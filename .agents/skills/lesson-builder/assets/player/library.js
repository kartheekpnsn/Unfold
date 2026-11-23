// library.js: the topic-library graph page (topics/index.html). Force-directed SVG, no dependencies.
import { icon } from 'unfold/icons';
import { esc, initTheme, store } from 'unfold/util';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const DUR = { '30m': '30 min', '2h': '2 hours' };

export function boot(graph) {
  const all = graph.nodes, byId = new Map(all.map(n => [n.id, n]));
  const built = all.filter(n => n.status === 'built'), drafts = all.filter(n => n.status === 'draft'), sugg = all.filter(n => n.status === 'suggested');
  let showSuggested = store.get('library:suggested', true);
  let selected = null;

  document.body.innerHTML = `
    <header class="topbar">
      <span class="brand"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span>Unfold</span></span>
      <span class="lib-title">Topic library</span>
      <div class="top-actions">
        <div class="search">${icon('search', 16)}<input type="search" placeholder="Find a topic" aria-label="Find a topic"></div>
        <button class="icon-btn" id="theme-btn" aria-label="Toggle dark mode">${icon('weather-moon', 18)}</button>
      </div>
    </header>
    <div class="lib-shell">
      <main class="lib-stage" aria-label="Topic graph">
        <svg class="lib-graph" role="group" aria-label="Topics and how they connect"></svg>
        <div class="lib-tools">
          <label class="lib-toggle"><input type="checkbox" id="sugg" ${showSuggested ? 'checked' : ''}> Show suggested topics <span class="muted">(${sugg.length})</span></label>
          <button class="icon-btn" id="fit" aria-label="Fit graph to screen" title="Fit to screen">${icon('zoom-fit', 18)}</button>
        </div>
        <div class="lib-legend" aria-hidden="true">
          <span><i class="lg-node built"></i>Lesson</span><span><i class="lg-node draft"></i>In progress</span><span><i class="lg-node suggested"></i>Suggested</span>
          <span><i class="lg-edge contains"></i>Contains</span><span><i class="lg-edge related"></i>Needs / leads to</span>
        </div>
        <p class="lib-hint">Drag to move · scroll to zoom · click a topic for details · double-click to open</p>
      </main>
      <aside class="lib-panel" aria-live="polite"></aside>
    </div>`;

  const svg = document.querySelector('.lib-graph'), panel = document.querySelector('.lib-panel'), input = document.querySelector('.search input');
  const themeBtn = document.getElementById('theme-btn');
  initTheme(themeBtn, () => { const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); themeBtn.innerHTML = icon(dark ? 'weather-sunny' : 'weather-moon', 18); });

  if (!built.length && !drafts.length) {
    svg.remove();
    document.querySelector('.lib-stage').insertAdjacentHTML('afterbegin', `<div class="lib-empty">${icon('book-open', 40)}<h2>No topics yet</h2><p>Select the <b>unfold</b> agent and type a topic, or run <code>/unfold "Stacks"</code>. Each lesson appears here as a node.</p></div>`);
    renderPanel(); return;
  }

  // ---------- svg scaffolding ----------
  const defs = el('defs', {}, svg);
  for (const [id, cls] of [['arr', 'arrow'], ['arr-hl', 'arrow hl']]) {
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 1 L9 5 L0 9 z', class: cls }, m);
  }
  const view = el('g', { class: 'viewport' }, svg);
  const gEdges = el('g', { class: 'edges' }, view), gNodes = el('g', { class: 'nodes' }, view);

  // ---------- simulation state ----------
  let N = [], E = [], alpha = 0, raf = 0;
  const radius = n => n.status === 'suggested' ? 7 : n.status === 'draft' ? 11 : (n.parent ? 14 : 18) + Math.min(4, kids(n.id)) * 1.5;
  const kids = id => all.filter(n => n.parent === id).length;

  function rebuild() {
    const visible = all.filter(n => showSuggested || n.status !== 'suggested');
    const ids = new Set(visible.map(n => n.id));
    // deterministic start: top-level topics spread on a wide circle, subtopics next to their parent, suggestions around their source
    const placed = new Map(N.map(n => [n.id, n]));
    const make = (d, i, anchor, rr) => {
      const r = radius(d), lw = Math.min(28, d.title.length) * (d.status === 'suggested' ? 6.2 : 7), ang = i * 2.399963;
      return { d, id: d.id, r, w: Math.max(2 * r, lw), h: 2 * r + 20, x: (anchor?.x || 0) + Math.cos(ang) * rr, y: (anchor?.y || 0) + Math.sin(ang) * rr, vx: 0, vy: 0 };
    };
    const order = [...visible.filter(d => d.status !== 'suggested').sort((x, y) => (x.path.split('/').length - y.path.split('/').length)), ...visible.filter(d => d.status === 'suggested')];
    order.forEach((d, i) => {
      if (placed.has(d.id)) return;
      const anchor = d.parent ? placed.get(d.parent) : d.suggestedBy?.length ? placed.get(d.suggestedBy[0].from) : null;
      placed.set(d.id, make(d, i, anchor, anchor ? (d.status === 'suggested' ? 90 : 140) : 120 + 90 * Math.sqrt(i)));
    });
    N = visible.map(d => placed.get(d.id));
    const by = new Map(N.map(n => [n.id, n]));
    E = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => ({ ...e, s: by.get(e.source), t: by.get(e.target) }));
    draw();
    heat(1);
  }

  function heat(a) {
    alpha = Math.max(alpha, a);
    if (reduced) { while (alpha > 0.005) tick(); place(); fit(false); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  let fitted = false;
  function loop() {
    for (let i = 0; i < 2; i++) tick();
    place();
    if (!fitted && alpha < 0.08) { fitted = true; fit(true); }
    raf = alpha > 0.005 ? requestAnimationFrame(loop) : 0;
  }

  function tick() {
    const n = N.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = N[i], b = N[j];
      let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 < 0.01) { dx = (Math.random() - .5); dy = (Math.random() - .5); d2 = dx * dx + dy * dy; }
      const d = Math.sqrt(d2);
      const ca = a.d.status === 'suggested' ? 0.45 : 2.6, cb = b.d.status === 'suggested' ? 0.45 : 2.6, charge = ca * cb;
      const f = Math.min(9000 * charge / d2, 20) * alpha;
      const fx = dx / d * f, fy = dy / d * f;
      if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
      if (!b.fixed) { b.vx += fx; b.vy += fy; }
      // collision on the node + its label (a box under the dot), so titles never sit on top of each other
      const ox = (a.w + b.w) / 2 + 10 - Math.abs(dx), oy = (a.h + b.h) / 2 + 6 - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
        const px = ox < oy ? ox * sx * 0.5 : 0, py = ox < oy ? 0 : oy * sy * 0.5;
        if (!a.fixed) { a.x -= px; a.y -= py; }
        if (!b.fixed) { b.x += px; b.y += py; }
      }
    }
    for (const e of E) {
      const len = e.kind === 'contains' ? 130 : e.t.d.status === 'suggested' || e.s.d.status === 'suggested' ? 95 : 200;
      const k = e.kind === 'contains' ? 0.12 : e.t.d.status === 'suggested' || e.s.d.status === 'suggested' ? 0.1 : 0.04;
      const dx = e.t.x - e.s.x, dy = e.t.y - e.s.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - len) * k * alpha, fx = dx / d * f, fy = dy / d * f;
      if (!e.s.fixed) { e.s.vx += fx; e.s.vy += fy; }
      if (!e.t.fixed) { e.t.vx -= fx; e.t.vy -= fy; }
    }
    for (const a of N) {
      if (a.fixed) { a.vx = a.vy = 0; continue; }
      a.vx -= a.x * 0.006 * alpha; a.vy -= a.y * 0.009 * alpha;   // gentle pull to the centre
      a.vx *= 0.6; a.vy *= 0.6;
      a.x += a.vx; a.y += a.vy;
    }
    alpha *= 0.985;
  }

  // ---------- drawing ----------
  let nodeEls = new Map(), edgeEls = [];
  function draw() {
    gEdges.textContent = ''; gNodes.textContent = '';
    edgeEls = E.map(e => {
      const related = e.kind !== 'contains', toSugg = e.s.d.status === 'suggested' || e.t.d.status === 'suggested';
      const p = el('path', { class: `edge ${e.kind}${toSugg ? ' to-sugg' : ''}`, ...(related ? { 'marker-end': 'url(#arr)' } : {}) }, gEdges);
      el('title', {}, p).textContent = e.kind === 'contains' ? `${e.s.d.title} contains ${e.t.d.title}` : `${e.s.d.title} → ${e.t.d.title}${e.kind === 'prereq' ? ' (needed first)' : ' (next)'}`;
      return { e, p };
    });
    nodeEls = new Map();
    for (const n of N) {
      const g = el('g', { class: `node ${n.d.status}`, tabindex: 0, role: 'button', 'aria-label': `${n.d.title}${n.d.status === 'built' ? '' : n.d.status === 'draft' ? ' (in progress)' : ' (suggested, not built yet)'}` }, gNodes);
      el('circle', { class: 'halo', r: n.r + 6 }, g);
      el('circle', { class: 'dot', r: n.r }, g);
      if (n.d.status === 'built' && kids(n.id)) { const t = el('text', { class: 'count', dy: '0.35em' }, g); t.textContent = kids(n.id); }
      const label = el('text', { class: 'label', y: n.r + 15 }, g);
      label.textContent = n.d.title.length > 28 ? n.d.title.slice(0, 26) + '…' : n.d.title;
      bindNode(g, n);
      nodeEls.set(n.id, g);
    }
    applyFocus();
  }
  function place() {
    for (const n of N) nodeEls.get(n.id)?.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
    for (const { e, p } of edgeEls) {
      const dx = e.t.x - e.s.x, dy = e.t.y - e.s.y, d = Math.hypot(dx, dy) || 1;
      const x1 = e.s.x + dx / d * e.s.r, y1 = e.s.y + dy / d * e.s.r, x2 = e.t.x - dx / d * (e.t.r + 3), y2 = e.t.y - dy / d * (e.t.r + 3);
      if (e.kind === 'contains') p.setAttribute('d', `M${x1},${y1}L${x2},${y2}`);
      else { const bend = 0.12, mx = (x1 + x2) / 2 - dy * bend, my = (y1 + y2) / 2 + dx * bend; p.setAttribute('d', `M${x1},${y1}Q${mx},${my} ${x2},${y2}`); }
    }
  }

  // ---------- pan / zoom ----------
  let T = { x: 0, y: 0, k: 1 };
  const applyT = (smooth) => { view.style.transition = smooth && !reduced ? 'transform .45s cubic-bezier(.4,0,.2,1)' : 'none'; view.style.transform = `translate(${T.x}px,${T.y}px) scale(${T.k})`; };
  function fit(smooth = true) {
    if (!N.length) return;
    const { width: w, height: h } = svg.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of N) { x0 = Math.min(x0, n.x - n.r - 60); x1 = Math.max(x1, n.x + n.r + 60); y0 = Math.min(y0, n.y - n.r - 20); y1 = Math.max(y1, n.y + n.r + 34); }
    const k = Math.min(1.6, Math.max(0.3, Math.min((w - 40) / (x1 - x0), (h - 110) / (y1 - y0))));
    T = { k, x: w / 2 - k * (x0 + x1) / 2, y: (h - 40) / 2 - k * (y0 + y1) / 2 + 8 };
    applyT(smooth);
  }
  function centerOn(n) {
    const { width: w, height: h } = svg.getBoundingClientRect();
    T = { k: Math.max(T.k, 1), x: w / 2 - Math.max(T.k, 1) * n.x, y: h / 2 - Math.max(T.k, 1) * n.y };
    applyT(true);
  }
  svg.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    const k = Math.min(3, Math.max(0.25, T.k * Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0015))));
    T = { k, x: px - (px - T.x) * k / T.k, y: py - (py - T.y) * k / T.k };
    applyT(false);
  }, { passive: false });
  let pan = null;
  svg.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.node')) return;
    pan = { x: ev.clientX, y: ev.clientY, tx: T.x, ty: T.y, moved: false };
    svg.setPointerCapture(ev.pointerId); svg.classList.add('panning');
  });
  svg.addEventListener('pointermove', ev => {
    if (!pan) return;
    const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
    T = { ...T, x: pan.tx + dx, y: pan.ty + dy }; applyT(false);
  });
  svg.addEventListener('pointerup', () => { if (pan && !pan.moved) select(null); pan = null; svg.classList.remove('panning'); });
  addEventListener('resize', () => fit(false));
  document.getElementById('fit').addEventListener('click', () => fit(true));

  // ---------- node interaction ----------
  function bindNode(g, n) {
    let drag = null;
    g.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      drag = { x: ev.clientX, y: ev.clientY, nx: n.x, ny: n.y, moved: false };
      g.setPointerCapture(ev.pointerId);
    });
    g.addEventListener('pointermove', ev => {
      if (!drag) return;
      const dx = (ev.clientX - drag.x) / T.k, dy = (ev.clientY - drag.y) / T.k;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      drag.moved = true; n.fixed = true; n.x = drag.nx + dx; n.y = drag.ny + dy;
      heat(0.25); place();
    });
    g.addEventListener('pointerup', () => { if (drag && !drag.moved) select(n.id); if (drag?.moved) n.fixed = false, heat(0.15); drag = null; });
    g.addEventListener('dblclick', () => open(n.d));
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(n.d); if (ev.key === ' ') { ev.preventDefault(); select(n.id); } });
    g.addEventListener('focus', () => hover(n.id));
    g.addEventListener('blur', () => hover(null));
    g.addEventListener('pointerenter', () => hover(n.id));
    g.addEventListener('pointerleave', () => hover(null));
  }
  const open = d => { if (d.status === 'built') location.href = d.href; else select(d.id); };

  let hovered = null, query = '';
  function hover(id) { hovered = id; applyFocus(); }
  function neighbours(id) {
    const s = new Set([id]);
    for (const { e } of edgeEls) { if (e.source === id) s.add(e.target); if (e.target === id) s.add(e.source); }
    return s;
  }
  function applyFocus() {
    const focus = hovered || selected;
    const near = focus ? neighbours(focus) : null;
    const q = query.trim().toLowerCase();
    for (const [id, g] of nodeEls) {
      const d = byId.get(id);
      const match = !q || d.title.toLowerCase().includes(q) || (d.path || '').toLowerCase().includes(q);
      g.classList.toggle('dim', (near && !near.has(id)) || !match);
      g.classList.toggle('sel', id === selected);
      g.classList.toggle('hit', !!q && match);
    }
    for (const { e, p } of edgeEls) {
      const on = focus && (e.source === focus || e.target === focus);
      p.classList.toggle('hl', !!on); p.classList.toggle('dim', !!focus && !on || (!!q && !focus));
      if (e.kind !== 'contains') p.setAttribute('marker-end', on ? 'url(#arr-hl)' : 'url(#arr)');
    }
  }
  function select(id) {
    selected = id; applyFocus(); renderPanel();
    if (id && matchMedia('(max-width: 860px)').matches) panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  input.addEventListener('input', () => { query = input.value; applyFocus(); });
  input.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    const q = input.value.trim().toLowerCase();
    const hit = N.find(n => n.d.title.toLowerCase().includes(q));
    if (hit) { select(hit.id); centerOn(hit); }
  });
  document.getElementById('sugg').addEventListener('change', ev => {
    showSuggested = ev.target.checked; store.set('library:suggested', showSuggested);
    if (!showSuggested && byId.get(selected)?.status === 'suggested') selected = null;
    fitted = false; rebuild(); renderPanel();
  });
  addEventListener('keydown', ev => { if (ev.key === 'Escape') { select(null); input.blur(); } });

  // ---------- side panel ----------
  function linkTo(id, title) {
    const d = byId.get(id);
    if (!d) return esc(title);
    const cls = d.status === 'built' ? 'lnk built' : 'lnk ' + d.status;
    return `<button class="${cls}" data-sel="${esc(id)}">${esc(d.title)}</button>${d.status === 'suggested' ? ' <span class="muted">not built yet</span>' : d.status === 'draft' ? ' <span class="muted">in progress</span>' : ''}`;
  }
  function renderPanel() {
    const d = selected && byId.get(selected);
    let html = '';
    if (!d) {
      html = `<h2>Your library</h2>
        <p class="stats"><b>${built.length}</b> lesson${built.length === 1 ? '' : 's'}${drafts.length ? ` · <b>${drafts.length}</b> in progress` : ''} · <b>${sugg.length}</b> suggested next</p>
        <p class="muted small">Big dots are lessons. Lines show folders (a topic <i>contains</i> its subtopics) and the prerequisites and next steps each lesson names.</p>
        <h3>Folders</h3><ul class="outline">${outline(null)}</ul>
        <p class="muted small foot">Updated ${esc(graph.generated)}. To add a topic, select the <b>unfold</b> agent and type it.</p>`;
    } else if (d.status === 'suggested') {
      html = `<div class="kicker">${icon('sparkle', 14)} Suggested topic</div><h2>${esc(d.title)}</h2>
        <p class="muted">Not built yet. Your lessons point to it:</p>
        <ul class="refs">${d.suggestedBy.map(s => `<li>${s.as === 'prereq' ? 'Needed for' : 'Comes after'} ${linkTo(s.from, s.title)}${s.why ? `<div class="lib-why">${esc(s.why)}</div>` : ''}</li>`).join('')}</ul>
        <h3>Build it</h3><p class="small">Select the <b>unfold</b> agent and type:</p>
        <div class="cmd"><code>${esc(d.title)}</code><button class="icon-btn" id="copy" aria-label="Copy topic name">${icon('document-text', 16)}</button></div>`;
    } else {
      const parts = d.path.split('/');
      const crumbs = parts.slice(0, -1).map((p, i) => linkTo(parts.slice(0, i + 1).join('/'), p)).join(' <span class="muted">/</span> ');
      const children = all.filter(n => n.parent === d.id);
      html = `${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h2>${esc(d.title)}</h2>
        <div class="chips">${d.status === 'draft' ? `<span class="chip draft">In progress${d.phase ? ` · after ${esc(d.phase)}` : ''}</span>` : ''}${d.level ? `<span class="chip">${esc(LEVEL[d.level] || d.level)}</span>` : ''}${d.duration ? `<span class="chip">${esc(DUR[d.duration] || d.duration)}</span>` : ''}${d.domain ? `<span class="chip">${esc(d.domain)}</span>` : ''}</div>
        ${d.summary ? `<p>${esc(d.summary)}</p>` : ''}
        ${d.status === 'built' ? `<a class="btn primary open" href="${esc(d.href)}">${icon('book-open', 16)} Open lesson</a>` : `<p class="muted small">Not built yet. Select the <b>unfold</b> agent and type <code>${esc(d.title)}</code> to resume.</p>`}
        ${children.length ? `<h3>Subtopics</h3><ul class="refs">${children.map(c => `<li>${linkTo(c.id)}</li>`).join('')}</ul>` : ''}
        ${d.prereqs?.length ? `<h3>Needs first</h3><ul class="refs">${d.prereqs.map(r => `<li>${linkTo(r.id, r.title)}${r.why ? `<div class="lib-why">${esc(r.why)}</div>` : ''}</li>`).join('')}</ul>` : ''}
        ${d.next?.length ? `<h3>Leads to</h3><ul class="refs">${d.next.map(r => `<li>${linkTo(r.id, r.title)}${r.why ? `<div class="lib-why">${esc(r.why)}</div>` : ''}</li>`).join('')}</ul>` : ''}
        <p class="muted small foot mono">topics/${esc(d.path)}</p>`;
    }
    panel.innerHTML = (d ? `<button class="back" id="back">${icon('arrow-left', 14)} All topics</button>` : '') + html;
    panel.querySelector('#back')?.addEventListener('click', () => select(null));
    panel.querySelector('#copy')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(d.title); panel.querySelector('#copy').innerHTML = icon('checkmark', 16); } catch { /* no clipboard */ } });
    panel.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.sel, n = N.find(x => x.id === id);
      if (!n && byId.get(id)?.status === 'suggested') { document.getElementById('sugg').checked = true; showSuggested = true; rebuild(); }
      select(id); const m = N.find(x => x.id === id); if (m) centerOn(m);
    }));
  }
  function outline(parent) {
    return all.filter(n => n.status !== 'suggested' && n.parent === parent).map(n => {
      const sub = outline(n.id);
      return `<li>${linkTo(n.id)}${sub ? `<ul>${sub}</ul>` : ''}</li>`;
    }).join('');
  }

  rebuild();
  renderPanel();
  if (reduced) fit(false);
}
