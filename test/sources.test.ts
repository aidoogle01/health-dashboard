import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toActivity, toGarminDay } from '../src/sources/garmin.js';
import { MfpSessionError, parseMfpCsv, parseMfpDiary } from '../src/sources/myfitnesspal.js';
import { mergeOura } from '../src/sources/oura.js';
import { addDays, dateRange } from '../src/lib/dates.js';

describe('MyFitnessPal diary parser', () => {
  const html = readFileSync(new URL('./fixtures/mfp-diary.html', import.meta.url), 'utf8');

  it('reads totals and goal by column name', () => {
    expect(parseMfpDiary(html)).toEqual({
      calories: 1842,
      carbs: 201,
      fat: 63,
      protein: 132,
      sodium: 2310,
      sugar: 48,
      goalCalories: 2200,
    });
  });

  it('flags a login page instead of returning zeros', () => {
    const login = '<form id="fitnessLogin" action="/account/login"></form>';
    expect(() => parseMfpDiary(login)).toThrow(MfpSessionError);
  });
});

describe('MyFitnessPal CSV import', () => {
  it('sums meals into daily totals', () => {
    const csv = [
      'Date,Meal,Time,Calories,Fat (g),Sodium (mg),Carbohydrates (g),Fiber,Sugar,Protein (g),Note',
      '2026-10-01,Breakfast,,400,10,300,50,5,10,20,',
      '2026-10-01,Lunch,,"600",20,700,60,6,8,40,"chicken, rice"',
      '2026-10-02,Dinner,,700,25,900,70,8,12,45,',
    ].join('\n');
    const days = parseMfpCsv(csv);
    expect(days).toEqual([
      { date: '2026-10-01', data: { calories: 1000, fat: 30, sodium: 1000, carbs: 110, fiber: 11, sugar: 18, protein: 60 } },
      { date: '2026-10-02', data: { calories: 700, fat: 25, sodium: 900, carbs: 70, fiber: 8, sugar: 12, protein: 45 } },
    ]);
  });

  it('rejects files without a Date column', () => {
    expect(() => parseMfpCsv('a,b\n1,2')).toThrow(/Date column/);
  });
});

describe('Oura merge', () => {
  it('combines collections and picks the main sleep over naps', () => {
    const days = mergeOura(
      [{ day: '2026-10-01', score: 82 }],
      [{ day: '2026-10-01', score: 75, temperature_deviation: -0.1 }],
      [{ day: '2026-10-01', score: 90, steps: 10234, active_calories: 480 }],
      [
        { day: '2026-10-01', type: 'long_sleep', total_sleep_duration: 27000, deep_sleep_duration: 5400, rem_sleep_duration: 6000, efficiency: 91, lowest_heart_rate: 48, average_hrv: 61 },
        { day: '2026-10-01', type: 'sleep', total_sleep_duration: 1800, lowest_heart_rate: 60, average_hrv: 30 },
      ],
    );
    expect(days.get('2026-10-01')).toEqual({
      sleepScore: 82,
      readinessScore: 75,
      temperatureDeviation: -0.1,
      activityScore: 90,
      steps: 10234,
      activeCalories: 480,
      totalSleepMin: 450,
      deepSleepMin: 90,
      remSleepMin: 100,
      sleepEfficiency: 91,
      lowestHr: 48,
      avgHrv: 61,
    });
  });
});

describe('Garmin mapping', () => {
  it('maps the daily summary and drops "not measured" sentinels', () => {
    const day = toGarminDay(
      { totalSteps: 8000, totalKilocalories: 2400, activeKilocalories: 600, restingHeartRate: 52, averageStressLevel: -1, moderateIntensityMinutes: 20, vigorousIntensityMinutes: 10 },
      { dailySleepDTO: { sleepTimeSeconds: 26400, sleepScores: { overall: { value: 81 } } } },
    );
    expect(day).toMatchObject({ steps: 8000, totalCalories: 2400, restingHr: 52, avgStress: undefined, intensityMinutes: 40, sleepMin: 440, sleepScore: 81 });
  });

  it('normalises activities', () => {
    expect(
      toActivity({ activityId: 42, activityName: 'Run', activityType: { typeKey: 'running' }, startTimeLocal: '2026-10-01 07:15:00', duration: 1800, distance: 5000, calories: 350, averageHR: 150 }),
    ).toEqual({ id: '42', source: 'garmin', name: 'Run', type: 'running', start: '2026-10-01T07:15:00', durationS: 1800, distanceM: 5000, calories: 350, avgHr: 150 });
  });
});

describe('dates', () => {
  it('builds inclusive ranges across month ends', () => {
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
