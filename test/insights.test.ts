import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module shared with the browser
import * as I from '../public/js/insights.js';
import { clockFromIso } from '../src/lib/dates.js';

const goals = { ...I.DEFAULT_GOALS };
const day = (date: string, extra: Record<string, unknown> = {}) => ({ date, ...extra });
const iso = (base: string, n: number) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
    expect(I.rolling([10, 20, undefined, 30, 40], 3, 2)).toEqual([undefined, 15, 15, 25, 35]);
  });
});

describe('usual range', () => {
  const values = Array.from({ length: 30 }, (_, i) => 50 + (i % 11)); // 50..60
  it('needs 10 days, then uses the middle 80% of the last 30', () => {
    expect(I.usualRange(values, 5)).toBeUndefined();
    const r = I.usualRange(values, 30);
    expect(r.lo).toBeGreaterThanOrEqual(50);
    expect(r.hi).toBeLessThanOrEqual(60);
    expect(r.lo).toBeLessThan(r.median);
  });
  it('labels values in one shared vocabulary, with direction-aware tone', () => {
    const r = { lo: 50, median: 55, hi: 60 };
    expect(I.usualLabel(55, r, true)).toMatchObject({ state: 'within', tone: 'neutral' });
    expect(I.usualLabel(45, r, true)).toMatchObject({ text: 'Lower than usual', tone: 'attention' });
    expect(I.usualLabel(45, r, false)).toMatchObject({ tone: 'good' }); // e.g. resting HR
    expect(I.usualLabel(undefined, r, true).state).toBe('unknown');
  });
  it('bands scores with Oura thresholds', () => {
    expect([I.scoreBand(90), I.scoreBand(75), I.scoreBand(60)]).toEqual(['Optimal', 'Good', 'Pay attention']);
  });
});

describe('weekly habit goals', () => {
  const steps = I.habits(goals).find((h: { id: string }) => h.id === 'steps');
  // Weeks start Monday 2026-09-14. Two full weeks then the current (partial) week.
  const pattern = [1, 1, 1, 1, 1, 0, 0, /* week 2 */ 1, 1, 1, 1, 1, 1, 0, /* week 3 */ 1, 1, 0];
  const days = pattern.map((hit, i) => day(iso('2026-09-14', i), { garmin: { steps: hit ? 11000 : 3000 } }));
  days.push(day(iso('2026-09-14', pattern.length), { garmin: { steps: 200 } })); // today, in progress
  const todayIso = days.at(-1).date;

  it('counts weeks that met "5 of 7" and shows progress this week', () => {
    const s = I.habitStats(steps, days, todayIso, 5);
    expect(s.thisWeek).toMatchObject({ met: 2, target: 5, done: false });
    expect(s.weekStreak).toBe(2);
    expect(s.recent).toEqual({ met: 13, scored: 17 });
  });

  it('does not let a week with missing data break the streak', () => {
    const gappy = days.map((d, i) => (i >= 7 && i < 14 ? day(d.date) : d));
    expect(I.habitStats(steps, gappy, todayIso, 5).weekStreak).toBe(1);
  });

  it('drops calories entirely when hidden', () => {
    expect(I.habits({ ...goals, showCalories: false }).some((h: { id: string }) => h.id === 'calories')).toBe(false);
  });
});

describe('compareBehaviours', () => {
  const build = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const hard = i % 2 === 0;
      return day(iso('2026-06-01', i), {
        garmin: { intensityMinutes: hard ? 80 : 10 },
        oura: { readinessScore: i > 0 && (i - 1) % 2 === 0 ? 70 + (i % 3) : 80 + (i % 3) },
      });
    });

  it('reports the difference, a 95% range and a confidence word', () => {
    const res = I.compareBehaviours(build(41), goals, 'readiness', '2026-12-01');
    const hard = res.find((r: { id: string }) => r.id === 'hard');
    expect(hard).toMatchObject({ nYes: 20, nNo: 20, enough: true, confidence: 'High' });
    expect(hard.diff).toBeCloseTo(-10, 0);
    expect(hard.lo).toBeLessThan(hard.diff);
    expect(hard.hi).toBeGreaterThan(hard.diff);
  });

  it('holds back a result until each side has 10 days, and says how many more', () => {
    const hard = I.compareBehaviours(build(13), goals, 'readiness', '2026-12-01').find((r: { id: string }) => r.id === 'hard');
    expect(hard.enough).toBe(false);
    expect(hard.diff).toBeUndefined();
    expect(hard.needYes + hard.needNo).toBeGreaterThan(0);
  });
});

describe('experiments', () => {
  it('compares the two weeks of a habit with the two weeks before', () => {
    const days = Array.from({ length: 40 }, (_, i) => {
      const during = i > 14 && i <= 28; // nights that end on the mornings after experiment days
      return day(iso('2026-08-01', i), {
        oura: { bedtimeMin: during ? -90 : 30, readinessScore: (i > 14 && i <= 28 ? 82 : 72) + (i % 3) },
      });
    });
    const r = I.evaluateExperiment({ id: 'x', behaviourId: 'bedtime', outcome: 'readiness', start: iso('2026-08-01', 14) }, days, goals, iso('2026-08-01', 39));
    expect(r.finished).toBe(true);
    expect(r.verdict).toBe('higher');
    expect(r.done).toBe(r.tracked);
  });
});

describe('focusItems', () => {
  it('leads with an easy-day suggestion that names a likely reason and reassures', () => {
    const past = Array.from({ length: 20 }, (_, i) =>
      day(iso('2026-09-01', i), { oura: { readinessScore: 78 + (i % 5), totalSleepMin: 450 + (i % 4) * 10, avgHrv: 50 + (i % 4), bedtimeMin: -70 }, garmin: { restingHr: 52 + (i % 2) } }),
    );
    const today = day('2026-09-21', { oura: { readinessScore: 60, totalSleepMin: 340, avgHrv: 38, bedtimeMin: 40 }, garmin: { restingHr: 60, steps: 2000 } });
    const items = I.focusItems([...past, today], goals, new Date(2026, 8, 21, 15, 0));
    expect(items[0]).toMatchObject({ level: 'warning', title: 'Take it easier today' });
    expect(items[0].detail).toMatch(/below your usual/);
    expect(items[0].detail).toMatch(/sleep was short/);
    expect(items[0].detail).toMatch(/one lower day is normal/);
  });
});
