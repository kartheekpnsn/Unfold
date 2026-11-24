// Unfold scene templates + shared kit data. No imports and no DOM: the player installs these on the real kit,
// and validate-lesson.mjs installs the same code on its mock kit.
//
// A template draws a whole, common picture from a few props, using only kit primitives, keyed under `key`.
// It follows the motion rules by default: stable keys (things glide), one focal change (the active item),
// labels on the object, everything inside the stage safe area (±320 × ±210).

export const PRIMITIVES = ['box', 'plate', 'token', 'label', 'pointer', 'arrow', 'rect', 'text', 'line', 'sarrow', 'path', 'circle',
  'chart', 'axis', 'linechart', 'scatter', 'person', 'icon'];

// Duration tokens (ms). P2: use these, not ad-hoc timings.
export const MOTION = { quick: 200, state: 520, reveal: 800 };

// Visual styles: a skin over the same scenes. See references/styles/<name>.md.
//   fill: 'solid' (filled, shaded) | 'tint' (light wash + outline) | 'flat' (solid, no outlines)
//   outline: 'self' (each colour's dark ink) | 'ink' (one dark marker)   wobble: px of hand-drawn displacement
//   drawOn: strokes draw themselves when they appear   hand: handwriting font   mesh: three.js boxes
export const STYLES = {
  isometric: { label: 'Clean', fill: 'solid', stroke: 1, wobble: 0, drawOn: false },
  line: { label: 'Line', fill: 'tint', tint: 0.1, outline: 'self', stroke: 1.5, wobble: 0, drawOn: true },
  sketch: { label: 'Sketch', fill: 'tint', tint: 0.38, outline: 'ink', stroke: 1.7, wobble: 2.4, wobbleFreq: 0.028, drawOn: true, hand: true },
  chalk: { label: 'Chalk', fill: 'tint', tint: 0.22, outline: 'self', stroke: 2, wobble: 1.6, wobbleFreq: 0.05, grain: true, drawOn: true, hand: true },
  pictogram: { label: 'Pictogram', fill: 'flat', stroke: 1, wobble: 0, drawOn: false, round: true },
  '3d': { label: '3D', fill: 'solid', stroke: 1, wobble: 0, drawOn: false, mesh: true },
};
export const STYLE_NAMES = Object.keys(STYLES);
export const TEMPLATE_NAMES = ['caption', 'pipeline', 'timeline', 'compare', 'array', 'stack', 'graphWalk', 'chartStory'];

const S = MOTION.state;
const clampText = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

export function installTemplates(kit) {
  // A one-line caption across the top of the stage.
  kit.caption = (text, { color = 'ink-2', key = 'caption' } = {}) => {
    if (text) kit.text(key, { x: 0, y: -212, text, size: 15, weight: 600, color });
  };

  // Stages in a row; the active one lights up and a token glides to it.
  // stages: ['Text', 'Tokens'] | [{ label, sub, color }]; active: index; note: text under the active stage.
  kit.pipeline = (key, { stages = [], active = 0, y = 0, width = 640, h = 46, note, flow = true, color = 'blue' } = {}) => {
    const n = stages.length || 1, gap = 18, w = Math.min(140, (width - gap * (n - 1)) / n), total = n * w + (n - 1) * gap, x0 = -total / 2;
    stages.forEach((st, i) => {
      const s = typeof st === 'string' ? { label: st } : st, x = x0 + i * (w + gap);
      const on = i === active, done = i < active;
      kit.rect(`${key}-s${i}`, { x, y: y - h / 2, w, h, r: 10, fill: on ? (s.color || color) : done ? `${s.color || color}-soft` : 'surface',
        stroke: on ? `${s.color || color}-ink` : done ? (s.color || color) : 'line-strong', strokeWidth: on ? 2 : 1,
        label: s.label, labelColor: on ? '#ffffff' : 'ink', labelSize: 13, delay: on ? S * 0.5 : 0 });
      if (s.sub) kit.text(`${key}-sub${i}`, { x: x + w / 2, y: y + h / 2 + 14, text: s.sub, size: 11, color: 'muted', mono: true });
      if (i < n - 1) kit.sarrow(`${key}-a${i}`, { x1: x + w + 2, y1: y, x2: x + w + gap - 2, y2: y, color: i < active ? color : 'line-strong', width: 1.6 });
    });
    if (flow && n) {
      const ax = x0 + active * (w + gap) + w / 2;
      kit.circle(`${key}-flow`, { x: ax, y: y - h / 2 - 12, r: 6, fill: 'yellow', stroke: 'yellow-ink', strokeWidth: 1.5, ease: 'out' });
    }
    if (note) kit.text(`${key}-note`, { x: x0 + active * (w + gap) + w / 2, y: y + h / 2 + 34, text: note, size: 12.5, weight: 700, color: `${color}-ink`, mono: true, delay: S * 0.6 });
  };

  // Dated events on a line; past events solid, future muted, a "now" marker glides to the current one.
  // events: [{ when, title }]; now: index.
  kit.timeline = (key, { events = [], now = events.length - 1, y = 20, x0 = -300, x1 = 300, color = 'blue' } = {}) => {
    const n = events.length || 1, step = n > 1 ? (x1 - x0) / (n - 1) : 0;
    kit.line(`${key}-axis`, { x1: x0 - 10, y1: y, x2: x1 + 10, y2: y, color: 'line-strong', width: 2 });
    const px = i => (n > 1 ? x0 + i * step : 0);
    kit.line(`${key}-done`, { x1: x0 - 10, y1: y, x2: px(Math.max(0, now)), y2: y, color, width: 3 });
    events.forEach((e, i) => {
      const x = px(i), past = i <= now, up = i % 2 === 0;
      kit.circle(`${key}-dot${i}`, { x, y, r: i === now ? 9 : 6, fill: i === now ? 'yellow' : past ? color : 'surface', stroke: past ? `${color}-ink` : 'line-strong', strokeWidth: 1.5 });
      kit.text(`${key}-when${i}`, { x, y: y + (up ? -26 : 26), text: String(e.when), size: 12, weight: 700, mono: true, color: past ? 'ink' : 'muted' });
      kit.text(`${key}-t${i}`, { x, y: y + (up ? -46 : 46), text: clampText(e.title, Math.max(10, Math.floor(step / 6.5) || 30)), size: 12, color: past ? 'ink-2' : 'muted' });
    });
  };

  // Two things side by side. items: up to 5 short rows each; or value: a number drawn as a bar that grows/counts.
  // highlight: 'left' | 'right' | null.
  kit.compare = (key, { left = {}, right = {}, highlight = null, y = -150, colW = 260, rowH = 34, max } = {}) => {
    const cols = [['left', left, -colW - 20], ['right', right, 20]];
    const vmax = max ?? Math.max(1, left.value || 0, right.value || 0);
    for (const [side, c, x] of cols) {
      const on = highlight === side, col = c.color || (side === 'left' ? 'blue' : 'green');
      kit.rect(`${key}-${side}-head`, { x, y, w: colW, h: 40, r: 10, fill: on ? col : `${col}-soft`, stroke: on ? `${col}-ink` : col, strokeWidth: on ? 2 : 1, label: c.title || side, labelColor: on ? '#ffffff' : 'ink', labelSize: 15 });
      (c.items || []).slice(0, 5).forEach((it, i) => {
        kit.rect(`${key}-${side}-i${i}`, { x, y: y + 52 + i * (rowH + 8), w: colW, h: rowH, r: 8, fill: 'surface', stroke: on ? col : 'line-strong', label: it, labelSize: 12.5, delay: i * 60 });
      });
      if (c.value != null) {   // a bar under the rows that grows, with a value that counts
        const rows = Math.min(5, (c.items || []).length), base = y + 52 + rows * (rowH + 8) + 24 + 150, bh = 150 * (c.value / vmax);
        kit.rect(`${key}-${side}-bar`, { x: x + colW / 2 - 40, y: base - bh, w: 80, h: bh, r: 6, fill: col, stroke: 'none' });
        kit.text(`${key}-${side}-val`, { x: x + colW / 2, y: base - bh - 14, text: c.valueText ?? String(c.value), size: 15, weight: 700, mono: true });
      }
    }
    kit.text(`${key}-vs`, { x: 0, y: y + 20, text: 'vs', size: 13, weight: 700, color: 'muted' });
  };

  // Array slots on the floor with items in them (isometric). items keep their identity (id, else value) so they glide.
  // items: [v | { id, label, color }]; highlight: [i]; pointers: { name: index }; capacity: slot count.
  kit.array = (key, { items = [], highlight = [], pointers = {}, capacity = items.length, cell = Math.min(1.9, 9 / Math.max(1, capacity)), x = -capacity * cell / 2 + 1, y = -1, color = 'blue' } = {}) => {
    const vals = items.map(it => (typeof it === 'object' ? it : { label: it }));
    const unique = new Set(vals.map(v => v.id ?? v.label)).size === vals.length;
    for (let i = 0; i < capacity; i++) {
      kit.plate(`${key}-slot${i}`, { x: x + i * cell, y, z: 0, w: cell * 0.92, d: cell * 0.92, color: 'surface-2', stroke: 'line-strong', dashed: i >= vals.length });
      kit.label(`${key}-idx${i}`, { x: x + i * cell + cell * 0.46, y: y + cell * 1.2, z: 0, text: String(i), size: 12, color: 'muted', mono: true });
    }
    vals.forEach((v, i) => {
      const id = unique ? (v.id ?? v.label) : i;
      kit.box(`${key}-v-${id}`, { x: x + i * cell + cell * 0.06, y: y + cell * 0.06, z: 0, w: cell * 0.8, d: cell * 0.8, h: cell * 0.6, color: v.color || (highlight.includes(i) ? 'yellow' : color), label: v.label, labelOn: 'top', labelSize: Math.min(20, 11 + cell * 4) });
    });
    Object.entries(pointers).forEach(([name, i], k) => {
      kit.pointer(`${key}-p-${name}`, { x: x + i * cell + cell * 0.46, y, z: cell * 0.6, text: `${name} = ${i}`, dx: 40 + k * 10, dy: -50 - k * 26, color: 'blue-ink' });
    });
  };

  // A stack of boxes with the top marked; popped items slide to a tray on the right (inside the safe area).
  // items: bottom → top; popped: most recent first.
  kit.stack = (key, { items = [], popped = [], color = 'blue', top = 'top', h = 0.55, x = -0.75, y = -0.75 } = {}) => {
    kit.plate(`${key}-base`, { x: x - 0.3, y: y - 0.3, z: 0, w: 2.1, d: 2.1, color: 'surface-2', label: 'STACK' });
    const ids = new Set();
    items.forEach((v, i) => {
      const it = typeof v === 'object' ? v : { label: v };
      const id = it.id ?? it.label; ids.add(id);
      kit.box(`${key}-v-${id}`, { x, y, z: 0.02 + i * (h + 0.06), w: 1.5, d: 1.5, h, color: it.color || (i === items.length - 1 ? 'green' : color), label: it.label });
    });
    popped.slice(0, 4).forEach((v, i) => {
      const it = typeof v === 'object' ? v : { label: v };
      const id = it.id ?? it.label; if (ids.has(id)) return;
      kit.box(`${key}-v-${id}`, { x: 2.6 + i * 0.25, y: -1.4 + i * 1.2, z: 0, w: 1.1, d: 1.1, h: 0.3, color: 'red', label: it.label, labelOn: 'top' });
    });
    if (popped.length) kit.label(`${key}-tray`, { x: 3.2, y: -2.2, z: 0, text: 'popped', size: 11, weight: 700, color: 'red-ink', mono: true });
    kit.pointer(`${key}-top`, { x: x + 1.5, y, z: 0.02 + Math.max(0, items.length) * (h + 0.06) - (items.length ? 0.06 : 0), text: items.length ? top : `${top} = none`, dx: 60, dy: -20 });
  };

  // A graph: nodes, edges, and a walker that moves along a highlighted path (edges on the path draw themselves).
  // nodes: [{ id, x, y, label }] in screen px; edges: [[a, b, label?]]; path: [id…]; at: id; visited: [id…].
  kit.graphWalk = (key, { nodes = [], edges = [], path = [], at = null, visited = [], directed = true, r = 22 } = {}) => {
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const onPath = new Set(path.slice(1).map((b, i) => `${path[i]}>${b}`));
    const trim = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return [a.x + dx / L * (r + 2), a.y + dy / L * (r + 2), b.x - dx / L * (r + 4), b.y - dy / L * (r + 4)]; };
    for (const [a, b, lab] of edges) {
      const A = byId[a], B = byId[b]; if (!A || !B) continue;
      const [x1, y1, x2, y2] = trim(A, B);
      kit[directed ? 'sarrow' : 'line'](`${key}-e-${a}-${b}`, { x1, y1, x2, y2, color: 'line-strong', width: 1.5, label: lab, ldy: -10 });
      if (onPath.has(`${a}>${b}`) || (!directed && onPath.has(`${b}>${a}`))) kit.sarrow(`${key}-pe-${a}-${b}`, { x1, y1, x2, y2, color: 'yellow-ink', width: 3, draw: true, layer: 0.95 });
    }
    for (const n of nodes) {
      const isAt = n.id === at, seen = visited.includes(n.id) || path.includes(n.id);
      kit.circle(`${key}-n-${n.id}`, { x: n.x, y: n.y, r, fill: isAt ? 'yellow' : seen ? 'blue' : 'surface', stroke: isAt ? 'yellow-ink' : seen ? 'blue-ink' : 'line-strong', strokeWidth: 1.5,
        label: n.label ?? n.id, labelColor: isAt ? 'ink' : seen ? '#ffffff' : 'ink', layer: 0.97 });
    }
    if (at != null && byId[at]) kit.circle(`${key}-walker`, { x: byId[at].x, y: byId[at].y - r - 10, r: 5, fill: 'yellow-ink', layer: 0.99, ease: 'out' });
  };

  // A chart that tells a story: a highlighted point (line) or bar (bars) moves per step, with a note beside it.
  // kind: 'line' | 'bar'; series (line) or values + labels (bar); focus: x value (line) or index (bar).
  kit.chartStory = (key, { kind = 'line', series = [], values = [], labels = [], xs, focus = null, note, x = -280, y = -150, w = 520, h = 280, xLabel, yLabel, yMin, yMax, xMin, xMax, color = 'blue' } = {}) => {
    if (kind === 'bar') {
      const colors = values.map((_, i) => (i === focus ? 'yellow' : color));
      kit.chart(`${key}-bars`, { x, y, w, h, values, labels, colors, showValues: true, max: yMax });
      if (note && focus != null) {
        const n = values.length || 1, bw = (w - 6 * (n - 1)) / n, bx = x + focus * (bw + 6) + bw / 2;
        kit.text(`${key}-note`, { x: Math.max(x + 80, Math.min(x + w - 80, bx)), y: y - 18, text: note, size: 12.5, weight: 700, color: 'yellow-ink' });
      }
      return;
    }
    kit.linechart(`${key}-line`, { x, y, w, h, series, xs, xLabel, yLabel, yMin, yMax, xMin, xMax, grid: true, marker: focus != null ? { at: focus, label: note } : null });
  };
}
