import { EventEmitter } from 'node:events';
import { addDays, today } from './lib/dates.js';
import type { Store } from './store.js';
import type { SourceAdapter, SourceId, SourceStatus } from './types.js';

export interface ScheduledSource {
  adapter: SourceAdapter;
  intervalMinutes: number;
  demo: boolean;
}

interface Logger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
}

/**
 * Runs each source on its own interval. The first run backfills history; later
 * runs re-fetch only the last few days. Emits `update` after every run.
 */
export class SyncScheduler extends EventEmitter {
  private readonly status = new Map<SourceId, SourceStatus>();
  private readonly timers = new Map<SourceId, NodeJS.Timeout>();
  private readonly backfilled = new Set<SourceId>();
  private readonly sources: Map<SourceId, ScheduledSource>;

  constructor(
    sources: ScheduledSource[],
    private readonly store: Store,
    private readonly opts: { backfillDays: number; resyncDays: number; log: Logger },
  ) {
    super();
    this.sources = new Map(sources.map((s) => [s.adapter.id, s]));
    for (const s of sources) {
      this.status.set(s.adapter.id, {
        id: s.adapter.id,
        label: s.adapter.label,
        configured: s.adapter.configured(),
        demo: s.demo,
        syncing: false,
      });
    }
  }

  statuses(): SourceStatus[] {
    return [...this.status.values()];
  }

  start(): void {
    for (const id of this.sources.keys()) void this.run(id);
  }

  stop(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  /** Trigger an immediate sync; returns false if that source is already mid-sync or unknown. */
  syncNow(id: SourceId): boolean {
    const st = this.status.get(id);
    if (!st || st.syncing || !st.configured) return false;
    void this.run(id);
    return true;
  }

  private async run(id: SourceId): Promise<void> {
    const src = this.sources.get(id);
    const st = this.status.get(id);
    if (!src || !st || st.syncing) return;
    clearTimeout(this.timers.get(id));

    if (!st.configured) return;
    st.syncing = true;
    st.nextSyncAt = undefined;
    this.emit('update', { source: id });

    const end = today();
    const days = this.backfilled.has(id) ? this.opts.resyncDays : this.opts.backfillDays;
    const start = addDays(end, -(days - 1));
    const startedAt = new Date().toISOString();
    try {
      const result = await src.adapter.sync(start, end);
      await this.store.putDays(id, result.days);
      if (result.activities) await this.store.putActivities(result.activities);
      this.backfilled.add(id);
      st.lastSuccessAt = startedAt;
      st.lastError = undefined;
      this.opts.log.info({ source: id, days: result.days.length }, 'sync complete');
    } catch (err) {
      st.lastError = err instanceof Error ? err.message : String(err);
      this.opts.log.warn({ source: id, err: st.lastError }, 'sync failed');
    } finally {
      st.syncing = false;
      st.lastSyncAt = startedAt;
      const delayMs = src.intervalMinutes * 60_000;
      st.nextSyncAt = new Date(Date.now() + delayMs).toISOString();
      this.timers.set(id, setTimeout(() => void this.run(id), delayMs));
      this.emit('update', { source: id });
    }
  }
}
