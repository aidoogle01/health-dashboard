// The generator lives with the web client so the static preview build can share it.
// The relative path is the same from src/sources (tsx) and dist/sources (build).
import { demoActivities, demoDay } from '../../public/js/demo-data.js';
import type { SourceAdapter, SourceId, SyncResult } from '../types.js';
import { dateRange } from '../lib/dates.js';

export class DemoSource implements SourceAdapter {
  constructor(
    readonly id: SourceId,
    readonly label: string,
  ) {}

  configured(): boolean {
    return true;
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    const days = dateRange(start, end).map((date) => ({ date, data: demoDay(this.id, date) }));
    return this.id === 'garmin' ? { days, activities: demoActivities(start, end) } : { days };
  }
}
