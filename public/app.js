// Health dashboard client. Renders /api/dashboard into four views and re-renders
// whenever the server pushes an `update` event (a sync finished) over /api/stream.
//
// The layout follows the UX research in reports/Health dashboard UX and Oura design.md:
// one main focus first, every number against your own usual range, forgiving
// weekly goals, and insights that show how sure they are.

import {
  DEFAULT_GOALS,
  EXPERIMENT_DAYS,
  M,
  OUTCOMES,
  compact,
  compareBehaviours,
  daysSinceData,
  dayProgress,
  evaluateExperiment,
  fmtClock,
  fmtHoursShort,
  fmtInt,
  focusItems,
  habitStats,
  habits,
  mean,
  rolling,
  scoreBand,
  usualBand,
  usualLabel,
  usualRange,
  weeklyReview,
} from './js/insights.js';
import {
  LEVEL_LABEL,
  bullet,
  ring,
  evidenceRows,
  findLastIndex,
  fmtDateLong,
  fmtDateShort,
  h,
  habitGrid,
  sleepSchedule,
  sparkline,
  statusIcon,
  statusLine,
  timeChart,
} from './js/charts.js';

const $ = (sel) => document.querySelector(sel);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const HISTORY_DAYS = 365;
const INSIGHT_DAYS = 90;
const TABS = ['today', 'habits', 'insights', 'trends'];

function storageGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
}

const initialTab = location.hash.slice(1);
const state = {
  range: Number(storageGet('dash.range') ?? 30),
  tab: TABS.includes(initialTab) ? initialTab : storageGet('dash.tab') ?? 'today',
  outcome: storageGet('dash.outcome') ?? 'readiness',
  data: null,
  tables: new Set(),
  lastFetch: 0,
  live: false,
};
if (!TABS.includes(state.tab)) state.tab = 'today';
if (!OUTCOMES[state.outcome]) state.outcome = 'readiness';
if (![7, 30, 90, 365].includes(state.range)) state.range = 30;

// ── Formatting ────────────────────────────────────────────
const fmtKm = (m) => (num(m) ? `${(m / 1000).toFixed(1)} km` : '–');
const fmtDur = (s) => {
  if (!num(s)) return '–';
  const hrs = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return hrs ? `${hrs}h ${String(m).padStart(2, '0')}m` : `${m} min`;
};
function fmtAgo(iso) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
const signed1 = (v) => {
  const d = Math.round(v * 10) / 10;
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}`;
};

/** Dense array over every date in range so missing days show as gaps, not compressed time. */
function denseDays(data) {
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const out = [];
  for (let d = new Date(`${data.range.start}T12:00:00`); ; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(byDate.get(iso) ?? { date: iso });
    if (iso >= data.range.end) break;
  }
  return out;
}

/** Draw into a holder once it is in the document and has a width. */
function deferDraw(holder, draw) {
  requestAnimationFrame(() => draw(holder));
  return holder;
}

function cardHead(title, note, tableId, extra) {
  const head = h('div', { class: 'card-head' }, h('div', {}, h('h2', { text: title }), note ? h('div', { class: 'muted small', text: note }) : null));
  if (extra) head.append(extra);
  if (tableId) {
    head.append(
      h('button', {
        class: 'link',
        type: 'button',
        text: state.tables.has(tableId) ? 'Show chart' : 'Show table',
        onclick: () => {
          state.tables.has(tableId) ? state.tables.delete(tableId) : state.tables.add(tableId);
          render();
        },
      }),
    );
  }
  return head;
}

function card(title, note, ...body) {
  return h('section', { class: 'card' }, cardHead(title, note), ...body);
}

function dataTable(headers, rows) {
  const table = h('table', { class: 'data' });
  const head = table.createTHead().insertRow();
  headers.forEach((t, i) => head.append(h('th', { class: i ? 'num' : null, text: t })));
  const body = table.createTBody();
  for (const r of rows) {
    const tr = body.insertRow();
    r.forEach((v, i) => tr.append(h('td', { class: i ? 'num' : null, text: v })));
  }
  return h('div', { class: 'table-wrap chart-table' }, table);
}

function legendItem(label, color, kind = 'line') {
  const key = h('i', { class: kind === 'line' ? 'key-line' : kind === 'band' ? 'key-band' : 'key-rect' });
  if (color) key.style.background = color;
  return h('span', {}, key, label);
}

function miniStat(label, value) {
  return h('div', { class: 'mini-stat' }, h('span', { class: 'muted small', text: label }), h('strong', { text: value }));
}

const TONE_ICON = { good: 'good', attention: 'warning', neutral: null };
function usualChip(label) {
  return h('span', { class: `usual-chip tone-${label.tone}` }, TONE_ICON[label.tone] ? statusIcon(TONE_ICON[label.tone]) : h('i', { class: 'usual-dot' }), label.text);
}

// ── Source status chips ───────────────────────────────────
const SYNC_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--grid)" stroke-width="2"/><path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>';
const OFF_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="var(--text-muted)" stroke-width="1.6"/></svg>';

function renderSources(sources) {
  const wrap = $('#sources');
  wrap.replaceChildren();
  for (const s of sources) {
    let icon;
    let text;
    if (s.syncing) [icon, text] = [SYNC_ICON, 'Syncing…'];
    else if (!s.configured) [icon, text] = [OFF_ICON, 'Not connected'];
    else if (s.lastError) [icon, text] = ['critical', `Error · ${s.lastError}`];
    else if (s.demo) [icon, text] = ['warning', `Sample data · ${fmtAgo(s.lastSuccessAt)}`];
    else [icon, text] = ['good', `Synced ${fmtAgo(s.lastSuccessAt)}`];
    const iconEl = icon.startsWith('<') ? Object.assign(h('span', { class: 'status-icon' }), { innerHTML: icon }) : statusIcon(icon);
    wrap.append(
      h('div', { class: 'source', title: s.nextSyncAt ? `Next sync ${new Date(s.nextSyncAt).toLocaleTimeString()}` : '' }, iconEl, h('strong', { text: s.label }), h('span', { class: 'state', text })),
    );
  }
}

// ── TODAY ─────────────────────────────────────────────────
function renderToday(days, goals, experiments) {
  const today = days.at(-1);
  const todayIso = isoToday();
  const isLive = today.date === todayIso;
  const p = isLive ? dayProgress(new Date()) : 1;
  const stats = Object.fromEntries(habits(goals).map((hb) => [hb.id, habitStats(hb, days.slice(-14), todayIso, goals.daysPerWeek)]));
  // Count today as soon as an in-progress goal is met, so the weekly line moves when you do.
  const habitById = Object.fromEntries(habits(goals).map((hb) => [hb.id, hb]));
  const weekLine = (id, word = 'Hit') => {
    const s = stats[id];
    if (!s) return '';
    const met = s.thisWeek.met + (habitById[id].intraday && habitById[id].bin(today) === 3 ? 1 : 0);
    return `${word} ${met} of ${s.thisWeek.target} days this week`;
  };

  // One main focus, Oura "One Big Thing" style; anything else is secondary.
  const gap = daysSinceData(days);
  const items = focusItems(days, goals, new Date());
  const [main, ...rest] = items;
  const running = experiments.map((e) => ({ e, r: evaluateExperiment(e, days, goals, todayIso) })).filter((x) => !x.r.finished && x.r.behaviour);
  const focus = h(
    'section',
    { class: 'card focus-card' },
    cardHead("Today's focus", isLive ? `Updated ${fmtAgo(new Date(state.lastFetch).toISOString())}` : fmtDateLong(today.date)),
    gap >= 2 && Number.isFinite(gap)
      ? h('div', { class: 'focus-main' }, h('h3', { text: 'Welcome back' }), h('p', { text: `There's no data from the last ${gap} days, which is completely normal. Wear your ring tonight and log a meal or two, and your trends will pick up where they left off.` }))
      : main
        ? h('div', { class: `focus-main level-${main.level}`, style: main.pillar ? { '--pillar': main.pillar } : {} }, h('div', { class: 'focus-title' }, statusIcon(main.level), h('h3', { text: main.title })), h('p', { text: main.detail }), h('span', { class: 'visually-hidden', text: LEVEL_LABEL[main.level] }))
        : h('div', { class: 'focus-main' }, h('h3', { text: 'Nothing needs attention today' }), h('p', { text: 'Your recovery is within your usual range and your goals are on pace. Keep doing what you are doing.' })),
    rest.length
      ? h('div', {}, h('h4', { class: 'mini-title', text: 'Also today' }), h('ul', { class: 'focus-list' }, ...rest.map((it) => h('li', {}, statusIcon(it.level), h('div', {}, h('strong', { text: it.title }), h('p', { text: it.detail }))))))
      : null,
    ...running.map(({ e, r }) =>
      h('div', { class: 'focus-exp' }, h('span', { class: 'exp-tag', text: 'Experiment' }), h('span', {}, h('strong', { text: r.behaviour.label }), ` · day ${r.elapsed} of ${EXPERIMENT_DAYS}${r.tracked ? ` · done on ${r.done} of ${r.tracked} days so far` : ''}`)),
    ),
  );

  // Goal progress: bullet bars with target tick, pace marker and a weekly line.
  const paceStatus = (value, target, unit, id, fmt = fmtInt) => {
    const week = weekLine(id);
    if (!num(value)) return { level: 'info', text: `No data yet · ${week}` };
    if (value >= target) return { level: 'good', text: `Goal done · ${week}` };
    if (!isLive || p >= 1) return { level: 'info', text: `${fmt(target - value)} ${unit} short · ${week}` };
    const pace = target * p;
    return value >= pace * 0.9
      ? { level: 'good', text: `On pace · ${week}` }
      : { level: 'info', text: `${fmt(pace - value)} ${unit} behind pace · ${week}` };
  };

  const steps = M.steps(today);
  const protein = M.protein(today);
  const fiber = M.fiber(today);
  const eaten = M.eaten(today);
  const calGoal = M.calorieGoal(today, goals);
  const tol = goals.calorieTolerancePct / 100;
  const calStatus = !num(eaten)
    ? { level: 'info', text: 'Nothing logged yet today' }
    : eaten > calGoal * (1 + tol)
      ? { level: 'warning', text: `Above your range today · ${weekLine('calories', 'In range')}` }
      : { level: 'good', text: `${isLive && eaten < calGoal ? `${fmtInt(calGoal - eaten)} kcal left` : 'In your range'} · ${weekLine('calories', 'In range')}` };

  const dow = (new Date(`${today.date}T12:00:00`).getDay() + 6) % 7;
  const week = days.slice(-(dow + 1));
  const hasIntensity = week.some((d) => num(M.intensity(d)));
  const weekIntensity = week.reduce((a, d) => a + (M.intensity(d) ?? 0), 0);
  const weekPace = goals.intensityWeekly * ((dow + p) / 7);
  const sleep = M.sleepMin(today);
  const bed = M.bedtime(today);

  const progress = card(
    'Goal progress',
    isLive ? "Today so far · the small tick shows where you'd be on pace" : fmtDateLong(today.date),
    h(
      'div',
      { class: 'bullets' },
      bullet({ color: 'var(--activity)', label: 'Steps', value: steps, target: goals.steps, fmt: fmtInt, pace: isLive && p < 1 ? goals.steps * p : undefined, status: paceStatus(steps, goals.steps, 'steps', 'steps') }),
      bullet({ color: 'var(--nutrition)', label: 'Protein', value: protein, target: goals.protein, unit: 'g', fmt: fmtInt, pace: isLive && p < 1 ? goals.protein * p : undefined, status: paceStatus(protein, goals.protein, 'g', 'protein') }),
      bullet({ color: 'var(--nutrition)', label: 'Fibre', value: fiber, target: goals.fiber, unit: 'g', fmt: fmtInt, pace: isLive && p < 1 ? goals.fiber * p : undefined, status: paceStatus(fiber, goals.fiber, 'g', 'fiber') }),
      goals.showCalories ? bullet({ color: 'var(--nutrition)', label: 'Calories', value: eaten, target: calGoal, unit: 'kcal', fmt: fmtInt, band: [calGoal * (1 - tol), calGoal * (1 + tol)], status: calStatus }) : null,
      bullet({
        color: 'var(--activity)',
        label: 'Intensity minutes this week',
        value: hasIntensity ? weekIntensity : undefined,
        target: goals.intensityWeekly,
        unit: 'min',
        fmt: fmtInt,
        pace: weekPace < goals.intensityWeekly ? weekPace : undefined,
        status: !hasIntensity
          ? { level: 'info', text: 'No data yet' }
          : weekIntensity >= goals.intensityWeekly
            ? { level: 'good', text: 'Weekly goal done' }
            : weekIntensity >= weekPace * 0.9
              ? { level: 'good', text: `On pace · ${fmtInt(goals.intensityWeekly - weekIntensity)} min to go` }
              : { level: 'info', text: `${fmtInt(weekPace - weekIntensity)} min behind pace for the week` },
      }),
      bullet({
        color: 'var(--sleep)',
        label: 'Sleep last night',
        value: sleep,
        target: goals.sleepMin,
        fmt: fmtHoursShort,
        status: !num(sleep) ? { level: 'info', text: 'No sleep recorded' } : { level: sleep >= goals.sleepMin ? 'good' : 'info', text: `${sleep >= goals.sleepMin ? 'Goal met' : `${fmtHoursShort(goals.sleepMin - sleep)} short`} · ${weekLine('sleep')}` },
      }),
      h(
        'div',
        { class: 'bullet' },
        h('div', { class: 'bullet-head' }, h('span', { class: 'bullet-label', text: 'Bedtime last night' }), h('span', { class: 'bullet-value' }, h('strong', { text: fmtClock(bed) }), ` / ${fmtClock(goals.bedtimeMin)}`)),
        !num(bed)
          ? statusLine('info', 'No bedtime recorded')
          : statusLine(bed <= goals.bedtimeMin ? 'good' : 'info', `${bed <= goals.bedtimeMin ? `${Math.round(goals.bedtimeMin - bed)} min before target` : `${Math.round(bed - goals.bedtimeMin)} min after target`} · ${weekLine('bedtime', 'On time')}`),
      ),
    ),
  );

  // Recovery signals: each against your own usual range, in one shared vocabulary.
  const TILES = [
    { label: 'Readiness', get: M.readiness, up: true, score: true, pillar: 'var(--recovery)' },
    { label: 'Sleep score', get: M.sleepScore, up: true, score: true, pillar: 'var(--sleep)' },
    { label: 'HRV', get: M.hrv, unit: 'ms', up: true, pillar: 'var(--recovery)' },
    { label: 'Resting HR', get: M.restingHr, unit: 'bpm', up: false, pillar: 'var(--recovery)' },
    { label: 'Body Battery', get: M.bodyBattery, up: true, score: true, pillar: 'var(--activity)' },
  ];
  const tiles = h('div', { class: 'tiles' });
  for (const t of TILES) {
    const values = days.map(t.get);
    const idx = findLastIndex(values, num);
    const tile = h('div', { class: 'tile', style: { '--pillar': t.pillar } }, h('div', { class: 'label' }, h('i', { class: 'pillar-dot' }), t.label));
    if (idx < 0) {
      tile.append(h('div', { class: 'value', text: '–' }), h('div', { class: 'meta', text: 'No data yet' }));
      tiles.append(tile);
      continue;
    }
    const v = values[idx];
    const range = usualRange(values, idx);
    const lbl = usualLabel(v, range, t.up);
    tile.append(
      h('div', { class: 'value' }, fmtInt(v), t.unit ? h('span', { class: 'unit', text: t.unit }) : null, t.score && scoreBand(v) ? h('span', { class: 'band-word', text: scoreBand(v) }) : null),
      usualChip(lbl),
      h('div', { class: 'meta' }, h('span', { text: days[idx].date === todayIso ? 'Today' : fmtDateShort(days[idx].date) }), range ? h('span', { text: `Usual ${fmtInt(range.lo)}–${fmtInt(range.hi)}` }) : null),
    );
    const spark = values.slice(-14);
    if (spark.filter(num).length >= 2) tile.append(sparkline(spark, range, t.pillar));
    tiles.append(tile);
  }

  // Headline rings, Oura-style: one glance per pillar. Everything below stays linear.
  const lastOf = (get) => {
    const i = findLastIndex(days, (d) => num(get(d)));
    return i < 0 ? undefined : { v: get(days[i]), i };
  };
  const readyNow = lastOf(M.readiness);
  const sleepNow = lastOf(M.sleepScore);
  const ringSub = (get, at, up) => {
    if (!at) return 'No data yet';
    const vals = days.map(get);
    const band = scoreBand(at.v);
    const usual = usualLabel(at.v, usualRange(vals, at.i), up).text;
    return band ? `${band} · ${usual.toLowerCase()}` : usual;
  };
  const rings = h(
    'section',
    { class: 'card rings-card' },
    h(
      'div',
      { class: 'rings' },
      ring({ label: 'Readiness', value: readyNow?.v, max: 100, display: fmtInt(readyNow?.v), color: 'var(--recovery)', sub: ringSub(M.readiness, readyNow, true) }),
      ring({ label: 'Sleep', value: sleepNow?.v, max: 100, display: fmtInt(sleepNow?.v), color: 'var(--sleep)', sub: num(M.sleepMin(today)) ? `${fmtHoursShort(M.sleepMin(today))} · ${(scoreBand(sleepNow?.v) ?? '').toLowerCase()}` : ringSub(M.sleepScore, sleepNow, true) }),
      ring({ label: 'Activity', value: steps, max: goals.steps, display: num(steps) ? compact(steps) : '–', unit: 'steps', color: 'var(--activity)', sub: num(steps) ? `${Math.round((steps / goals.steps) * 100)}% of ${compact(goals.steps)}${isLive && p < 1 ? ' so far' : ''}` : 'No data yet' }),
      ring({ label: 'Nutrition', value: protein, max: goals.protein, display: num(protein) ? `${fmtInt(protein)}` : '–', unit: 'g protein', color: 'var(--nutrition)', sub: num(protein) ? `${Math.round((protein / goals.protein) * 100)}% of ${goals.protein} g goal` : 'Nothing logged yet' }),
    ),
  );

  $('#panel-today').replaceChildren(
    rings,
    h('div', { class: 'grid-2' }, focus, progress),
    h('div', { class: 'section-head' }, h('h3', { class: 'section-title', text: 'Recovery signals' }), h('span', { class: 'muted small', text: 'Compared with your usual range: the middle 80% of your last 30 days' })),
    tiles,
  );
}

// ── HABITS ────────────────────────────────────────────────
function renderHabits(days, goals) {
  const todayIso = isoToday();
  const rows = habits(goals).map((habit) => ({ habit, stats: habitStats(habit, days, todayIso, goals.daysPerWeek) }));
  const fmtValue = (habit, d) => {
    const v = habit.value(d);
    if (!num(v)) return '–';
    if (habit.id === 'sleep') return fmtHoursShort(v);
    if (habit.id === 'bedtime') return fmtClock(v);
    if (habit.id === 'protein' || habit.id === 'fiber') return `${fmtInt(v)} g`;
    if (habit.id === 'calories') return `${fmtInt(v)} of ${fmtInt(M.calorieGoal(d, goals))} kcal`;
    return fmtInt(v);
  };

  const done = rows.filter((r) => r.stats.thisWeek.done).length;
  const reachable = rows.filter((r) => !r.stats.thisWeek.done && r.stats.thisWeek.met + r.stats.thisWeek.daysLeft >= r.stats.thisWeek.target).length;
  const lede = h(
    'p',
    { class: 'lede' },
    h('strong', { text: done ? `${done} of ${rows.length} goals already done this week${reachable ? `, ${reachable} more still within reach.` : '.'}` : `${reachable} of ${rows.length} goals still within reach this week.` }),
    ` Each goal asks for ${goals.daysPerWeek} of 7 days, so ${7 - goals.daysPerWeek} days a week are spare: a missed day is planned for, not a failure.`,
  );
  const consistency = card('Weekly goals', 'Each square is a day. Grey outlines are days with no data, which never count against you.', lede, habitGrid(rows, days, fmtValue));

  const beds = days.map(M.bedtime).filter(num);
  const wakes = days.map(M.wake).filter(num);
  const sd = (xs) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };
  const onTime = beds.filter((b) => b <= goals.bedtimeMin).length;
  const stats = h(
    'div',
    { class: 'mini-stats' },
    miniStat('Average bedtime', fmtClock(mean(beds))),
    miniStat('Bedtime varies by', beds.length > 2 ? `±${Math.round(sd(beds))} min` : '–'),
    miniStat('Average wake', fmtClock(mean(wakes))),
    miniStat('In bed on time', beds.length ? `${onTime} of ${beds.length} nights` : '–'),
  );
  const schedBody = state.tables.has('schedule')
    ? dataTable(['Night before', 'In bed', 'Woke', 'Asleep'], [...days].reverse().map((d) => [fmtDateLong(d.date), fmtClock(M.bedtime(d)), fmtClock(M.wake(d)), fmtHoursShort(M.sleepMin(d))]))
    : beds.length
      ? deferDraw(h('div', { class: 'chart' }), (el) => sleepSchedule(el, days, M.bedtime, M.wake, goals.bedtimeMin, (d) => fmtHoursShort(M.sleepMin(d))))
      : h('div', { class: 'empty-chart', text: 'No bedtimes recorded yet. Connect Oura or Garmin.' });
  const schedule = h(
    'section',
    { class: 'card has-pillar', style: { '--pillar': 'var(--sleep)' } },
    cardHead('Sleep schedule', 'Each bar runs from bedtime to wake. A regular schedule is one of the simplest ways to sleep better.', 'schedule'),
    stats,
    beds.length
      ? h('div', { class: 'legend' }, legendItem('In bed by target', 'var(--sleep)', 'rect'), legendItem('Later than target', 'var(--activity)', 'rect'), legendItem('Target window: the 30 minutes before your bedtime', null, 'band'))
      : null,
    schedBody,
  );

  $('#panel-habits').replaceChildren(consistency, schedule);
}

// ── INSIGHTS ──────────────────────────────────────────────
async function startExperiment(r) {
  const res = await fetch('/api/experiments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ behaviourId: r.id, outcome: state.outcome, start: isoToday() }),
  }).catch(() => null);
  if (!res?.ok) return notify('Could not start the experiment. Try again in a moment');
  notify(`Started: ${r.label} for 2 weeks`);
  await load();
}

async function endExperiment(id) {
  const res = await fetch(`/api/experiments/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
  if (!res?.ok) return notify('Could not remove the experiment');
  await load();
}

function experimentsCard(experiments, days, goals) {
  const todayIso = isoToday();
  const list = experiments
    .map((e) => ({ e, r: evaluateExperiment(e, days, goals, todayIso) }))
    .filter((x) => x.r.behaviour)
    .sort((a, b) => b.e.start.localeCompare(a.e.start));
  if (!list.length) return null;
  const VERDICT = {
    running: null,
    higher: (r) => `${r.outcome.label} was ${signed1(r.result.diff)} ${r.outcome.unit} higher than the 2 weeks before (${r.result.confidence.toLowerCase()} confidence). Worth keeping.`,
    lower: (r) => `${r.outcome.label} was ${signed1(r.result.diff)} ${r.outcome.unit} lower than the 2 weeks before. This habit may not suit you right now.`,
    inconclusive: (r) => `${r.outcome.label} changed by ${signed1(r.result.diff)} ${r.outcome.unit}, which is within your normal day-to-day variation. Inconclusive is a real answer: keep it if it feels good.`,
    'not-enough-data': () => 'Not enough data during the experiment to tell. Try again when your devices are syncing.',
  };
  return h(
    'section',
    { class: 'card span-2' },
    cardHead('Your experiments', `Two weeks of a habit, compared with the two weeks before`),
    h(
      'div',
      { class: 'exp-list' },
      ...list.map(({ e, r }) =>
        h(
          'div',
          { class: 'exp' },
          h(
            'div',
            { class: 'exp-head' },
            h('div', {}, h('strong', { text: r.behaviour.label }), h('span', { class: 'muted small', text: ` · watching ${r.outcome.label.toLowerCase()} · started ${fmtDateShort(e.start)}` })),
            h('button', { type: 'button', class: 'link', text: r.finished ? 'Remove' : 'Stop', onclick: () => endExperiment(e.id) }),
          ),
          h('div', { class: 'exp-track', role: 'img', 'aria-label': `Day ${r.elapsed} of ${EXPERIMENT_DAYS}` }, h('div', { class: 'exp-fill', style: { width: `${(r.elapsed / EXPERIMENT_DAYS) * 100}%` } })),
          h('p', { class: 'small', text: r.finished ? VERDICT[r.verdict](r) : `Day ${r.elapsed} of ${EXPERIMENT_DAYS}${r.tracked ? ` · done on ${r.done} of ${r.tracked} days so far` : ''} · results on ${fmtDateShort(r.end)}` }),
        ),
      ),
    ),
  );
}

function renderInsights(all, goals, experiments) {
  const todayIso = isoToday();
  const days = all.slice(-INSIGHT_DAYS);
  const outcome = OUTCOMES[state.outcome];
  const results = compareBehaviours(days, goals, state.outcome, todayIso);
  const strongest = results.find((r) => r.enough && r.confidence !== 'Low');
  const activeIds = new Set(experiments.filter((e) => !evaluateExperiment(e, all, goals, todayIso).finished).map((e) => e.behaviourId));

  const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Measure recovery by' });
  for (const [key, o] of Object.entries(OUTCOMES)) {
    seg.append(
      h('button', {
        type: 'button',
        text: o.label,
        'aria-pressed': String(key === state.outcome),
        onclick: () => {
          state.outcome = key;
          storageSet('dash.outcome', key);
          render();
        },
      }),
    );
  }

  const drivers = h(
    'section',
    { class: 'card span-2 has-pillar', style: { '--pillar': 'var(--recovery)' } },
    cardHead('What goes with better recovery', `Next-morning ${outcome.label.toLowerCase()} after days with each habit, compared with days without it · last ${INSIGHT_DAYS} days`, null, seg),
    strongest
      ? h(
          'p',
          { class: 'lede' },
          `After ${strongest.after}, your next-morning ${outcome.label.toLowerCase()} averaged `,
          h('strong', { text: `${fmtInt(strongest.meanYes)} vs ${fmtInt(strongest.meanNo)}` }),
          ` (${strongest.nYes} vs ${strongest.nNo} days, ${strongest.confidence.toLowerCase()} confidence).`,
        )
      : h('p', { class: 'lede muted', text: `No pattern is clear enough yet. Each habit needs at least 10 days with it and 10 without, and a difference bigger than your normal day-to-day variation.` }),
    h('div', { class: 'legend' }, legendItem('Difference in averages', 'var(--pos)', 'rect'), h('span', {}, h('i', { class: 'key-ci' }), 'Likely range (95%): if it crosses the centre line, it could be noise')),
    evidenceRows(results, outcome, { onTry: startExperiment, activeIds }),
    h('p', { class: 'footnote', text: "These are patterns in your own data, not proof of cause. The 'Also' notes show other things that differed between the two groups. The best way to find out is to try a habit for two weeks and see whether the number moves." }),
  );

  // Week in review: wins first, then a goal check-in, then the numbers.
  const wr = weeklyReview(all, goals, todayIso);
  const table = h('table', { class: 'data review' });
  const head = table.createTHead().insertRow();
  ['', 'Last 7 days', '4-week avg', 'Change'].forEach((t, i) => head.append(h('th', { class: i ? 'num' : null, text: t })));
  const body = table.createTBody();
  for (const r of wr.rows) {
    const tr = body.insertRow();
    tr.append(h('td', { text: r.label }), h('td', { class: 'num', text: num(r.cur) ? r.fmt(r.cur) : '–' }), h('td', { class: 'num muted', text: num(r.prev) ? r.fmt(r.prev) : '–' }));
    let change = '–';
    let cls = 'num';
    if (num(r.diff)) {
      if (!r.meaningful) change = 'Steady';
      else {
        const amount = r.asMinutes ? `${Math.round(Math.abs(r.diff))} min` : `${fmtInt(Math.abs(r.diff))}${r.unit ?? ''}`;
        change = r.label === 'Bedtime' ? `${amount} ${r.diff > 0 ? 'later' : 'earlier'}` : `${r.diff > 0 ? '▲' : '▼'} ${amount}`;
        if (r.better !== undefined) cls += r.better ? ' good-text' : ' muted';
      }
    }
    tr.append(h('td', { class: cls, text: change }));
  }
  const review = h(
    'section',
    { class: 'card' },
    cardHead('Week in review', wr.curRange[0] ? `${fmtDateShort(wr.curRange[0])} – ${fmtDateShort(wr.curRange[1])}, against your 4-week average` : ''),
    wr.wins.length
      ? h('div', {}, h('h3', { class: 'mini-title', text: 'Wins' }), h('ul', { class: 'wins' }, ...wr.wins.slice(0, 4).map((w) => h('li', {}, statusIcon('good'), h('span', { text: w })))))
      : h('p', { class: 'lede muted', text: 'A quieter week. That happens; next week starts fresh.' }),
    wr.prompts.length
      ? h(
          'div',
          { class: 'prompts' },
          h('h3', { class: 'mini-title', text: 'Goal check-in' }),
          ...wr.prompts.slice(0, 2).map((pr) => h('p', { class: 'small', text: pr.text })),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Adjust goals', onclick: () => toggleGoals(true) }),
        )
      : null,
    h('h3', { class: 'mini-title', text: 'Averages' }),
    h('div', { class: 'table-wrap' }, table),
  );

  // Nutrition: 7-day averages against a range. No running deficit ledger.
  const nd = all.slice(-30);
  const dates = nd.map((d) => d.date);
  const tol = goals.calorieTolerancePct / 100;
  const nutritionCharts = [
    goals.showCalories && {
      id: 'n-cal',
      title: 'Calories',
      type: 'line',
      fmt: (v) => `${fmtInt(v)} kcal`,
      endFmt: compact,
      height: 150,
      series: [{ label: 'Calories', color: 'var(--nutrition)', values: nd.map(M.eaten) }],
      rolling: rolling(nd.map(M.eaten)),
      band: { lo: nd.map((d) => M.calorieGoal(d, goals) * (1 - tol)), hi: nd.map((d) => M.calorieGoal(d, goals) * (1 + tol)) },
      bandLabel: 'Your calorie range',
    },
    { id: 'n-protein', title: 'Protein', type: 'line', fmt: (v) => `${fmtInt(v)} g`, height: 150, series: [{ label: 'Protein', color: 'var(--nutrition)', values: nd.map(M.protein) }], rolling: rolling(nd.map(M.protein)), goal: { value: goals.protein, label: `Goal ${goals.protein} g` } },
    { id: 'n-fiber', title: 'Fibre', type: 'line', fmt: (v) => `${fmtInt(v)} g`, height: 150, series: [{ label: 'Fibre', color: 'var(--nutrition)', values: nd.map(M.fiber) }], rolling: rolling(nd.map(M.fiber)), goal: { value: goals.fiber, label: `Goal ${goals.fiber} g` } },
  ].filter(Boolean);
  const nutrition = h(
    'section',
    { class: 'card has-pillar', style: { '--pillar': 'var(--nutrition)' } },
    cardHead('Nutrition, 7-day averages', 'Dots are days; the line smooths out the day-to-day swings · last 30 days'),
    h('div', { class: 'legend' }, legendItem('Daily', 'var(--nutrition)', 'rect'), legendItem('7-day average', 'var(--nutrition)'), goals.showCalories ? legendItem('Calorie range', null, 'band') : null),
    ...nutritionCharts.map((c) =>
      h('div', { class: 'multiple' }, h('div', { class: 'multiple-title' }, h('strong', { text: c.title }), h('span', { class: 'muted small', text: num(c.rolling.at(-1)) ? `7-day avg ${c.fmt(c.rolling.at(-1))}` : '' })), deferDraw(h('div', { class: 'chart' }), (el) => timeChart(el, c, dates))),
    ),
    h('p', { class: 'footnote', text: goals.showCalories ? 'Calories burned by exercise are not added back to your food budget. You can hide calories entirely in Goals and keep protein and fibre.' : 'Calories are hidden. Turn them back on in Goals.' }),
  );

  $('#panel-insights').replaceChildren(h('div', { class: 'grid-2' }, experimentsCard(experiments, all, goals), drivers, review, nutrition));
}

// ── TRENDS ────────────────────────────────────────────────
function renderTrends(days, goals, activities) {
  const dates = days.map((d) => d.date);
  const series = (label, get, color) => ({ label, color, values: days.map(get) });
  const calGoal = M.calorieGoal(days.at(-1), goals);
  // Bands are computed on the full history so the first days in view have one too.
  const full = denseDays(state.data);
  const offset = full.length - days.length;
  const bandFor = (get) => {
    const b = usualBand(full.map(get));
    return { lo: b.lo.slice(offset), hi: b.hi.slice(offset) };
  };
  const CHARTS = [
    { id: 'scores', pillar: 'var(--sleep)', title: 'Sleep & readiness', note: 'Oura · score 0–100', type: 'line', fmt: fmtInt, series: [series('Sleep score', M.sleepScore, 'var(--sleep)'), series('Readiness', M.readiness, 'var(--recovery)')] },
    goals.showCalories && {
      id: 'energy',
      pillar: 'var(--nutrition)',
      title: 'Calories eaten vs burned',
      note: 'kcal · MyFitnessPal vs Garmin',
      type: 'line',
      zero: true,
      fmt: fmtInt,
      series: [series('Eaten', M.eaten, 'var(--nutrition)'), series('Burned', M.burned, 'var(--activity)')],
      goal: num(calGoal) ? { value: calGoal, label: `Goal ${fmtInt(calGoal)}` } : undefined,
    },
    { id: 'macros', pillar: 'var(--nutrition)', title: 'Macros', note: 'grams · MyFitnessPal', type: 'stack', fmt: (v) => `${fmtInt(v)} g`, series: [series('Protein', M.protein, 'var(--nutrition)'), series('Carbs', M.carbs, 'var(--activity)'), series('Fat', M.fat, 'var(--recovery)')] },
    {
      id: 'steps',
      pillar: 'var(--activity)',
      title: 'Steps',
      note: 'Bars are days; the line is your 7-day average',
      type: 'bar',
      fmt: fmtInt,
      series: [series('Steps', M.steps, 'var(--activity)')],
      rolling: rolling(days.map(M.steps)),
      goal: { value: goals.steps, label: `Goal ${compact(goals.steps)}` },
    },
    {
      id: 'sleep',
      pillar: 'var(--sleep)',
      title: 'Sleep stages',
      note: 'hours · Oura',
      type: 'stack',
      fmt: fmtHoursShort,
      axisFmt: (m) => `${Math.round(m / 60)}h`,
      tickStep: 120,
      series: [series('Deep', M.deep, 'var(--sleep-deep)'), series('REM', M.rem, 'var(--sleep)'), series('Light', M.light, 'var(--sleep-light)')],
      goal: { value: goals.sleepMin, label: `Goal ${fmtHoursShort(goals.sleepMin)}`, fmt: fmtHoursShort },
    },
    { id: 'rhr', pillar: 'var(--recovery)', title: 'Resting heart rate', note: 'bpm · lower is usually better', type: 'line', fmt: (v) => `${fmtInt(v)} bpm`, series: [series('Resting HR', M.restingHr, 'var(--recovery)')], rolling: rolling(days.map(M.restingHr)), band: bandFor(M.restingHr) },
    { id: 'hrv', pillar: 'var(--recovery)', title: 'Heart rate variability', note: 'ms · higher is usually better', type: 'line', fmt: (v) => `${fmtInt(v)} ms`, series: [series('HRV', M.hrv, 'var(--recovery)')], rolling: rolling(days.map(M.hrv)), band: bandFor(M.hrv) },
  ].filter(Boolean);

  const grid = h('div', { class: 'grid' });
  for (const c of CHARTS) {
    const hasData = c.series.some((s) => s.values.some(num));
    const legend =
      c.series.length > 1 || c.rolling
        ? h(
            'div',
            { class: 'legend' },
            ...c.series.map((s) => legendItem(c.rolling && c.type === 'line' ? `Daily ${s.label}` : s.label, s.color, c.type === 'line' && !c.rolling ? 'line' : 'rect')),
            c.rolling ? legendItem('7-day average', c.type === 'line' ? c.series[0].color : 'var(--text-primary)') : null,
            c.band ? legendItem('Your usual range', null, 'band') : null,
          )
        : null;
    const body = !hasData
      ? h('div', { class: 'empty-chart', text: 'No data in this range yet. Connect the source or wait for the next sync.' })
      : state.tables.has(c.id)
        ? dataTable(
            ['Date', ...c.series.map((s) => s.label), ...(c.rolling ? ['7-day avg'] : [])],
            [...days.keys()].reverse().map((i) => [fmtDateLong(dates[i]), ...c.series.map((s) => (num(s.values[i]) ? c.fmt(s.values[i]) : '–')), ...(c.rolling ? [num(c.rolling[i]) ? c.fmt(c.rolling[i]) : '–'] : [])]),
          )
        : deferDraw(h('div', { class: 'chart' }), (el) => timeChart(el, c, dates));
    grid.append(h('section', { class: 'card has-pillar', style: { '--pillar': c.pillar } }, cardHead(c.title, c.note, c.id), hasData ? legend : null, body));
  }

  // Activities, each linked to how you recovered the next morning.
  const byDate = new Map(full.map((d, i) => [d.date, i]));
  const readyVals = full.map(M.readiness);
  const acts = h('table', { class: 'data' });
  const ah = acts.createTHead().insertRow();
  ['Date', 'Activity', 'Duration', 'Distance', 'Calories', 'Avg HR', 'Next-morning readiness'].forEach((t, i) => ah.append(h('th', { class: i > 1 ? 'num' : null, text: t })));
  const ab = acts.createTBody();
  const inRange = activities.filter((a) => a.start.slice(0, 10) >= dates[0]);
  if (!inRange.length) ab.insertRow().append(h('td', { colspan: '7', class: 'muted', text: 'No activities in this range.' }));
  for (const a of inRange) {
    const tr = ab.insertRow();
    tr.append(h('td', { text: fmtDateLong(a.start.slice(0, 10)) }), h('td', { text: a.name }));
    for (const [v, f] of [[a.durationS, fmtDur], [a.distanceM, fmtKm], [goals.showCalories ? a.calories : undefined, fmtInt], [a.avgHr, fmtInt]]) tr.append(h('td', { class: 'num', text: f(v) }));
    const i = byDate.get(a.start.slice(0, 10));
    const next = i === undefined ? undefined : i + 1;
    const r = next !== undefined && next < full.length ? readyVals[next] : undefined;
    const lbl = num(r) ? usualLabel(r, usualRange(readyVals, next), true) : undefined;
    tr.append(h('td', { class: 'num' }, num(r) ? h('span', {}, h('strong', { text: fmtInt(r) }), h('span', { class: 'muted', text: ` · ${lbl.text.replace('Within your usual', 'usual').replace(' than usual', '').toLowerCase()}` })) : '–'));
  }

  $('#panel-trends').replaceChildren(grid, card('Recent activities', 'Garmin · with how recovered you were the next morning', h('div', { class: 'table-wrap' }, acts)));
}

// ── Shell: tabs, goals, loading, live updates ─────────────
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const goalsOf = (data) => ({ ...DEFAULT_GOALS, ...data.goals });

function render() {
  for (const t of TABS) {
    const on = t === state.tab;
    $(`#tab-${t}`).setAttribute('aria-selected', String(on));
    $(`#tab-${t}`).tabIndex = on ? 0 : -1;
    $(`#panel-${t}`).hidden = !on;
  }
  // The range picker scopes only the views it applies to; the others say what they cover.
  $('#range-wrap').hidden = !(state.tab === 'habits' || state.tab === 'trends');
  $('#scope-note').textContent =
    state.tab === 'today' ? 'Today, against your goals and your usual range' : state.tab === 'insights' ? `Patterns from your last ${INSIGHT_DAYS} days` : '';

  const data = state.data;
  if (!data) return;
  const all = denseDays(data);
  const goals = goalsOf(data);
  const experiments = data.experiments ?? [];
  const ranged = all.slice(-state.range);
  renderSources(data.sources);
  $('#sync').disabled = data.sources.some((s) => s.syncing);

  if (state.tab === 'today') renderToday(all, goals, experiments);
  else if (state.tab === 'habits') renderHabits(ranged, goals);
  else if (state.tab === 'insights') renderInsights(all, goals, experiments);
  else renderTrends(ranged, goals, data.activities);
  renderLive();
}

function setTab(tab, focus = false) {
  state.tab = tab;
  storageSet('dash.tab', tab);
  try {
    history.replaceState(null, '', `#${tab}`);
  } catch {
    /* sandboxed frame */
  }
  render();
  if (focus) $(`#tab-${tab}`).focus();
}

for (const t of TABS) $(`#tab-${t}`).addEventListener('click', () => setTab(t));
$('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = TABS.indexOf(state.tab);
  setTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length], true);
});

// Goals editor
function fillGoals(goals) {
  $('#g-sleep').value = String(goals.sleepMin / 60);
  $('#g-bedtime').value = fmtClock(goals.bedtimeMin);
  $('#g-steps').value = String(goals.steps);
  $('#g-protein').value = String(goals.protein);
  $('#g-fiber').value = String(goals.fiber);
  $('#g-days').value = String(goals.daysPerWeek);
  $('#g-calories').value = String(goals.calories);
  $('#g-tol').value = String(goals.calorieTolerancePct);
  $('#g-intensity').value = String(goals.intensityWeekly);
  $('#g-show-cal').checked = goals.showCalories;
}
function toggleGoals(open) {
  $('#goals-panel').hidden = !open;
  $('#goals-toggle').setAttribute('aria-expanded', String(open));
  if (open && state.data) {
    fillGoals(goalsOf(state.data));
    $('#goals-panel').scrollIntoView({ block: 'nearest' });
    $('#g-sleep').focus();
  }
}
$('#goals-toggle').addEventListener('click', () => toggleGoals($('#goals-panel').hidden));
$('#goals-cancel').addEventListener('click', () => toggleGoals(false));
$('#goals-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const [hh, mm] = $('#g-bedtime').value.split(':').map(Number);
  const goals = {
    sleepMin: Math.round(Number($('#g-sleep').value) * 60),
    bedtimeMin: hh >= 12 ? hh * 60 + mm - 1440 : hh * 60 + mm,
    steps: Number($('#g-steps').value),
    protein: Number($('#g-protein').value),
    fiber: Number($('#g-fiber').value),
    daysPerWeek: Number($('#g-days').value),
    calories: Number($('#g-calories').value),
    calorieTolerancePct: Number($('#g-tol').value),
    intensityWeekly: Number($('#g-intensity').value),
    showCalories: $('#g-show-cal').checked,
  };
  const res = await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goals) }).catch(() => null);
  if (!res?.ok) {
    const body = res ? await res.json().catch(() => ({})) : {};
    notify(`Goals not saved: ${body.error ?? 'the server could not be reached'}`);
    return;
  }
  state.data.goals = await res.json();
  toggleGoals(false);
  notify('Goals saved');
  render();
});

let inflight = null;
function load() {
  if (inflight) return inflight;
  $('#main').classList.add('loading');
  inflight = fetch(`/api/dashboard?days=${HISTORY_DAYS}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      state.data = data;
      state.lastFetch = Date.now();
      render();
    })
    .catch((err) => {
      $('#live-text').textContent = `Couldn't load data (${err.message}). Retrying`;
    })
    .finally(() => {
      inflight = null;
      $('#main').classList.remove('loading');
    });
  return inflight;
}

function renderLive() {
  $('.live-dot').classList.toggle('on', state.live);
  const age = state.lastFetch ? fmtAgo(new Date(state.lastFetch).toISOString()) : '—';
  $('#live-text').textContent = state.live ? `Live · updated ${age}` : `Reconnecting… · updated ${age}`;
}

let debounce;
function connectStream() {
  const es = new EventSource('/api/stream');
  es.addEventListener('open', () => {
    state.live = true;
    renderLive();
    load();
  });
  es.addEventListener('error', () => {
    state.live = false;
    renderLive();
  });
  es.addEventListener('update', () => {
    clearTimeout(debounce);
    debounce = setTimeout(load, 300);
  });
}

$('#range').value = String(state.range);
$('#range').addEventListener('change', (e) => {
  state.range = Number(e.target.value);
  storageSet('dash.range', String(state.range));
  render();
});

$('#sync').addEventListener('click', async () => {
  $('#sync').disabled = true;
  await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
});

$('#mfp-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const res = await fetch('/api/import/mfp', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: await file.text() });
  const body = await res.json().catch(() => ({}));
  notify(res.ok ? `Imported ${body.imported} days from MyFitnessPal` : `Import failed: ${body.error ?? body.message ?? res.status}`);
  e.target.value = '';
});

let noticeTimer;
function notify(text) {
  const n = $('#notice');
  n.textContent = `· ${text}`;
  n.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    n.hidden = true;
  }, 8000);
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

// Relative times tick; a slow poll backs up the stream in case a proxy drops it.
setInterval(() => {
  renderLive();
  if (state.data) renderSources(state.data.sources);
}, 15_000);
setInterval(() => {
  if (Date.now() - state.lastFetch > 5 * 60_000) load();
}, 60_000);

render();
load();
connectStream();
