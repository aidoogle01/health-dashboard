import { today } from '../lib/dates.js';
import type { SourceAdapter, SourceId, SyncResult } from '../types.js';
import { dateRange } from '../lib/dates.js';

/** Deterministic 0..1 noise from a string seed, so demo history is stable across restarts. */
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const around = (seed: string, mid: number, spread: number) => Math.round(mid + (noise(seed) - 0.5) * 2 * spread);

/** Fraction of the day elapsed — makes "today" climb on each sync so auto-refresh is visible. */
function dayProgress(date: string): number {
  if (date !== today()) return 1;
  const now = new Date();
  return Math.min(1, (now.getHours() * 60 + now.getMinutes()) / (21 * 60));
}

function demoDay(source: SourceId, date: string): Record<string, number> {
  const s = (k: string) => `${source}:${date}:${k}`;
  const p = dayProgress(date);
  switch (source) {
    case 'oura': {
      const deep = around(s('deep'), 80, 20);
      const rem = around(s('rem'), 100, 20);
      return {
        sleepScore: around(s('sleep'), 80, 10),
        readinessScore: around(s('ready'), 78, 12),
        activityScore: around(s('act'), 82, 12),
        totalSleepMin: deep + rem + around(s('light'), 250, 30),
        deepSleepMin: deep,
        remSleepMin: rem,
        sleepEfficiency: around(s('eff'), 89, 5),
        lowestHr: around(s('lhr'), 51, 4),
        avgHrv: around(s('hrv'), 52, 12),
        steps: Math.round(around(s('steps'), 9000, 3000) * p),
        activeCalories: Math.round(around(s('acal'), 520, 180) * p),
        temperatureDeviation: (noise(s('temp')) - 0.5) * 0.8,
      };
    }
    case 'garmin': {
      const active = Math.round(around(s('acal'), 600, 220) * p);
      return {
        steps: Math.round(around(s('steps'), 9500, 3200) * p),
        totalCalories: Math.round(1750 * Math.max(p, 0.3)) + active,
        activeCalories: active,
        restingHr: around(s('rhr'), 54, 4),
        avgStress: around(s('stress'), 30, 10),
        bodyBatteryHigh: around(s('bbh'), 85, 12),
        bodyBatteryLow: around(s('bbl'), 25, 12),
        intensityMinutes: Math.round(around(s('im'), 45, 30) * p),
        distanceM: Math.round(around(s('dist'), 7500, 2500) * p),
        sleepMin: around(s('sleep'), 440, 45),
        sleepScore: around(s('ss'), 78, 12),
      };
    }
    case 'mfp': {
      const protein = Math.round(around(s('p'), 150, 30) * p);
      const carbs = Math.round(around(s('c'), 210, 50) * p);
      const fat = Math.round(around(s('f'), 70, 18) * p);
      return {
        calories: protein * 4 + carbs * 4 + fat * 9,
        protein,
        carbs,
        fat,
        fiber: Math.round(around(s('fib'), 30, 8) * p),
        sugar: Math.round(around(s('sug'), 45, 15) * p),
        sodium: Math.round(around(s('na'), 2200, 500) * p),
        goalCalories: 2200,
      };
    }
  }
}

const ACTIVITY_TYPES = [
  ['running', 'Morning Run'],
  ['cycling', 'Road Ride'],
  ['strength_training', 'Strength'],
  ['walking', 'Evening Walk'],
] as const;

export class DemoSource implements SourceAdapter {
  constructor(
    readonly id: SourceId,
    readonly label: string,
  ) {}

  configured(): boolean {
    return true;
  }

  async sync(start: string, end: string): Promise<SyncResult> {
    const dates = dateRange(start, end);
    const days = dates.map((date) => ({ date, data: demoDay(this.id, date) }));
    if (this.id !== 'garmin') return { days };
    const activities = dates
      .filter((d) => noise(`act:${d}`) > 0.35 && d < today())
      .map((date) => {
        const [type, name] = ACTIVITY_TYPES[Math.floor(noise(`type:${date}`) * ACTIVITY_TYPES.length)]!;
        const durationS = around(`dur:${date}`, 2700, 1200);
        return {
          id: `demo-${date}`,
          source: 'garmin' as const,
          name,
          type,
          start: `${date}T07:${String(around(`min:${date}`, 30, 25)).padStart(2, '0')}:00`,
          durationS,
          distanceM: type === 'strength_training' ? undefined : Math.round((durationS / 60) * (type === 'cycling' ? 450 : 160)),
          calories: Math.round(durationS / 6),
          avgHr: around(`hr:${date}`, 138, 15),
        };
      });
    return { days, activities };
  }
}
