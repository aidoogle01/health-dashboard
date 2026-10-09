import { EventEmitter } from 'node:events';
import { addDays, today } from './lib/dates.js';
import type { Store } from './store.js';
import type { SourceAdapter, SourceId, SourceStatus } from './types.js';

export interface ScheduledSource {
  adapter: SourceAdapter;
  /** Stands in while nothing real is connected, so a fresh install shows a working dashboard. */
  demo: SourceAdapter;
  intervalMinutes: number;
}

interface Logger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
}

const DEMO_INTERVAL_MINUTES = 1;

/**
 * Runs each source on its own interval. The first run backfills history; later
 * runs re-fetch only the last few days. Emits `update` after every run.
 *
 * Sample data fills a source only while no real source is connected (or when
 * DEMO_MODE is on). The first real sync for a source wipes its sample data.
 */
export class SyncScheduler extends EventEmitter {
  private readonly runtime = new Map<SourceId, Pick<SourceStatus, 'lastSyncAt' | 'lastSuccessAt' | 'lastError' | 'nextSyncAt' | 'syncing'>>();
  private readonly timers = new Map<SourceId, NodeJS.Timeout>();
  private readonly backfilled = new Set<string>();
  private readonly sources: Map<SourceId, ScheduledSource>;

  constructor(
    sources: ScheduledSource[],
    private readonly store: Store,
    private readonly opts: { backfillDays: number; resyncDays: number; demoMode: boolean; log: Logger },
  ) {
    super();
    this.sources = new Map(sources.map((s) => [s.adapter.id, s]));
    for (const s of sources) this.runtime.set(s.adapter.id, { syncing: false });
  }

  private demoAllowed(): boolean {
    return this.opts.demoMode || [...this.sources.values()].every((s) => !s.adapter.configured());
  }

  /** The adapter a source should use right now: real, sample, or none. */
  private active(src: ScheduledSource): { adapter: SourceAdapter; demo: boolean } | undefined {
    if (src.adapter.configured()) return { adapter: src.adapter, demo: false };
    if (this.demoAllowed()) return { adapter: src.demo, demo: true };
    return undefined;
  }

  statuses(): SourceStatus[] {
    return [...this.sources.values()].map((src) => {
      const act = this.active(src);
      return {
        id: src.adapter.id,
        label: src.adapter.label,
        configured: Boolean(act),
        demo: act?.demo ?? false,
        ...this.runtime.get(src.adapter.id)!,
      };
    });
  }

  start(): void {
    for (const id of this.sources.keys()) void this.run(id);
  }

  stop(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  /** Trigger an immediate sync; returns false if that source is mid-sync, unknown or not connected. */
  syncNow(id: SourceId): boolean {
    const src = this.sources.get(id);
    const st = this.runtime.get(id);
    if (!src || !st || st.syncing || !this.active(src)) return false;
    void this.run(id);
    return true;
  }

  /** After connecting or disconnecting a source: re-sync everything so sample data appears or clears. */
  refreshAll(): void {
    for (const id of this.sources.keys()) {
      if (!this.runtime.get(id)?.syncing) void this.run(id);
    }
  }

  private async run(id: SourceId): Promise<void> {
    const src = this.sources.get(id);
    const st = this.runtime.get(id);
    if (!src || !st || st.syncing) return;
    clearTimeout(this.timers.get(id));

    const act = this.active(src);
    if (!act) {
      // Not connected and sample data no longer allowed: clear any leftover samples.
      if (this.store.hasDemo(id)) {
        await this.store.clearSource(id);
        this.emit('update', { source: id });
      }
      st.lastError = undefined;
      st.nextSyncAt = undefined;
      this.timers.set(id, setTimeout(() => void this.run(id), 60_000));
      return;
    }

    st.syncing = true;
    st.nextSyncAt = undefined;
    this.emit('update', { source: id });

    const key = `${id}:${act.demo ? 'demo' : 'real'}`;
    const end = today();
    const days = this.backfilled.has(key) ? this.opts.resyncDays : this.opts.backfillDays;
    const start = addDays(end, -(days - 1));
    const startedAt = new Date().toISOString();
    try {
      const result = await act.adapter.sync(start, end);
      // Switching from sample to real data: never mix the two.
      if (!act.demo && this.store.hasDemo(id)) await this.store.clearSource(id);
      await this.store.putDays(id, result.days);
      if (result.activities) await this.store.putActivities(result.activities);
      if (act.demo) await this.store.markDemo(id);
      this.backfilled.add(key);
      st.lastSuccessAt = startedAt;
      st.lastError = undefined;
      this.opts.log.info({ source: id, demo: act.demo, days: result.days.length }, 'sync complete');
    } catch (err) {
      st.lastError = err instanceof Error ? err.message : String(err);
      this.opts.log.warn({ source: id, err: st.lastError }, 'sync failed');
    } finally {
      st.syncing = false;
      st.lastSyncAt = startedAt;
      const delayMs = (act.demo ? DEMO_INTERVAL_MINUTES : src.intervalMinutes) * 60_000;
      st.nextSyncAt = new Date(Date.now() + delayMs).toISOString();
      this.timers.set(id, setTimeout(() => void this.run(id), delayMs));
      this.emit('update', { source: id });
    }
  }
}
