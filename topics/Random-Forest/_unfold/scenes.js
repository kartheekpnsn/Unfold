// Scenes for "Random Forest". State-based: render(state, prev, kit) draws the whole picture for one step.
// Colour meaning: green = correct, red = wrong/error, yellow = highlighted (strong feature, OOB, focus), blue = normal.

// ---------- shared helpers (pure, no DOM) ----------
const fmt = (v, d = 2) => Number(v).toFixed(d);
const arcPt = (cx, cy, r, v) => { const a = Math.PI * (1 - Math.max(0, Math.min(1, v))); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
function gauge(kit, key, { cx, cy, r, v, ticks = [], title, value }) {
  kit.path(key + '-arc', { d: `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`, stroke: 'line-strong', width: 10 });
  ticks.forEach(([tv, tl], i) => {
    const [x, y] = arcPt(cx, cy, r + 16, tv);
    kit.text(key + '-tick-' + i, { x, y, text: tl, size: 11, color: 'muted', mono: true });
  });
  const [nx, ny] = arcPt(cx, cy, r - 6, v);
  kit.line(key + '-needle', { x1: cx, y1: cy, x2: nx, y2: ny, color: 'ink-2', width: 3 });
  kit.circle(key + '-hub', { x: cx, y: cy, r: 6, fill: 'ink-2' });
  if (title) kit.text(key + '-title', { x: cx, y: cy - r - 34, text: title, size: 13, weight: 700, color: 'ink-2' });
  if (value) kit.text(key + '-value', { x: cx, y: cy + 22, text: value, size: 15, weight: 700, color: 'ink', mono: true });
}

// ---------- ELI5: a jury of noisy jurors ----------
const jury = {
  mode: 'svg',
  label: 'A jury of jurors whose mistakes are shared or independent',
  view: { scale: 44, originX: 0, originY: 60 },
  render(s, prev, kit) {
    kit.begin();
    const n = s.jurors || 1, wrong = new Set(s.wrong || []);
    const slices = ['A C F', 'B D H', 'C E I', 'A F G', 'B E H', 'D G I', 'A B E', 'C H I', 'D F G'];
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) * 0.82, x = t, y = -t;
      const isWrong = wrong.has(i), k = n === 1 ? 1.7 : 1;
      kit.box('body-' + i, { x: x - 0.25 * k, y: y - 0.25 * k, z: 0, w: 0.5 * k, d: 0.5 * k, h: 0.8 * k, color: 'blue', delay: i * 50 });
      kit.token('head-' + i, { x, y, z: 1.12 * k, r: 12 * k, color: 'blue', delay: i * 50 });
      if (s.flip) {
        kit.token('badge-' + i, { x, y, z: 2.1 * k, r: 16, color: 'yellow', label: '?', labelColor: '#1B1B1F' });
      } else if (s.verdict) {
        kit.token('badge-' + i, { x, y, z: 1.95, r: 11, color: isWrong ? 'red' : 'green', label: isWrong ? '✗' : '✓', delay: 80 + i * 60 });
      }
      if (s.shared) kit.box('card-' + i, { x: x + 0.28, y: y - 0.3, z: 0.25, w: 0.08, d: 0.6, h: 0.45, color: 'line-strong', outline: 'ink-2', delay: i * 40 });
      if (s.slices) {
        kit.box('card-' + i, { x: x + 0.28, y: y - 0.3, z: 0.25, w: 0.08, d: 0.6, h: 0.45, color: 'surface', outline: 'blue-ink', delay: i * 40 });
        kit.label('slice-' + i, { x, y, z: 0, text: slices[i % slices.length], size: 11, weight: 700, color: 'blue-ink', mono: true, dy: 26 });
      }
    }
    if (s.flip) {
      kit.rect('pile-a', { x: -340, y: 110, w: 250, h: 56, r: 10, fill: 'green-soft', stroke: 'green', label: 'Evidence, version 1  →  ✓ right', labelColor: 'green-ink', labelSize: 14 });
      kit.rect('pile-b', { x: 90, y: 110, w: 250, h: 56, r: 10, fill: 'red-soft', stroke: 'red', label: '2 facts shifted  →  ✗ wrong', labelColor: 'red-ink', labelSize: 14 });
      kit.sarrow('to-a', { x1: -22, y1: 60, x2: -200, y2: 104, color: 'green-ink', curve: 20 });
      kit.sarrow('to-b', { x1: 22, y1: 60, x2: 200, y2: 104, color: 'red-ink', curve: -20 });
    }
    if (s.verdict) {
      const ok = s.verdict === 'right';
      const nw = wrong.size, nr = n - nw;
      kit.rect('verdict', { x: -190, y: 112, w: 380, h: 48, r: 12, fill: ok ? 'green-soft' : 'red-soft', stroke: ok ? 'green' : 'red',
        label: `Majority verdict: ${ok ? '✓ right' : '✗ wrong'}  (${nr} right, ${nw} wrong)`, labelColor: ok ? 'green-ink' : 'red-ink', labelSize: 15, delay: 300 });
    }
    if (s.shared) kit.pointer('news', { x: 3.6, y: -3.6, z: 0.5, text: 'everyone read the same newspaper', dx: -60, dy: -150, color: 'ink-2' });
    if (s.labels) {
      kit.pointer('lab-tree', { x: -3.28, y: 3.28, z: 1.12, text: 'juror = one decision tree', dx: 10, dy: -150, color: 'blue-ink' });
      kit.pointer('lab-slice', { x: 3.28, y: -3.28, z: 0, text: 'slice = random rows + features', dx: -40, dy: 145, color: 'blue-ink' });
    }
    if (s.caption) kit.text('caption', { x: 0, y: -215, text: s.caption, size: 16, weight: 600, color: 'ink-2' });
    kit.end();
  },
};

// ---------- Core: the whole mechanism on one composite stage ----------
const STRONG = 'D';
const CHIP_X = i => -330 + i * 38;
const TREE_X = [-300, -195, -90, 15, 120];
const VB = { y0: 190, maxH: 150, w: 50 };

function miniTree(kit, key, cx, root, opts = {}) {
  const top = -70, mid = -28, low = 12;
  const kids = [cx - 26, cx + 26], leaves = [cx - 38, cx - 14, cx + 14, cx + 38];
  const d = opts.delay || 0;
  kit.line(key + '-e0', { x1: cx, y1: top, x2: kids[0], y2: mid, color: 'line-strong', width: 2, delay: d });
  kit.line(key + '-e1', { x1: cx, y1: top, x2: kids[1], y2: mid, color: 'line-strong', width: 2, delay: d });
  leaves.forEach((lx, j) => {
    kit.line(key + '-l' + j, { x1: kids[j < 2 ? 0 : 1], y1: mid, x2: lx, y2: low, color: 'line-strong', width: 1.5, delay: d });
    kit.circle(key + '-leaf' + j, { x: lx, y: low, r: 5, fill: 'surface-2', stroke: 'line-strong', delay: d });
  });
  kids.forEach((kx, j) => kit.circle(key + '-kid' + j, { x: kx, y: mid, r: 8, fill: 'blue-soft', stroke: 'blue', delay: d }));
  const strong = root === STRONG;
  kit.circle(key + '-root', { x: cx, y: top, r: 14, fill: strong ? 'yellow' : 'blue', stroke: strong ? 'yellow-ink' : 'blue-ink', label: root, labelColor: strong ? '#1B1B1F' : '#ffffff', labelSize: 13, delay: d });
}

const forestMain = {
  mode: 'svg',
  label: 'Random forest: bootstrap, trees, feature subsets, correlation and variance',
  render(s, prev, kit) {
    kit.begin();
    const show = new Set(s.panel || []);
    const roots = s.roots || [];

    // data strip + bag
    if (show.has('data')) {
      const drawn = s.drawn || [], oob = new Set(s.oob || []);
      kit.text('data-title', { x: -345, y: -222, text: 'training rows (N = 12)', size: 12, weight: 700, color: 'muted', anchor: 'start' });
      for (let i = 0; i < 12; i++) {
        const isOob = oob.has(i), dim = s.dimData;
        kit.circle('chip-' + i, { x: CHIP_X(i), y: -190, r: 13, fill: isOob ? 'yellow' : 'surface-2', stroke: isOob ? 'yellow-ink' : 'line-strong', label: String(i + 1), labelColor: isOob ? '#1B1B1F' : 'ink-2', opacity: dim ? 0.45 : 1 });
        if (isOob) kit.text('oob-' + i, { x: CHIP_X(i), y: -166, text: 'OOB', size: 10, weight: 700, color: 'yellow-ink', mono: true, delay: i * 40 });
        if (show.has('bag') && drawn[i] > 1) kit.text('mult-' + i, { x: CHIP_X(i), y: -166, text: '×' + drawn[i], size: 10, weight: 700, color: 'blue-ink', mono: true });
      }
    }
    if (show.has('bag')) {
      const drawn = s.drawn || [];
      const draws = [];
      drawn.forEach((c, i) => { for (let k = 0; k < c; k++) draws.push(i); });
      kit.rect('bag', { x: -348, y: -152, w: 456, h: 40, r: 10, fill: 'surface', stroke: 'muted', dashed: true });
      kit.text('bag-title', { x: 118, y: -132, text: 'bootstrap bag\n(12 draws)', size: 11, weight: 700, color: 'muted', anchor: 'start' });
      draws.forEach((c, k) => kit.circle('draw-' + k, { x: CHIP_X(k), y: -132, r: 10, fill: 'blue', label: String(c + 1), labelSize: 10, delay: k * 70 }));
      if (s.oob?.length) kit.text('oob-count', { x: -120, y: -88, text: `left out of this bag: ${s.oob.length} of 12 rows  (≈ 37% on average)`, size: 14, weight: 700, color: 'yellow-ink', mono: true });
    }

    // trees
    if (show.has('trees')) {
      const n = s.trees || 1;
      for (let i = 0; i < n; i++) {
        const cx = n === 1 ? -110 : TREE_X[i];
        miniTree(kit, 'tree-' + i, cx, roots[i] || STRONG, { delay: i * 90 });
        kit.text('tree-name-' + i, { x: cx, y: 34, text: 'tree ' + (i + 1), size: 11, weight: 600, color: 'muted' });
        if (show.has('bags')) kit.rect('tbag-' + i, { x: cx - 38, y: -124, w: 76, h: 22, r: 11, fill: 'surface', stroke: 'muted', dashed: true, label: 'bag ' + (i + 1), labelSize: 11, labelColor: 'muted', delay: i * 90 });
        const dealt = s.dealt?.[i];
        if (dealt) dealt.forEach((f, k) => kit.rect(`deal-${i}-${k}`, { x: cx - 37 + k * 26, y: -124, w: 22, h: 22, r: 5, fill: f === STRONG ? 'yellow' : 'surface', stroke: f === STRONG ? 'yellow-ink' : 'line-strong', label: f, labelSize: 12, labelColor: f === STRONG ? '#1B1B1F' : 'ink-2', mono: true, delay: i * 90 + k * 60 }));
        if (s.weakBadge && i === 0) kit.rect('weak', { x: cx - 52, y: -124, w: 104, h: 24, r: 12, fill: 'red-soft', stroke: 'red', label: 'm = 1: weaker tree', labelColor: 'red-ink', labelSize: 11, layer: 30 });
      }
      if (s.ghost) {
        const cx = -110;
        kit.line('ghost-e0', { x1: cx, y1: -70, x2: cx - 44, y2: -28, color: 'yellow-ink', width: 2, dashed: true });
        kit.line('ghost-e1', { x1: cx, y1: -70, x2: cx + 10, y2: -28, color: 'yellow-ink', width: 2, dashed: true });
        kit.line('ghost-e2', { x1: cx + 10, y1: -28, x2: cx - 4, y2: 12, color: 'yellow-ink', width: 2, dashed: true });
        kit.line('ghost-e3', { x1: cx + 10, y1: -28, x2: cx + 60, y2: 12, color: 'yellow-ink', width: 2, dashed: true });
        kit.line('ghost-e4', { x1: cx + 60, y1: 12, x2: cx + 76, y2: 50, color: 'yellow-ink', width: 2, dashed: true });
        kit.line('ghost-lead', { x1: cx + 62, y1: 14, x2: cx + 110, y2: -100, color: 'yellow-ink', width: 1.2, dashed: true });
        kit.rect('ghost-tag', { x: cx + 40, y: -124, w: 200, h: 24, r: 12, fill: 'surface', stroke: 'yellow-ink', label: 'same data, 2 rows changed', labelColor: 'yellow-ink', labelSize: 12, mono: true });
        kit.text('ghost-root', { x: cx - 30, y: -92, text: 'root split changes too', size: 11, color: 'yellow-ink', anchor: 'end' });
      }
    }

    // feature cards
    if (show.has('features')) {
      for (let j = 0; j < 9; j++) {
        const f = String.fromCharCode(65 + j), strong = f === STRONG, x = -345 + j * 52;
        if (strong) kit.rect('glow', { x: x - 5, y: 65, w: 54, h: 54, r: 12, fill: 'yellow-soft', stroke: 'none' });
        kit.rect('feat-' + f, { x, y: 70, w: 44, h: 44, r: 8, fill: strong ? 'yellow' : 'surface', stroke: strong ? 'yellow-ink' : 'line-strong', label: f, labelSize: 15, labelColor: strong ? '#1B1B1F' : 'ink-2', mono: true, delay: j * 30 });
      }
      kit.text('feat-title', { x: -345, y: 136, text: s.m ? `features (p = 9) · each split may use only m = ${s.m}` : 'features (p = 9) · D is the strong one', size: 12, weight: 700, color: 'muted', anchor: 'start' });
    }

    // correlation meter
    if (show.has('meter')) {
      gauge(kit, 'rho', { cx: 265, cy: -110, r: 60, v: s.rho ?? 0, ticks: [[0, '0'], [0.5, '0.5'], [1, '1']], title: 'tree correlation ρ', value: 'ρ = ' + fmt(s.rho ?? 0) });
    }

    // variance bars
    if (show.has('var')) {
      const B = s.B || 1;
      const bars = s.compare ? [['a', 200, s.rhoA ?? 0.7, `bagging\nρ=${s.rhoA ?? 0.7}`], ['b', 280, s.rho ?? 0.3, `forest\nρ=${s.rho ?? 0.3}`]] : [['a', 240, s.rho ?? 0.7, B === 1 ? 'one tree' : `${B} trees`]];
      kit.text('var-title', { x: 265, y: 6, text: 'Var of the average (σ² = 1)', size: 12, weight: 700, color: 'muted' });
      kit.line('var-base', { x1: 185, y1: VB.y0, x2: 345, y2: VB.y0, color: 'line-strong', width: 1.5 });
      bars.forEach(([id, x, rho, name], k) => {
        const floor = B === 1 ? 0 : rho, total = B === 1 ? 1 : rho + (1 - rho) / B;
        const fh = floor * VB.maxH, th = total * VB.maxH;
        if (s.split) {
          kit.rect(`vb-${id}-floor`, { x, y: VB.y0 - fh, w: VB.w, h: fh, r: 3, fill: 'blue-ink', stroke: 'none', delay: k * 100 });
          kit.rect(`vb-${id}-top`, { x, y: VB.y0 - th, w: VB.w, h: Math.max(0, th - fh), r: 3, fill: 'blue-soft', stroke: 'blue', delay: k * 100 });
          kit.line(`vb-${id}-floorline`, { x1: x - 8, y1: VB.y0 - fh, x2: x + VB.w + 8, y2: VB.y0 - fh, color: 'ink', width: 1.5, dashed: true });
        } else {
          kit.rect(`vb-${id}-top`, { x, y: VB.y0 - th, w: VB.w, h: th, r: 3, fill: 'blue', stroke: 'none' });
        }
        kit.text(`vb-${id}-val`, { x: x + VB.w / 2, y: VB.y0 - th - 12, text: fmt(total), size: 13, weight: 700, color: 'ink', mono: true });
        kit.text(`vb-${id}-name`, { x: x + VB.w / 2, y: VB.y0 + (s.compare ? 20 : 14), text: name, size: 11, weight: 600, color: 'muted' });
      });
      if (s.split) kit.text('var-legend', { x: 265, y: 24, text: 'dark = floor ρσ²  ·  light = (1−ρ)σ²/B', size: 11, color: 'ink-2' });
    }

    if (s.caption) kit.text('caption', { x: -120, y: 220, text: s.caption, size: 14, weight: 600, color: s.captionColor || 'ink-2' });
    kit.end();
  },
};

// ---------- Technical: Var(average) vs B, and error vs B ----------
const PX0 = -280, PX1 = 260, PYT = -170, PYB = 150, BMAX = 200;
const bx = B => PX0 + (Math.log(B) / Math.log(BMAX)) * (PX1 - PX0);
function curvePath(fn, ymax) {
  let d = '';
  for (let k = 0; k <= 48; k++) {
    const B = Math.exp((k / 48) * Math.log(BMAX));
    const v = fn(B);
    d += (k ? ' L' : 'M') + bx(B).toFixed(1) + ',' + (PYB - (v / ymax) * (PYB - PYT)).toFixed(1);
  }
  return d;
}
const varianceCurve = {
  mode: 'svg',
  label: 'Variance or error of the forest as the number of trees grows',
  render(s, prev, kit) {
    kit.begin();
    const err = s.mode === 'error';
    const ymax = err ? 0.5 : 1;
    const py = v => PYB - (v / ymax) * (PYB - PYT);
    kit.line('ax-x', { x1: PX0, y1: PYB, x2: PX1 + 10, y2: PYB, color: 'ink-2', width: 1.5 });
    kit.line('ax-y', { x1: PX0, y1: PYB, x2: PX0, y2: PYT - 10, color: 'ink-2', width: 1.5 });
    [1, 5, 20, 100, 200].forEach(B => {
      kit.line('xt-' + B, { x1: bx(B), y1: PYB, x2: bx(B), y2: PYB + 5, color: 'ink-2' });
      kit.text('xl-' + B, { x: bx(B), y: PYB + 18, text: String(B), size: 11, color: 'muted', mono: true });
    });
    kit.text('x-title', { x: (PX0 + PX1) / 2, y: PYB + 40, text: 'number of trees B (log scale)', size: 12, weight: 600, color: 'muted' });
    [0, 0.5, 1].forEach((f, i) => kit.text('yl-' + i, { x: PX0 - 10, y: py(f * ymax), text: fmt(f * ymax, err ? 2 : 1), size: 11, color: 'muted', mono: true, anchor: 'end' }));
    kit.text('y-title', { x: PX0, y: PYT - 26, text: err ? 'test error (shape only)' : 'Var(average), σ² = 1', size: 12, weight: 700, color: 'muted', anchor: 'start' });

    if (!err) {
      (s.rhos || []).forEach((rho, i) => {
        const hl = rho === s.highlight;
        const key = 'v-' + String(rho).replace('.', '_');
        kit.line(key + '-floor', { x1: PX0, y1: py(rho), x2: PX1, y2: py(rho), color: hl ? 'blue-ink' : 'line-strong', width: 1, dashed: true, delay: 200 + i * 80 });
        kit.path(key + '-curve', { d: curvePath(B => rho + (1 - rho) / B, ymax), stroke: hl ? 'blue' : 'muted', width: hl ? 3.5 : 1.5, delay: i * 80 });
        kit.text(key + '-lab', { x: PX1 + 8, y: py(rho), text: hl ? `ρ=${rho} → ${rho}` : `ρ=${rho}`, size: hl ? 13 : 11, weight: hl ? 700 : 500, color: hl ? 'blue-ink' : 'muted', mono: true, anchor: 'start' });
      });
      if (s.highlight != null) kit.text('floor-note', { x: 0, y: py(s.highlight) - 16, text: `floor ρσ² = ${s.highlight}: more trees can't go lower`, size: 13, weight: 700, color: 'blue-ink' });
    } else {
      (s.limits || []).forEach((L, i) => {
        const hl = i === s.highlight;
        kit.path('e-curve-' + i, { d: curvePath(B => L.value + (0.42 - L.value) / Math.sqrt(B), ymax), stroke: hl ? 'blue' : 'muted', width: hl ? 3.5 : 2, delay: i * 100 });
        kit.line('e-floor-' + i, { x1: PX0, y1: py(L.value), x2: PX1, y2: py(L.value), color: hl ? 'blue-ink' : 'line-strong', width: 1, dashed: true });
        kit.text('e-lab-' + i, { x: PX1 - 4, y: py(L.value) + (i ? 16 : -26), text: L.label, size: 12, weight: 700, color: hl ? 'blue-ink' : 'ink-2', anchor: 'end' });
      });
      kit.text('e-note', { x: 40, y: PYT + 10, text: 'each curve flattens to its own limit: it never turns back up', size: 13, weight: 600, color: 'ink-2' });
    }
    kit.end();
  },
};

// ---------- Technical: strength vs correlation ----------
const SIM = [
  { F: 1, s: 0.069, rho: 0.012, tree: '80%', forest: '10.7%' },
  { F: 10, s: 0.22, rho: 0.045, tree: '65%', forest: '3.0%' },
  { F: 25, s: 0.28, rho: 0.065, tree: '60%', forest: '2.8%' },
];
const strengthCorr = {
  mode: 'svg',
  label: 'Strength versus correlation as max_features changes',
  render(s, prev, kit) {
    kit.begin();
    const F = s.F || 1, sv = s.s ?? 0, rv = s.rho ?? 0;
    const bound = sv > 0 ? rv * (1 - sv * sv) / (sv * sv) : 0;
    gauge(kit, 'dial', { cx: -190, cy: -70, r: 85, v: Math.log(F) / Math.log(40), ticks: [[0, '1'], [Math.log(4) / Math.log(40), '4'], [Math.log(10) / Math.log(40), '10'], [Math.log(25) / Math.log(40), '25']],
      title: 'max_features (F)', value: 'F = ' + F });
    // meters
    const meters = [['s', 'strength s', sv, 0.3, 'blue'], ['r', 'correlation ρ̄', rv, 0.08, 'blue']];
    meters.forEach(([id, name, v, max, col], k) => {
      const y = 25 + k * 46;
      kit.text('m-name-' + id, { x: -340, y: y + 8, text: name, size: 13, weight: 600, color: 'ink-2', anchor: 'start' });
      kit.rect('m-bg-' + id, { x: -220, y, w: 160, h: 16, r: 8, fill: 'surface-2', stroke: 'line-strong' });
      kit.rect('m-fill-' + id, { x: -220, y, w: Math.min(160, (v / max) * 160), h: 16, r: 8, fill: col, stroke: 'none' });
      kit.text('m-val-' + id, { x: -50, y: y + 8, text: fmt(v, 3), size: 13, weight: 700, color: 'ink', mono: true, anchor: 'start' });
    });
    kit.rect('bound', { x: -340, y: 125, w: 340, h: 50, r: 10, fill: 'yellow-soft', stroke: 'yellow', label: `bound ρ̄(1−s²)/s² = ${fmt(bound)}`, labelColor: 'ink', labelSize: 15, mono: true });
    kit.text('bound-note', { x: -170, y: 192, text: 'loose, but smaller ρ̄/s² is better', size: 12, color: 'muted' });

    if (!s.table) {
      // margin worked example
      kit.text('mg-title', { x: 190, y: -200, text: 'margin for one example row', size: 13, weight: 700, color: 'ink-2' });
      const votes = [['right class', 0.55, 'green'], ['best other class', 0.30, 'red'], ['rest', 0.15, 'line-strong']];
      votes.forEach(([nm, v, col], k) => {
        const y = -170 + k * 44;
        kit.text('mg-n-' + k, { x: 40, y: y + 11, text: nm, size: 12, color: 'ink-2', anchor: 'start' });
        kit.rect('mg-b-' + k, { x: 160, y, w: v * 300, h: 22, r: 4, fill: col, stroke: 'none' });
        kit.text('mg-v-' + k, { x: 168 + v * 300, y: y + 11, text: fmt(v), size: 12, weight: 700, color: 'ink', mono: true, anchor: 'start' });
      });
      kit.rect('mg-eq', { x: 40, y: -30, w: 320, h: 44, r: 10, fill: 'surface', stroke: 'line-strong', label: 'margin = 0.55 − 0.30 = 0.25', labelSize: 14, mono: true });
      kit.text('mg-s', { x: 200, y: 40, text: 'strength s = average margin over all rows', size: 12, color: 'muted' });
    } else {
      // 1,000 weak inputs table
      kit.text('tb-title', { x: 200, y: -222, text: '1,000 weak inputs (Bayes error 1.0%)', size: 13, weight: 700, color: 'ink-2' });
      const cols = [['F', 50], ['s', 105], ['ρ̄', 160], ['tree err', 230], ['forest', 310]];
      cols.forEach(([h, x]) => kit.text('tb-h-' + h, { x, y: -196, text: h, size: 12, weight: 700, color: 'muted' }));
      SIM.forEach((r, k) => {
        const y = -172 + k * 28, hl = r.F === F;
        kit.rect('tb-row-' + k, { x: 22, y: y - 12, w: 330, h: 24, r: 6, fill: hl ? 'yellow-soft' : 'surface', stroke: hl ? 'yellow' : 'line' });
        [r.F, r.s, r.rho, r.tree, r.forest].forEach((v, c) => kit.text(`tb-${k}-${c}`, { x: cols[c][1], y, text: String(v), size: 12, weight: c === 4 ? 700 : 500, color: 'ink', mono: true }));
      });
      // sonar sketch (shape only)
      const X0 = 40, X1 = 340, Y0 = 170, Y1 = 30;
      const fx = f => X0 + (Math.log(f) / Math.log(30)) * (X1 - X0);
      const path = fn => { let d = ''; for (let k = 0; k <= 30; k++) { const f = Math.exp(k / 30 * Math.log(30)); d += (k ? ' L' : 'M') + fx(f).toFixed(1) + ',' + (Y0 - fn(f) * (Y0 - Y1)).toFixed(1); } return d; };
      kit.text('sn-title', { x: 190, y: 8, text: 'sonar data: the pattern (shape only)', size: 12, weight: 700, color: 'muted' });
      kit.line('sn-ax', { x1: X0, y1: Y0, x2: X1, y2: Y0, color: 'ink-2' });
      kit.line('sn-f4', { x1: fx(4), y1: Y0, x2: fx(4), y2: Y1, color: 'line-strong', dashed: true });
      kit.text('sn-f4l', { x: fx(4), y: Y0 + 14, text: 'F≈4', size: 11, color: 'muted', mono: true });
      kit.path('sn-s', { d: path(f => 0.35 + 0.4 * Math.min(1, Math.log(f) / Math.log(4))), stroke: 'blue', width: 2 });
      kit.path('sn-r', { d: path(f => 0.1 + 0.6 * Math.log(f) / Math.log(30)), stroke: 'ink-2', width: 2, dashed: true });
      kit.path('sn-e', { d: path(f => 0.35 - 0.2 * Math.min(1, Math.log(f) / Math.log(5)) + 0.25 * Math.max(0, Math.log(f / 5) / Math.log(6))), stroke: 'red', width: 2 });
      kit.text('sn-sl', { x: X1 + 4, y: Y0 - 0.75 * (Y0 - Y1), text: 's', size: 12, weight: 700, color: 'blue-ink', anchor: 'start' });
      kit.text('sn-rl', { x: X1 + 4, y: Y0 - 0.7 * (Y0 - Y1) + 14, text: 'ρ̄', size: 12, weight: 700, color: 'ink-2', anchor: 'start' });
      kit.text('sn-el', { x: X1 + 4, y: Y0 - 0.4 * (Y0 - Y1), text: 'err', size: 12, weight: 700, color: 'red-ink', anchor: 'start' });
    }
    kit.end();
  },
};

// ---------- Technical: OOB grid and permutation importance ----------
const OOB = [
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 1],
  [0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [1, 0, 0, 0, 1, 1],
  [0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 1],
];
const FOCUS_VOTES = { 0: 'A', 2: 'A', 5: 'B' };
const XV = ['3.1', '0.4', '2.2', '5.0', '1.7', '4.4', '0.9', '2.8'];
const SHUF = [5, 2, 7, 0, 3, 6, 1, 4];
const GX = j => -260 + j * 50, GY = i => -185 + i * 32;
const oobTable = {
  mode: 'svg',
  label: 'Out-of-bag grid: which trees never saw which rows',
  render(s, prev, kit) {
    kit.begin();
    const focus = s.focusRow != null ? s.focusRow - 1 : -1;
    for (let j = 0; j < 6; j++) kit.text('col-' + j, { x: GX(j) + 22, y: -212, text: 'T' + (j + 1), size: 12, weight: 700, color: 'muted', mono: true });
    OOB.forEach((row, i) => {
      kit.text('rowl-' + i, { x: -290, y: GY(i) + 13, text: 'row ' + (i + 1), size: 12, weight: i === focus ? 700 : 500, color: i === focus ? 'ink' : 'muted', anchor: 'end' });
      row.forEach((o, j) => {
        const vote = i === focus && o ? FOCUS_VOTES[j] : null;
        kit.rect(`c-${i}-${j}`, { x: GX(j), y: GY(i), w: 44, h: 26, r: 5, fill: o ? 'yellow' : 'blue', stroke: i === focus ? 'ink' : 'none', strokeWidth: 2,
          label: vote ? 'votes ' + vote : (o ? 'OOB' : ''), labelSize: vote ? 10 : 10, labelColor: '#1B1B1F', opacity: focus >= 0 && i !== focus && !s.shuffle ? 0.55 : 1, delay: vote ? 200 : 0 });
      });
    });
    kit.text('legend', { x: -125, y: 90, text: 'blue = row in the tree’s bag  ·  yellow = out of bag', size: 12, color: 'muted' });

    if (s.tally) {
      const t = s.tally, ok = t.pred === t.truth;
      kit.rect('tally', { x: 80, y: -150, w: 270, h: 150, r: 12, fill: 'surface', stroke: 'line-strong' });
      kit.text('tally-t', { x: 215, y: -128, text: `row ${s.focusRow}: OOB trees only`, size: 13, weight: 700, color: 'ink-2' });
      kit.text('tally-v', { x: 215, y: -96, text: `A × ${t.votesA}    B × ${t.votesB}`, size: 16, weight: 700, color: 'ink', mono: true });
      kit.text('tally-p', { x: 215, y: -64, text: `OOB prediction: ${t.pred}`, size: 14, weight: 600, color: 'ink', mono: true });
      kit.rect('tally-ok', { x: 110, y: -46, w: 210, h: 32, r: 16, fill: ok ? 'green-soft' : 'red-soft', stroke: ok ? 'green' : 'red', label: `truth ${t.truth} → ${ok ? '✓ correct' : '✗ wrong'}`, labelColor: ok ? 'green-ink' : 'red-ink', labelSize: 13, delay: 350 });
      kit.sarrow('tally-arrow', { x1: GX(5) + 50, y1: GY(focus) + 13, x2: 78, y2: -90, color: 'yellow-ink', curve: -20 });
    }

    if (s.shuffle != null) {
      // feature column, aligned with grid rows; values keep their key so they glide when shuffled
      kit.text('xcol-t', { x: 105, y: -212, text: 'feature x₂', size: 12, weight: 700, color: s.shuffle ? 'yellow-ink' : 'muted' });
      XV.forEach((v, i) => {
        const slot = s.shuffle ? SHUF.indexOf(i) : i;
        kit.rect('xv-' + i, { x: 80, y: GY(slot), w: 50, h: 26, r: 5, fill: s.shuffle ? 'yellow-soft' : 'surface', stroke: s.shuffle ? 'yellow' : 'line-strong', label: v, labelSize: 12, mono: true, delay: i * 40 });
      });
      // error bars
      const BY = 60, BH = 220;
      kit.text('err-t', { x: 255, y: -212, text: 'OOB error (illustrative)', size: 12, weight: 700, color: 'muted' });
      kit.line('err-base', { x1: 170, y1: BY, x2: 345, y2: BY, color: 'line-strong' });
      [['before', s.errBefore ?? 0, 'blue', 'intact'], ['after', s.shuffle ? (s.errAfter ?? 0) : (s.errBefore ?? 0), s.shuffle ? 'red' : 'blue', 'x₂ shuffled']].forEach(([id, v, col, nm], k) => {
        const x = 190 + k * 80, h = v * BH * 2;
        kit.rect('eb-' + id, { x, y: BY - h, w: 56, h, r: 4, fill: col, stroke: 'none', delay: k * 150 });
        kit.text('ebv-' + id, { x: x + 28, y: BY - h - 12, text: fmt(v), size: 12, weight: 700, color: 'ink', mono: true });
        kit.text('ebn-' + id, { x: x + 28, y: BY + 14, text: nm, size: 11, color: 'muted' });
      });
      if (s.shuffle) kit.text('err-delta', { x: 258, y: BY + 36, text: `importance of x₂ = rise in error`, size: 12, weight: 700, color: 'red-ink' });
    }

    if (s.defaults) {
      kit.rect('defaults', { x: -345, y: 112, w: 690, h: 112, r: 10, fill: 'surface-2', stroke: 'line-strong' });
      kit.text('defaults-t', { x: -328, y: 130, text: 'RandomForestClassifier defaults (scikit-learn 1.9)', size: 12, weight: 700, color: 'ink-2', anchor: 'start' });
      kit.text('defaults-b', { x: -328, y: 175, text: 'n_estimators=100   max_features="sqrt"   max_depth=None   bootstrap=True\noob_score=False   min_samples_leaf=1   (Regressor: max_features=1.0 = bagging)\nchanged: n_estimators 10 → 100 in 0.22 · max_features "auto" → "sqrt" in 1.1', size: 12, color: 'ink', mono: true, anchor: 'start' });
    }
    kit.end();
  },
};

export default {
  jury,
  'forest-main': forestMain,
  'variance-curve': varianceCurve,
  'strength-corr': strengthCorr,
  'oob-table': oobTable,
};
