// garmin-connect is CommonJS: take the named export off the default import.
import garminConnect from 'garmin-connect';
import type { Config } from '../config.js';
import { dateRange } from '../lib/dates.js';
import type { Store } from '../store.js';
import type { Activity, GarminDay, SourceAdapter, SyncResult } from '../types.js';

/**
 * Garmin Connect via the unofficial web API (Garmin's official Health API is
 * partner-only). The OAuth session is cached in the store so we log in rarely —
 * Garmin rate-limits and may challenge repeated SSO logins.
 */

export interface GarminSummary {
  totalSteps?: number | null;
  totalKilocalories?: number | null;
  activeKilocalories?: number | null;
  restingHeartRate?: number | null;
  averageStressLevel?: number | null;
  bodyBatteryHighestValue?: number | null;
  bodyBatteryLowestValue?: number | null;
  moderateIntensityMinutes?: number | null;
  vigorousIntensityMinutes?: number | null;
  totalDistanceMeters?: number | null;
}

export interface GarminSleep {
  dailySleepDTO?: {
    sleepTimeSeconds?: number | null;
    sleepScores?: { overall?: { value?: number | null } };
  };
}

export interface GarminActivity {
  activityId: number;
  activityName?: string;
  activityType?: { typeKey?: string };
  startTimeLocal: string;
  duration?: number;
  distance?: number;
  calories?: number;
  averageHR?: number;
}

const num = (v: number | null | undefined) => (typeof v === 'number' && v >= 0 ? v : undefined);

/** Exported for tests. */
export function toGarminDay(summary: GarminSummary, sleep: GarminSleep | undefined): GarminDay {
  const mod = num(summary.moderateIntensityMinutes);
  const vig = num(summary.vigorousIntensityMinutes);
  const sleepS = num(sleep?.dailySleepDTO?.sleepTimeSeconds);
  return {
    steps: num(summary.totalSteps),
    totalCalories: num(summary.totalKilocalories),
    activeCalories: num(summary.activeKilocalories),
    restingHr: num(summary.restingHeartRate),
    // Garmin reports -1/-2 when stress couldn't be measured; num() drops negatives.
    avgStress: num(summary.averageStressLevel),
    bodyBatteryHigh: num(summary.bodyBatteryHighestValue),
    bodyBatteryLow: num(summary.bodyBatteryLowestValue),
    // Garmin counts vigorous minutes double toward the weekly goal.
    intensityMinutes: mod === undefined && vig === undefined ? undefined : (mod ?? 0) + 2 * (vig ?? 0),
    distanceM: num(summary.totalDistanceMeters),
    sleepMin: sleepS === undefined ? undefined : Math.round(sleepS / 60),
    sleepScore: num(sleep?.dailySleepDTO?.sleepScores?.overall?.value),
  };
}

export function toActivity(a: GarminActivity): Activity {
  return {
    id: String(a.activityId),
    source: 'garmin',
    name: a.activityName ?? 'Activity',
    type: a.activityType?.typeKey ?? 'other',
    start: a.startTimeLocal.replace(' ', 'T'),
    durationS: num(a.duration),
    distanceM: num(a.distance),
    calories: num(a.calories),
    avgHr: num(a.averageHR),
  };
}

const { GarminConnect } = garminConnect;
type GarminConnect = InstanceType<typeof GarminConnect>;
type Tokens = ReturnType<GarminConnect['exportToken']>;

export class GarminSource implements SourceAdapter {
  readonly id = 'garmin' as const;
  readonly label = 'Garmin';
  private client: GarminConnect | undefined;
  private displayName: string | undefined;

  constructor(
    private readonly config: Config,
    private readonly store: Store,
  ) {}

  configured(): boolean {
    return Boolean(this.config.GARMIN_EMAIL && this.config.GARMIN_PASSWORD);
  }

  private get api() {
    return `https://connectapi.${this.config.GARMIN_DOMAIN}`;
  }

  private async connect(forceLogin = false): Promise<GarminConnect> {
    if (this.client && !forceLogin) return this.client;
    const gc = new GarminConnect(
      { username: this.config.GARMIN_EMAIL ?? '', password: this.config.GARMIN_PASSWORD ?? '' },
      this.config.GARMIN_DOMAIN,
    );
    const saved = this.store.getSecret<Tokens>('garmin.tokens');
    if (saved && !forceLogin) {
      gc.loadToken(saved.oauth1, saved.oauth2);
    } else {
      await gc.login();
      await this.store.setSecret('garmin.tokens', gc.exportToken());
    }
    const profile = await gc.getUserProfile();
    this.displayName = profile.displayName;
    this.client = gc;
    return gc;
  }

  private async withSession<T>(fn: (gc: GarminConnect) => Promise<T>): Promise<T> {
    try {
      return await fn(await this.connect());
    } catch (err) {
      // Expired/invalid cached session: log in once more and retry.
      if (!isAuthError(err)) throw err;
      this.client = undefined;
      return fn(await this.connect(true));
    }
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    return this.withSession(async (gc) => {
      const user = encodeURIComponent(this.displayName ?? '');
      const days: SyncResult['days'] = [];
      for (const date of dateRange(start, end)) {
        const summary = await gc.get<GarminSummary>(
          `${this.api}/usersummary-service/usersummary/daily/${user}?calendarDate=${date}`,
        );
        const sleep = await gc
          .get<GarminSleep>(
            `${this.api}/wellness-service/wellness/dailySleepData/${user}?date=${date}&nonSleepBufferMinutes=60`,
          )
          .catch(() => undefined);
        days.push({ date, data: { ...toGarminDay(summary ?? {}, sleep) } });
      }
      const recent = (await gc.getActivities(0, 30)) as unknown as GarminActivity[];
      return { days, activities: recent.map(toActivity) };
    });
  }
}

function isAuthError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}
