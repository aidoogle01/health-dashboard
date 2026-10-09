// Health dashboard client: renders /api/dashboard and re-renders whenever the
// server pushes an `update` event (a sync finished) over /api/stream.

const $ = (sel) => document.querySelector(sel);
const SVG = 'http://www.w3.org/2000/svg';

const state = {
  days: Number(localStorageGet('dash.range') ?? 30),
  data: null,
  tables: new Set(), // chart ids currently showing their table view
  lastFetch: 0,
  live: false,
};

function localStorageGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function localStorageSet(k, v) {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
}

// ── Formatting ────────────────────────────────────────────
const nf = new Intl.NumberFormat();
const fmtInt = (v) => (v == null ? '–' : nf.format(Math.round(v)));
const fmtHours = (min) => (min == null ? '–' : `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`);
const fmtKm = (m) => (m == null ? '–' : `${(m / 1000).toFixed(1)} km`);
const fmtDur = (s) => {
  if (s == null) return '–';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
};
const fmtDateShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtDateLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
function fmtAgo(iso) {
  if (!iso) return 'never';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
function compact(v) {
  if (Math.abs(v) >= 10000) return `${nf.format(Math.round(v / 1000))}K`;
  return nf.format(v);
}

// ── Metric accessors (with fallbacks across devices) ──────
const pick = (...vals) => vals.find((v) => typeof v === 'number');
const M = {
  sleepScore: (d) => pick(d.oura?.sleepScore, d.garmin?.sleepScore),
  readiness: (d) => d.oura?.readinessScore,
  steps: (d) => pick(d.garmin?.steps, d.oura?.steps),
  eaten: (d) => d.mfp?.calories,
  goal: (d) => d.mfp?.goalCalories,
  burned: (d) => d.garmin?.totalCalories,
  restingHr: (d) => pick(d.garmin?.restingHr, d.oura?.lowestHr),
  hrv: (d) => d.oura?.avgHrv,
  bodyBattery: (d) => d.garmin?.bodyBatteryHigh,
  protein: (d) => d.mfp?.protein,
  carbs: (d) => d.mfp?.carbs,
  fat: (d) => d.mfp?.fat,
  deep: (d) => d.oura?.deepSleepMin,
  rem: (d) => d.oura?.remSleepMin,
  light: (d) =>
    d.oura?.totalSleepMin != null ? d.oura.totalSleepMin - (d.oura.deepSleepMin ?? 0) - (d.oura.remSleepMin ?? 0) : undefined,
  sleepMin: (d) => pick(d.oura?.totalSleepMin, d.garmin?.sleepMin),
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

// ── Source status chips ───────────────────────────────────
const ICON = {
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--status-good)"/><path d="M4.5 8.2l2.2 2.2 4.8-4.8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  error: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--status-critical)"/><path d="M8 4.5v4.2M8 11.2v.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  demo: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--status-warning)"/><path d="M8 4.5v4.2M8 11.2v.1" stroke="#0b0b0b" stroke-width="1.8" stroke-linecap="round"/></svg>',
  off: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="var(--text-muted)" stroke-width="1.6"/></svg>',
  sync: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--grid)" stroke-width="2"/><path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>',
};

function renderSources(sources) {
  const wrap = $('#sources');
  wrap.replaceChildren();
  for (const s of sources) {
    let icon, text;
    if (s.syncing) [icon, text] = ['sync', 'Syncing…'];
    else if (!s.configured) [icon, text] = ['off', 'Not connected'];
    else if (s.lastError) [icon, text] = ['error', `Error · ${s.lastError}`];
    else if (s.demo) [icon, text] = ['demo', `Demo data · ${fmtAgo(s.lastSuccessAt)}`];
    else [icon, text] = ['ok', `Synced ${fmtAgo(s.lastSuccessAt)}`];
    const el = document.createElement('div');
    el.className = 'source';
    el.innerHTML = ICON[icon];
    const name = document.createElement('strong');
    name.textContent = s.label;
    const st = document.createElement('span');
    st.className = 'state';
    st.textContent = text;
    el.title = s.nextSyncAt ? `Next sync ${new Date(s.nextSyncAt).toLocaleTimeString()}` : '';
    el.append(name, st);
    wrap.append(el);
  }
}

// ── Stat tiles ────────────────────────────────────────────
const TILES = [
  { label: 'Sleep score', get: M.sleepScore, up: true },
  { label: 'Readiness', get: M.readiness, up: true },
  { label: 'Steps', get: M.steps, up: true, fmt: compact },
  { label: 'Calories eaten', get: M.eaten, unit: 'kcal', goal: M.goal },
  { label: 'Calories burned', get: M.burned, unit: 'kcal', up: true },
  { label: 'Resting HR', get: M.restingHr, unit: 'bpm', up: false },
  { label: 'HRV', get: M.hrv, unit: 'ms', up: true },
  { label: 'Body Battery', get: M.bodyBattery, up: true },
];

function renderTiles(days) {
  const wrap = $('#tiles');
  wrap.replaceChildren();
  const todayIso = days.at(-1)?.date;
  for (const t of TILES) {
    const idx = findLastIndex(days, (d) => typeof t.get(d) === 'number');
    const tile = document.createElement('div');
    tile.className = 'tile';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = t.label;
    const value = document.createElement('div');
    value.className = 'value';
    const meta = document.createElement('div');
    meta.className = 'meta';
    tile.append(label, value, meta);

    if (idx < 0) {
      value.textContent = '–';
      meta.textContent = 'No data yet';
      wrap.append(tile);
      continue;
    }
    const day = days[idx];
    const v = t.get(day);
    value.textContent = (t.fmt ?? fmtInt)(v);
    if (t.unit) {
      const u = document.createElement('span');
      u.className = 'unit';
      u.textContent = t.unit;
      value.append(u);
    }

    const when = document.createElement('span');
    when.textContent = day.date === todayIso ? 'Today' : fmtDateShort(day.date);
    meta.append(when);

    const delta = document.createElement('span');
    delta.className = 'delta';
    if (t.goal && typeof t.goal(day) === 'number') {
      const left = t.goal(day) - v;
      delta.textContent = left >= 0 ? `${fmtInt(left)} left of ${fmtInt(t.goal(day))}` : `${fmtInt(-left)} over goal`;
    } else {
      const prev = days.slice(Math.max(0, idx - 7), idx).map(t.get).filter((x) => typeof x === 'number');
      if (prev.length >= 3) {
        const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
        const diff = v - avg;
        const pct = avg ? Math.round((diff / avg) * 100) : 0;
        if (pct !== 0) {
          const better = diff > 0 === t.up;
          delta.classList.add(better ? 'good' : 'bad');
          delta.textContent = `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs 7-day avg`;
        } else delta.textContent = 'Even with 7-day avg';
      }
    }
    meta.append(delta);

    const sparkVals = days.slice(-14).map(t.get);
    if (sparkVals.filter((x) => typeof x === 'number').length >= 2) tile.append(sparkline(sparkVals));
    wrap.append(tile);
  }
}

function findLastIndex(arr, fn) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}

function sparkline(vals) {
  const w = 140, h = 28, pad = 3;
  const nums = vals.filter((v) => typeof v === 'number');
  const min = Math.min(...nums), max = Math.max(...nums);
  const x = (i) => pad + (i / (vals.length - 1)) * (w - pad * 2);
  const y = (v) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const svg = el('svg', { class: 'spark', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svg.append(el('path', { d: linePath(vals, x, y), fill: 'none', stroke: 'var(--axis)', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const last = findLastIndex(vals, (v) => typeof v === 'number');
  svg.append(el('circle', { cx: x(last), cy: y(vals[last]), r: 2.5, fill: 'var(--accent)' }));
  return svg;
}

// ── Charts ────────────────────────────────────────────────
const CHARTS = [
  {
    id: 'scores', title: 'Sleep & readiness', note: 'Oura · score 0–100', type: 'line', fmt: fmtInt,
    series: [
      { label: 'Sleep score', get: M.sleepScore, color: 'var(--series-1)' },
      { label: 'Readiness', get: M.readiness, color: 'var(--series-2)' },
    ],
  },
  {
    id: 'energy', title: 'Energy balance', note: 'kcal · MyFitnessPal vs Garmin', type: 'line', zero: true, fmt: fmtInt,
    series: [
      { label: 'Eaten', get: M.eaten, color: 'var(--series-1)' },
      { label: 'Burned', get: M.burned, color: 'var(--series-2)' },
    ],
  },
  {
    id: 'macros', title: 'Macros', note: 'grams · MyFitnessPal', type: 'stack', fmt: (v) => `${fmtInt(v)} g`,
    series: [
      { label: 'Protein', get: M.protein, color: 'var(--series-1)' },
      { label: 'Carbs', get: M.carbs, color: 'var(--series-2)' },
      { label: 'Fat', get: M.fat, color: 'var(--series-3)' },
    ],
  },
  {
    id: 'steps', title: 'Steps', note: 'Garmin (Oura fallback)', type: 'bar', fmt: fmtInt,
    series: [{ label: 'Steps', get: M.steps, color: 'var(--series-1)' }],
  },
  {
    id: 'sleep', title: 'Sleep stages', note: 'hours · Oura', type: 'stack', fmt: fmtHours, axisFmt: (m) => `${Math.round(m / 60)}h`, tickStep: 120,
    series: [
      { label: 'Deep', get: M.deep, color: 'var(--series-1)' },
      { label: 'REM', get: M.rem, color: 'var(--series-2)' },
      { label: 'Light', get: M.light, color: 'var(--series-3)' },
    ],
  },
  {
    id: 'rhr', title: 'Resting heart rate', note: 'bpm · Garmin (Oura fallback)', type: 'line', fmt: (v) => `${fmtInt(v)} bpm`,
    series: [{ label: 'Resting HR', get: M.restingHr, color: 'var(--series-1)' }],
  },
  {
    id: 'hrv', title: 'Heart rate variability', note: 'ms · Oura nightly average', type: 'line', fmt: (v) => `${fmtInt(v)} ms`,
    series: [{ label: 'HRV', get: M.hrv, color: 'var(--series-1)' }],
  },
];

function el(tag, attrs = {}) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

function linePath(vals, x, y) {
  let d = '';
  let pen = false;
  vals.forEach((v, i) => {
    if (typeof v !== 'number') { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Round a range out to "nice" tick values. */
function niceScale(min, max, count = 4, step0) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = step0 ?? [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { lo, hi, ticks };
}

function renderCharts(days) {
  const grid = $('#charts');
  grid.replaceChildren();
  for (const c of CHARTS) grid.append(chartCard(c, days));
}

function chartCard(c, days) {
  const card = document.createElement('section');
  card.className = 'card';
  const head = document.createElement('div');
  head.className = 'card-head';
  const titleWrap = document.createElement('div');
  const h = document.createElement('h2');
  h.textContent = c.title;
  const note = document.createElement('div');
  note.className = 'muted small';
  note.textContent = c.note;
  titleWrap.append(h, note);
  const toggle = document.createElement('button');
  toggle.className = 'link';
  toggle.type = 'button';
  const showTable = state.tables.has(c.id);
  toggle.textContent = showTable ? 'Show chart' : 'Show table';
  toggle.addEventListener('click', () => {
    state.tables.has(c.id) ? state.tables.delete(c.id) : state.tables.add(c.id);
    card.replaceWith(chartCard(c, days));
  });
  head.append(titleWrap, toggle);
  card.append(head);

  const hasData = days.some((d) => c.series.some((s) => typeof s.get(d) === 'number'));
  if (!hasData) {
    const empty = document.createElement('div');
    empty.className = 'empty-chart';
    empty.textContent = 'No data in this range yet — connect the source or wait for the next sync.';
    card.append(empty);
    return card;
  }

  if (c.series.length > 1) {
    const legend = document.createElement('div');
    legend.className = 'legend';
    for (const s of c.series) {
      const item = document.createElement('span');
      const key = document.createElement('i');
      key.className = c.type === 'line' ? 'key-line' : 'key-rect';
      key.style.background = s.color;
      item.append(key, document.createTextNode(s.label));
      legend.append(item);
    }
    card.append(legend);
  }

  if (showTable) card.append(chartTable(c, days));
  else {
    const holder = document.createElement('div');
    holder.className = 'chart';
    card.append(holder);
    // Draw after insertion so the width is known.
    requestAnimationFrame(() => drawChart(holder, c, days));
  }
  return card;
}

function chartTable(c, days) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap chart-table';
  const table = document.createElement('table');
  table.className = 'data';
  const head = table.createTHead().insertRow();
  for (const label of ['Date', ...c.series.map((s) => s.label)]) {
    const th = document.createElement('th');
    th.textContent = label;
    if (label !== 'Date') th.className = 'num';
    head.append(th);
  }
  const body = table.createTBody();
  for (const d of [...days].reverse()) {
    const row = body.insertRow();
    row.insertCell().textContent = fmtDateLong(d.date);
    for (const s of c.series) {
      const cell = row.insertCell();
      cell.className = 'num';
      const v = s.get(d);
      cell.textContent = typeof v === 'number' ? c.fmt(v) : '–';
    }
  }
  wrap.append(table);
  return wrap;
}

function drawChart(holder, c, days) {
  const W = Math.max(280, holder.clientWidth);
  const H = 200;
  const m = { top: 14, right: c.type === 'line' ? 44 : 8, bottom: 24, left: 44 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const n = days.length;
  const band = iw / n;
  const cx = (i) => m.left + band * (i + 0.5);

  const vals = c.series.map((s) => days.map(s.get));
  let lo, hi;
  if (c.type === 'stack') {
    lo = 0;
    hi = Math.max(1, ...days.map((_, i) => vals.reduce((sum, v) => sum + (v[i] ?? 0), 0)));
  } else {
    const nums = vals.flat().filter((v) => typeof v === 'number');
    lo = c.type === 'bar' || c.zero ? 0 : Math.min(...nums);
    hi = Math.max(...nums);
    if (c.type === 'line' && !c.zero) { const pad = (hi - lo) * 0.15 || 2; lo -= pad; hi += pad; }
  }
  const scale = niceScale(lo, hi, 4, c.tickStep);
  const y = (v) => m.top + ih - ((v - scale.lo) / (scale.hi - scale.lo)) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, tabindex: 0, role: 'img', 'aria-label': `${c.title} chart. Use arrow keys to read values; a table view is available.` });

  // Grid + y ticks
  for (const t of scale.ticks) {
    svg.append(el('line', { x1: m.left, x2: W - m.right, y1: y(t), y2: y(t), stroke: t === scale.lo ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
    const label = el('text', { x: m.left - 8, y: y(t), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'axis-text' });
    label.textContent = c.axisFmt ? c.axisFmt(t) : compact(t);
    svg.append(label);
  }
  // X labels: ~5 evenly spaced dates
  const every = Math.max(1, Math.ceil(n / 5));
  for (let i = n - 1; i >= 0; i -= every) {
    const label = el('text', { x: cx(i), y: H - 6, 'text-anchor': 'middle', class: 'axis-text' });
    label.textContent = fmtDateShort(days[i].date);
    svg.append(label);
  }

  // Hover band / crosshair (drawn under the marks)
  const hoverBand = el('rect', { y: m.top, height: ih, width: band, fill: 'var(--hover)', visibility: 'hidden' });
  const crosshair = el('line', { y1: m.top, y2: m.top + ih, stroke: 'var(--axis)', 'stroke-width': 1, visibility: 'hidden' });
  svg.append(c.type === 'line' ? crosshair : hoverBand);

  if (c.type === 'line') {
    vals.forEach((v, si) => {
      svg.append(el('path', { d: linePath(v, cx, y), fill: 'none', stroke: c.series[si].color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      // Isolated points (neighbors missing) would be invisible as a path: draw them as dots.
      v.forEach((p, i) => {
        if (typeof p === 'number' && typeof v[i - 1] !== 'number' && typeof v[i + 1] !== 'number') {
          svg.append(el('circle', { cx: cx(i), cy: y(p), r: 3, fill: c.series[si].color }));
        }
      });
    });
    // End markers + direct labels, skipped when two would collide.
    const ends = vals
      .map((v, si) => ({ si, i: findLastIndex(v, (p) => typeof p === 'number') }))
      .filter((e) => e.i >= 0)
      .map((e) => ({ ...e, v: vals[e.si][e.i], py: y(vals[e.si][e.i]) }));
    const collide = ends.some((a, ai) => ends.some((b, bi) => ai < bi && Math.abs(a.py - b.py) < 14));
    for (const e of ends) {
      svg.append(el('circle', { cx: cx(e.i), cy: e.py, r: 4, fill: c.series[e.si].color, stroke: 'var(--surface)', 'stroke-width': 2 }));
      if (!collide) {
        const t = el('text', { x: cx(e.i) + 8, y: e.py, 'dominant-baseline': 'middle', class: 'end-label' });
        t.textContent = compact(Math.round(e.v));
        svg.append(t);
      }
    }
  } else {
    const bw = Math.min(24, Math.max(2, band - 2));
    const r = Math.min(4, bw / 2);
    days.forEach((_, i) => {
      let base = scale.lo;
      const segs = vals.map((v, si) => ({ v: v[i], si })).filter((s) => typeof s.v === 'number' && s.v > 0);
      segs.forEach((s, k) => {
        const top = k === segs.length - 1;
        const y0 = y(base);
        const y1 = y(base + s.v);
        base += s.v;
        // 2px surface gap between stacked segments.
        const gap = k > 0 ? 2 : 0;
        const h = Math.max(0, y0 - y1 - gap);
        if (h <= 0) return;
        svg.append(el('path', { d: barPath(cx(i) - bw / 2, y1, bw, h, top ? Math.min(r, h) : 0), fill: c.series[s.si].color }));
      });
    });
  }

  // Interaction layer: nearest date under the pointer; arrow keys for keyboard users.
  const overlay = el('rect', { x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent' });
  svg.append(overlay);
  const markers = c.type === 'line' ? c.series.map((s) => {
    const dot = el('circle', { r: 4, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(dot);
    return dot;
  }) : [];

  let current = -1;
  const show = (i, anchor) => {
    current = i;
    const x = cx(i);
    crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x); crosshair.setAttribute('visibility', 'visible');
    hoverBand.setAttribute('x', x - band / 2); hoverBand.setAttribute('visibility', 'visible');
    markers.forEach((dot, si) => {
      const v = vals[si][i];
      if (typeof v === 'number') {
        dot.setAttribute('cx', x); dot.setAttribute('cy', y(v)); dot.setAttribute('visibility', 'visible');
      } else dot.setAttribute('visibility', 'hidden');
    });
    const rect = svg.getBoundingClientRect();
    showTooltip(c, days[i], vals.map((v) => v[i]), anchor ?? rect.left + (x / W) * rect.width, rect.top);
  };
  const hide = () => {
    current = -1;
    crosshair.setAttribute('visibility', 'hidden');
    hoverBand.setAttribute('visibility', 'hidden');
    markers.forEach((d) => d.setAttribute('visibility', 'hidden'));
    $('#tooltip').hidden = true;
  };
  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.floor((px - m.left) / band)));
    show(i, e.clientX);
  });
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = current < 0 ? n - 1 : Math.max(0, Math.min(n - 1, current + (e.key === 'ArrowRight' ? 1 : -1)));
    show(next);
  });

  holder.replaceChildren(svg);
}

/** Bar with rounded data-end, square at the baseline. */
function barPath(x, y, w, h, r) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function showTooltip(c, day, values, clientX, top) {
  const tip = $('#tooltip');
  tip.replaceChildren();
  const date = document.createElement('div');
  date.className = 't-date';
  date.textContent = fmtDateLong(day.date);
  tip.append(date);
  c.series.forEach((s, si) => {
    const row = document.createElement('div');
    row.className = 't-row';
    const key = document.createElement('i');
    key.className = 'key-line';
    key.style.background = s.color;
    const val = document.createElement('strong');
    val.textContent = typeof values[si] === 'number' ? c.fmt(values[si]) : '–';
    const label = document.createElement('span');
    label.textContent = s.label;
    row.append(key, val, label);
    tip.append(row);
  });
  if (c.type === 'stack') {
    const total = values.reduce((a, v) => a + (v ?? 0), 0);
    const row = document.createElement('div');
    row.className = 't-row';
    const val = document.createElement('strong');
    val.textContent = c.fmt(total);
    const label = document.createElement('span');
    label.textContent = 'Total';
    const spacer = document.createElement('i');
    spacer.className = 'key-line';
    row.append(spacer, val, label);
    tip.append(row);
  }
  tip.hidden = false;
  // Right of the pointer, flipping left near the viewport edge.
  const tw = tip.offsetWidth;
  const left = clientX + 14 + tw > window.innerWidth - 8 ? clientX - 14 - tw : clientX + 14;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top + 8)}px`;
}

// ── Activities ────────────────────────────────────────────
function renderActivities(acts) {
  const body = $('#activities tbody');
  body.replaceChildren();
  if (!acts.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = 'muted';
    cell.textContent = 'No activities in this range.';
    return;
  }
  for (const a of acts) {
    const row = body.insertRow();
    row.insertCell().textContent = fmtDateLong(a.start.slice(0, 10));
    row.insertCell().textContent = a.name;
    for (const [v, f] of [[a.durationS, fmtDur], [a.distanceM, fmtKm], [a.calories, fmtInt], [a.avgHr, fmtInt]]) {
      const cell = row.insertCell();
      cell.className = 'num';
      cell.textContent = f(v);
    }
  }
}

// ── Data loading & live updates ───────────────────────────
let inflight = null;
async function load() {
  if (inflight) return inflight;
  $('#main').classList.add('loading');
  inflight = fetch(`/api/dashboard?days=${state.days}`)
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
      $('#live-text').textContent = `Couldn't load data (${err.message}) — retrying`;
    })
    .finally(() => {
      inflight = null;
      $('#main').classList.remove('loading');
    });
  return inflight;
}

function render() {
  const data = state.data;
  if (!data) return;
  const days = denseDays(data);
  renderSources(data.sources);
  renderTiles(days);
  renderCharts(days);
  renderActivities(data.activities);
  $('#sync').disabled = data.sources.some((s) => s.syncing);
  renderLive();
}

function renderLive() {
  const dot = $('.live-dot');
  dot.classList.toggle('on', state.live);
  const age = state.lastFetch ? fmtAgo(new Date(state.lastFetch).toISOString()) : '—';
  $('#live-text').textContent = state.live ? `Live · updated ${age}` : `Reconnecting… · updated ${age}`;
}

let debounce;
function connectStream() {
  const es = new EventSource('/api/stream');
  es.addEventListener('open', () => { state.live = true; renderLive(); load(); });
  es.addEventListener('error', () => { state.live = false; renderLive(); });
  es.addEventListener('update', () => {
    clearTimeout(debounce);
    debounce = setTimeout(load, 300);
  });
}

$('#range').value = String(state.days);
$('#range').addEventListener('change', (e) => {
  state.days = Number(e.target.value);
  localStorageSet('dash.range', state.days);
  load();
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
  alert(res.ok ? `Imported ${body.imported} days from MyFitnessPal.` : `Import failed: ${body.error ?? body.message ?? res.status}`);
  e.target.value = '';
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => state.data && renderCharts(denseDays(state.data)), 150);
});

// Relative times tick; a slow poll backs up the stream in case a proxy drops it.
setInterval(() => { renderLive(); state.data && renderSources(state.data.sources); }, 15_000);
setInterval(() => { if (Date.now() - state.lastFetch > 5 * 60_000) load(); }, 60_000);

load();
connectStream();
