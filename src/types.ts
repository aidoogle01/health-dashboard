export type SourceId = 'oura' | 'garmin' | 'mfp';

/** Optional numeric field — `undefined` means the source had no value for that day. */
type N = number | undefined;

export interface OuraDay {
  sleepScore?: N;
  readinessScore?: N;
  activityScore?: N;
  totalSleepMin?: N;
  deepSleepMin?: N;
  remSleepMin?: N;
  sleepEfficiency?: N;
  lowestHr?: N;
  avgHrv?: N;
  steps?: N;
  activeCalories?: N;
  temperatureDeviation?: N;
  /** Clock times of the main sleep, minutes from midnight of the wake day (23:30 → -30). */
  bedtimeMin?: N;
  wakeMin?: N;
}

export interface GarminDay {
  steps?: N;
  totalCalories?: N;
  activeCalories?: N;
  restingHr?: N;
  avgStress?: N;
  bodyBatteryHigh?: N;
  bodyBatteryLow?: N;
  intensityMinutes?: N;
  distanceM?: N;
  sleepMin?: N;
  sleepScore?: N;
  bedtimeMin?: N;
  wakeMin?: N;
}

export interface MfpDay {
  calories?: N;
  protein?: N;
  carbs?: N;
  fat?: N;
  fiber?: N;
  sugar?: N;
  sodium?: N;
  goalCalories?: N;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  oura?: OuraDay;
  garmin?: GarminDay;
  mfp?: MfpDay;
}

export interface Activity {
  id: string;
  source: SourceId;
  name: string;
  type: string;
  start: string; // ISO local timestamp
  durationS?: N;
  distanceM?: N;
  calories?: N;
  avgHr?: N;
}

export interface SourceStatus {
  id: SourceId;
  label: string;
  configured: boolean;
  demo: boolean;
  lastSyncAt?: string | undefined;
  lastSuccessAt?: string | undefined;
  lastError?: string | undefined;
  nextSyncAt?: string | undefined;
  syncing: boolean;
}

/** Result of one sync run for a source: per-day patches plus optional activities. */
export interface SyncResult {
  days: Array<{ date: string; data: Record<string, number | undefined> }>;
  activities?: Activity[];
}

export interface SourceAdapter {
  id: SourceId;
  label: string;
  configured(): boolean;
  /** Fetch data for an inclusive date range (YYYY-MM-DD). */
  sync(start: string, end: string): Promise<SyncResult>;
}

/** Targets the dashboard measures you against. Editable from the UI. */
export interface Goals {
  sleepMin: number;
  /** Target bedtime, minutes from midnight (23:00 → -60). */
  bedtimeMin: number;
  steps: number;
  protein: number;
  /** Used when MyFitnessPal has no daily calorie goal for the day. */
  calories: number;
  /** A day counts as on target when calories land within this % of the goal. */
  calorieTolerancePct: number;
  intensityWeekly: number;
}

export const DEFAULT_GOALS: Goals = {
  sleepMin: 450,
  bedtimeMin: -60,
  steps: 10000,
  protein: 150,
  calories: 2200,
  calorieTolerancePct: 10,
  intensityWeekly: 150,
};
