import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module shared with the browser
import * as I from '../public/js/insights.js';
import { clockFromIso } from '../src/lib/dates.js';

const goals = { ...I.DEFAULT_GOALS };
const day = (date: string, extra: Record<string, unknown> = {}) => ({ date, ...extra });

describe('formatting', () => {
  it('formats clock minutes either side of midnight', () => {
    expect(I.fmtClock(-60)).toBe('23:00');
    expect(I.fmtClock(45)).toBe('00:45');
    expect(I.fmtClock(430)).toBe('07:10');
  });
});

describe('clockFromIso', () => {
  it('puts evening bedtimes before midnight and reads the local offset', () => {
    expect(clockFromIso('2026-10-01T23:15:00+02:00', true)).toBe(-45);
    expect(clockFromIso('2026-10-02T00:30:00-07:00', true)).toBe(30);
    expect(clockFromIso('2026-10-02T07:05:00+02:00', false)).toBe(425);
  });
});

describe('rolling', () => {
  it('averages the trailing window and skips gaps', () => {
    const r = I.rolling([10, 20, undefined, 30, 40], 3, 2);
    expect(r).toEqual([undefined, 15, 15, 25, 35]);
  });
});

describe('habitStats', () => {
  const steps = I.habits(goals).find((h: { id: string }) => h.id === 'steps');
  const days = [
    day('2026-10-01', { garmin: { steps: 12000 } }),
    day('2026-10-02', { garmin: { steps: 4000 } }),
    day('2026-10-03', { garmin: { steps: 11000 } }),
    day('2026-10-04'), // no data: neither breaks nor extends the streak
    day('2026-10-05', { garmin: { steps: 10500 } }),
    day('2026-10-06', { garmin: { steps: 300 } }), // today, in progress
  ];

  it('scores closeness to goal, ignores today, and counts streaks', () => {
    const s = I.habitStats(steps, days, '2026-10-06');
    expect(s.bins).toEqual([3, 0, 3, undefined, 3, undefined]);
    expect(s).toMatchObject({ evaluated: 4, met: 3, rate: 0.75, streak: 2, best: 2 });
  });
});

describe('compareBehaviours', () => {
  it('compares next-morning readiness after hard days vs other days', () => {
    const days = Array.from({ length: 21 }, (_, i) => {
      const hard = i % 2 === 0;
      return day(`2026-09-${String(i + 1).padStart(2, '0')}`, {
        garmin: { intensityMinutes: hard ? 80 : 10 },
        // the morning after a hard day reads 70; otherwise 80
        oura: { readinessScore: i > 0 && (i - 1) % 2 === 0 ? 70 : 80 },
      });
    });
    const res = I.compareBehaviours(days, goals, 'readiness', '2026-09-30');
    const hard = res.find((r: { id: string }) => r.id === 'hard');
    expect(hard).toMatchObject({ nYes: 10, nNo: 10, meanYes: 70, meanNo: 80, diff: -10, enough: true });
  });

  it('withholds a result when either group is too small', () => {
    const days = [day('2026-09-01', { garmin: { intensityMinutes: 80 } }), day('2026-09-02', { oura: { readinessScore: 70 } })];
    const hard = I.compareBehaviours(days, goals, 'readiness', '2026-09-30').find((r: { id: string }) => r.id === 'hard');
    expect(hard.enough).toBe(false);
    expect(hard.diff).toBeUndefined();
  });
});

describe('focusItems', () => {
  it('flags low readiness and a step shortfall for the time of day', () => {
    const past = Array.from({ length: 10 }, (_, i) => day(`2026-09-${String(i + 1).padStart(2, '0')}`, { oura: { readinessScore: 80 } }));
    const today = day('2026-09-11', { oura: { readinessScore: 62 }, garmin: { steps: 2000 } });
    const items = I.focusItems([...past, today], goals, new Date(2026, 8, 11, 15, 0));
    expect(items[0]).toMatchObject({ level: 'warning', title: 'Make today an easy day' });
    expect(items.some((i: { title: string }) => /steps behind pace/.test(i.title))).toBe(true);
  });
});

describe('cumulativeBalance', () => {
  it('sums eaten minus burned for complete days only', () => {
    const days = [
      day('2026-10-01', { mfp: { calories: 2000 }, garmin: { totalCalories: 2500 } }),
      day('2026-10-02'),
      day('2026-10-03', { mfp: { calories: 2600 }, garmin: { totalCalories: 2400 } }),
      day('2026-10-04', { mfp: { calories: 500 }, garmin: { totalCalories: 900 } }),
    ];
    const r = I.cumulativeBalance(days, '2026-10-04');
    expect(r.series).toEqual([-500, -500, -300, -300]);
    expect(r).toMatchObject({ total: -300, counted: 2 });
  });
});
