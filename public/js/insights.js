// Pure calculations behind the dashboard's guidance: metric accessors, personal
// usual ranges, weekly goals, "what goes with better recovery", experiments,
// the weekly review and today's focus. No DOM here, so it is unit-tested directly.
//
// Design rules from the UX research (reports/Health dashboard UX and Oura design.md):
// compare people with their own usual range, forgive missed days, show how sure
// an insight is, and phrase everything as observations rather than verdicts.

export const DEFAULT_GOALS = {
  sleepMin: 450,
  bedtimeMin: -60,
  steps: 10000,
  protein: 150,
  fiber: 30,
  calories: 2200,
  calorieTolerancePct: 10,
  intensityWeekly: 150,
  daysPerWeek: 5,
  showCalories: true,
};

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pick = (...vals) => vals.find(num);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

/** Metric accessors, preferring the device that measures each best. */
export const M = {
  sleepScore: (d) => pick(d.oura?.sleepScore, d.garmin?.sleepScore),
  readiness: (d) => d.oura?.readinessScore,
  steps: (d) => pick(d.garmin?.steps, d.oura?.steps),
  eaten: (d) => d.mfp?.calories,
  calorieGoal: (d, goals) => pick(d.mfp?.goalCalories, goals?.calories),
  burned: (d) => d.garmin?.totalCalories,
  restingHr: (d) => pick(d.garmin?.restingHr, d.oura?.lowestHr),
  hrv: (d) => d.oura?.avgHrv,
  bodyBattery: (d) => d.garmin?.bodyBatteryHigh,
  intensity: (d) => d.garmin?.intensityMinutes,
  protein: (d) => d.mfp?.protein,
  fiber: (d) => d.mfp?.fiber,
  carbs: (d) => d.mfp?.carbs,
  fat: (d) => d.mfp?.fat,
  deep: (d) => d.oura?.deepSleepMin,
  rem: (d) => d.oura?.remSleepMin,
  light: (d) => (num(d.oura?.totalSleepMin) ? d.oura.totalSleepMin - (d.oura.deepSleepMin ?? 0) - (d.oura.remSleepMin ?? 0) : undefined),
  sleepMin: (d) => pick(d.oura?.totalSleepMin, d.garmin?.sleepMin),
  bedtime: (d) => pick(d.oura?.bedtimeMin, d.garmin?.bedtimeMin),
  wake: (d) => pick(d.oura?.wakeMin, d.garmin?.wakeMin),
};

/** Trailing average over `window` days, needing at least `minCount` real values. */
export function rolling(values, window = 7, minCount = 4) {
  return values.map((_, i) => {
    const xs = values.slice(Math.max(0, i - window + 1), i + 1).filter(num);
    return xs.length >= minCount ? mean(xs) : undefined;
  });
}

export function percentile(sorted, p) {
  if (!sorted.length) return undefined;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// ── Personal usual range ─────────────────────────────────
export const USUAL = { window: 30, minDays: 10, lo: 0.1, hi: 0.9 };

/**
 * Your usual range for a metric: the middle 80% of the 30 days before `idx`.
 * Undefined until there are at least 10 days to learn from.
 */
export function usualRange(values, idx, window = USUAL.window) {
  const xs = values.slice(Math.max(0, idx - window), idx).filter(num).sort((a, b) => a - b);
  if (xs.length < USUAL.minDays) return undefined;
  return { lo: percentile(xs, USUAL.lo), median: percentile(xs, 0.5), hi: percentile(xs, USUAL.hi), n: xs.length };
}

/** Usual range for every day, for drawing a band behind a trend chart. */
export function usualBand(values) {
  const lo = [];
  const hi = [];
  values.forEach((_, i) => {
    const r = usualRange(values, i);
    lo.push(r?.lo);
    hi.push(r?.hi);
  });
  return { lo, hi };
}

/**
 * Where a value sits against your usual range, in the one vocabulary used for
 * every source. `tone` says whether that direction is good news for this metric.
 */
export function usualLabel(v, range, upGood) {
  if (!num(v) || !range) return { state: 'unknown', text: 'Learning your usual', tone: 'neutral' };
  if (v > range.hi) return { state: 'higher', text: 'Higher than usual', tone: upGood === null ? 'neutral' : upGood ? 'good' : 'attention' };
  if (v < range.lo) return { state: 'lower', text: 'Lower than usual', tone: upGood === null ? 'neutral' : upGood ? 'attention' : 'good' };
  return { state: 'within', text: 'Within your usual', tone: 'neutral' };
}

/** Shared band words for 0–100 scores (Oura's thresholds). */
export function scoreBand(v) {
  if (!num(v)) return undefined;
  return v >= 85 ? 'Optimal' : v >= 70 ? 'Good' : 'Pay attention';
}

/** Recovery signals and which direction is good for each. */
export const RECOVERY = [
  { id: 'readiness', label: 'Readiness', get: M.readiness, upGood: true },
  { id: 'hrv', label: 'HRV', get: M.hrv, upGood: true },
  { id: 'restingHr', label: 'Resting HR', get: M.restingHr, upGood: false },
  { id: 'sleepScore', label: 'Sleep score', get: M.sleepScore, upGood: true },
];

/** Recovery signals outside your usual range in the unhelpful direction for the latest day. */
export function strainedSignals(days) {
  const i = days.length - 1;
  return RECOVERY.filter((s) => {
    const values = days.map(s.get);
    return usualLabel(values[i], usualRange(values, i), s.upGood).tone === 'attention';
  });
}

// ── Daily habits and weekly goals ────────────────────────
const ratioBin = (r) => (r >= 1 ? 3 : r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0);

/**
 * Daily habits scored 0–3 (3 = goal met). Intraday habits aren't scored for
 * today because the day isn't over. Calories drop out when hidden.
 */
export function habits(goals) {
  const tol = goals.calorieTolerancePct / 100;
  const list = [
    {
      id: 'sleep',
      label: 'Sleep',
      target: `${fmtHoursShort(goals.sleepMin)}+`,
      value: M.sleepMin,
      bin: (d) => (num(M.sleepMin(d)) ? ratioBin(M.sleepMin(d) / goals.sleepMin) : undefined),
    },
    {
      id: 'bedtime',
      label: 'Bedtime',
      target: `by ${fmtClock(goals.bedtimeMin)}`,
      value: M.bedtime,
      bin: (d) => {
        const b = M.bedtime(d);
        if (!num(b)) return undefined;
        const late = b - goals.bedtimeMin;
        return late <= 0 ? 3 : late <= 20 ? 2 : late <= 45 ? 1 : 0;
      },
    },
    {
      id: 'steps',
      label: 'Steps',
      target: `${compact(goals.steps)}+`,
      intraday: true,
      value: M.steps,
      bin: (d) => (num(M.steps(d)) ? ratioBin(M.steps(d) / goals.steps) : undefined),
    },
    {
      id: 'protein',
      label: 'Protein',
      target: `${goals.protein} g+`,
      intraday: true,
      value: M.protein,
      bin: (d) => (num(M.protein(d)) && M.protein(d) > 0 ? ratioBin(M.protein(d) / goals.protein) : undefined),
    },
    {
      id: 'fiber',
      label: 'Fibre',
      target: `${goals.fiber} g+`,
      intraday: true,
      value: M.fiber,
      bin: (d) => (num(M.fiber(d)) && M.fiber(d) > 0 ? ratioBin(M.fiber(d) / goals.fiber) : undefined),
    },
  ];
  if (goals.showCalories) {
    list.push({
      id: 'calories',
      label: 'Calories in range',
      target: `±${goals.calorieTolerancePct}% of goal`,
      intraday: true,
      value: M.eaten,
      bin: (d) => {
        const v = M.eaten(d);
        const g = M.calorieGoal(d, goals);
        if (!num(v) || !num(g) || v === 0) return undefined;
        const off = Math.abs(v - g) / g;
        return off <= tol ? 3 : off <= tol * 2 ? 2 : off <= tol * 3 ? 1 : 0;
      },
    });
  }
  return list;
}

/** Monday of the week containing an ISO date. */
export function weekStart(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Score a habit as a weekly goal ("5 of 7 days"), so missed days are spare days,
 * not failures. Weeks without enough data neither count nor break the streak.
 * Returns { bins, thisWeek, weekStreak, recent }.
 */
export function habitStats(habit, days, todayIso, daysPerWeek) {
  const bins = days.map((d) => (habit.intraday && d.date === todayIso ? undefined : habit.bin(d)));
  const weeks = new Map();
  days.forEach((d, i) => {
    const k = weekStart(d.date);
    const w = weeks.get(k) ?? { start: k, met: 0, scored: 0, days: 0 };
    w.days++;
    if (num(bins[i])) {
      w.scored++;
      if (bins[i] === 3) w.met++;
    }
    weeks.set(k, w);
  });
  const ordered = [...weeks.values()];
  const current = weeks.get(weekStart(todayIso)) ?? { start: weekStart(todayIso), met: 0, scored: 0, days: 0 };
  const daysLeft = 7 - ((new Date(`${todayIso}T12:00:00`).getDay() + 6) % 7) - (habit.intraday ? 0 : 1);

  let weekStreak = 0;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const w = ordered[i];
    if (w.met >= daysPerWeek) weekStreak++;
    else if (w.start === current.start) continue; // this week is still open
    else if (w.scored < daysPerWeek) continue; // not enough data: neither counts nor breaks
    else break;
  }
  const scoredDays = bins.filter(num);
  return {
    bins,
    thisWeek: { met: current.met, target: daysPerWeek, done: current.met >= daysPerWeek, daysLeft: Math.max(0, daysLeft) },
    weekStreak,
    recent: { met: scoredDays.filter((b) => b === 3).length, scored: scoredDays.length },
  };
}

// ── What goes with better recovery ───────────────────────
/** Behaviours compared against the next morning's recovery. `test(day, nextDay)` → boolean | undefined. */
export function behaviours(goals) {
  const list = [
    {
      id: 'bedtime',
      label: `In bed by ${fmtClock(goals.bedtimeMin)}`,
      after: 'nights in bed on time',
      tryable: true,
      test: (_d, next) => (num(M.bedtime(next)) ? M.bedtime(next) <= goals.bedtimeMin : undefined),
    },
    {
      id: 'sleep',
      label: `Slept ${fmtHoursShort(goals.sleepMin)}+`,
      after: `nights of ${fmtHoursShort(goals.sleepMin)}+ sleep`,
      tryable: true,
      skipFor: ['sleepScore'],
      test: (_d, next) => (num(M.sleepMin(next)) ? M.sleepMin(next) >= goals.sleepMin : undefined),
    },
    {
      id: 'steps',
      label: `${compact(goals.steps)}+ steps`,
      after: `days with ${compact(goals.steps)}+ steps`,
      tryable: true,
      test: (d) => (num(M.steps(d)) ? M.steps(d) >= goals.steps : undefined),
    },
    {
      id: 'hard',
      label: 'Hard training (60+ intensity min)',
      after: 'hard training days',
      test: (d) => (num(M.intensity(d)) ? M.intensity(d) >= 60 : undefined),
    },
    {
      id: 'protein',
      label: `${goals.protein} g+ protein`,
      after: 'days you hit your protein goal',
      tryable: true,
      test: (d) => (num(M.protein(d)) && M.protein(d) > 0 ? M.protein(d) >= goals.protein : undefined),
    },
  ];
  if (goals.showCalories) {
    list.push({
      id: 'overate',
      label: 'Ate 15%+ over calorie goal',
      after: 'days 15%+ over your calorie goal',
      test: (d) => {
        const v = M.eaten(d);
        const g = M.calorieGoal(d, goals);
        return num(v) && num(g) && v > 0 ? v > g * 1.15 : undefined;
      },
    });
  }
  return list;
}

export const OUTCOMES = {
  readiness: { label: 'Readiness', unit: 'pts', get: M.readiness },
  sleepScore: { label: 'Sleep score', unit: 'pts', get: M.sleepScore },
  hrv: { label: 'HRV', unit: 'ms', get: M.hrv },
};

/** Days needed on each side before a comparison is shown. */
export const MIN_GROUP = 10;

const variance = (xs) => {
  const m = mean(xs);
  return xs.length > 1 ? xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) : 0;
};

/** Difference in means with a 95% interval and a plain confidence word. */
export function compareGroups(yes, no) {
  const diff = mean(yes) - mean(no);
  const se = Math.sqrt(variance(yes) / yes.length + variance(no) / no.length);
  const t = se > 0 ? Math.abs(diff) / se : 0;
  return { diff, lo: diff - 1.96 * se, hi: diff + 1.96 * se, confidence: t >= 3 ? 'High' : t >= 2 ? 'Medium' : 'Low' };
}

/** Other things that differ between the "with" and "without" days, named so nobody reads a pattern as a cause. */
const CONTEXT = [
  { id: 'weekend', text: 'weekends', test: (d) => [0, 6].includes(new Date(`${d.date}T12:00:00`).getDay()) },
  { id: 'hard', text: 'hard training days', test: (d) => (num(M.intensity(d)) ? M.intensity(d) >= 60 : undefined) },
  { id: 'bedtime', text: 'late nights', test: (d, next, goals) => (num(M.bedtime(next)) ? M.bedtime(next) > goals.bedtimeMin : undefined) },
];

/**
 * For each behaviour, average next-morning outcome on days with vs without it.
 * Associations only: every view that shows these says so.
 */
export function compareBehaviours(days, goals, outcomeKey, todayIso) {
  const outcome = OUTCOMES[outcomeKey];
  return behaviours(goals)
    .filter((b) => !b.skipFor?.includes(outcomeKey))
    .map((b) => {
      const yes = [];
      const no = [];
      const ctx = Object.fromEntries(CONTEXT.map((c) => [c.id, { yes: [0, 0], no: [0, 0] }]));
      for (let i = 0; i + 1 < days.length; i++) {
        const d = days[i];
        const next = days[i + 1];
        if (d.date === todayIso) continue;
        const y = outcome.get(next);
        const t = b.test(d, next);
        if (!num(y) || t === undefined) continue;
        (t ? yes : no).push(y);
        for (const c of CONTEXT) {
          const v = c.test(d, next, goals);
          if (v === undefined) continue;
          const slot = ctx[c.id][t ? 'yes' : 'no'];
          slot[0] += v ? 1 : 0;
          slot[1]++;
        }
      }
      const enough = yes.length >= MIN_GROUP && no.length >= MIN_GROUP;
      const stats = enough ? compareGroups(yes, no) : undefined;
      const confounders = CONTEXT.filter((c) => c.id !== b.id)
        .map((c) => {
          const s = ctx[c.id];
          const a = s.yes[1] ? s.yes[0] / s.yes[1] : undefined;
          const z = s.no[1] ? s.no[0] / s.no[1] : undefined;
          return num(a) && num(z) && Math.abs(a - z) >= 0.2 ? { text: c.text, yes: a, no: z } : undefined;
        })
        .filter(Boolean);
      return {
        id: b.id,
        label: b.label,
        after: b.after,
        tryable: Boolean(b.tryable),
        nYes: yes.length,
        nNo: no.length,
        needYes: Math.max(0, MIN_GROUP - yes.length),
        needNo: Math.max(0, MIN_GROUP - no.length),
        meanYes: mean(yes),
        meanNo: mean(no),
        enough,
        confounders,
        ...stats,
      };
    })
    .sort((a, b) => b.enough - a.enough || (b.diff !== undefined && a.diff !== undefined ? Math.abs(b.diff) - Math.abs(a.diff) : 0));
}

// ── Two-week experiments ─────────────────────────────────
export const EXPERIMENT_DAYS = 14;

/**
 * Compare next-morning outcome during an experiment with the 14 days before it.
 * "Inconclusive" is a real answer: it means the change was within normal noise.
 */
export function evaluateExperiment(exp, days, goals, todayIso) {
  const b = behaviours(goals).find((x) => x.id === exp.behaviourId);
  const outcome = OUTCOMES[exp.outcome] ?? OUTCOMES.readiness;
  const end = shiftIso(exp.start, EXPERIMENT_DAYS - 1);
  const elapsed = Math.min(EXPERIMENT_DAYS, Math.max(0, daysBetween(exp.start, todayIso) + 1));
  const idx = new Map(days.map((d, i) => [d.date, i]));
  let done = 0;
  let tracked = 0;
  const during = [];
  const before = [];
  for (let k = -EXPERIMENT_DAYS; k < EXPERIMENT_DAYS; k++) {
    const date = shiftIso(exp.start, k);
    const i = idx.get(date);
    if (i === undefined || i + 1 >= days.length || date >= todayIso) continue;
    const y = outcome.get(days[i + 1]);
    if (k >= 0) {
      const t = b?.test(days[i], days[i + 1]);
      if (t !== undefined) {
        tracked++;
        if (t) done++;
      }
      if (num(y)) during.push(y);
    } else if (num(y)) before.push(y);
  }
  const finished = todayIso > end;
  const result = during.length >= 5 && before.length >= 5 ? compareGroups(during, before) : undefined;
  let verdict = 'running';
  if (finished) verdict = !result ? 'not-enough-data' : result.lo > 0 ? 'higher' : result.hi < 0 ? 'lower' : 'inconclusive';
  return { behaviour: b, outcome, elapsed, end, done, tracked, finished, verdict, result, nDuring: during.length, nBefore: before.length };
}

// ── Weekly review ────────────────────────────────────────
/** Last 7 complete days against your 4-week average before them, leading with wins. */
export function weeklyReview(days, goals, todayIso) {
  const done = days.filter((d) => d.date < todayIso);
  const cur = done.slice(-7);
  const base = done.slice(-35, -7);
  const avg = (set, get) => mean(set.map(get).filter(num));
  const rows = [
    { label: 'Sleep', get: M.sleepMin, fmt: fmtHoursShort, upGood: true, minDiff: 5, unit: ' min', asMinutes: true },
    { label: 'Bedtime', get: M.bedtime, fmt: fmtClock, upGood: false, minDiff: 5, asMinutes: true },
    { label: 'Sleep score', get: M.sleepScore, fmt: fmtInt, upGood: true, minDiff: 1 },
    { label: 'Readiness', get: M.readiness, fmt: fmtInt, upGood: true, minDiff: 1 },
    { label: 'HRV', get: M.hrv, fmt: (v) => `${fmtInt(v)} ms`, upGood: true, minDiff: 1, unit: ' ms' },
    { label: 'Resting HR', get: M.restingHr, fmt: (v) => `${fmtInt(v)} bpm`, upGood: false, minDiff: 1, unit: ' bpm' },
    { label: 'Steps', get: M.steps, fmt: fmtInt, upGood: true, minDiff: 250 },
    { label: 'Protein', get: M.protein, fmt: (v) => `${fmtInt(v)} g`, upGood: true, minDiff: 3, unit: ' g' },
    { label: 'Fibre', get: M.fiber, fmt: (v) => `${fmtInt(v)} g`, upGood: true, minDiff: 2, unit: ' g' },
    ...(goals.showCalories ? [{ label: 'Calories eaten', get: M.eaten, fmt: fmtInt, upGood: null, minDiff: 50 }] : []),
  ].map((r) => {
    const c = avg(cur, r.get);
    const p = avg(base, r.get);
    const diff = num(c) && num(p) ? c - p : undefined;
    const meaningful = num(diff) && Math.abs(diff) >= r.minDiff;
    return { ...r, cur: c, prev: p, diff, meaningful, better: meaningful && r.upGood !== null ? diff > 0 === r.upGood : undefined };
  });

  const H = habits(goals);
  const hit = (set, h) => set.map((d) => h.bin(d)).filter((b) => b === 3).length;
  const goalsHit = H.map((h) => ({ id: h.id, label: h.label, cur: hit(cur, h), prevAvg: base.length ? (hit(base, h) / base.length) * 7 : undefined }));
  const wins = [
    ...goalsHit.filter((g) => g.cur >= goals.daysPerWeek).map((g) => `${g.label}: on target ${g.cur} of 7 days`),
    ...rows.filter((r) => r.better).map((r) => `${r.label} ${r.label === 'Bedtime' ? (r.diff < 0 ? 'earlier' : 'later') : r.diff > 0 ? 'up' : 'down'} ${r.asMinutes ? `${Math.round(Math.abs(r.diff))} min` : `${fmtInt(Math.abs(r.diff))}${r.unit ?? ''}`} on your 4-week average`),
  ];

  // Goal review: nudge goals that are too easy or too hard to keep you in the useful middle.
  const prompts = [];
  for (const g of goalsHit) {
    if (g.cur === 7 && num(g.prevAvg) && g.prevAvg >= 6) prompts.push({ id: g.id, text: `You've hit ${g.label.toLowerCase()} nearly every day for a month. Ready for a slightly harder target?` });
    else if (g.cur <= 1 && num(g.prevAvg) && g.prevAvg <= 1.5) prompts.push({ id: g.id, text: `${g.label} has been out of reach lately. A smaller target you can hit most days builds the habit faster.` });
  }
  return { rows, goalsHit, wins, prompts, curRange: [cur[0]?.date, cur.at(-1)?.date], baseDays: base.length };
}

/** Share of today's waking window (07:00–21:00) that has passed. */
export function dayProgress(now) {
  const min = now.getHours() * 60 + now.getMinutes();
  return Math.min(1, Math.max(0, (min - 7 * 60) / (14 * 60)));
}

/** Days since the last day with any data from any source (0 = today has data). */
export function daysSinceData(days) {
  const i = findLast(days, (d) => d.oura || d.garmin || d.mfp);
  return i < 0 ? Infinity : days.length - 1 - i;
}

/**
 * Today's suggestions, most important first: [{ level, title, detail }].
 * The first is the day's one main focus. Low-day copy follows four steps:
 * the fact against your usual, a likely reason from your data, one small action,
 * and reassurance from the bigger picture.
 */
export function focusItems(days, goals, now = new Date()) {
  const items = [];
  const today = days.at(-1);
  if (!today) return items;
  const i = days.length - 1;
  const p = dayProgress(now);
  const prev = days[i - 1];

  // Recovery: only raise the alarm when two or more signals agree.
  const strained = strainedSignals(days);
  const readyVals = days.map(M.readiness);
  const ready = readyVals[i];
  const readyRange = usualRange(readyVals, i);
  const week = mean(readyVals.slice(-7).filter(num));
  if (num(ready) && readyRange && (ready < readyRange.lo || strained.length >= 2)) {
    const reasons = [];
    const sleepRange = usualRange(days.map(M.sleepMin), i);
    if (num(M.sleepMin(today)) && sleepRange && M.sleepMin(today) < sleepRange.lo) reasons.push(`last night's sleep was short (${fmtHoursShort(M.sleepMin(today))})`);
    if (num(M.bedtime(today)) && M.bedtime(today) > goals.bedtimeMin + 30) reasons.push(`you went to bed at ${fmtClock(M.bedtime(today))}`);
    if (prev && num(M.intensity(prev)) && M.intensity(prev) >= 60) reasons.push(`yesterday was a hard training day (${fmtInt(M.intensity(prev))} intensity min)`);
    if (prev && goals.showCalories && num(M.eaten(prev)) && num(M.calorieGoal(prev, goals)) && M.eaten(prev) > M.calorieGoal(prev, goals) * 1.15) reasons.push('yesterday was a bigger eating day');
    const signals = strained.length >= 2 ? ` ${strained.map((s) => s.label).join(' and ')} are both outside your usual range.` : '';
    items.push({
      level: strained.length >= 2 ? 'warning' : 'info',
      title: 'Take it easier today',
      detail:
        `Readiness is ${fmtInt(ready)}, below your usual ${fmtInt(readyRange.lo)}–${fmtInt(readyRange.hi)}.${signals} ` +
        (reasons.length ? `This often follows days like yesterday: ${reasons.join(', ')}. ` : '') +
        `Keep training light and aim for bed by ${fmtClock(goals.bedtimeMin)}. ` +
        (num(week) ? `Your 7-day average is ${fmtInt(week)}, so one lower day is normal.` : ''),
    });
  } else if (num(ready) && readyRange && ready > readyRange.hi) {
    items.push({ level: 'good', title: 'Good day for a hard session', detail: `Readiness is ${fmtInt(ready)}, above your usual ${fmtInt(readyRange.lo)}–${fmtInt(readyRange.hi)}.` });
  }

  const steps = M.steps(today);
  if (num(steps) && steps < goals.steps && p > 0.15) {
    const gap = Math.round(goals.steps * p - steps);
    if (gap > 800) {
      items.push({
        level: 'info',
        title: `A ${Math.max(5, Math.round(gap / 110 / 5) * 5)}-minute walk keeps steps on pace`,
        detail: `You're at ${fmtInt(steps)}; on pace for ${compact(goals.steps)} would be about ${fmtInt(goals.steps * p)} by now.`,
      });
    }
  }

  const protein = M.protein(today);
  if (num(protein) && p > 0.3) {
    const left = goals.protein - protein;
    if (left > 15) {
      const calLeft = goals.showCalories && num(M.eaten(today)) && num(M.calorieGoal(today, goals)) ? M.calorieGoal(today, goals) - M.eaten(today) : undefined;
      items.push({
        level: 'info',
        title: `${fmtInt(left)} g protein to go`,
        detail:
          num(calLeft) && calLeft > 0 && (left * 4) / calLeft > 0.45
            ? `That's a big share of the ${fmtInt(calLeft)} kcal you have left, so lean sources help: chicken, fish, Greek yoghurt, a shake.`
            : 'One protein-forward meal or snack covers most of it.',
      });
    }
  }

  const beds = days.slice(-7).map(M.bedtime).filter(num);
  if (beds.length >= 4) {
    const late = Math.round(mean(beds) - goals.bedtimeMin);
    if (late > 20) {
      items.push({
        level: 'info',
        title: `Start winding down by ${fmtClock(goals.bedtimeMin - 30)}`,
        detail: `You've averaged ${fmtClock(mean(beds))} in bed this week, ${late} min after your ${fmtClock(goals.bedtimeMin)} target.`,
      });
    }
  }

  const rank = { critical: 0, warning: 1, info: 2, good: 3 };
  return items.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 4);
}

// ── Date helpers ─────────────────────────────────────────
function shiftIso(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);
}
function findLast(arr, fn) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}

// ── Formatting shared with the views ───────────────────
const nf = new Intl.NumberFormat('en-US');
export const fmtInt = (v) => (num(v) ? nf.format(Math.round(v)) : '–');
export function compact(v) {
  if (!num(v)) return '–';
  if (Math.abs(v) >= 10000) return `${nf.format(Math.round(v / 1000))}K`;
  if (Math.abs(v) >= 1000 && v % 1000 === 0) return `${v / 1000}K`;
  return nf.format(Math.round(v));
}
export function fmtHoursShort(min) {
  if (!num(min)) return '–';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}
/** Minutes from midnight (may be negative) → "23:15". */
export function fmtClock(min) {
  if (!num(min)) return '–';
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
