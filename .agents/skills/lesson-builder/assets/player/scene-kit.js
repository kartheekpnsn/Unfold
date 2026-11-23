// Unfold scene kit: keyed, state-based SVG drawing with automatic tweening.
//
// A scene's render(state, prev, kit) calls kit.begin(), draws primitives by key, then kit.end().
// The kit diffs against the previous frame: new keys enter, changed keys tween, missing keys exit.
// Because each step fully describes its state, Back and deep links render correctly.
//
// World coordinates: x runs right-down, y runs left-down, z is up (isometric). 1 unit = kit.scale px.
// Screen primitives (rect, text, line, path, circle, chart) use screen px with (0,0) at stage centre.

const SVGNS = 'http://www.w3.org/2000/svg';
const COS30 = Math.cos(Math.PI / 6), SIN30 = 0.5;
const TOKENS = ['red', 'green', 'blue', 'yellow', 'ink', 'ink-2', 'muted', 'surface', 'surface-2', 'line', 'line-strong', 'bg',
  'red-ink', 'green-ink', 'blue-ink', 'yellow-ink', 'red-soft', 'green-soft', 'blue-soft', 'yellow-soft'];

export const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- colour helpers ----------
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); }
const isHex = v => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

// ---------- tween helpers ----------
function lerpVal(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (isHex(a) && isHex(b)) return mix(a, b, t);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => lerpVal(v, b[i], t));
  return t < 0.5 ? a : b;
}
function lerpProps(a, b, t) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? lerpVal(a[k], b[k], t) : (k in b ? b[k] : a[k]);
  return o;
}

export function createKit(stage, opts = {}) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', opts.label || 'Animated scene');
  const W = opts.width || 800, H = opts.height || 500;
  // On narrow stages (phones) crop the edges a little so the scene isn't tiny.
  const narrow = (stage.clientWidth || 800) < 600;
  const vw = narrow ? W * 0.8 : W, vh = narrow ? H * 0.92 : H;
  svg.setAttribute('viewBox', `${-vw / 2} ${-vh / 2} ${vw} ${vh}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.innerHTML = `<defs>
    <marker id="uf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>
    <g class="uf-bg"></g><g class="uf-world"></g>`;
  stage.appendChild(svg);
  const world = svg.querySelector('.uf-world');
  const bgLayer = svg.querySelector('.uf-bg');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kit = {
    svg, world, W, H, scale: opts.scale || 38, origin: [0, opts.originY ?? 40], duration: reduced ? 0 : (opts.duration || 520),
    paused: false, reduced,
  };
  const nodes = new Map();   // key -> { type, el, from, to, cur, start, dur, exiting, layer }
  let frameKeys = null, raf = 0, colorCache = null, loops = [];

  // ---------- colours ----------
  function readColors() {
    const cs = getComputedStyle(stage);
    const c = {};
    for (const t of TOKENS) c[t] = (cs.getPropertyValue('--' + t).trim() || '#888888');
    return c;
  }
  kit.colors = () => (colorCache ||= readColors());
  kit.color = v => {
    if (v == null) return kit.colors().ink;
    if (isHex(v)) return v;
    const c = kit.colors();
    if (c[v]) return c[v];
    return v; // allow any CSS colour string
  };
  kit.shade = (v, amt) => { const h = kit.color(v); if (!isHex(h)) return h; return amt > 0 ? mix(h, '#ffffff', amt) : mix(h, '#000000', -amt); };

  // ---------- projection ----------
  kit.iso = (x, y, z = 0) => [kit.origin[0] + (x - y) * COS30 * kit.scale, kit.origin[1] + (x + y) * SIN30 * kit.scale - z * kit.scale];
  kit.view = ({ scale, originX, originY } = {}) => {
    if (scale != null) kit.scale = scale;
    if (originX != null) kit.origin[0] = originX;
    if (originY != null) kit.origin[1] = originY;
  };

  // ---------- primitives: each returns an SVG string for props p ----------
  const P = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const draw = {
    box(p) {
      const { x = 0, y = 0, z = 0, w = 1, d = 1, h = 1 } = p;
      const base = kit.color(p.color || 'blue');
      const top = p.topColor ? kit.color(p.topColor) : (isHex(base) ? mix(base, '#ffffff', 0.18) : base);
      const left = base, right = isHex(base) ? mix(base, '#000000', 0.16) : base;
      const A = kit.iso(x, y, z + h), B = kit.iso(x + w, y, z + h), C = kit.iso(x + w, y + d, z + h), D = kit.iso(x, y + d, z + h);
      const Bb = kit.iso(x + w, y, z), Cb = kit.iso(x + w, y + d, z), Db = kit.iso(x, y + d, z);
      const stroke = p.outline ? kit.color(p.outline) : (isHex(base) ? mix(base, '#000000', 0.28) : 'none');
      const dash = p.dashed ? ' stroke-dasharray="4 3"' : '';
      const fillOp = p.dashed ? 0.08 : 1;
      let s = `<g stroke="${stroke}" stroke-width="1" stroke-linejoin="round"${dash}>` +
        `<polygon points="${P([D, C, Cb, Db])}" fill="${left}" fill-opacity="${fillOp}"/>` +
        `<polygon points="${P([C, B, Bb, Cb])}" fill="${right}" fill-opacity="${fillOp}"/>` +
        `<polygon points="${P([A, B, C, D])}" fill="${top}" fill-opacity="${fillOp}"/></g>`;
      if (p.label != null && p.label !== '') {
        const where = p.labelOn || (h >= 0.45 ? 'front' : 'top');
        const fs = p.labelSize || Math.max(11, Math.min(18, kit.scale * 0.42));
        const lc = p.labelColor ? kit.color(p.labelColor) : (p.dashed ? kit.color('muted') : '#ffffff');
        if (where === 'top') {
          const [cx, cy] = kit.iso(x + w / 2, y + d / 2, z + h);
          s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="${lc}" class="mono">${esc(p.label)}</text>`;
        } else {
          // label centred on the left (front) face, skewed to sit on the face
          const [cx, cy] = kit.iso(x + w / 2, y + d, z + h / 2);
          s += `<text x="0" y="0" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) matrix(${COS30},${SIN30},0,1,0,0)" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="${lc}" class="mono">${esc(p.label)}</text>`;
        }
      }
      return s;
    },
    plate(p) { // flat rectangle on a plane at height z
      const { x = 0, y = 0, z = 0, w = 1, d = 1 } = p;
      const pts = [kit.iso(x, y, z), kit.iso(x + w, y, z), kit.iso(x + w, y + d, z), kit.iso(x, y + d, z)];
      const fill = p.fill === 'none' ? 'none' : kit.color(p.color || 'surface-2');
      let s = `<polygon points="${P(pts)}" fill="${fill}" fill-opacity="${p.fillOpacity ?? 1}" stroke="${kit.color(p.stroke || 'line-strong')}" stroke-width="${p.strokeWidth || 1}"${p.dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
      if (p.label) {
        const [lx, ly] = kit.iso(x + (p.labelAt?.[0] ?? w / 2), y + (p.labelAt?.[1] ?? d + 0.35), z);
        s += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="hanging" font-size="${p.labelSize || 12}" fill="${kit.color(p.labelColor || 'muted')}" font-weight="600" letter-spacing=".04em">${esc(p.label)}</text>`;
      }
      return s;
    },
    token(p) { // a disc/coin floating at a world point
      const [cx, cy] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      const r = p.r || 14, col = kit.color(p.color || 'blue');
      let s = `<ellipse cx="${cx}" cy="${cy + r * 0.35}" rx="${r}" ry="${r * 0.5}" fill="${kit.color('ink')}" opacity=".08"/>` +
        `<circle cx="${cx}" cy="${cy - r * 0.2}" r="${r}" fill="${col}" stroke="${isHex(col) ? mix(col, '#000000', .25) : col}"/>`;
      if (p.label != null) s += `<text x="${cx}" y="${cy - r * 0.2}" text-anchor="middle" dominant-baseline="central" font-size="${p.labelSize || r * 0.95}" font-weight="700" fill="${p.labelColor ? kit.color(p.labelColor) : '#fff'}" class="mono">${esc(p.label)}</text>`;
      return s;
    },
    label(p) { // text at a world point
      const [x, y] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      return textSvg(x + (p.dx || 0), y + (p.dy || 0), p);
    },
    pointer(p) { // a tag above a world point with a leader line, e.g. "top"
      const [x, y] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      const dx = p.dx ?? 70, dy = p.dy ?? -10, col = kit.color(p.color || 'blue-ink');
      const tx = x + dx, ty = y + dy, txt = String(p.text ?? '');
      const tw = txt.length * 7.4 + 16;
      const bx = dx >= 0 ? tx : tx - tw;
      return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3"/>` +
        `<circle cx="${x}" cy="${y}" r="3" fill="${col}"/>` +
        `<rect x="${bx}" y="${ty - 11}" width="${tw}" height="22" rx="11" fill="${kit.color('surface')}" stroke="${col}"/>` +
        `<text x="${bx + tw / 2}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${col}" class="mono">${esc(txt)}</text>`;
    },
    arrow(p) { // world-space arrow from -> to
      const a = kit.iso(...(p.from || [0, 0, 0])), b = kit.iso(...(p.to || [1, 0, 0]));
      return arrowSvg(a, b, p);
    },
    // ---------- screen-space primitives ----------
    rect(p) {
      return `<rect x="${p.x || 0}" y="${p.y || 0}" width="${Math.max(0, p.w || 0)}" height="${Math.max(0, p.h || 0)}" rx="${p.r ?? 8}" fill="${p.fill === 'none' ? 'none' : kit.color(p.fill || 'surface')}" stroke="${p.stroke === 'none' ? 'none' : kit.color(p.stroke || 'line-strong')}" stroke-width="${p.strokeWidth || 1}"${p.dashed ? ' stroke-dasharray="5 4"' : ''}/>` +
        (p.label != null ? textSvg((p.x || 0) + (p.w || 0) / 2, (p.y || 0) + (p.h || 0) / 2, { text: p.label, size: p.labelSize || 13, color: p.labelColor || 'ink', weight: p.labelWeight || 600, anchor: 'middle', mono: p.mono }) : '');
    },
    text(p) { return textSvg(p.x || 0, p.y || 0, p); },
    line(p) {
      return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${kit.color(p.color || 'line-strong')}" stroke-width="${p.width || 1.5}"${p.dashed ? ' stroke-dasharray="5 4"' : ''} stroke-linecap="round"/>`;
    },
    sarrow(p) { return arrowSvg([p.x1, p.y1], [p.x2, p.y2], p); },
    path(p) {
      return `<path d="${p.d}" fill="${p.fill ? kit.color(p.fill) : 'none'}" fill-opacity="${p.fillOpacity ?? 1}" stroke="${p.stroke === 'none' ? 'none' : kit.color(p.stroke || 'ink')}" stroke-width="${p.width || 1.5}"${p.dashed ? ' stroke-dasharray="5 4"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
    },
    circle(p) {
      return `<circle cx="${p.x || 0}" cy="${p.y || 0}" r="${Math.max(0, p.r || 6)}" fill="${p.fill === 'none' ? 'none' : kit.color(p.fill || 'blue')}" stroke="${p.stroke ? kit.color(p.stroke) : 'none'}" stroke-width="${p.strokeWidth || 1.5}"${p.dashed ? ' stroke-dasharray="4 3"' : ''}/>` +
        (p.label != null ? textSvg(p.x || 0, p.y || 0, { text: p.label, size: p.labelSize || 12, color: p.labelColor || '#ffffff', weight: 700, anchor: 'middle', mono: true }) : '');
    },
    chart(p) { // simple bar chart in screen space: values[], max, labels[]
      const { x = 0, y = 0, w = 240, h = 120, values = [], max = Math.max(1, ...values) } = p;
      const n = values.length || 1, gap = 6, bw = (w - gap * (n - 1)) / n;
      let s = `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${kit.color('line-strong')}"/>`;
      values.forEach((v, i) => {
        const bh = Math.max(0, (v / max) * h), bx = x + i * (bw + gap);
        const col = kit.color(Array.isArray(p.colors) ? p.colors[i] : (p.color || 'blue'));
        s += `<rect x="${bx}" y="${y + h - bh}" width="${bw}" height="${bh}" rx="3" fill="${col}"/>`;
        if (p.labels?.[i] != null) s += `<text x="${bx + bw / 2}" y="${y + h + 14}" text-anchor="middle" font-size="11" fill="${kit.color('muted')}">${esc(p.labels[i])}</text>`;
        if (p.showValues) s += `<text x="${bx + bw / 2}" y="${y + h - bh - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="${kit.color('ink')}" class="mono">${esc(typeof v === 'number' ? +v.toFixed(p.decimals ?? 0) : v)}</text>`;
      });
      return s;
    },
  };
  function textSvg(x, y, p) {
    const lines = String(p.text ?? '').split('\n');
    const fs = p.size || 13, lh = fs * 1.3;
    const y0 = y - ((lines.length - 1) * lh) / 2;
    return `<text x="${x}" y="${y0}" text-anchor="${p.anchor === 'start' ? 'start' : p.anchor === 'end' ? 'end' : 'middle'}" dominant-baseline="central" font-size="${fs}" font-weight="${p.weight || 500}" fill="${kit.color(p.color || 'ink')}"${p.mono ? ' class="mono"' : ''}${p.italic ? ' font-style="italic"' : ''}>` +
      lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('') + `</text>`;
  }
  function arrowSvg(a, b, p) {
    const col = kit.color(p.color || 'ink-2');
    let d;
    if (p.curve) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1, k = p.curve;
      d = `M${a[0]},${a[1]} Q${mx - (dy / len) * k},${my + (dx / len) * k} ${b[0]},${b[1]}`;
    } else d = `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
    let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${p.width || 2}"${p.dashed ? ' stroke-dasharray="6 4"' : ''} stroke-linecap="round" marker-end="url(#uf-arrow)"/>`;
    if (p.label) {
      const lx = (a[0] + b[0]) / 2 + (p.ldx || 0), ly = (a[1] + b[1]) / 2 + (p.ldy ?? -12);
      s += textSvg(lx, ly, { text: p.label, size: p.labelSize || 12, color: p.color || 'ink-2', weight: 700, mono: p.mono });
    }
    return s;
  }
  kit.primitives = Object.keys(draw);

  // ---------- reconciler ----------
  function depth(type, p) {
    if (p.layer != null) return p.layer * 1e6;
    if (type === 'box' || type === 'plate') {
      const cx = (p.x || 0) + (p.w || 1) / 2, cy = (p.y || 0) + (p.d || 1) / 2;
      return (type === 'plate' ? -1e5 : 0) + (cx + cy) * 1000 + (p.z || 0) * 10;
    }
    if (type === 'token' || type === 'label' || type === 'pointer' || type === 'arrow') return 5e5 + ((p.x || 0) + (p.y || 0)) * 1000 + (p.z || 0);
    return 9e5; // screen primitives draw above world unless layered
  }
  function paint(n) {
    const p = n.cur;
    n.el.setAttribute('opacity', (p.opacity ?? 1).toFixed(3));
    n.el.innerHTML = draw[n.type](p);
  }
  function enterFrom(type, p) {
    const e = p.enter || (['box', 'token'].includes(type) ? 'drop' : 'fade');
    const s = { ...p, opacity: 0 };
    if (e === 'drop' && 'z' in p) s.z = (p.z || 0) + 1.4;
    else if (e === 'drop' && type === 'box') s.z = 1.4;
    if (e === 'grow' && type === 'box') s.h = 0.01;
    if (e === 'grow' && type === 'circle') s.r = 0;
    if (e === 'grow' && type === 'rect') s.w = 0;
    if (e === 'none') s.opacity = p.opacity ?? 1;
    return s;
  }
  function exitTo(type, p, how) {
    const e = how || (['box', 'token'].includes(type) ? 'lift' : 'fade');
    const s = { ...p, opacity: 0 };
    if (e === 'lift') s.z = (p.z || 0) + 1.6;
    if (e === 'right') { s.x = (p.x || 0) + 4; }
    if (e === 'sink') s.z = (p.z || 0) - 1;
    return s;
  }

  kit.begin = () => { frameKeys = new Map(); };
  function put(type, key, props) {
    if (!frameKeys) throw new Error('kit.begin() must be called before drawing');
    if (!draw[type]) throw new Error(`unknown primitive ${type}`);
    frameKeys.set(String(key), { type, props: { opacity: 1, ...props } });
  }
  for (const t of Object.keys(draw)) kit[t] = (key, props = {}) => put(t, key, props);

  kit.end = ({ instant = false } = {}) => {
    const now = performance.now();
    const dur = instant ? 0 : kit.duration;
    for (const [key, { type, props }] of frameKeys) {
      let n = nodes.get(key);
      if (n && n.type !== type) { n.el.remove(); nodes.delete(key); n = null; }
      if (!n) {
        const el = document.createElementNS(SVGNS, 'g');
        el.dataset.key = key;
        n = { type, el, cur: dur ? enterFrom(type, props) : { ...props } };
        nodes.set(key, n);
      }
      n.exiting = false;
      n.from = { ...n.cur };
      n.to = { ...props };
      n.start = now + (props.delay || 0) * (dur ? 1 : 0);
      n.dur = dur;
      n.depth = depth(type, props);
    }
    for (const [key, n] of nodes) {
      if (frameKeys.has(key) || n.exiting) continue;
      n.exiting = true;
      n.from = { ...n.cur };
      n.to = exitTo(n.type, n.cur, n.cur.exit);
      n.start = now; n.dur = dur;
      if (!dur) { n.el.remove(); nodes.delete(key); }
    }
    // depth-sort DOM
    const sorted = [...nodes.values()].sort((a, b) => a.depth - b.depth);
    for (const n of sorted) world.appendChild(n.el);
    frameKeys = null;
    tick();
  };

  function tick() {
    cancelAnimationFrame(raf);
    const now = performance.now();
    let busy = false;
    for (const [key, n] of nodes) {
      if (!n.to) continue;
      const t = n.dur ? Math.max(0, Math.min(1, (now - n.start) / n.dur)) : 1;
      n.cur = t >= 1 ? { ...n.to } : lerpProps(n.from, n.to, ease(t));
      paint(n);
      if (t < 1) busy = true;
      else {
        if (n.exiting) { n.el.remove(); nodes.delete(key); }
        else n.to = null;
      }
    }
    if (loops.length && !kit.paused) {
      for (const fn of loops) fn(now);
      busy = true;
    }
    if (busy) raf = requestAnimationFrame(tick);
  }

  // Continuous ambient animation (e.g. flowing particles). fn(nowMs) runs every frame until kit.clearLoops().
  kit.loop = fn => { if (!kit.reduced) { loops.push(fn); tick(); } };
  kit.clearLoops = () => { loops = []; };
  kit.setPaused = p => { kit.paused = p; if (!p) tick(); };
  kit.isAnimating = () => [...nodes.values()].some(n => n.to);
  // Raw layer for loop-driven elements that bypass the reconciler.
  kit.raw = (cls = '') => { const g = document.createElementNS(SVGNS, 'g'); if (cls) g.setAttribute('class', cls); svg.appendChild(g); return g; };
  kit.background = html => { bgLayer.innerHTML = html; };

  // Faint isometric floor grid (dots at integer world points)
  let floorArgs = null;
  kit.floor = (args = {}) => {
    floorArgs = args;
    const { from = -6, to = 6, z = 0 } = args;
    let s = '';
    const col = kit.color('line-strong');
    for (let i = from; i <= to; i++) for (let j = from; j <= to; j++) {
      const [x, y] = kit.iso(i, j, z);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="${col}"/>`;
    }
    bgLayer.innerHTML = s;
  };

  kit.refreshColors = () => { colorCache = null; if (floorArgs) kit.floor(floorArgs); for (const n of nodes.values()) paint(n); };
  kit.clear = () => { for (const n of nodes.values()) n.el.remove(); nodes.clear(); kit.clearLoops(); bgLayer.innerHTML = ''; };
  kit.destroy = () => { cancelAnimationFrame(raf); kit.clear(); svg.remove(); };
  return kit;
}
