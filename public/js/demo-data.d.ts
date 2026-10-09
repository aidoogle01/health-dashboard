export function isoDate(d: Date): string;
export function shiftDate(iso: string, n: number): string;
export function demoDay(source: 'oura' | 'garmin' | 'mfp', date: string, now?: Date): Record<string, number | undefined>;
export function demoActivities(
  start: string,
  end: string,
  now?: Date,
): Array<{
  id: string;
  source: 'garmin';
  name: string;
  type: string;
  start: string;
  durationS: number;
  distanceM: number | undefined;
  calories: number;
  avgHr: number;
}>;
