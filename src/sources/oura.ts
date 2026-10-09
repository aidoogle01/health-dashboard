import type { Config } from '../config.js';
import { addDays } from '../lib/dates.js';
import type { Store } from '../store.js';
import type { OuraDay, SourceAdapter, SyncResult } from '../types.js';

const API = 'https://api.ouraring.com/v2/usercollection';
const TOKEN_URL = 'https://api.ouraring.com/oauth/token';

interface OuraPage<T> {
  data: T[];
  next_token?: string | null;
}

interface DailyScore {
  day: string;
  score?: number | null;
}
interface DailyReadiness extends DailyScore {
  temperature_deviation?: number | null;
}
interface DailyActivity extends DailyScore {
  steps?: number | null;
  active_calories?: number | null;
}
export interface SleepPeriod {
  day: string;
  type?: string;
  total_sleep_duration?: number | null;
  deep_sleep_duration?: number | null;
  rem_sleep_duration?: number | null;
  efficiency?: number | null;
  lowest_heart_rate?: number | null;
  average_hrv?: number | null;
}

const num = (v: number | null | undefined) => (typeof v === 'number' ? v : undefined);
const mins = (s: number | null | undefined) => (typeof s === 'number' ? Math.round(s / 60) : undefined);

/** Merge Oura's four collections into one record per day. Exported for tests. */
export function mergeOura(
  sleep: DailyScore[],
  readiness: DailyReadiness[],
  activity: DailyActivity[],
  periods: SleepPeriod[],
): Map<string, OuraDay> {
  const days = new Map<string, OuraDay>();
  const get = (day: string) => {
    let d = days.get(day);
    if (!d) days.set(day, (d = {}));
    return d;
  };

  for (const s of sleep) get(s.day).sleepScore = num(s.score);
  for (const r of readiness) {
    const d = get(r.day);
    d.readinessScore = num(r.score);
    d.temperatureDeviation = num(r.temperature_deviation);
  }
  for (const a of activity) {
    const d = get(a.day);
    d.activityScore = num(a.score);
    d.steps = num(a.steps);
    d.activeCalories = num(a.active_calories);
  }

  // A day can hold naps as well as the main sleep: use the longest period.
  const main = new Map<string, SleepPeriod>();
  for (const p of periods) {
    const cur = main.get(p.day);
    if (!cur || (p.total_sleep_duration ?? 0) > (cur.total_sleep_duration ?? 0)) main.set(p.day, p);
  }
  for (const [day, p] of main) {
    const d = get(day);
    d.totalSleepMin = mins(p.total_sleep_duration);
    d.deepSleepMin = mins(p.deep_sleep_duration);
    d.remSleepMin = mins(p.rem_sleep_duration);
    d.sleepEfficiency = num(p.efficiency);
    d.lowestHr = num(p.lowest_heart_rate);
    d.avgHrv = num(p.average_hrv);
  }
  return days;
}

export class OuraSource implements SourceAdapter {
  readonly id = 'oura' as const;
  readonly label = 'Oura Ring';

  constructor(
    private readonly config: Config,
    private readonly store: Store,
  ) {}

  configured(): boolean {
    return Boolean(this.accessToken() || this.canRefresh());
  }

  private accessToken(): string | undefined {
    return this.store.getSecret<string>('oura.accessToken') ?? this.config.OURA_ACCESS_TOKEN;
  }

  private refreshToken(): string | undefined {
    return this.store.getSecret<string>('oura.refreshToken') ?? this.config.OURA_REFRESH_TOKEN;
  }

  private canRefresh(): boolean {
    return Boolean(this.config.OURA_CLIENT_ID && this.config.OURA_CLIENT_SECRET && this.refreshToken());
  }

  /** OAuth refresh tokens are single-use, so the rotated one is persisted immediately. */
  private async refresh(): Promise<void> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken() ?? '',
        client_id: this.config.OURA_CLIENT_ID ?? '',
        client_secret: this.config.OURA_CLIENT_SECRET ?? '',
      }),
    });
    if (!res.ok) throw new Error(`Oura token refresh failed (${res.status})`);
    const body = (await res.json()) as { access_token: string; refresh_token?: string };
    await this.store.setSecret('oura.accessToken', body.access_token);
    if (body.refresh_token) await this.store.setSecret('oura.refreshToken', body.refresh_token);
  }

  private async fetchAll<T>(collection: string, start: string, end: string): Promise<T[]> {
    const out: T[] = [];
    let nextToken: string | undefined;
    let retried = false;
    for (;;) {
      const params = new URLSearchParams({ start_date: start, end_date: end });
      if (nextToken) params.set('next_token', nextToken);
      const res = await fetch(`${API}/${collection}?${params}`, {
        headers: { Authorization: `Bearer ${this.accessToken() ?? ''}` },
      });
      if (res.status === 401 && !retried && this.canRefresh()) {
        retried = true;
        await this.refresh();
        continue;
      }
      if (!res.ok) throw new Error(`Oura ${collection} request failed (${res.status})`);
      const page = (await res.json()) as OuraPage<T>;
      out.push(...page.data);
      nextToken = page.next_token ?? undefined;
      if (!nextToken) return out;
    }
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    if (!this.accessToken() && this.canRefresh()) await this.refresh();
    // Oura treats end_date as exclusive for some collections; ask for one extra day and trim.
    const endEx = addDays(end, 1);
    const sleep = await this.fetchAll<DailyScore>('daily_sleep', start, endEx);
    const readiness = await this.fetchAll<DailyReadiness>('daily_readiness', start, endEx);
    const activity = await this.fetchAll<DailyActivity>('daily_activity', start, endEx);
    const periods = await this.fetchAll<SleepPeriod>('sleep', start, endEx);

    const merged = mergeOura(sleep, readiness, activity, periods);
    return {
      days: [...merged]
        .filter(([date]) => date >= start && date <= end)
        .map(([date, data]) => ({ date, data: { ...data } })),
    };
  }
}
