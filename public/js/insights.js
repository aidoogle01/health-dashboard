// Pure calculations behind the dashboard's guidance: metric accessors, goal
// checks, streaks, rolling averages, "what goes with better recovery", the
// weekly review and today's focus. No DOM here, so it is unit-tested directly.

export const DEFAULT_GOALS = {
  sleepMin: 450,
  bedtimeMin: -60,
  steps: 10000,
  protein: 150,
  calories: 2200,
  calorieTolerancePct: 10,
  intensityWeekly: 150,
};

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pick = (...vals) => vals.find(num);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

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

const ratioBin = (r) => (r >= 1 ? 3 : r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0);

/**
 * Daily habits scored 0–3 (3 = goal met). Intraday habits are not scored for
 * today because the day isn't over.
 */
export function habits(goals) {
  const tol = goals.calorieTolerancePct / 100;
  return [
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
      bin: (d) => (num(M.protein(d)) ? ratioBin(M.protein(d) / goals.protein) : undefined),
    },
    {
      id: 'calories',
      label: 'Calories',
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
    },
  ];
}

/** Score every habit across days. Returns { bins[], rate, evaluated, met, streak, best }. */
export function habitStats(habit, days, todayIso) {
  const bins = days.map((d) => (habit.intraday && d.date === todayIso ? undefined : habit.bin(d)));
  const scored = bins.filter(num);
  const met = scored.filter((b) => b === 3).length;
  let streak = 0;
  let run = 0;
  let best = 0;
  let currentOpen = true;
  for (let i = bins.length - 1; i >= 0; i--) {
    const b = bins[i];
    if (!num(b)) continue; // missing data neither breaks nor extends a streak
    if (b === 3) {
      run++;
      if (currentOpen) streak = run;
    } else {
      currentOpen = false;
      run = 0;
    }
    best = Math.max(best, run);
  }
  return { bins, evaluated: scored.length, met, rate: scored.length ? met / scored.length : undefined, streak, best };
}

/** Behaviours compared against the next morning's recovery. `test(day, nextDay)` → boolean | undefined. */
export function behaviours(goals) {
  return [
    {
      id: 'bedtime',
      label: `In bed by ${fmtClock(goals.bedtimeMin)}`,
      test: (_d, next) => (num(M.bedtime(next)) ? M.bedtime(next) <= goals.bedtimeMin : undefined),
    },
    {
      id: 'sleep',
      label: `Slept ${fmtHoursShort(goals.sleepMin)}+`,
      skipFor: ['sleepScore'],
      test: (_d, next) => (num(M.sleepMin(next)) ? M.sleepMin(next) >= goals.sleepMin : undefined),
    },
    {
      id: 'steps',
      label: `${compact(goals.steps)}+ steps the day before`,
      test: (d) => (num(M.steps(d)) ? M.steps(d) >= goals.steps : undefined),
    },
    {
      id: 'hard',
      label: 'Hard training day before (60+ intensity min)',
      test: (d) => (num(M.intensity(d)) ? M.intensity(d) >= 60 : undefined),
    },
    {
      id: 'protein',
      label: `Hit protein goal the day before`,
      test: (d) => (num(M.protein(d)) && M.protein(d) > 0 ? M.protein(d) >= goals.protein : undefined),
    },
    {
      id: 'overate',
      label: 'Ate 15%+ over calorie goal the day before',
      test: (d) => {
        const v = M.eaten(d);
        const g = M.calorieGoal(d, goals);
        return num(v) && num(g) && v > 0 ? v > g * 1.15 : undefined;
      },
    },
  ];
}

export const OUTCOMES = {
  readiness: { label: 'Readiness', unit: 'pts', get: M.readiness },
  sleepScore: { label: 'Sleep score', unit: 'pts', get: M.sleepScore },
  hrv: { label: 'HRV', unit: 'ms', get: M.hrv },
};

export const MIN_GROUP = 5;

/**
 * For each behaviour, average next-morning outcome on days with vs without it.
 * Associations only: the dashboard says so wherever these are shown.
 */
export function compareBehaviours(days, goals, outcomeKey, todayIso) {
  const outcome = OUTCOMES[outcomeKey];
  return behaviours(goals)
    .filter((b) => !b.skipFor?.includes(outcomeKey))
    .map((b) => {
      const yes = [];
      const no = [];
      for (let i = 0; i + 1 < days.length; i++) {
        const d = days[i];
        const next = days[i + 1];
        if (d.date === todayIso) continue;
        const y = outcome.get(next);
        const t = b.test(d, next);
        if (!num(y) || t === undefined) continue;
        (t ? yes : no).push(y);
      }
      const meanYes = mean(yes);
      const meanNo = mean(no);
      const enough = yes.length >= MIN_GROUP && no.length >= MIN_GROUP;
      return { id: b.id, label: b.label, nYes: yes.length, nNo: no.length, meanYes, meanNo, diff: enough ? meanYes - meanNo : undefined, enough };
    })
    .sort((a, b) => (b.enough - a.enough) || Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
}

/** Last 7 complete days against the 7 before. */
export function weeklyReview(days, goals, todayIso) {
  const done = days.filter((d) => d.date < todayIso);
  const cur = done.slice(-7);
  const prev = done.slice(-14, -7);
  const avg = (set, get) => mean(set.map(get).filter(num));
  const hits = (set, h) => set.map((d) => h.bin(d)).filter((b) => b === 3).length;
  const H = Object.fromEntries(habits(goals).map((h) => [h.id, h]));
  const rows = [
    { label: 'Sleep', get: M.sleepMin, fmt: fmtHoursShort, upGood: true },
    { label: 'Bedtime', get: M.bedtime, fmt: fmtClock, upGood: false, unitless: true },
    { label: 'Sleep score', get: M.sleepScore, fmt: fmtInt, upGood: true },
    { label: 'Readiness', get: M.readiness, fmt: fmtInt, upGood: true },
    { label: 'HRV', get: M.hrv, fmt: (v) => `${fmtInt(v)} ms`, upGood: true },
    { label: 'Resting HR', get: M.restingHr, fmt: (v) => `${fmtInt(v)} bpm`, upGood: false },
    { label: 'Steps', get: M.steps, fmt: fmtInt, upGood: true },
    { label: 'Protein', get: M.protein, fmt: (v) => `${fmtInt(v)} g`, upGood: true },
    { label: 'Calories eaten', get: M.eaten, fmt: fmtInt, upGood: null },
  ].map((r) => {
    const c = avg(cur, r.get);
    const p = avg(prev, r.get);
    return { ...r, cur: c, prev: p, diff: num(c) && num(p) ? c - p : undefined };
  });
  const goalsHit = ['sleep', 'bedtime', 'steps', 'protein', 'calories'].map((id) => ({
    label: H[id].label,
    cur: hits(cur, H[id]),
    prev: hits(prev, H[id]),
  }));
  return { rows, goalsHit, curRange: [cur[0]?.date, cur.at(-1)?.date], days: cur.length };
}

/** Running total of (eaten − burned) across days with both numbers. */
export function cumulativeBalance(days, todayIso) {
  let total = 0;
  let counted = 0;
  const series = days.map((d) => {
    const e = M.eaten(d);
    const b = M.burned(d);
    if (d.date === todayIso || !num(e) || !num(b) || e === 0) return counted ? total : undefined;
    total += e - b;
    counted++;
    return total;
  });
  return { series, total, counted };
}

/** Share of today's waking window (07:00–21:00) that has passed. */
export function dayProgress(now) {
  const min = now.getHours() * 60 + now.getMinutes();
  return Math.min(1, Math.max(0, (min - 7 * 60) / (14 * 60)));
}

/**
 * Up to four concrete suggestions for today, most important first.
 * level: 'good' | 'warning' | 'critical' | 'info'.
 */
export function focusItems(days, goals, now = new Date()) {
  const items = [];
  const today = days.at(-1);
  if (!today) return items;
  const past = days.slice(0, -1);
  const p = dayProgress(now);

  const ready = M.readiness(today);
  const base = mean(past.slice(-30).map(M.readiness).filter(num));
  if (num(ready) && num(base)) {
    if (ready < 70 || ready < base - 8) {
      items.push({
        level: ready < 60 ? 'critical' : 'warning',
        title: 'Make today an easy day',
        detail: `Readiness is ${fmtInt(ready)}, against your 30-day average of ${fmtInt(base)}. Keep training light and aim for bed by ${fmtClock(goals.bedtimeMin)}.`,
      });
    } else if (ready >= 85 || ready > base + 6) {
      items.push({
        level: 'good',
        title: 'Good day for a hard session',
        detail: `Readiness is ${fmtInt(ready)}, above your 30-day average of ${fmtInt(base)}.`,
      });
    }
  }

  const steps = M.steps(today);
  if (num(steps)) {
    if (steps >= goals.steps) {
      items.push({ level: 'good', title: 'Step goal done', detail: `${fmtInt(steps)} steps so far today.` });
    } else if (p > 0.15) {
      const gap = Math.round(goals.steps * p - steps);
      if (gap > 800) {
        items.push({
          level: 'warning',
          title: `${fmtInt(gap)} steps behind pace`,
          detail: `You'd usually be at ${fmtInt(goals.steps * p)} by now. A ${Math.max(5, Math.round(gap / 110 / 5) * 5)}-minute walk closes the gap.`,
        });
      }
    }
  }

  const protein = M.protein(today);
  const eaten = M.eaten(today);
  const calGoal = M.calorieGoal(today, goals);
  if (num(protein) && num(eaten) && num(calGoal) && p > 0.3) {
    const proteinLeft = goals.protein - protein;
    const calLeft = calGoal - eaten;
    if (proteinLeft > 15 && calLeft > 0) {
      const share = Math.round(((proteinLeft * 4) / calLeft) * 100);
      items.push({
        level: share > 45 ? 'warning' : 'info',
        title: `${fmtInt(proteinLeft)} g protein to go`,
        detail:
          share > 45
            ? `That's ${share}% of the ${fmtInt(calLeft)} kcal you have left, so pick lean sources: chicken, fish, Greek yoghurt, a shake.`
            : `You have ${fmtInt(calLeft)} kcal left, plenty of room for it.`,
      });
    } else if (calLeft < -calGoal * (goals.calorieTolerancePct / 100)) {
      items.push({ level: 'warning', title: 'Over your calorie goal', detail: `${fmtInt(-calLeft)} kcal over ${fmtInt(calGoal)} so far today.` });
    }
  }

  const beds = days.slice(-7).map(M.bedtime).filter(num);
  if (beds.length >= 4) {
    const avgBed = mean(beds);
    const late = Math.round(avgBed - goals.bedtimeMin);
    if (late > 20) {
      items.push({
        level: 'warning',
        title: 'Bedtime is drifting later',
        detail: `You've averaged ${fmtClock(avgBed)} this week, ${late} min after your ${fmtClock(goals.bedtimeMin)} target. Start winding down by ${fmtClock(goals.bedtimeMin - 30)}.`,
      });
    }
  }

  const levelRank = { critical: 0, warning: 1, info: 2, good: 3 };
  return items.sort((a, b) => levelRank[a.level] - levelRank[b.level]).slice(0, 4);
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
