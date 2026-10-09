// Chart building blocks. Every chart reads colors from CSS tokens, so light and
// dark themes come for free; every value a tooltip shows is also in a table view.

import { compact, fmtClock, fmtHoursShort, fmtInt } from './insights.js';

const SVG = 'http://www.w3.org/2000/svg';
const num = (v) => typeof v === 'number' && Number.isFinite(v);

export function el(tag, attrs = {}) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export function h(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c);
  return n;
}

export const fmtDateShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const fmtDateLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export function findLastIndex(arr, fn) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}

// ── Tooltip ──────────────────────────────────────────────
/** rows: [{ value, label, color?, key?: 'line'|'rect'|'none' }] */
export function showTip(title, rows, clientX, top) {
  const tip = document.getElementById('tooltip');
  tip.replaceChildren(h('div', { class: 't-date', text: title }));
  for (const r of rows) {
    const key = h('i', { class: r.key === 'rect' ? 'key-rect' : 'key-line' });
    if (r.color) key.style.background = r.color;
    else key.style.visibility = 'hidden';
    tip.append(h('div', { class: 't-row' }, key, h('strong', { text: r.value }), h('span', { text: r.label })));
  }
  tip.hidden = false;
  const tw = tip.offsetWidth;
  const left = clientX + 14 + tw > window.innerWidth - 8 ? clientX - 14 - tw : clientX + 14;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}
export function hideTip() {
  document.getElementById('tooltip').hidden = true;
}

// ── Shared geometry ──────────────────────────────────────
export function linePath(vals, x, y) {
  let d = '';
  let pen = false;
  vals.forEach((v, i) => {
    if (!num(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Round a range out to "nice" tick values. */
export function niceScale(min, max, count = 4, step0) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = step0 ?? [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { lo, hi, ticks };
}

/** Bar with a rounded data-end and a square baseline. */
export function barPath(x, y, w, hgt, r) {
  return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
}

function axisLabel(svg, x, y, text, anchor = 'middle', baseline = 'auto') {
  const t = el('text', { x, y, 'text-anchor': anchor, 'dominant-baseline': baseline, class: 'axis-text' });
  t.textContent = text;
  svg.append(t);
}

// ── Sparkline ────────────────────────────────────────────
export function sparkline(vals) {
  const w = 140;
  const ht = 28;
  const pad = 3;
  const nums = vals.filter(num);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const x = (i) => pad + (i / (vals.length - 1)) * (w - pad * 2);
  const y = (v) => (max === min ? ht / 2 : ht - pad - ((v - min) / (max - min)) * (ht - pad * 2));
  const svg = el('svg', { class: 'spark', viewBox: `0 0 ${w} ${ht}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svg.append(el('path', { d: linePath(vals, x, y), fill: 'none', stroke: 'var(--axis)', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const last = findLastIndex(vals, num);
  svg.append(el('circle', { cx: x(last), cy: y(vals[last]), r: 2.5, fill: 'var(--accent)' }));
  return svg;
}

// ── Time-series chart (line / bar / stacked) ─────────────
/**
 * c: { title, type: 'line'|'bar'|'stack', series: [{label, color, values}], fmt,
 *      axisFmt?, tickStep?, zero?, rolling?: number[] (7-day avg, single series),
 *      goal?: { value, label }, area? }
 */
export function timeChart(holder, c, dates) {
  const W = Math.max(280, holder.clientWidth);
  const H = c.height ?? 200;
  const m = { top: 16, right: c.type === 'line' || c.rolling ? 44 : 10, bottom: 24, left: 44 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const n = dates.length;
  const band = iw / n;
  const cx = (i) => m.left + band * (i + 0.5);
  const vals = c.series.map((s) => s.values);

  let lo;
  let hi;
  if (c.type === 'stack') {
    lo = 0;
    hi = Math.max(1, ...dates.map((_, i) => vals.reduce((sum, v) => sum + (v[i] ?? 0), 0)));
  } else {
    const nums = vals.flat().filter(num);
    lo = c.type === 'bar' || c.zero ? Math.min(0, ...nums) : Math.min(...nums);
    hi = c.zero ? Math.max(0, ...nums) : Math.max(...nums);
    if (c.type === 'line' && !c.zero) {
      const pad = (hi - lo) * 0.15 || 2;
      lo -= pad;
      hi += pad;
    }
  }
  if (c.goal) {
    lo = Math.min(lo, c.goal.value);
    hi = Math.max(hi, c.goal.value * 1.05);
  }
  const scale = niceScale(lo, hi, 4, c.tickStep);
  const y = (v) => m.top + ih - ((v - scale.lo) / (scale.hi - scale.lo)) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, tabindex: 0, role: 'img', 'aria-label': `${c.title}. Use arrow keys to read values; a table view is available.` });

  for (const t of scale.ticks) {
    svg.append(el('line', { x1: m.left, x2: W - m.right, y1: y(t), y2: y(t), stroke: t === 0 || t === scale.lo ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
    axisLabel(svg, m.left - 8, y(t), c.axisFmt ? c.axisFmt(t) : compact(t), 'end', 'middle');
  }
  const every = Math.max(1, Math.ceil(n / 5));
  for (let i = n - 1; i >= 0; i -= every) axisLabel(svg, cx(i), H - 6, fmtDateShort(dates[i]));

  const hoverBand = el('rect', { y: m.top, height: ih, width: band, fill: 'var(--hover)', visibility: 'hidden' });
  const crosshair = el('line', { y1: m.top, y2: m.top + ih, stroke: 'var(--axis)', 'stroke-width': 1, visibility: 'hidden' });
  svg.append(c.type === 'line' ? crosshair : hoverBand);

  if (c.type === 'line') {
    vals.forEach((v, si) => {
      const color = c.series[si].color;
      if (c.area) {
        const zeroY = y(Math.max(scale.lo, Math.min(scale.hi, 0)));
        const first = v.findIndex(num);
        const last = findLastIndex(v, num);
        if (first >= 0) {
          svg.append(el('path', { d: `${linePath(v, cx, y)}L${cx(last)},${zeroY}L${cx(first)},${zeroY}Z`, fill: color, opacity: 0.1 }));
        }
      }
      if (c.rolling) {
        // Daily values as quiet dots; the 7-day average carries the trend.
        v.forEach((p, i) => num(p) && svg.append(el('circle', { cx: cx(i), cy: y(p), r: 2.5, fill: color, opacity: 0.4 })));
      } else {
        svg.append(el('path', { d: linePath(v, cx, y), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        v.forEach((p, i) => {
          if (num(p) && !num(v[i - 1]) && !num(v[i + 1])) svg.append(el('circle', { cx: cx(i), cy: y(p), r: 3, fill: color }));
        });
      }
    });
  } else {
    const bw = Math.min(24, Math.max(2, band - 2));
    const r = Math.min(4, bw / 2);
    dates.forEach((_, i) => {
      let base = 0;
      const segs = vals.map((v, si) => ({ v: v[i], si })).filter((s) => num(s.v) && s.v > 0);
      segs.forEach((s, k) => {
        const y0 = y(base);
        const y1 = y(base + s.v);
        base += s.v;
        const gap = k > 0 ? 2 : 0;
        const hgt = Math.max(0, y0 - y1 - gap);
        if (hgt > 0) svg.append(el('path', { d: barPath(cx(i) - bw / 2, y1, bw, hgt, k === segs.length - 1 ? Math.min(r, hgt) : 0), fill: c.series[s.si].color, opacity: c.rolling ? 0.55 : 1 }));
      });
    });
  }

  // Goal reference line, labelled at the right end.
  if (c.goal) {
    const gy = y(c.goal.value);
    svg.append(el('line', { x1: m.left, x2: W - m.right, y1: gy, y2: gy, stroke: 'var(--text-secondary)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
    // Labelled at the left end, clear of the end-of-line value labels.
    const t = el('text', { x: m.left + 4, y: gy - 5, class: 'goal-label' });
    t.textContent = c.goal.label;
    svg.append(t);
  }

  // 7-day average line + end label.
  const lineSets = c.rolling
    ? [{ values: c.rolling, color: c.type === 'line' ? c.series[0].color : 'var(--text-primary)' }]
    : c.type === 'line'
      ? c.series.map((s) => ({ values: s.values, color: s.color }))
      : [];
  if (c.rolling) {
    svg.append(el('path', { d: linePath(c.rolling, cx, y), fill: 'none', stroke: lineSets[0].color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  }
  const ends = lineSets
    .map((s) => ({ s, i: findLastIndex(s.values, num) }))
    .filter((e) => e.i >= 0)
    .map((e) => ({ ...e, v: e.s.values[e.i], py: y(e.s.values[e.i]) }));
  const collide = ends.some((a, ai) => ends.some((b, bi) => ai < bi && Math.abs(a.py - b.py) < 14));
  for (const e of ends) {
    svg.append(el('circle', { cx: cx(e.i), cy: e.py, r: 4, fill: e.s.color, stroke: 'var(--surface)', 'stroke-width': 2 }));
    if (!collide) {
      const t = el('text', { x: cx(e.i) + 8, y: e.py, 'dominant-baseline': 'middle', class: 'end-label' });
      t.textContent = c.endFmt ? c.endFmt(e.v) : compact(Math.round(e.v));
      svg.append(t);
    }
  }

  // Interaction: nearest date under the pointer; arrow keys for keyboard users.
  svg.append(el('rect', { x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent' }));
  const markers = c.type === 'line' ? lineSets.map((s) => {
    const dot = el('circle', { r: 4, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(dot);
    return { dot, values: s.values };
  }) : [];

  let current = -1;
  const show = (i, clientX) => {
    current = i;
    const x = cx(i);
    crosshair.setAttribute('x1', x);
    crosshair.setAttribute('x2', x);
    crosshair.setAttribute('visibility', 'visible');
    hoverBand.setAttribute('x', x - band / 2);
    hoverBand.setAttribute('visibility', 'visible');
    for (const mk of markers) {
      const v = mk.values[i];
      mk.dot.setAttribute('visibility', num(v) ? 'visible' : 'hidden');
      if (num(v)) {
        mk.dot.setAttribute('cx', x);
        mk.dot.setAttribute('cy', y(v));
      }
    }
    const rect = svg.getBoundingClientRect();
    const rows = c.series.map((s) => ({ value: num(s.values[i]) ? c.fmt(s.values[i]) : '–', label: s.label, color: s.color, key: c.type === 'line' ? 'line' : 'rect' }));
    if (c.type === 'stack') rows.push({ value: c.fmt(vals.reduce((a, v) => a + (v[i] ?? 0), 0)), label: 'Total' });
    if (c.rolling) rows.push({ value: num(c.rolling[i]) ? c.fmt(c.rolling[i]) : '–', label: '7-day average', color: lineSets[0].color });
    if (c.goal) rows.push({ value: c.goal.fmt ? c.goal.fmt(c.goal.value) : c.fmt(c.goal.value), label: 'Goal' });
    showTip(fmtDateLong(dates[i]), rows, clientX ?? rect.left + (x / W) * rect.width, rect.top + 8);
  };
  const hide = () => {
    current = -1;
    crosshair.setAttribute('visibility', 'hidden');
    hoverBand.setAttribute('visibility', 'hidden');
    markers.forEach((mk) => mk.dot.setAttribute('visibility', 'hidden'));
    hideTip();
  };
  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    show(Math.max(0, Math.min(n - 1, Math.floor((px - m.left) / band))), e.clientX);
  });
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    show(current < 0 ? n - 1 : Math.max(0, Math.min(n - 1, current + (e.key === 'ArrowRight' ? 1 : -1))));
  });
  holder.replaceChildren(svg);
}

// ── Bullet bar: actual vs target, with optional pace marker ───
/**
 * b: { label, value, target, unit, fmt, pace?, paceLabel?, over?: 'bad'|'ok',
 *      band?: [lo, hi], status: { level, text } }
 */
export function bullet(b) {
  const max = Math.max(b.target * 1.25, b.value ?? 0, b.band?.[1] ?? 0) || 1;
  const pct = (v) => `${Math.min(100, (v / max) * 100)}%`;
  const overBand = b.band && num(b.value) && b.value > b.band[1];
  const track = h('div', { class: 'bullet-track' });
  if (b.band) track.append(h('div', { class: 'bullet-band', style: { left: pct(b.band[0]), width: `calc(${pct(b.band[1])} - ${pct(b.band[0])})` } }));
  if (num(b.value)) track.append(h('div', { class: `bullet-fill${overBand ? ' over' : ''}`, style: { width: pct(b.value) } }));
  track.append(h('div', { class: 'bullet-target', style: { left: pct(b.target) }, title: `Goal ${b.fmt(b.target)}` }));
  if (num(b.pace)) track.append(h('div', { class: 'bullet-pace', style: { left: pct(b.pace) }, title: b.paceLabel ?? 'Where you would be on pace' }));

  return h(
    'div',
    { class: 'bullet' },
    h(
      'div',
      { class: 'bullet-head' },
      h('span', { class: 'bullet-label', text: b.label }),
      h('span', { class: 'bullet-value' }, h('strong', { text: num(b.value) ? b.fmt(b.value) : '–' }), ` / ${b.fmt(b.target)}${b.unit ? ` ${b.unit}` : ''}`),
    ),
    track,
    b.status ? statusLine(b.status.level, b.status.text) : null,
  );
}

const STATUS_ICON = {
  good: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--status-good)"/><path d="M4.5 8.2l2.2 2.2 4.8-4.8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warning: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l7 12.5H1z" fill="var(--status-warning)" stroke-linejoin="round"/><path d="M8 6v3.5M8 11.6v.1" stroke="#0b0b0b" stroke-width="1.6" stroke-linecap="round"/></svg>',
  critical: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--status-critical)"/><path d="M8 4.5v4.2M8 11.2v.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--accent)"/><path d="M8 7.2v4.3M8 4.6v.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
export const LEVEL_LABEL = { good: 'On track', warning: 'Needs attention', critical: 'Off track', info: 'Note' };

export function statusIcon(level) {
  const i = h('span', { class: 'status-icon', title: LEVEL_LABEL[level] });
  i.innerHTML = STATUS_ICON[level];
  return i;
}

export function statusLine(level, text) {
  return h('div', { class: 'status-line' }, statusIcon(level), h('span', { text }));
}

// ── Habit grid: one strip per goal, one cell per day ─────
const BIN_LABEL = ['Missed', 'Close', 'Nearly', 'Hit'];

/** rows: [{ habit, stats }], fmtValue(habit, day) */
export function habitGrid(rows, days, fmtValue) {
  const wrap = h('div', { class: 'habit-grid' });
  wrap.append(
    h(
      'div',
      { class: 'legend heat-legend' },
      ...[3, 2, 1, 0].map((b) => h('span', {}, h('i', { class: `heat-swatch heat-${b}` }), BIN_LABEL[b])),
      h('span', {}, h('i', { class: 'heat-swatch heat-none' }), 'No data'),
    ),
  );
  for (const { habit, stats } of rows) {
    const strip = h('div', { class: 'heat-strip', style: { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` } });
    stats.bins.forEach((b, i) => {
      const cell = h('div', { class: `heat-cell ${num(b) ? `heat-${b}` : 'heat-none'}` });
      cell.addEventListener('pointerenter', (e) => {
        const r = cell.getBoundingClientRect();
        showTip(fmtDateLong(days[i].date), [
          { value: fmtValue(habit, days[i]), label: habit.label },
          { value: habit.target, label: 'Goal' },
          { value: num(b) ? BIN_LABEL[b] : 'Not scored', label: '' },
        ], e.clientX, r.bottom + 8);
      });
      cell.addEventListener('pointerleave', hideTip);
      strip.append(cell);
    });
    const rate = num(stats.rate) ? `${Math.round(stats.rate * 100)}%` : '–';
    wrap.append(
      h(
        'div',
        { class: 'heat-row' },
        h(
          'div',
          { class: 'heat-head' },
          h('span', {}, h('strong', { text: habit.label }), h('span', { class: 'muted', text: ` · ${habit.target}` })),
          h(
            'span',
            { class: 'heat-stats' },
            h('span', {}, h('strong', { text: rate }), h('span', { class: 'muted', text: ` hit (${stats.met}/${stats.evaluated})` })),
            h('span', {}, h('strong', { text: String(stats.streak) }), h('span', { class: 'muted', text: ` day streak · best ${stats.best}` })),
          ),
        ),
        strip,
      ),
    );
  }
  const axis = h('div', { class: 'heat-axis' });
  for (const i of [0, Math.floor((days.length - 1) / 2), days.length - 1]) axis.append(h('span', { text: fmtDateShort(days[i].date) }));
  wrap.append(axis);
  return wrap;
}

// ── Sleep schedule: each night as a bar from bedtime to wake ───
export function sleepSchedule(holder, days, bed, wake, targetBed, fmtDur) {
  const W = Math.max(280, holder.clientWidth);
  const H = 220;
  const m = { top: 14, right: 10, bottom: 24, left: 48 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const n = days.length;
  const band = iw / n;
  const cx = (i) => m.left + band * (i + 0.5);
  const beds = days.map(bed);
  const wakes = days.map(wake);
  const lo = Math.floor((Math.min(targetBed, ...beds.filter(num)) - 30) / 60) * 60;
  const hi = Math.ceil((Math.max(...wakes.filter(num)) + 30) / 60) * 60;
  // Clock time runs downwards: evening at the top, morning at the bottom.
  const y = (v) => m.top + ((v - lo) / (hi - lo)) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, tabindex: 0, role: 'img', 'aria-label': 'Sleep schedule: bedtime to wake time per night. Use arrow keys to read values.' });
  const step = hi - lo > 720 ? 180 : 120;
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
    svg.append(el('line', { x1: m.left, x2: W - m.right, y1: y(t), y2: y(t), stroke: 'var(--grid)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
    axisLabel(svg, m.left - 8, y(t), fmtClock(t), 'end', 'middle');
  }
  const every = Math.max(1, Math.ceil(n / 5));
  for (let i = n - 1; i >= 0; i -= every) axisLabel(svg, cx(i), H - 6, fmtDateShort(days[i].date));

  const hoverBand = el('rect', { y: m.top, height: ih, width: band, fill: 'var(--hover)', visibility: 'hidden' });
  svg.append(hoverBand);

  const bw = Math.min(14, Math.max(3, band - 3));
  days.forEach((_, i) => {
    if (!num(beds[i]) || !num(wakes[i])) return;
    const late = beds[i] > targetBed;
    svg.append(el('rect', { x: cx(i) - bw / 2, y: y(beds[i]), width: bw, height: Math.max(2, y(wakes[i]) - y(beds[i])), rx: Math.min(4, bw / 2), fill: late ? 'var(--series-2)' : 'var(--series-1)' }));
  });

  const ty = y(targetBed);
  svg.append(el('line', { x1: m.left, x2: W - m.right, y1: ty, y2: ty, stroke: 'var(--text-secondary)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
  const tl = el('text', { x: m.left + 4, y: ty - 5, class: 'goal-label' });
  tl.textContent = `Target bedtime ${fmtClock(targetBed)}`;
  svg.append(tl);

  svg.append(el('rect', { x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent' }));
  let current = -1;
  const show = (i, clientX) => {
    current = i;
    hoverBand.setAttribute('x', cx(i) - band / 2);
    hoverBand.setAttribute('visibility', 'visible');
    const rect = svg.getBoundingClientRect();
    const b = beds[i];
    const w = wakes[i];
    showTip(`Night before ${fmtDateLong(days[i].date)}`, [
      { value: fmtClock(b), label: num(b) && b > targetBed ? `In bed, ${Math.round(b - targetBed)} min late` : 'In bed', color: num(b) && b > targetBed ? 'var(--series-2)' : 'var(--series-1)', key: 'rect' },
      { value: fmtClock(w), label: 'Woke' },
      { value: fmtDur(days[i]), label: 'Asleep' },
    ], clientX ?? rect.left + (cx(i) / W) * rect.width, rect.top + 8);
  };
  const hide = () => {
    current = -1;
    hoverBand.setAttribute('visibility', 'hidden');
    hideTip();
  };
  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    show(Math.max(0, Math.min(n - 1, Math.floor((px - m.left) / band))), e.clientX);
  });
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    show(current < 0 ? n - 1 : Math.max(0, Math.min(n - 1, current + (e.key === 'ArrowRight' ? 1 : -1))));
  });
  holder.replaceChildren(svg);
}

// ── Diverging bars: difference with vs without a behaviour ───
export function divergingBars(results, unit, outcomeLabel) {
  const maxAbs = Math.max(1, ...results.filter((r) => r.enough).map((r) => Math.abs(r.diff)));
  const list = h('div', { class: 'diverge' });
  list.append(
    h('div', { class: 'diverge-axis' }, h('span'), h('div', { class: 'diverge-axis-labels' }, h('span', { text: `Lower ${outcomeLabel.toLowerCase()}` }), h('span', { text: `Higher ${outcomeLabel.toLowerCase()}` })), h('span')),
  );
  for (const r of results) {
    const track = h('div', { class: 'diverge-track' }, h('div', { class: 'diverge-zero' }));
    let value;
    if (r.enough) {
      const w = `${(Math.abs(r.diff) / maxAbs) * 50}%`;
      const pos = r.diff >= 0;
      track.append(h('div', { class: `diverge-bar ${pos ? 'pos' : 'neg'}`, style: pos ? { left: '50%', width: w } : { right: '50%', width: w } }));
      const rounded = Math.round(r.diff * 10) / 10;
      value = h('span', { class: 'diverge-value', text: `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} ${unit}` });
    } else {
      value = h('span', { class: 'diverge-value muted', text: 'Too few days' });
    }
    list.append(
      h(
        'div',
        { class: 'diverge-row' },
        h('div', { class: 'diverge-label' }, h('span', { text: r.label }), h('span', { class: 'muted small', text: `${r.nYes} days with · ${r.nNo} without` })),
        track,
        value,
      ),
    );
  }
  return list;
}

export { fmtInt, fmtHoursShort };
