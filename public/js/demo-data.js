// Sample data shared by the server's demo mode and the static preview build.
// One simulated person drives every device, with realistic links built in
// (late nights and hard training lower next-day readiness), so the Insights
// view has something to find.

/** Deterministic 0..1 noise from a string seed, so history is stable across restarts. */
function noise(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
const around = (seed, mid, spread) => Math.round(mid + (noise(seed) - 0.5) * 2 * spread);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDate(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Fraction of today's waking hours (07:00–21:00) elapsed; 1 for past days. */
function progress(date, now) {
  if (date !== isoDate(now)) return 1;
  const min = now.getHours() * 60 + now.getMinutes();
  return Math.min(1, Math.max(0.03, (min - 7 * 60) / (14 * 60)));
}

// ── The simulated person (full-day values) ──────────────
const P = {
  /** Bedtime of the night ending on `d`, minutes from midnight (negative = before). */
  bedtime: (d) => around(`bed:${d}`, -35, 75),
  sleepMin: (d) => clamp(around(`slp:${d}`, 455, 45) - Math.max(0, P.bedtime(d) + 30) * 0.5, 300, 560),
  wake: (d) => P.bedtime(d) + P.sleepMin(d) + around(`awk:${d}`, 32, 14),
  intensity: (d) => Math.max(0, around(`im:${d}`, 40, 40)),
  steps: (d) => around(`steps:${d}`, 9600, 3400),
  protein: (d) => around(`p:${d}`, 140, 35),
  carbs: (d) => around(`c:${d}`, 215, 55),
  fat: (d) => around(`f:${d}`, 72, 20),
  eaten: (d) => P.protein(d) * 4 + P.carbs(d) * 4 + P.fat(d) * 9,
  readiness: (d) => {
    const prev = shiftDate(d, -1);
    const bed = P.bedtime(d);
    return clamp(
      around(`ready:${d}`, 76, 7) +
        (bed <= -60 ? 6 : bed > 0 ? -6 : 0) -
        (P.intensity(prev) >= 60 ? 7 : 0) +
        (P.steps(prev) >= 10000 ? 3 : 0) -
        (P.eaten(prev) > 2200 * 1.15 ? 4 : 0) +
        (P.sleepMin(d) - 450) / 12,
      35,
      99,
    );
  },
  sleepScore: (d) => clamp(around(`sleep:${d}`, 77, 6) + (P.sleepMin(d) - 450) / 6 + (P.bedtime(d) <= -60 ? 4 : 0), 35, 99),
  hrv: (d) => clamp(around(`hrv:${d}`, 50, 7) + (P.readiness(d) - 76) * 0.6, 18, 120),
  restingHr: (d) => clamp(around(`rhr:${d}`, 52, 2) - (P.readiness(d) - 76) * 0.12, 38, 80),
};

export function demoDay(source, date, now = new Date()) {
  const p = progress(date, now);
  const deep = clamp(P.sleepMin(date) * 0.18 + around(`deep:${date}`, 0, 12), 30, 150);
  const rem = clamp(P.sleepMin(date) * 0.22 + around(`rem:${date}`, 0, 15), 40, 160);
  switch (source) {
    case 'oura':
      return {
        sleepScore: P.sleepScore(date),
        readinessScore: P.readiness(date),
        activityScore: clamp(around(`act:${date}`, 80, 12), 30, 99),
        totalSleepMin: P.sleepMin(date),
        deepSleepMin: deep,
        remSleepMin: rem,
        sleepEfficiency: around(`eff:${date}`, 89, 5),
        lowestHr: P.restingHr(date) - 2,
        avgHrv: P.hrv(date),
        steps: Math.round(P.steps(date) * 0.96 * p),
        activeCalories: Math.round(around(`acal:${date}`, 520, 160) * p),
        bedtimeMin: P.bedtime(date),
        wakeMin: P.wake(date),
      };
    case 'garmin': {
      const active = Math.round((250 + P.steps(date) * 0.03 + P.intensity(date) * 4) * p);
      return {
        steps: Math.round(P.steps(date) * p),
        totalCalories: Math.round(1600 * Math.max(p, 0.3)) + active,
        activeCalories: active,
        restingHr: P.restingHr(date),
        avgStress: around(`stress:${date}`, 30, 10),
        bodyBatteryHigh: clamp(P.readiness(date) + around(`bbh:${date}`, 6, 6), 20, 100),
        bodyBatteryLow: around(`bbl:${date}`, 25, 12),
        intensityMinutes: Math.round(P.intensity(date) * p),
        distanceM: Math.round(P.steps(date) * 0.78 * p),
        sleepMin: P.sleepMin(date) + around(`gsl:${date}`, 0, 8),
        sleepScore: clamp(P.sleepScore(date) + around(`gss:${date}`, 0, 4), 30, 99),
        bedtimeMin: P.bedtime(date) + around(`gbed:${date}`, 0, 3),
        wakeMin: P.wake(date) + around(`gwk:${date}`, 0, 3),
      };
    }
    case 'mfp': {
      const protein = Math.round(P.protein(date) * p);
      const carbs = Math.round(P.carbs(date) * p);
      const fat = Math.round(P.fat(date) * p);
      return {
        calories: protein * 4 + carbs * 4 + fat * 9,
        protein,
        carbs,
        fat,
        fiber: Math.round(around(`fib:${date}`, 30, 8) * p),
        sugar: Math.round(around(`sug:${date}`, 45, 15) * p),
        sodium: Math.round(around(`na:${date}`, 2200, 500) * p),
        goalCalories: 2200,
      };
    }
    default:
      return {};
  }
}

const ACTIVITY_TYPES = [
  ['running', 'Morning Run'],
  ['cycling', 'Road Ride'],
  ['strength_training', 'Strength'],
  ['walking', 'Evening Walk'],
];

/** Garmin-style activities for days with real training load, newest first. */
export function demoActivities(start, end, now = new Date()) {
  const out = [];
  const today = isoDate(now);
  for (let date = end; date >= start; date = shiftDate(date, -1)) {
    if (date >= today || P.intensity(date) < 20) continue;
    const [type, name] = ACTIVITY_TYPES[Math.floor(noise(`type:${date}`) * ACTIVITY_TYPES.length)];
    const durationS = Math.round((P.intensity(date) + around(`dur:${date}`, 15, 10)) * 60);
    out.push({
      id: `demo-${date}`,
      source: 'garmin',
      name,
      type,
      start: `${date}T07:${String(around(`min:${date}`, 30, 25)).padStart(2, '0')}:00`,
      durationS,
      distanceM: type === 'strength_training' ? undefined : Math.round((durationS / 60) * (type === 'cycling' ? 450 : 160)),
      calories: Math.round(durationS / 6),
      avgHr: around(`hr:${date}`, 138, 15),
    });
  }
  return out;
}
