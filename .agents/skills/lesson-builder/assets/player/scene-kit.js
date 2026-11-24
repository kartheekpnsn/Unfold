// Unfold scene kit: keyed, state-based SVG drawing with automatic tweening.
//
// A scene's render(state, prev, kit) calls kit.begin(), draws primitives by key, then kit.end().
// The kit diffs against the previous frame: new keys enter, changed keys tween, missing keys exit.
// Because each step fully describes its state, Back and deep links render correctly.
//
// World coordinates: x runs right-down, y runs left-down, z is up (isometric). 1 unit = kit.scale px.
// Screen primitives (rect, text, line, path, circle, charts, person, icon) use screen px with (0,0) at stage centre.
//
// Motion (see references/motion-and-visual-principles.md):
//   motion: 'quick' | 'state' | 'reveal'      duration tokens (200 / 520 / 800 ms)
//   ease: 'standard' | 'out' | 'overshoot' | 'linear'
//   phase: 'name' | n                          kit.seq('a', 'b') plays phases one after another within a step
//   draw: true                                 strokes draw themselves on enter (fills fade in behind them)
//   write: true                                text writes itself on enter
//   along: { d, t }                            place a circle/rect/text at fraction t along an SVG path
//   numbers inside strings (text, labels, path d) tween when both ends share the same shape ("p = 0.42" → "p = 0.80")
//
// Styles (lesson.style / tab.style) re-skin every primitive without changing scenes: isometric, line, sketch,
// chalk, pictogram, 3d. In "3d", box/plate/token become lit three.js meshes (attachMesh) and everything else stays SVG.

import { ICONS } from 'unfold/icons';
import { PRIMITIVES, MOTION, STYLES, installTemplates } from 'unfold/templates';

const SVGNS = 'http://www.w3.org/2000/svg';
const COS30 = Math.cos(Math.PI / 6), SIN30 = 0.5;
const TOKENS = ['red', 'green', 'blue', 'yellow', 'ink', 'ink-2', 'muted', 'surface', 'surface-2', 'line', 'line-strong', 'bg',
  'red-ink', 'green-ink', 'blue-ink', 'yellow-ink', 'red-soft', 'green-soft', 'blue-soft', 'yellow-soft', 'purple', 'purple-ink', 'purple-soft'];
const MESH_TYPES = new Set(['box', 'plate', 'token']);
const STROKY = new Set(['box', 'plate', 'arrow', 'rect', 'line', 'sarrow', 'path', 'circle', 'chart', 'linechart', 'scatter', 'axis', 'person', 'icon', 'token']);
const INTERNAL = { drawn: 1, writeT: 1 };   // props the kit animates itself; they rest at these values

export const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const EASE = {
  standard: ease,
  out: t => 1 - Math.pow(1 - t, 3),
  overshoot: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  linear: t => t,
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let uid = 0;

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
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const decimals = s => { const i = s.indexOf('.'); return i < 0 || /e/i.test(s) ? 0 : s.length - i - 1; };
// Interpolate the numbers inside two strings that have the same shape; otherwise switch halfway.
function lerpStr(a, b, t) {
  if (a === b) return a;
  const na = a.match(NUM), nb = b.match(NUM);
  if (!na || !nb || na.length !== nb.length || a.replace(NUM, '\u0000') !== b.replace(NUM, '\u0000')) return t < 0.5 ? a : b;
  let i = 0;
  return a.replace(NUM, () => { const x = +na[i], y = +nb[i], d = Math.max(decimals(na[i]), decimals(nb[i])); i++; return (x + (y - x) * t).toFixed(d); });
}
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
function lerpVal(a, b, t, k) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (isHex(a) && isHex(b)) return mix(a, b, t);
  if (typeof a === 'string' && typeof b === 'string') return k === 'noCount' ? (t < 0.5 ? a : b) : lerpStr(a, b, t);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => lerpVal(v, b[i], t));
  if (isPlain(a) && isPlain(b)) return lerpProps(a, b, t);
  return t < 0.5 ? a : b;
}
function lerpProps(a, b, t) {
  const o = {};
  const noCount = b.count === false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    o[k] = k in a && k in b ? lerpVal(a[k], b[k], t, noCount && (k === 'text' || k === 'label') ? 'noCount' : k) : (k in b ? b[k] : a[k]);
  }
  return o;
}

export function createKit(stage, opts = {}) {
  const styleName = STYLES[opts.style] ? opts.style : 'isometric';
  const style = STYLES[styleName];
  const id = ++uid;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', opts.label || 'Animated scene');
  svg.setAttribute('class', `uf-style-${styleName}`);
  const W = opts.width || 800, H = opts.height || 500;
  // On phone-width stages start cropped so the scene isn't tiny; the view widens (never past W × H) if the drawing needs it.
  // A scene may fix its own drawing area with view: { box: [x, y, w, h] } (then there is no phone crop).
  const fixed = Array.isArray(opts.box) && opts.box.length === 4 ? { x: opts.box[0], y: opts.box[1], w: opts.box[2], h: opts.box[3] } : null;
  const narrow = !fixed && (stage.clientWidth || 800) < 480;
  const base = fixed || (narrow ? { x: -W * 0.4, y: -H * 0.46, w: W * 0.8, h: H * 0.92 } : { x: -W / 2, y: -H / 2, w: W, h: H });
  const vb = { ...base };
  const setVB = () => svg.setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  setVB();
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const wob = style.wobble ? `<filter id="uf-wobble-${id}" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${2 * W}" height="${2 * H}">
      <feTurbulence type="fractalNoise" baseFrequency="${style.wobbleFreq || 0.03}" numOctaves="2" seed="${id % 7 + 2}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${style.wobble}" xChannelSelector="R" yChannelSelector="G" result="d"/>
      ${style.grain ? `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.5" result="m"/>
      <feComposite in="d" in2="m" operator="in"/>` : ''}</filter>` : '';
  svg.innerHTML = `<defs>
    <marker id="uf-arrow-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker>${wob}</defs>
    <g class="uf-bg"></g><g class="uf-world"${style.wobble ? ` filter="url(#uf-wobble-${id})"` : ''}></g>
    <text class="uf-probe" x="0" y="0" opacity="0" aria-hidden="true"></text><path class="uf-probe-path" d="M0,0" fill="none" stroke="none"/>`;
  stage.appendChild(svg);
  stage.dataset.style = styleName;
  const world = svg.querySelector('.uf-world');
  const bgLayer = svg.querySelector('.uf-bg');
  const probe = svg.querySelector('.uf-probe'), probePath = svg.querySelector('.uf-probe-path');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kit = {
    svg, world, W, H, scale: opts.scale || 38, origin: [0, opts.originY ?? 40], duration: reduced ? 0 : (opts.duration || MOTION.state),
    paused: false, reduced, style: styleName, styleSpec: style, motion: { ...MOTION }, mesh: null, narrow,
  };
  const nodes = new Map();   // key -> { type, el, from, to, cur, start, dur, ease, exiting, depth }
  let frameKeys = null, framePhases = [], raf = 0, colorCache = null, loops = [], vbTween = null;

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
  const inkOf = v => (typeof v === 'string' && kit.colors()[v + '-ink'] ? kit.color(v + '-ink') : kit.shade(v, -0.3));
  // How the current style paints a filled shape: { fill, fop, stroke, sw }
  function skin(color, { fop = 1, stroke, sw = 1 } = {}) {
    const f = kit.color(color);
    if (style.fill === 'tint') {
      const outline = style.outline === 'ink' ? kit.color('ink') : inkOf(color);
      return { fill: f, fop: fop * style.tint, stroke: stroke && stroke !== 'none' ? kit.color(stroke) : outline, sw: sw * style.stroke };
    }
    // flat: saturated fills drop their outline; pale fills (surface, soft tints) keep one so they don't vanish
    if (style.fill === 'flat') return /^(surface|bg|line|.*-soft)/.test(String(color)) || color === 'none' ? { fill: f, fop, stroke: stroke === 'none' ? 'none' : kit.color(stroke || 'line-strong'), sw } : { fill: f, fop, stroke: 'none', sw: 0 };
    return { fill: f, fop, stroke: stroke === 'none' ? 'none' : stroke ? kit.color(stroke) : null, sw };
  }

  // ---------- projection ----------
  kit.iso = (x, y, z = 0) => [kit.origin[0] + (x - y) * COS30 * kit.scale, kit.origin[1] + (x + y) * SIN30 * kit.scale - z * kit.scale];
  kit.view = ({ scale, originX, originY } = {}) => {
    if (scale != null) kit.scale = scale;
    if (originX != null) kit.origin[0] = originX;
    if (originY != null) kit.origin[1] = originY;
  };
  kit.viewBox = () => ({ ...vb });

  // ---------- text measurement (real font metrics) ----------
  const mcache = new Map();
  kit.measure = (text, { size = 13, weight = 500, mono = false } = {}) => {
    const k = `${size}|${weight}|${mono}|${text}`;
    if (mcache.has(k)) return mcache.get(k);
    probe.setAttribute('font-size', size); probe.setAttribute('font-weight', weight);
    probe.setAttribute('class', 'uf-probe' + (mono ? ' mono' : ''));
    probe.textContent = String(text);
    let w = 0;
    try { w = probe.getComputedTextLength(); } catch { /* detached */ }
    if (!w) w = String(text).length * size * (mono ? 0.6 : 0.55);
    if (mcache.size > 2000) mcache.clear();
    mcache.set(k, w);
    return w;
  };
  // point at fraction t along an SVG path string
  const pcache = new Map();
  kit.pointAt = (d, t = 0) => {
    let len = pcache.get(d);
    probePath.setAttribute('d', d);
    if (len == null) { try { len = probePath.getTotalLength(); } catch { len = 0; } pcache.set(d, len); if (pcache.size > 500) pcache.clear(); }
    if (!len) return [0, 0];
    const p = probePath.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
    return [p.x, p.y];
  };

  // ---------- primitives: each returns an SVG string for props p ----------
  const P = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const dashAttr = (p, a = '5 4') => (p.dashed ? ` stroke-dasharray="${a}"` : '');
  const fs1 = n => (+n).toFixed(1);
  const draw = {
    box(p, { labelOnly = false } = {}) {
      const { x = 0, y = 0, z = 0, w = 1, d = 1, h = 1 } = p;
      const sk = skin(p.color || 'blue', { stroke: p.outline });
      const base = sk.fill;
      const top = p.topColor ? kit.color(p.topColor) : (isHex(base) ? mix(base, '#ffffff', 0.18) : base);
      const left = base, right = isHex(base) ? mix(base, '#000000', 0.16) : base;
      let s = '';
      if (!labelOnly) {
        const A = kit.iso(x, y, z + h), B = kit.iso(x + w, y, z + h), C = kit.iso(x + w, y + d, z + h), D = kit.iso(x, y + d, z + h);
        const Bb = kit.iso(x + w, y, z), Cb = kit.iso(x + w, y + d, z), Db = kit.iso(x, y + d, z);
        const stroke = sk.stroke ?? (isHex(base) ? mix(base, '#000000', 0.28) : 'none');
        const fillOp = (p.dashed ? 0.08 : 1) * sk.fop;
        const r = style.fill === 'flat' ? ' stroke-linejoin="round"' : '';
        s = `<g stroke="${stroke}" stroke-width="${sk.sw}" stroke-linejoin="round"${dashAttr(p, '4 3')}${r}>` +
          `<polygon points="${P([D, C, Cb, Db])}" fill="${left}" fill-opacity="${fillOp}"/>` +
          `<polygon points="${P([C, B, Bb, Cb])}" fill="${right}" fill-opacity="${fillOp}"/>` +
          `<polygon points="${P([A, B, C, D])}" fill="${top}" fill-opacity="${fillOp}"/></g>`;
      }
      if (p.label != null && p.label !== '') {
        const where = p.labelOn || (h >= 0.45 ? 'front' : 'top');
        const fs = p.labelSize || Math.max(11, Math.min(18, kit.scale * 0.42));
        const lc = p.labelColor ? kit.color(p.labelColor) : (p.dashed || style.fill === 'tint' ? kit.color(style.fill === 'tint' ? 'ink' : 'muted') : '#ffffff');
        if (where === 'top') {
          const [cx, cy] = kit.iso(x + w / 2, y + d / 2, z + h);
          s += `<text x="${fs1(cx)}" y="${fs1(cy)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="${lc}" class="mono">${esc(p.label)}</text>`;
        } else {
          const [cx, cy] = kit.iso(x + w / 2, y + d, z + h / 2);
          s += `<text x="0" y="0" transform="translate(${fs1(cx)},${fs1(cy)}) matrix(${COS30},${SIN30},0,1,0,0)" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="${lc}" class="mono">${esc(p.label)}</text>`;
        }
      }
      return s;
    },
    plate(p, { labelOnly = false } = {}) { // flat rectangle on a plane at height z
      const { x = 0, y = 0, z = 0, w = 1, d = 1 } = p;
      let s = '';
      if (!labelOnly) {
        const pts = [kit.iso(x, y, z), kit.iso(x + w, y, z), kit.iso(x + w, y + d, z), kit.iso(x, y + d, z)];
        const sk = skin(p.color || 'surface-2', { fop: p.fillOpacity ?? 1, stroke: p.stroke || 'line-strong', sw: p.strokeWidth || 1 });
        const fill = p.fill === 'none' ? 'none' : sk.fill;
        s = `<polygon points="${P(pts)}" fill="${fill}" fill-opacity="${sk.fop}" stroke="${style.fill === 'flat' ? 'none' : kit.color(p.stroke || 'line-strong')}" stroke-width="${sk.sw || 1}"${dashAttr(p)}/>`;
      }
      if (p.label) {
        const [lx, ly] = kit.iso(x + (p.labelAt?.[0] ?? w / 2), y + (p.labelAt?.[1] ?? d + 0.35), z);
        s += `<text x="${fs1(lx)}" y="${fs1(ly)}" text-anchor="middle" dominant-baseline="hanging" font-size="${p.labelSize || 12}" fill="${kit.color(p.labelColor || 'muted')}" font-weight="600" letter-spacing=".04em">${esc(p.label)}</text>`;
      }
      return s;
    },
    token(p, { labelOnly = false } = {}) { // a disc/coin floating at a world point
      const [cx, cy] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      const r = p.r || 14, sk = skin(p.color || 'blue');
      let s = '';
      if (!labelOnly) s = `<ellipse cx="${fs1(cx)}" cy="${fs1(cy + r * 0.35)}" rx="${r}" ry="${r * 0.5}" fill="${kit.color('ink')}" opacity=".08"/>` +
        `<circle cx="${fs1(cx)}" cy="${fs1(cy - r * 0.2)}" r="${r}" fill="${sk.fill}" fill-opacity="${sk.fop}" stroke="${sk.stroke ?? (isHex(sk.fill) ? mix(sk.fill, '#000000', .25) : sk.fill)}" stroke-width="${sk.sw}"/>`;
      if (p.label != null) s += `<text x="${fs1(cx)}" y="${fs1(cy - r * 0.2)}" text-anchor="middle" dominant-baseline="central" font-size="${p.labelSize || r * 0.95}" font-weight="700" fill="${p.labelColor ? kit.color(p.labelColor) : style.fill === 'tint' ? kit.color('ink') : '#fff'}" class="mono">${esc(p.label)}</text>`;
      return s;
    },
    label(p) { // text at a world point
      const [x, y] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      return textSvg(x + (p.dx || 0), y + (p.dy || 0), p);
    },
    pointer(p) { // a tag beside a world point with a leader line, e.g. "top"
      const [x, y] = kit.iso(p.x || 0, p.y || 0, p.z || 0);
      const dx = p.dx ?? 70, dy = p.dy ?? -10, col = kit.color(p.color || 'blue-ink');
      const tx = x + dx, ty = y + dy, txt = String(p.text ?? '');
      const tw = kit.measure(txt, { size: 12, weight: 700, mono: true }) + 16;
      const bx = dx >= 0 ? tx : tx - tw;
      return `<line x1="${fs1(x)}" y1="${fs1(y)}" x2="${fs1(tx)}" y2="${fs1(ty)}" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3"/>` +
        `<circle cx="${fs1(x)}" cy="${fs1(y)}" r="3" fill="${col}"/>` +
        `<rect x="${fs1(bx)}" y="${fs1(ty - 11)}" width="${fs1(tw)}" height="22" rx="11" fill="${kit.color('surface')}" stroke="${col}"/>` +
        `<text x="${fs1(bx + tw / 2)}" y="${fs1(ty)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${col}" class="mono">${esc(txt)}</text>`;
    },
    arrow(p) { // world-space arrow from -> to
      const a = kit.iso(...(p.from || [0, 0, 0])), b = kit.iso(...(p.to || [1, 0, 0]));
      return arrowSvg(a, b, p);
    },
    // ---------- screen-space primitives ----------
    rect(p) {
      const sk = skin(p.fill === 'none' ? 'surface' : (p.fill || 'surface'), { stroke: p.stroke === 'none' ? 'none' : (p.stroke || 'line-strong'), sw: p.strokeWidth || 1 });
      const fill = p.fill === 'none' ? 'none' : sk.fill;
      const stroke = p.stroke === 'none' && style.fill !== 'tint' ? 'none' : (sk.stroke ?? kit.color(p.stroke || 'line-strong'));
      const r = p.r ?? (style.round ? 14 : 8);
      let s = `<rect x="${fs1(p.x || 0)}" y="${fs1(p.y || 0)}" width="${fs1(Math.max(0, p.w || 0))}" height="${fs1(Math.max(0, p.h || 0))}" rx="${r}" fill="${fill}" fill-opacity="${sk.fop}" stroke="${stroke}" stroke-width="${sk.sw || 1}"${dashAttr(p)}/>`;
      if (p.label != null && p.label !== '') {
        // shrink the label to fit the box (real font metrics), never below 9px
        const lines = String(p.label).split('\n');
        let fs = p.labelSize || 13;
        const wmax = Math.max(...lines.map(l => kit.measure(l, { size: fs, weight: p.labelWeight || 600, mono: p.mono })));
        const room = Math.max(10, (p.w || 0) - 10), vroom = Math.max(10, (p.h || 0) - 4);
        if (wmax > room) fs = Math.max(9, fs * room / wmax);
        if (lines.length * fs * 1.3 > vroom) fs = Math.max(9, Math.min(fs, vroom / (lines.length * 1.3)));
        s += textSvg((p.x || 0) + (p.w || 0) / 2, (p.y || 0) + (p.h || 0) / 2, { text: p.label, size: fs, color: style.fill === 'tint' ? labelInk(p.labelColor) || 'ink' : p.labelColor || 'ink', weight: p.labelWeight || 600, anchor: 'middle', mono: p.mono, writeT: p.writeT });
      }
      return s;
    },
    text(p) { return textSvg(p.x || 0, p.y || 0, p); },
    line(p) {
      return `<line x1="${fs1(p.x1)}" y1="${fs1(p.y1)}" x2="${fs1(p.x2)}" y2="${fs1(p.y2)}" stroke="${kit.color(p.color || 'line-strong')}" stroke-width="${(p.width || 1.5) * strokeMul()}"${dashAttr(p)} stroke-linecap="round"/>`;
    },
    sarrow(p) { return arrowSvg([p.x1, p.y1], [p.x2, p.y2], p); },
    path(p) {
      return `<path d="${p.d}" fill="${p.fill ? kit.color(p.fill) : 'none'}" fill-opacity="${p.fillOpacity ?? 1}" stroke="${p.stroke === 'none' ? 'none' : kit.color(p.stroke || 'ink')}" stroke-width="${(p.width || 1.5) * strokeMul()}"${dashAttr(p)} stroke-linecap="round" stroke-linejoin="round"/>`;
    },
    circle(p) {
      const sk = skin(p.fill === 'none' ? 'surface' : (p.fill || 'blue'), { stroke: p.stroke, sw: p.strokeWidth || 1.5 });
      const stroke = p.stroke ? kit.color(p.stroke) : (style.fill === 'tint' ? sk.stroke : 'none');
      return `<circle cx="${fs1(p.x || 0)}" cy="${fs1(p.y || 0)}" r="${fs1(Math.max(0, p.r || 6))}" fill="${p.fill === 'none' ? 'none' : sk.fill}" fill-opacity="${sk.fop}" stroke="${stroke}" stroke-width="${sk.sw || 1.5}"${dashAttr(p, '4 3')}/>` +
        (p.label != null ? textSvg(p.x || 0, p.y || 0, { text: p.label, size: p.labelSize || 12, color: style.fill === 'tint' ? labelInk(p.labelColor) || 'ink' : p.labelColor || '#ffffff', weight: 700, anchor: 'middle', mono: true }) : '');
    },
    chart(p) { // bar chart: values[], max, labels[]
      const { x = 0, y = 0, w = 240, h = 120, values = [], max = Math.max(1, ...values) } = p;
      const n = values.length || 1, gap = 6, bw = (w - gap * (n - 1)) / n;
      let s = `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${kit.color('line-strong')}"/>`;
      values.forEach((v, i) => {
        const bh = Math.max(0, (v / max) * h), bx = x + i * (bw + gap);
        const sk = skin(Array.isArray(p.colors) ? p.colors[i] : (p.color || 'blue'));
        s += `<rect x="${fs1(bx)}" y="${fs1(y + h - bh)}" width="${fs1(bw)}" height="${fs1(bh)}" rx="3" fill="${sk.fill}" fill-opacity="${sk.fop}" stroke="${sk.stroke ?? 'none'}" stroke-width="${sk.sw}"/>`;
        if (p.labels?.[i] != null) s += `<text x="${fs1(bx + bw / 2)}" y="${y + h + 14}" text-anchor="middle" font-size="11" fill="${kit.color('muted')}">${esc(p.labels[i])}</text>`;
        if (p.showValues) s += `<text x="${fs1(bx + bw / 2)}" y="${fs1(y + h - bh - 6)}" text-anchor="middle" font-size="11" font-weight="700" fill="${kit.color('ink')}" class="mono">${esc(typeof v === 'number' ? (+v).toFixed(p.decimals ?? 0) : v)}</text>`;
      });
      return s;
    },
    axis(p) { return axisSvg(p, scales(p)); },
    linechart(p) { // series: [{ values[] | points[[x,y]], color, label, dashed, width, area }], marker: { at, label }
      const sc = scales(p);
      let s = p.axes === false ? '' : axisSvg(p, sc);
      (p.series || []).forEach((se, si) => {
        const pts = (se.points || (se.values || []).map((v, i) => [p.xs ? p.xs[i] : i, v])).map(([a, b]) => [sc.x(a), sc.y(b)]);
        if (!pts.length) return;
        const col = kit.color(se.color || ['blue', 'green', 'red', 'yellow'][si % 4]);
        const d = 'M' + pts.map(q => q.map(fs1).join(',')).join(' L');
        if (se.area) s += `<path d="${d} L${fs1(pts[pts.length - 1][0])},${fs1(sc.y0)} L${fs1(pts[0][0])},${fs1(sc.y0)} Z" fill="${col}" fill-opacity=".14" stroke="none"/>`;
        s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(se.width || 2.5) * strokeMul()}"${se.dashed ? ' stroke-dasharray="6 4"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
        if (se.label) { const [lx, ly] = pts[pts.length - 1]; s += `<text x="${fs1(lx + 6)}" y="${fs1(ly)}" dominant-baseline="central" font-size="12" font-weight="700" fill="${col}">${esc(se.label)}</text>`; }
      });
      if (p.marker && p.marker.at != null) {
        const se = (p.series || [])[p.marker.series || 0];
        const mx = sc.x(p.marker.at);
        let my = null;
        if (se) { const vals = se.points || (se.values || []).map((v, i) => [p.xs ? p.xs[i] : i, v]); my = sc.y(interp(vals, p.marker.at)); }
        s += `<line x1="${fs1(mx)}" y1="${fs1(sc.yTop)}" x2="${fs1(mx)}" y2="${fs1(sc.y0)}" stroke="${kit.color('yellow-ink')}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
        if (my != null) s += `<circle cx="${fs1(mx)}" cy="${fs1(my)}" r="6" fill="${kit.color('yellow')}" stroke="${kit.color('yellow-ink')}" stroke-width="1.5"/>`;
        if (p.marker.label) s += textSvg(mx, sc.yTop - 12, { text: p.marker.label, size: 12, weight: 700, color: 'yellow-ink', mono: true });
      }
      return s;
    },
    scatter(p) { // points: [{ x, y, color, r, label }], fit: { slope, intercept }
      const sc = scales(p);
      let s = p.axes === false ? '' : axisSvg(p, sc);
      if (p.fit) {
        const { slope = 0, intercept = 0 } = p.fit, x0 = sc.xMin, x1 = sc.xMax;
        s += `<line x1="${fs1(sc.x(x0))}" y1="${fs1(sc.y(slope * x0 + intercept))}" x2="${fs1(sc.x(x1))}" y2="${fs1(sc.y(slope * x1 + intercept))}" stroke="${kit.color(p.fit.color || 'red')}" stroke-width="2" stroke-dasharray="6 4"/>`;
      }
      for (const q of p.points || []) {
        const sk = skin(q.color || 'blue');
        s += `<circle cx="${fs1(sc.x(q.x))}" cy="${fs1(sc.y(q.y))}" r="${q.r || 5}" fill="${sk.fill}" fill-opacity="${style.fill === 'tint' ? 0.5 : 0.85}" stroke="${sk.stroke ?? kit.color('surface')}" stroke-width="1"/>`;
        if (q.label) s += `<text x="${fs1(sc.x(q.x) + 8)}" y="${fs1(sc.y(q.y))}" dominant-baseline="central" font-size="11" fill="${kit.color('ink-2')}">${esc(q.label)}</text>`;
      }
      return s;
    },
    person(p) { // generic pictogram figure (never a likeness of a real person)
      const x = p.x || 0, y = p.y || 0, sz = p.size || 64, k = sz / 64;
      const col = kit.color(p.color || 'blue'), sk = skin(p.color || 'blue');
      const st = style.fill === 'tint' ? ` stroke="${sk.stroke}" stroke-width="${1.6 * style.stroke}"` : '';
      const fo = ` fill-opacity="${style.fill === 'tint' ? Math.max(0.35, sk.fop) : 1}"`;
      const pose = p.pose || 'stand';
      const T = (dx, dy) => `${fs1(x + dx * k)},${fs1(y + dy * k)}`;
      // body origin: feet at (x, y), head centre 52 above
      let s = `<circle cx="${fs1(x)}" cy="${fs1(y - 52 * k)}" r="${fs1(9 * k)}" fill="${col}"${fo}${st}/>`;
      s += `<path d="M${T(-11, -40)} Q${T(0, -44)} ${T(11, -40)} L${T(9, -16)} L${T(-9, -16)} Z" fill="${col}"${fo}${st}/>`;
      const leg = (a, b) => `<path d="M${T(a, -16)} L${T(b, 0)}" stroke="${col}" stroke-width="${fs1(6 * k)}" stroke-linecap="round" fill="none"/>`;
      s += pose === 'sit' ? `<path d="M${T(-6, -16)} L${T(10, -16)} L${T(10, 0)}" stroke="${col}" stroke-width="${fs1(6 * k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : leg(-5, -7) + leg(5, 7);
      const arm = (a, b, c, d2) => `<path d="M${T(a, b)} L${T(c, d2)}" stroke="${col}" stroke-width="${fs1(5 * k)}" stroke-linecap="round" fill="none"/>`;
      if (pose === 'wave') s += arm(-10, -38, -16, -20) + arm(10, -38, 20, -58);
      else if (pose === 'point') s += arm(-10, -38, -16, -20) + arm(10, -38, 30, -40);
      else if (pose === 'think') s += arm(-10, -38, -16, -20) + `<path d="M${T(10, -38)} L${T(14, -30)} L${T(4, -48)}" stroke="${col}" stroke-width="${fs1(5 * k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      else if (pose === 'cheer') s += arm(-10, -38, -20, -58) + arm(10, -38, 20, -58);
      else s += arm(-10, -38, -15, -18) + arm(10, -38, 15, -18);
      if (p.label) s += textSvg(x, y + 14, { text: p.label, size: p.labelSize || 12, weight: 600, color: p.labelColor || 'ink-2' });
      return s;
    },
    icon(p) { // a Fluent icon from the vendored set, centred on (x, y)
      const d = ICONS[p.name] || ICONS['circle-hint'], sz = p.size || 32, k = sz / 20;
      let s = `<g transform="translate(${fs1((p.x || 0) - sz / 2)},${fs1((p.y || 0) - sz / 2)}) scale(${k.toFixed(3)})" fill="${kit.color(p.color || 'ink-2')}">${d.map(q => `<path d="${q}"/>`).join('')}</g>`;
      if (p.label) s += textSvg(p.x || 0, (p.y || 0) + sz / 2 + 12, { text: p.label, size: p.labelSize || 12, weight: 600, color: p.labelColor || 'ink-2' });
      return s;
    },
  };
  const strokeMul = () => (style.stroke || 1);
  // white text on a solid fill becomes dark ink when the style only tints fills (line, sketch, chalk)
  const labelInk = c => (style.fill === 'tint' && (!c || /^(#fff(fff)?|white|surface|surface-2|bg)$/i.test(c)) ? 'ink' : c);
  function interp(pts, at) {
    if (!pts.length) return 0;
    if (at <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (at <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * ((at - x0) / ((x1 - x0) || 1)); }
    return pts[pts.length - 1][1];
  }
  function scales(p) {
    const { x = -200, y = -120, w = 400, h = 240 } = p;
    const all = (p.series || []).flatMap(se => se.points || (se.values || []).map((v, i) => [p.xs ? p.xs[i] : i, v])).concat((p.points || []).map(q => [q.x, q.y]));
    const xMin = p.xMin ?? Math.min(0, ...all.map(q => q[0])), xMax = p.xMax ?? Math.max(1, ...all.map(q => q[0]));
    const yMin = p.yMin ?? Math.min(0, ...all.map(q => q[1])), yMax = p.yMax ?? Math.max(1, ...all.map(q => q[1]));
    const sx = v => x + ((v - xMin) / ((xMax - xMin) || 1)) * w, sy = v => y + h - ((v - yMin) / ((yMax - yMin) || 1)) * h;
    return { x: sx, y: sy, xMin, xMax, yMin, yMax, y0: y + h, yTop: y, x0: x, w, h };
  }
  function ticks(min, max, n = 5) {
    const span = max - min || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || mag * 10;
    const out = []; for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function axisSvg(p, sc) {
    const lc = kit.color('line-strong'), mc = kit.color('muted');
    let s = `<path d="M${fs1(sc.x0)},${fs1(sc.yTop)} L${fs1(sc.x0)},${fs1(sc.y0)} L${fs1(sc.x0 + sc.w)},${fs1(sc.y0)}" fill="none" stroke="${lc}" stroke-width="1.2"/>`;
    const fmt = v => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : String(+v.toFixed(2)));
    if (p.ticks !== false) {
      for (const v of (Array.isArray(p.xTicks) ? p.xTicks : ticks(sc.xMin, sc.xMax, p.xTicks || 5))) s += `<text x="${fs1(sc.x(v))}" y="${fs1(sc.y0 + 14)}" text-anchor="middle" font-size="10.5" fill="${mc}" class="mono">${esc(fmt(v))}</text>`;
      for (const v of (Array.isArray(p.yTicks) ? p.yTicks : ticks(sc.yMin, sc.yMax, p.yTicks || 4))) {
        s += `<text x="${fs1(sc.x0 - 6)}" y="${fs1(sc.y(v))}" text-anchor="end" dominant-baseline="central" font-size="10.5" fill="${mc}" class="mono">${esc(fmt(v))}</text>`;
        if (p.grid) s += `<line x1="${fs1(sc.x0)}" y1="${fs1(sc.y(v))}" x2="${fs1(sc.x0 + sc.w)}" y2="${fs1(sc.y(v))}" stroke="${kit.color('line')}" stroke-width="1"/>`;
      }
    }
    if (p.xLabel) s += `<text x="${fs1(sc.x0 + sc.w / 2)}" y="${fs1(sc.y0 + 32)}" text-anchor="middle" font-size="12" font-weight="600" fill="${kit.color('ink-2')}">${esc(p.xLabel)}</text>`;
    if (p.yLabel) s += `<text x="${fs1(sc.x0)}" y="${fs1(sc.yTop - 12)}" text-anchor="middle" font-size="12" font-weight="600" fill="${kit.color('ink-2')}">${esc(p.yLabel)}</text>`;
    return s;
  }
  function textSvg(x, y, p) {
    let str = String(p.text ?? '');
    if (p.writeT != null && p.writeT < 1) str = str.slice(0, Math.round(str.length * Math.max(0, p.writeT)));
    const lines = str.split('\n');
    const fs = p.size || 13, lh = fs * 1.3;
    const y0 = y - ((lines.length - 1) * lh) / 2;
    return `<text x="${fs1(x)}" y="${fs1(y0)}" text-anchor="${p.anchor === 'start' ? 'start' : p.anchor === 'end' ? 'end' : 'middle'}" dominant-baseline="central" font-size="${fs1(fs)}" font-weight="${p.weight || 500}" fill="${kit.color(p.color || 'ink')}"${p.mono ? ' class="mono"' : ''}${p.italic ? ' font-style="italic"' : ''}>` +
      lines.map((l, i) => `<tspan x="${fs1(x)}" dy="${i ? fs1(lh) : 0}">${esc(l)}</tspan>`).join('') + `</text>`;
  }
  function arrowSvg(a, b, p) {
    const col = kit.color(p.color || 'ink-2');
    let d;
    if (p.curve) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1, k = p.curve;
      d = `M${fs1(a[0])},${fs1(a[1])} Q${fs1(mx - (dy / len) * k)},${fs1(my + (dx / len) * k)} ${fs1(b[0])},${fs1(b[1])}`;
    } else d = `M${fs1(a[0])},${fs1(a[1])} L${fs1(b[0])},${fs1(b[1])}`;
    let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(p.width || 2) * strokeMul()}"${p.dashed ? ' stroke-dasharray="6 4"' : ''} stroke-linecap="round" marker-end="url(#uf-arrow-${id})"/>`;
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
  // stroke "draw-on": with pathLength = 1 the dash pattern reveals the first `drawn` share of every stroke
  function applyDraw(el, drawn) {
    for (const s of el.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse')) {
      s.setAttribute('pathLength', '1');
      s.setAttribute('stroke-dasharray', '1 1');
      s.setAttribute('stroke-dashoffset', (1 - drawn).toFixed(3));
      const fo = +(s.getAttribute('fill-opacity') ?? 1);
      s.setAttribute('fill-opacity', (fo * drawn * drawn).toFixed(3));
      if (drawn < 0.97) s.removeAttribute('marker-end');
    }
    for (const t of el.querySelectorAll('text')) t.setAttribute('opacity', Math.max(0, (drawn - 0.55) / 0.45).toFixed(3));
  }
  function paint(n) {
    let p = n.cur;
    if (p.along && p.along.d) {   // ride a path: overrides x/y
      const [ax, ay] = kit.pointAt(p.along.d, p.along.t ?? 0);
      p = n.type === 'rect' ? { ...p, x: ax - (p.w || 0) / 2, y: ay - (p.h || 0) / 2 } : { ...p, x: ax, y: ay };
    }
    n.el.setAttribute('opacity', (p.opacity ?? 1).toFixed(3));
    if (kit.mesh && MESH_TYPES.has(n.type)) {
      kit.mesh.update(n.key, n.type, p);
      n.el.innerHTML = draw[n.type](p, { labelOnly: true });
    } else n.el.innerHTML = draw[n.type](p);
    if (p.drawn != null && p.drawn < 1) applyDraw(n.el, Math.max(0, p.drawn));
  }
  function enterFrom(type, p) {
    const auto = style.drawOn && STROKY.has(type) && p.draw !== false ? 'draw' : null;
    const e = p.enter || (p.draw ? 'draw' : p.write ? 'write' : auto || (['box', 'token'].includes(type) ? 'drop' : 'fade'));
    const s = { ...p, opacity: 0 };
    if (e === 'drop' && 'z' in p) s.z = (p.z || 0) + 1.4;
    else if (e === 'drop' && type === 'box') s.z = 1.4;
    if (e === 'grow' && type === 'box') s.h = 0.01;
    if (e === 'grow' && type === 'circle') s.r = 0;
    if (e === 'grow' && type === 'rect') s.w = 0;
    if (e === 'draw') { s.drawn = 0; s.opacity = p.opacity ?? 1; }
    if (e === 'write') { s.writeT = 0; s.opacity = p.opacity ?? 1; }
    if (e === 'none') s.opacity = p.opacity ?? 1;
    return s;
  }
  function exitTo(type, p, how) {
    const e = how || (['box', 'token'].includes(type) ? 'lift' : 'fade');
    const s = { ...p, opacity: 0 };
    if (e === 'lift') s.z = (p.z || 0) + 1.6;
    if (e === 'right') { s.x = (p.x || 0) + 4; }
    if (e === 'sink') s.z = (p.z || 0) - 1;
    if (e === 'undraw') { s.drawn = 0; s.opacity = p.opacity ?? 1; }
    return s;
  }

  kit.begin = () => { frameKeys = new Map(); framePhases = []; };
  // Declare the order of named phases for this step: kit.seq('travel', 'arrive', 'count').
  kit.seq = (...names) => { framePhases = names.flat(); };
  function put(type, key, props) {
    if (!frameKeys) throw new Error('kit.begin() must be called before drawing');
    if (!draw[type]) throw new Error(`unknown primitive ${type}`);
    frameKeys.set(String(key), { type, props: { opacity: 1, ...props } });
  }
  for (const t of Object.keys(draw)) kit[t] = (key, props = {}) => put(t, key, props);
  const phaseIndex = ph => (ph == null ? 0 : typeof ph === 'number' ? ph : Math.max(0, framePhases.indexOf(ph)));

  kit.end = ({ instant = false } = {}) => {
    const now = performance.now();
    const dur = instant ? 0 : kit.duration;
    const k = dur / MOTION.state;   // motion tokens scale with the kit's duration (0 when instant or reduced)
    for (const [key, { type, props }] of frameKeys) {
      let n = nodes.get(key);
      if (n && n.type !== type) { n.el.remove(); nodes.delete(key); if (kit.mesh) kit.mesh.remove(key); n = null; }
      if (!n) {
        const el = document.createElementNS(SVGNS, 'g');
        el.dataset.key = key;
        el.dataset.type = type;
        n = { key, type, el, cur: dur ? enterFrom(type, props) : { ...props } };
        nodes.set(key, n);
      }
      n.exiting = false;
      n.from = { ...n.cur };
      n.to = { ...props };
      for (const [ik, rest] of Object.entries(INTERNAL)) if (n.from[ik] != null && n.to[ik] == null) n.to[ik] = rest;
      const d = props.motion && MOTION[props.motion] ? MOTION[props.motion] * k : dur;
      n.start = now + ((props.delay || 0) + phaseIndex(props.phase) * MOTION.state) * (dur ? 1 : 0);
      n.dur = d;
      n.ease = EASE[props.ease] || ease;
      n.depth = depth(type, props);
    }
    for (const [key, n] of nodes) {
      if (frameKeys.has(key) || n.exiting) continue;
      n.exiting = true;
      n.from = { ...n.cur };
      n.to = exitTo(n.type, n.cur, n.cur.exit);
      n.start = now; n.dur = dur; n.ease = ease;
      if (!dur) { n.el.remove(); nodes.delete(key); if (kit.mesh) kit.mesh.remove(key); }
    }
    const sorted = [...nodes.values()].sort((a, b) => a.depth - b.depth);
    for (const n of sorted) world.appendChild(n.el);
    frameKeys = null;
    tick();
    if (!dur) fitView(true);
  };

  // Phones: widen the view (smoothly, never shrinking) when the drawing runs past the cropped area.
  function fitView(instant = false) {
    if (!narrow) return;
    let bb;
    try { bb = world.getBBox(); } catch { return; }
    if (!bb || (!bb.width && !bb.height)) return;
    const full = { x: -W / 2, y: -H / 2, w: W, h: H }, pad = 6;
    const x0 = Math.max(full.x, Math.min(vb.x, bb.x - pad)), y0 = Math.max(full.y, Math.min(vb.y, bb.y - pad));
    const x1 = Math.min(full.x + full.w, Math.max(vb.x + vb.w, bb.x + bb.width + pad)), y1 = Math.min(full.y + full.h, Math.max(vb.y + vb.h, bb.y + bb.height + pad));
    const to = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    if (Math.abs(to.x - vb.x) + Math.abs(to.y - vb.y) + Math.abs(to.w - vb.w) + Math.abs(to.h - vb.h) < 1) return;
    if (instant || !kit.duration) { Object.assign(vb, to); setVB(); return; }
    vbTween = { from: { ...vb }, to, start: performance.now(), dur: MOTION.quick * 1.5 };
    tick();
  }

  function tick() {
    cancelAnimationFrame(raf);
    const now = performance.now();
    let busy = false, meshDirty = false;
    for (const [key, n] of nodes) {
      if (!n.to) continue;
      const t = n.dur ? Math.max(0, Math.min(1, (now - n.start) / n.dur)) : 1;
      n.cur = t >= 1 ? { ...n.to } : lerpProps(n.from, n.to, n.ease(t));
      paint(n);
      if (kit.mesh && MESH_TYPES.has(n.type)) meshDirty = true;
      if (t < 1) busy = true;
      else {
        if (n.exiting) { n.el.remove(); nodes.delete(key); if (kit.mesh) { kit.mesh.remove(key); meshDirty = true; } }
        else n.to = null;
      }
    }
    if (vbTween) {
      const t = Math.min(1, (now - vbTween.start) / vbTween.dur), e = ease(t);
      for (const k of ['x', 'y', 'w', 'h']) vb[k] = vbTween.from[k] + (vbTween.to[k] - vbTween.from[k]) * e;
      setVB();
      if (kit.mesh) meshDirty = true;
      if (t < 1) busy = true; else vbTween = null;
    }
    if (!busy && narrow && !vbTween && nodesSettled()) fitView();
    if (vbTween) busy = true;
    if (meshDirty || (kit.mesh && kit.mesh.animating?.())) { kit.mesh?.render(); if (kit.mesh?.animating?.()) busy = true; }
    if (loops.length && !kit.paused) {
      for (const fn of loops) fn(now);
      busy = true;
    }
    if (busy) raf = requestAnimationFrame(tick);
  }
  const nodesSettled = () => ![...nodes.values()].some(n => n.to);

  // Continuous ambient animation (e.g. flowing particles). fn(nowMs) runs every frame until kit.clearLoops().
  kit.loop = fn => { if (!kit.reduced) { loops.push(fn); tick(); } };
  kit.clearLoops = () => { loops = []; };
  kit.setPaused = p => { kit.paused = p; if (!p) tick(); };
  kit.isAnimating = () => !nodesSettled() || !!vbTween;
  kit.hasLoops = () => loops.length > 0;
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

  // 3D style: box/plate/token are drawn by a three.js adapter under the SVG; labels stay in SVG.
  kit.attachMesh = mesh => {
    kit.mesh = mesh;
    for (const n of nodes.values()) paint(n);
    mesh.render();
  };

  kit.refreshColors = () => { colorCache = null; if (floorArgs) kit.floor(floorArgs); for (const n of nodes.values()) paint(n); kit.mesh?.refresh?.(); kit.mesh?.render(); };
  kit.clear = () => { for (const [key, n] of nodes) { n.el.remove(); kit.mesh?.remove(key); } nodes.clear(); kit.clearLoops(); bgLayer.innerHTML = ''; };
  kit.destroy = () => { cancelAnimationFrame(raf); kit.clear(); kit.mesh?.destroy(); svg.remove(); delete stage.dataset.style; };
  installTemplates(kit);
  return kit;
}
