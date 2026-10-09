import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_GOALS, type Activity, type DayRecord, type Goals, type SourceId } from './types.js';

interface StoreData {
  days: Record<string, DayRecord>;
  activities: Activity[];
  /** Rotating credentials (Oura refresh token, Garmin session) so restarts don't re-login. */
  secrets: Record<string, unknown>;
  goals?: Partial<Goals>;
}

const MAX_ACTIVITIES = 200;

/** Small JSON-file store. Single process, so writes are serialised through one promise chain. */
export class Store {
  private data: StoreData = { days: {}, activities: [], secrets: {} };
  private writing: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(dir: string) {
    this.file = path.join(dir, 'dashboard.json');
  }

  async load(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const raw = JSON.parse(await readFile(this.file, 'utf8')) as Partial<StoreData>;
      this.data = {
        days: raw.days ?? {},
        activities: raw.activities ?? [],
        secrets: raw.secrets ?? {},
        ...(raw.goals ? { goals: raw.goals } : {}),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data);
    this.writing = this.writing.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, { mode: 0o600 });
      await rename(tmp, this.file);
    });
    return this.writing;
  }

  /** Replace one source's values for a day (a re-sync is authoritative for that day). */
  async putDays(source: SourceId, days: Array<{ date: string; data: Record<string, number | undefined> }>) {
    for (const { date, data } of days) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)),
      );
      const rec = (this.data.days[date] ?? { date }) as unknown as Record<string, unknown>;
      if (Object.keys(clean).length > 0) rec[source] = clean;
      else delete rec[source];
      this.data.days[date] = rec as unknown as DayRecord;
    }
    await this.persist();
  }

  async putActivities(activities: Activity[]) {
    const incoming = new Map(activities.map((a) => [`${a.source}:${a.id}`, a]));
    const kept = this.data.activities.filter((a) => !incoming.has(`${a.source}:${a.id}`));
    this.data.activities = [...kept, ...incoming.values()]
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, MAX_ACTIVITIES);
    await this.persist();
  }

  getDays(start: string, end: string): DayRecord[] {
    return Object.values(this.data.days)
      .filter((d) => d.date >= start && d.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getActivities(start: string, limit = 25): Activity[] {
    return this.data.activities.filter((a) => a.start.slice(0, 10) >= start).slice(0, limit);
  }

  getGoals(): Goals {
    return { ...DEFAULT_GOALS, ...this.data.goals };
  }

  async setGoals(goals: Goals) {
    this.data.goals = goals;
    await this.persist();
  }

  getSecret<T>(key: string): T | undefined {
    return this.data.secrets[key] as T | undefined;
  }

  async setSecret(key: string, value: unknown) {
    this.data.secrets[key] = value;
    await this.persist();
  }
}
