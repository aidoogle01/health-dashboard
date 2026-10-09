import type { Config } from '../config.js';
import { clockMinutes, dateRange } from '../lib/dates.js';
import type { PythonBridge } from '../lib/python-bridge.js';
import type { Store } from '../store.js';
import type { Activity, GarminDay, SourceAdapter, SyncResult } from '../types.js';

/**
 * Garmin Connect through python-garminconnect (Garmin's official Health API is
 * partner-only, and since 2026 Garmin blocks plain server HTTP clients). You sign
 * in once from the Connections panel; only the session tokens Garmin issues are
 * stored, never your password. The library refreshes them as it goes.
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
    /** Epoch ms of the wearer's local wall-clock time (Garmin encodes local time as if UTC). */
    sleepStartTimestampLocal?: number | null;
    sleepEndTimestampLocal?: number | null;
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

function localClock(ts: number | null | undefined, isBedtime: boolean): number | undefined {
  if (typeof ts !== 'number') return undefined;
  const d = new Date(ts);
  return clockMinutes(d.getUTCHours(), d.getUTCMinutes(), isBedtime);
}

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
    bedtimeMin: localClock(sleep?.dailySleepDTO?.sleepStartTimestampLocal, true),
    wakeMin: localClock(sleep?.dailySleepDTO?.sleepEndTimestampLocal, false),
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

const TOKENS = 'garmin.tokens';

interface LoginResult {
  status: 'ok' | 'needs_mfa';
  tokens?: string;
  displayName?: string;
}

export class GarminSource implements SourceAdapter {
  readonly id = 'garmin' as const;
  readonly label = 'Garmin';

  constructor(
    private readonly config: Config,
    private readonly store: Store,
    private readonly bridge: PythonBridge,
  ) {}

  /** Connected once a sign-in has produced tokens (or env credentials allow a hands-off sign-in). */
  configured(): boolean {
    return Boolean(this.store.getSecret<string>(TOKENS) || (this.config.GARMIN_EMAIL && this.config.GARMIN_PASSWORD));
  }

  connected(): boolean {
    return Boolean(this.store.getSecret<string>(TOKENS));
  }

  /** Step 1 of signing in. May come back asking for the code Garmin sends. */
  async login(email: string, password: string): Promise<'ok' | 'needs_mfa'> {
    const res = await this.bridge.call<LoginResult>('garmin.login', { email, password });
    if (res.status === 'ok' && res.tokens) await this.store.setSecret(TOKENS, res.tokens);
    return res.status;
  }

  /** Step 2, only when Garmin asked for a verification code. */
  async verify(code: string): Promise<void> {
    const res = await this.bridge.call<LoginResult>('garmin.mfa', { code });
    if (!res.tokens) throw new Error('Garmin did not return a session');
    await this.store.setSecret(TOKENS, res.tokens);
  }

  async disconnect(): Promise<void> {
    await this.store.setSecret(TOKENS, undefined);
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    if (!this.connected()) {
      // Env credentials work only for accounts without two-step verification.
      const status = await this.login(this.config.GARMIN_EMAIL ?? '', this.config.GARMIN_PASSWORD ?? '');
      if (status === 'needs_mfa') throw new Error('Garmin wants a verification code. Connect Garmin from the Connections panel.');
    }
    const res = await this.bridge.call<{
      days: Array<{ date: string; summary: GarminSummary | null; sleep: GarminSleep | null }>;
      activities: GarminActivity[];
      tokens: string;
    }>('garmin.sync', { tokens: this.store.getSecret<string>(TOKENS), dates: dateRange(start, end) }, 300_000).catch(async (err: Error) => {
      if (/auth|401|403|expired|token/i.test(err.message)) {
        await this.disconnect();
        throw new Error('Garmin session expired. Connect Garmin again from the Connections panel.');
      }
      throw err;
    });
    if (res.tokens) await this.store.setSecret(TOKENS, res.tokens);
    return {
      days: res.days.map((d) => ({ date: d.date, data: { ...toGarminDay(d.summary ?? {}, d.sleep ?? undefined) } })),
      activities: res.activities.filter((a) => a?.activityId && a.startTimeLocal).map(toActivity),
    };
  }
}
