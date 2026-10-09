// Health dashboard client. Renders /api/dashboard into four views and re-renders
// whenever the server pushes an `update` event (a sync finished) over /api/stream.

import {
  DEFAULT_GOALS,
  M,
  OUTCOMES,
  compact,
  compareBehaviours,
  cumulativeBalance,
  dayProgress,
  fmtClock,
  fmtHoursShort,
  fmtInt,
  focusItems,
  habitStats,
  habits,
  rolling,
  weeklyReview,
} from './js/insights.js';
import {
  LEVEL_LABEL,
  bullet,
  divergingBars,
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
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const HISTORY_DAYS = 90;
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
const signed = (v, fmt) => (v > 0 ? `+${fmt(v)}` : v < 0 ? `−${fmt(-v)}` : fmt(0));

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
  const key = h('i', { class: kind === 'line' ? 'key-line' : 'key-rect' });
  key.style.background = color;
  return h('span', {}, key, label);
}

function miniStat(label, value) {
  return h('div', { class: 'mini-stat' }, h('span', { class: 'muted small', text: label }), h('strong', { text: value }));
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
function renderToday(days, goals) {
  const today = days.at(-1);
  const isLive = today.date === isoToday();
  const p = isLive ? dayProgress(new Date()) : 1;

  const items = focusItems(days, goals, new Date());
  const focus = card(
    "Today's focus",
    'What would move your numbers most today',
    items.length
      ? h(
          'ul',
          { class: 'focus-list' },
          ...items.map((it) =>
            h('li', {}, statusIcon(it.level), h('div', {}, h('span', { class: 'visually-hidden', text: `${LEVEL_LABEL[it.level]}: ` }), h('strong', { text: it.title }), h('p', { text: it.detail }))),
          ),
        )
      : h('p', { class: 'muted', text: 'Nothing needs attention right now. Keep doing what you are doing.' }),
  );

  const paceStatus = (value, target, unit, fmt = fmtInt) => {
    if (!num(value)) return { level: 'info', text: 'No data yet' };
    if (value >= target) return { level: 'good', text: 'Goal done' };
    if (!isLive || p >= 1) return { level: 'warning', text: `${fmt(target - value)} ${unit} short` };
    const pace = target * p;
    return value >= pace * 0.9
      ? { level: 'good', text: `On pace · ${fmt(target - value)} ${unit} to go` }
      : { level: 'warning', text: `${fmt(pace - value)} ${unit} behind pace for this time of day` };
  };

  const steps = M.steps(today);
  const protein = M.protein(today);
  const eaten = M.eaten(today);
  const calGoal = M.calorieGoal(today, goals);
  const tol = goals.calorieTolerancePct / 100;
  const calStatus = !num(eaten)
    ? { level: 'info', text: 'Nothing logged yet today' }
    : eaten > calGoal * (1 + tol)
      ? { level: 'warning', text: `${fmtInt(eaten - calGoal)} kcal over goal` }
      : !isLive && eaten < calGoal * (1 - tol)
        ? { level: 'warning', text: `${fmtInt(calGoal - eaten)} kcal under goal` }
        : { level: 'good', text: `${fmtInt(Math.max(0, calGoal - eaten))} kcal left` };

  // Week to date (Monday start) for intensity minutes.
  const dow = (new Date(`${today.date}T12:00:00`).getDay() + 6) % 7;
  const week = days.slice(-(dow + 1));
  const hasIntensity = week.some((d) => num(M.intensity(d)));
  const weekIntensity = week.reduce((a, d) => a + (M.intensity(d) ?? 0), 0);
  const weekPace = goals.intensityWeekly * ((dow + p) / 7);
  const weekStatus = !hasIntensity
    ? { level: 'info', text: 'No data yet' }
    : weekIntensity >= goals.intensityWeekly
      ? { level: 'good', text: 'Weekly goal done' }
      : weekIntensity >= weekPace * 0.9
        ? { level: 'good', text: `On pace · ${fmtInt(goals.intensityWeekly - weekIntensity)} min to go this week` }
        : { level: 'warning', text: `${fmtInt(weekPace - weekIntensity)} min behind pace for the week` };

  const sleep = M.sleepMin(today);
  const bed = M.bedtime(today);

  const progress = card(
    'Goal progress',
    isLive ? "Today so far · the small tick shows where you'd be on pace" : fmtDateLong(today.date),
    h(
      'div',
      { class: 'bullets' },
      bullet({ label: 'Steps', value: steps, target: goals.steps, fmt: fmtInt, pace: isLive && p < 1 ? goals.steps * p : undefined, status: paceStatus(steps, goals.steps, 'steps') }),
      bullet({ label: 'Protein', value: protein, target: goals.protein, unit: 'g', fmt: fmtInt, pace: isLive && p < 1 ? goals.protein * p : undefined, status: paceStatus(protein, goals.protein, 'g') }),
      bullet({ label: 'Calories', value: eaten, target: calGoal, unit: 'kcal', fmt: fmtInt, band: [calGoal * (1 - tol), calGoal * (1 + tol)], status: calStatus }),
      bullet({ label: 'Intensity minutes this week', value: hasIntensity ? weekIntensity : undefined, target: goals.intensityWeekly, unit: 'min', fmt: fmtInt, pace: weekPace < goals.intensityWeekly ? weekPace : undefined, status: weekStatus }),
      bullet({
        label: 'Sleep last night',
        value: sleep,
        target: goals.sleepMin,
        fmt: fmtHoursShort,
        status: !num(sleep) ? { level: 'info', text: 'No sleep recorded' } : sleep >= goals.sleepMin ? { level: 'good', text: 'Goal met' } : { level: 'warning', text: `${fmtHoursShort(goals.sleepMin - sleep)} short` },
      }),
      h(
        'div',
        { class: 'bullet' },
        h('div', { class: 'bullet-head' }, h('span', { class: 'bullet-label', text: 'Bedtime last night' }), h('span', { class: 'bullet-value' }, h('strong', { text: fmtClock(bed) }), ` / ${fmtClock(goals.bedtimeMin)}`)),
        !num(bed)
          ? statusLine('info', 'No bedtime recorded')
          : bed <= goals.bedtimeMin
            ? statusLine('good', `${Math.round(goals.bedtimeMin - bed)} min before your target`)
            : statusLine('warning', `${Math.round(bed - goals.bedtimeMin)} min after your target`),
      ),
    ),
  );

  // Recovery signals against your own 30-day baseline.
  const TILES = [
    { label: 'Readiness', get: M.readiness, up: true },
    { label: 'Sleep score', get: M.sleepScore, up: true },
    { label: 'HRV', get: M.hrv, unit: 'ms', up: true },
    { label: 'Resting HR', get: M.restingHr, unit: 'bpm', up: false },
    { label: 'Body Battery', get: M.bodyBattery, up: true },
    { label: 'Calories burned', get: M.burned, unit: 'kcal', up: null },
  ];
  const tiles = h('div', { class: 'tiles' });
  for (const t of TILES) {
    const idx = findLastIndex(days, (d) => num(t.get(d)));
    const tile = h('div', { class: 'tile' }, h('div', { class: 'label', text: t.label }));
    if (idx < 0) {
      tile.append(h('div', { class: 'value', text: '–' }), h('div', { class: 'meta', text: 'No data yet' }));
      tiles.append(tile);
      continue;
    }
    const day = days[idx];
    const v = t.get(day);
    tile.append(h('div', { class: 'value' }, fmtInt(v), t.unit ? h('span', { class: 'unit', text: t.unit }) : null));
    const meta = h('div', { class: 'meta' }, h('span', { text: day.date === isoToday() ? 'Today' : fmtDateShort(day.date) }));
    const prev = days.slice(Math.max(0, idx - 30), idx).map(t.get).filter(num);
    if (prev.length >= 7 && t.up !== null) {
      const avg = mean(prev);
      const pct = avg ? Math.round(((v - avg) / avg) * 100) : 0;
      const better = v - avg > 0 === t.up;
      meta.append(pct === 0 ? h('span', { class: 'delta', text: 'At your 30-day average' }) : h('span', { class: `delta ${better ? 'good' : 'bad'}`, text: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs 30-day avg` }));
    }
    tile.append(meta);
    const spark = days.slice(-14).map(t.get);
    if (spark.filter(num).length >= 2) tile.append(sparkline(spark));
    tiles.append(tile);
  }

  $('#panel-today').replaceChildren(h('div', { class: 'grid-2' }, focus, progress), h('h3', { class: 'section-title', text: 'Recovery signals' }), tiles);
}

// ── HABITS ────────────────────────────────────────────────
function renderHabits(days, goals) {
  const todayIso = isoToday();
  const rows = habits(goals).map((habit) => ({ habit, stats: habitStats(habit, days, todayIso) }));
  const fmtValue = (habit, d) => {
    const v = habit.value(d);
    if (!num(v)) return '–';
    if (habit.id === 'sleep') return fmtHoursShort(v);
    if (habit.id === 'bedtime') return fmtClock(v);
    if (habit.id === 'protein') return `${fmtInt(v)} g`;
    if (habit.id === 'calories') return `${fmtInt(v)} of ${fmtInt(M.calorieGoal(d, goals))} kcal`;
    return fmtInt(v);
  };

  const ranked = rows.filter((r) => num(r.stats.rate)).sort((a, b) => b.stats.rate - a.stats.rate);
  const lede = ranked.length
    ? h(
        'p',
        { class: 'lede' },
        'Most consistent: ',
        h('strong', { text: `${ranked[0].habit.label.toLowerCase()} (${Math.round(ranked[0].stats.rate * 100)}%)` }),
        '. Most room to improve: ',
        h('strong', { text: `${ranked.at(-1).habit.label.toLowerCase()} (${Math.round(ranked.at(-1).stats.rate * 100)}%)` }),
        '.',
      )
    : h('p', { class: 'lede muted', text: 'Not enough data yet.' });
  const consistency = card('Goal consistency', 'Each square is a day. Today is left out of daily goals until it ends.', lede, habitGrid(rows, days, fmtValue));

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
    { class: 'card' },
    cardHead('Sleep schedule', 'Each bar runs from bedtime to wake. A regular schedule is one of the simplest ways to sleep better.', 'schedule'),
    stats,
    beds.length ? h('div', { class: 'legend' }, legendItem('In bed by target', 'var(--series-1)', 'rect'), legendItem('Later than target', 'var(--series-2)', 'rect')) : null,
    schedBody,
  );

  $('#panel-habits').replaceChildren(consistency, schedule);
}

// ── INSIGHTS ──────────────────────────────────────────────
function renderInsights(days, goals) {
  const todayIso = isoToday();
  const outcome = OUTCOMES[state.outcome];
  const results = compareBehaviours(days, goals, state.outcome, todayIso);
  const strongest = results.find((r) => r.enough && Math.abs(r.diff) >= 2);

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
    { class: 'card span-2' },
    cardHead('What goes with better recovery', `Next-morning ${outcome.label.toLowerCase()} on days with each habit, compared with days without it · last ${HISTORY_DAYS} days`, null, seg),
    strongest
      ? h(
          'p',
          { class: 'lede' },
          'Your clearest pattern: ',
          h('strong', { text: strongest.label.toLowerCase() }),
          ` goes with ${Math.abs(Math.round(strongest.diff * 10) / 10)} ${outcome.unit} ${strongest.diff > 0 ? 'higher' : 'lower'} ${outcome.label.toLowerCase()} the next morning (${fmtInt(strongest.meanYes)} vs ${fmtInt(strongest.meanNo)}).`,
        )
      : h('p', { class: 'lede muted', text: 'No clear pattern yet. Each habit needs at least 5 days with it and 5 without.' }),
    divergingBars(results, outcome.unit, outcome.label),
    h('p', { class: 'footnote', text: 'These are patterns in your own data, not proof of cause: a late night and a low score can share a reason, like stress or travel. Use them to choose what to try, then watch whether the number moves.' }),
  );

  // Week in review
  const wr = weeklyReview(days, goals, todayIso);
  const table = h('table', { class: 'data review' });
  const head = table.createTHead().insertRow();
  ['', 'Last 7 days', 'Previous 7', 'Change'].forEach((t, i) => head.append(h('th', { class: i ? 'num' : null, text: t })));
  const body = table.createTBody();
  for (const r of wr.rows) {
    const tr = body.insertRow();
    tr.append(h('td', { text: r.label }), h('td', { class: 'num', text: num(r.cur) ? r.fmt(r.cur) : '–' }), h('td', { class: 'num muted', text: num(r.prev) ? r.fmt(r.prev) : '–' }));
    let change = '–';
    let cls = 'num';
    if (num(r.diff)) {
      const minutes = r.label === 'Bedtime' || r.label === 'Sleep';
      const d = minutes ? Math.round(r.diff) : Math.round(r.diff * 10) / 10;
      const unit = minutes ? ' min' : r.label === 'HRV' ? ' ms' : r.label === 'Resting HR' ? ' bpm' : r.label === 'Protein' ? ' g' : '';
      if (Math.abs(d) < (minutes ? 1 : 0.5)) change = 'No change';
      else {
        change = r.label === 'Bedtime' ? `${Math.abs(d)} min ${d > 0 ? 'later' : 'earlier'}` : `${d > 0 ? '▲' : '▼'} ${fmtInt(Math.abs(d))}${unit}`;
        if (r.upGood !== null) cls += d > 0 === r.upGood ? ' good-text' : ' bad-text';
      }
    }
    tr.append(h('td', { class: cls, text: change }));
  }
  const hits = h(
    'div',
    { class: 'hit-row' },
    ...wr.goalsHit.map((g) =>
      h(
        'div',
        { class: 'hit' },
        h('span', { class: 'muted small', text: g.label }),
        h('strong', { text: `${g.cur} of 7` }),
        h('span', { class: `small ${g.cur > g.prev ? 'good-text' : g.cur < g.prev ? 'bad-text' : 'muted'}`, text: g.cur === g.prev ? 'Same' : `${g.cur > g.prev ? '▲' : '▼'} ${Math.abs(g.cur - g.prev)}`, title: `Previous 7 days: ${g.prev} of 7` }),
      ),
    ),
  );
  const review = h(
    'section',
    { class: 'card' },
    cardHead('Week in review', wr.curRange[0] ? `${fmtDateShort(wr.curRange[0])} – ${fmtDateShort(wr.curRange[1])}, against the 7 days before` : ''),
    h('h3', { class: 'mini-title', text: 'Days you hit each goal · change vs the 7 days before' }),
    hits,
    h('h3', { class: 'mini-title', text: 'Averages' }),
    h('div', { class: 'table-wrap' }, table),
  );

  // Running calorie balance over the last 30 days
  const range = days.slice(-30);
  const bal = cumulativeBalance(range, todayIso);
  const kg = bal.total / 7700;
  const energyBody = state.tables.has('balance')
    ? dataTable(['Date', 'Eaten', 'Burned', 'Running total'], range.map((d, i) => [fmtDateLong(d.date), fmtInt(M.eaten(d)), fmtInt(M.burned(d)), fmtInt(bal.series[i])]).reverse())
    : bal.counted >= 2
      ? deferDraw(h('div', { class: 'chart' }), (el) =>
          timeChart(el, { title: 'Running calorie balance', type: 'line', zero: true, area: true, fmt: (v) => `${fmtInt(v)} kcal`, series: [{ label: 'Running total', color: 'var(--series-1)', values: bal.series }] }, range.map((d) => d.date)),
        )
      : h('div', { class: 'empty-chart', text: 'Needs MyFitnessPal and Garmin data for the same days.' });
  const energy = h(
    'section',
    { class: 'card' },
    cardHead('Running calorie balance', 'Calories eaten minus burned, added up day by day · last 30 days', 'balance'),
    bal.counted >= 2
      ? h('p', { class: 'lede' }, h('strong', { text: `${signed(Math.round(bal.total), fmtInt)} kcal` }), ` over ${bal.counted} days, roughly ${kg >= 0 ? '+' : '−'}${Math.abs(kg).toFixed(1)} kg of body weight.`)
      : null,
    energyBody,
    h('p', { class: 'footnote', text: 'Watches can misjudge calories burned by 10–20%, so read this as a direction rather than an exact weight change. The kg figure uses 7,700 kcal per kg.' }),
  );

  $('#panel-insights').replaceChildren(h('div', { class: 'grid-2' }, drivers, review, energy));
}

// ── TRENDS ────────────────────────────────────────────────
function renderTrends(days, goals, activities) {
  const dates = days.map((d) => d.date);
  const series = (label, get, color) => ({ label, color, values: days.map(get) });
  const calGoal = M.calorieGoal(days.at(-1), goals);
  const CHARTS = [
    { id: 'scores', title: 'Sleep & readiness', note: 'Oura · score 0–100', type: 'line', fmt: fmtInt, series: [series('Sleep score', M.sleepScore, 'var(--series-1)'), series('Readiness', M.readiness, 'var(--series-2)')] },
    {
      id: 'energy',
      title: 'Calories eaten vs burned',
      note: 'kcal · MyFitnessPal vs Garmin',
      type: 'line',
      zero: true,
      fmt: fmtInt,
      series: [series('Eaten', M.eaten, 'var(--series-1)'), series('Burned', M.burned, 'var(--series-2)')],
      goal: num(calGoal) ? { value: calGoal, label: `Goal ${fmtInt(calGoal)}` } : undefined,
    },
    { id: 'macros', title: 'Macros', note: 'grams · MyFitnessPal', type: 'stack', fmt: (v) => `${fmtInt(v)} g`, series: [series('Protein', M.protein, 'var(--series-1)'), series('Carbs', M.carbs, 'var(--series-2)'), series('Fat', M.fat, 'var(--series-3)')] },
    {
      id: 'steps',
      title: 'Steps',
      note: 'Bars are days; the line is your 7-day average',
      type: 'bar',
      fmt: fmtInt,
      series: [series('Steps', M.steps, 'var(--series-1)')],
      rolling: rolling(days.map(M.steps)),
      goal: { value: goals.steps, label: `Goal ${compact(goals.steps)}` },
    },
    {
      id: 'sleep',
      title: 'Sleep stages',
      note: 'hours · Oura',
      type: 'stack',
      fmt: fmtHoursShort,
      axisFmt: (m) => `${Math.round(m / 60)}h`,
      tickStep: 120,
      series: [series('Deep', M.deep, 'var(--series-1)'), series('REM', M.rem, 'var(--series-2)'), series('Light', M.light, 'var(--series-3)')],
      goal: { value: goals.sleepMin, label: `Goal ${fmtHoursShort(goals.sleepMin)}`, fmt: fmtHoursShort },
    },
    { id: 'rhr', title: 'Resting heart rate', note: 'bpm · dots are nights, the line is the 7-day average · lower is better', type: 'line', fmt: (v) => `${fmtInt(v)} bpm`, series: [series('Resting HR', M.restingHr, 'var(--series-1)')], rolling: rolling(days.map(M.restingHr)) },
    { id: 'hrv', title: 'Heart rate variability', note: 'ms · dots are nights, the line is the 7-day average · higher is better', type: 'line', fmt: (v) => `${fmtInt(v)} ms`, series: [series('HRV', M.hrv, 'var(--series-1)')], rolling: rolling(days.map(M.hrv)) },
  ];

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
    grid.append(h('section', { class: 'card' }, cardHead(c.title, c.note, c.id), hasData ? legend : null, body));
  }

  const acts = h('table', { class: 'data' });
  const ah = acts.createTHead().insertRow();
  ['Date', 'Activity', 'Duration', 'Distance', 'Calories', 'Avg HR'].forEach((t, i) => ah.append(h('th', { class: i > 1 ? 'num' : null, text: t })));
  const ab = acts.createTBody();
  const inRange = activities.filter((a) => a.start.slice(0, 10) >= dates[0]);
  if (!inRange.length) ab.insertRow().append(h('td', { colspan: '6', class: 'muted', text: 'No activities in this range.' }));
  for (const a of inRange) {
    const tr = ab.insertRow();
    tr.append(h('td', { text: fmtDateLong(a.start.slice(0, 10)) }), h('td', { text: a.name }));
    for (const [v, f] of [[a.durationS, fmtDur], [a.distanceM, fmtKm], [a.calories, fmtInt], [a.avgHr, fmtInt]]) tr.append(h('td', { class: 'num', text: f(v) }));
  }

  $('#panel-trends').replaceChildren(grid, card('Recent activities', 'Garmin', h('div', { class: 'table-wrap' }, acts)));
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
    state.tab === 'today' ? 'Today, against your goals and your 30-day baseline' : state.tab === 'insights' ? `Patterns from your last ${HISTORY_DAYS} days` : '';

  const data = state.data;
  if (!data) return;
  const all = denseDays(data);
  const goals = goalsOf(data);
  const ranged = all.slice(-state.range);
  renderSources(data.sources);
  $('#sync').disabled = data.sources.some((s) => s.syncing);

  if (state.tab === 'today') renderToday(all, goals);
  else if (state.tab === 'habits') renderHabits(ranged, goals);
  else if (state.tab === 'insights') renderInsights(all, goals);
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
  $('#g-calories').value = String(goals.calories);
  $('#g-tol').value = String(goals.calorieTolerancePct);
  $('#g-intensity').value = String(goals.intensityWeekly);
}
function toggleGoals(open) {
  $('#goals-panel').hidden = !open;
  $('#goals-toggle').setAttribute('aria-expanded', String(open));
  if (open && state.data) {
    fillGoals(goalsOf(state.data));
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
    calories: Number($('#g-calories').value),
    calorieTolerancePct: Number($('#g-tol').value),
    intensityWeekly: Number($('#g-intensity').value),
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
