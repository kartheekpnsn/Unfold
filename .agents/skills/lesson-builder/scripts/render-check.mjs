#!/usr/bin/env node
// render-check.mjs: render every step of a built lesson in headless Chrome and check what the learner actually sees.
// validate-lesson.mjs dry-runs scenes against a mock kit; this script draws them for real.
//
// Usage:
//   node render-check.mjs <topic-folder>... | --all [--root topics]
//   options: --widths 1280,390   viewport widths to check (default 1280,390)
//            --no-log            don't append a "Render check" section to _unfold/build-log.md
//            --frames            also save mid-transition screenshots (25/50/75%) to _unfold/qa/frames/
//            --json              print the full report as JSON
//   Alternate styles (lesson.altStyles) are checked at the first width too, end states only: contact-<style>.png.
//
// Needs Chrome, Chromium or Edge (set CHROME_PATH if it isn't found). Run it after build-page.mjs.
// Exit code 1 if any lesson has errors. Writes T/_unfold/qa/contact.png (+ contact-<width>.png) and report.json.
//
// End-state checks (every step, every width):           Transition checks (consecutive steps in one scene):
//   ERROR text clipped by the stage edge                  warn text-only step: only words change, nothing moves
//   ERROR two labels overlap                              warn jump: a shape snaps to its new place instead of moving
//   ERROR shape mostly outside the stage                  warn re-keyed: a shape vanishes and an identical one appears
//   ERROR runtime error / scene failed to render          warn too many focal changes in one step (P1)
//   warn  sparse stage (drawing covers < 35% of it)       warn nothing on the stage changes at all

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs';
import { join, resolve, relative, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findTopics } from './validate-lesson.mjs';

const T = {
  edgeTol: 2,            // px a text box may poke past the stage edge
  overlapFrac: 0.18,     // overlap area / smaller text area that counts as overlapping
  outsideFrac: 0.4,      // share of a shape outside the stage that counts as an error
  sparse: 0.35,          // drawing extent / stage area below which the stage counts as sparse
  moved: 3,              // px change that counts as movement
  clusterGap: 36,        // px: changes closer than this belong to one focal area
  maxFocal: 3,           // focal areas allowed to change in one step
  settleMs: 8000,        // max virtual time to wait for a transition to finish
  frameMs: 32,           // virtual time between sampled frames
};

// ---------- Chrome over the DevTools protocol (no dependencies) ----------
function findChrome() {
  const c = [process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];
  return c.find(p => p && existsSync(p));
}

export async function launch() {
  const bin = findChrome();
  if (!bin) throw new Error('No Chrome/Chromium/Edge found; set CHROME_PATH');
  const profile = mkdtempSync(join(tmpdir(), 'unfold-rc-'));
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('Chrome did not start')), 20000);
    proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
    proc.on('exit', c => rej(new Error(`Chrome exited (${c})`)));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map(), listeners = new Set();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else for (const l of listeners) l(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  return {
    send, on: f => listeners.add(f), off: f => listeners.delete(f),
    close() { try { ws.close(); } catch { /* gone */ } proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500); },
  };
}

export async function openPage(browser, { width, height, noWebGL = false, pref = null }) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => browser.send(m, p, sessionId);
  const errors = [];
  const onMsg = m => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ').split('\n')[0]);
  };
  browser.on(onMsg);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  // pref = { key, value }: a localStorage entry to set (value) or clear (null) before the page runs, e.g. the chosen style
  const prefJs = pref ? `try { ${pref.value == null ? `localStorage.removeItem(${JSON.stringify(pref.key)})` : `localStorage.setItem(${JSON.stringify(pref.key)}, ${JSON.stringify(JSON.stringify(pref.value))})`} } catch (e) {}` : '';
  await s('Page.addScriptToEvaluateOnNewDocument', { source: CLOCK + (noWebGL ? NO_WEBGL : '') + prefJs });
  const evaluate = async (expr, awaitPromise = true) => {
    const r = await s('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    s, evaluate, errors,
    async goto(url) {
      const [base, hash = ''] = url.split('#');
      if (this.base === base) await evaluate(`location.hash = ${JSON.stringify('#' + hash)}; new Promise(r => setTimeout(r, 30))`);
      else {
        const loaded = new Promise(res => { const f = m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { browser.off(f); res(); } }; browser.on(f); });
        await s('Page.navigate', { url });
        await loaded;
        this.base = base;
        await evaluate(`new Promise(r => { const t0 = Date.now(); (function w() { if (window.__unfold && document.querySelector('#center')) r(); else if (Date.now() - t0 > 10000) r(); else setTimeout(w, 20); })(); })`);
        await evaluate(INSPECT, false);
      }
      // wait for the (async) scene mount: three.js loads on demand
      await evaluate(`new Promise(r => { const t0 = Date.now(); (function w() { const st = document.querySelector('#stage'); if (!st || st.querySelector(':scope > svg, :scope > canvas, .stage-error') || Date.now() - t0 > 8000) r(); else setTimeout(w, 20); })(); })`);
    },
    async shot(clip, scale = 1) {
      const r = await s('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale } });
      return r.data;
    },
    async close() { browser.off(onMsg); await browser.send('Target.closeTarget', { targetId }); },
  };
}

// Virtual clock: the page's animation frames only advance when the checker says so, so every frame is reproducible.
const CLOCK = `(() => {
  let now = 0, id = 0; const q = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = cb => { q.set(++id, cb); return id; };
  window.cancelAnimationFrame = i => { q.delete(i); };
  window.__clock = { advance(ms, step = 16) { const end = now + ms; while (now < end) { now = Math.min(end, now + step); const cbs = [...q.values()]; q.clear(); for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } } } return now; } };
})();`;
const NO_WEBGL = `(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; })();`;

// In-page helpers: snapshot the stage, settle animations.
const INSPECT = `(() => {
  const opacityOf = el => { let o = 1; for (let e = el; e && e.tagName !== 'svg'; e = e.parentElement) { const a = e.getAttribute && e.getAttribute('opacity'); if (a != null) o *= +a; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; } return o; };
  const inst = () => window.__unfold.player.stage?.inst;
  window.__rc = {
    settle(max) { let t = 0; const k = inst(); window.__clock.advance(16); t += 16; while (k && k.isAnimating && k.isAnimating() && t < max) { window.__clock.advance(32); t += 32; } return t; },
    async render(scene, state, instant) { await window.__unfold.player.renderScene(scene, state, { instant, animateIn: !instant }); },
    stage() {
      const st = document.querySelector('#stage'); if (!st) return null;
      const r = st.getBoundingClientRect(), card = st.closest('.stage-card')?.getBoundingClientRect() || r;
      const svg = st.querySelector(':scope > svg'), canvas = st.querySelector(':scope > canvas');
      return { x: r.x, y: r.y, w: r.width, h: r.height, card: { x: card.x, y: card.y, w: card.width, h: card.height },
        mode: svg ? 'svg' : canvas ? 'three' : 'none', error: st.querySelector('.stage-error')?.textContent || null };
    },
    snap() {
      const st = document.querySelector('#stage'); const svg = st && st.querySelector(':scope > svg'); if (!svg) return null;
      const sr = st.getBoundingClientRect();
      // a text box in screen px plus its local box and transform, so skewed labels can be compared exactly
      const T = t => { const tb = t.getBoundingClientRect(), lb = t.getBBox(), m = t.getScreenCTM();
        return { x: tb.x - sr.x, y: tb.y - sr.y, w: tb.width, h: tb.height, s: t.textContent.trim().slice(0, 40),
          lb: { x: lb.x, y: lb.y, w: lb.width, h: lb.height }, m: [m.a, m.b, m.c, m.d, m.e - sr.x, m.f - sr.y] }; };
      const nodes = [];
      for (const g of svg.querySelectorAll('g[data-key]')) {
        const op = opacityOf(g); if (op < 0.05) continue;
        const b = g.getBoundingClientRect(); if (!b.width && !b.height) continue;
        const texts = [...g.querySelectorAll('text')].filter(t => opacityOf(t) > 0.3 && t.textContent.trim()).map(T);
        const paint = [...g.querySelectorAll('[fill],[stroke]')].slice(0, 6).map(e => (e.getAttribute('fill') || '') + '/' + (e.getAttribute('stroke') || '')).join(',');
        nodes.push({ key: g.dataset.key, type: g.dataset.type, x: b.x - sr.x, y: b.y - sr.y, w: b.width, h: b.height, op: +op.toFixed(2), texts, txt: texts.map(t => t.s).join(' | '), paint });
      }
      // text drawn outside the reconciler (kit.raw layers)
      const loose = [...svg.querySelectorAll('text')].filter(t => !t.closest('g[data-key]') && opacityOf(t) > 0.3 && t.textContent.trim()).map(T);
      // the scene's drawable area: the viewBox as fitted into the stage ("meet")
      const vb = svg.viewBox.baseVal, k = Math.min(sr.width / vb.width, sr.height / vb.height);
      const view = { w: vb.width * k, h: vb.height * k }; view.x = (sr.width - view.w) / 2; view.y = (sr.height - view.h) / 2;
      return { w: sr.width, h: sr.height, view, nodes, loose, mesh: !!st.querySelector(':scope > canvas') };
    },
  };
})()`;

// ---------- geometry ----------
const area = b => Math.max(0, b.w) * Math.max(0, b.h);
const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const iou = (a, b) => { const i = inter(a, b); return i / Math.max(1, area(a) + area(b) - i); };
const moved = (a, b, tol = T.moved) => Math.abs(a.x - b.x) > tol || Math.abs(a.y - b.y) > tol || Math.abs(a.w - b.w) > tol || Math.abs(a.h - b.h) > tol;
const TEXTY = new Set(['text', 'label']);
// Overlap of two text boxes as a share of the smaller one. Boxes are compared in a's local space, which is exact
// for labels skewed onto the same box face (their screen bounding boxes are far bigger than the glyphs).
function textOverlap(a, b) {
  if (!a.m || !b.m) return inter(a, b) / Math.max(1, Math.min(area(a), area(b)));
  const [A, B, C, D, E, F] = a.m, det = A * D - B * C;
  if (Math.abs(det) < 1e-9) return 0;
  const toA = (x, y) => [(D * (x - E) - C * (y - F)) / det, (-B * (x - E) + A * (y - F)) / det];
  const [a2, b2, c2, d2, e2, f2] = b.m, L = b.lb;
  const pts = [[L.x, L.y], [L.x + L.w, L.y], [L.x, L.y + L.h], [L.x + L.w, L.y + L.h]].map(([x, y]) => toA(a2 * x + c2 * y + e2, b2 * x + d2 * y + f2));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const bb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const al = a.lb, bArea = L.w * L.h * Math.abs(a2 * d2 - b2 * c2) / Math.abs(det);
  return inter(al, bb) / Math.max(1, Math.min(al.w * al.h, bArea));
}

function endStateIssues(snap, where) {
  const errors = [], warnings = [];
  if (!snap) return { errors, warnings };
  const stage = { x: 0, y: 0, w: snap.w, h: snap.h };
  const texts = [...snap.nodes.flatMap(n => n.texts.map(t => ({ ...t, key: n.key }))), ...snap.loose.map(t => ({ ...t, key: '(raw)' }))];
  for (const t of texts) {
    const e = T.edgeTol;
    const side = t.x < -e ? 'left' : t.x + t.w > snap.w + e ? 'right' : t.y < -e ? 'top' : t.y + t.h > snap.h + e ? 'bottom' : null;
    if (side) errors.push(`${where}: text "${t.s}" is clipped by the ${side} edge of the stage`);
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (textOverlap(a, b) > T.overlapFrac && area(a) > 4 && area(b) > 4) errors.push(`${where}: labels "${a.s}" and "${b.s}" overlap`);
  }
  for (const n of snap.nodes) {
    if (TEXTY.has(n.type)) continue;
    const out = 1 - inter(n, stage) / Math.max(1, area(n));
    if (out > T.outsideFrac && area(n) > 16) errors.push(`${where}: ${n.type} "${n.key}" is ${Math.round(out * 100)}% outside the stage`);
  }
  if (snap.mesh) return { errors, warnings };   // "3d" style: shapes are WebGL meshes the SVG snapshot can't measure
  const V = snap.view || stage;
  const inside = snap.nodes.filter(n => area(n) < 0.9 * area(V));
  if (inside.length) {
    const x0 = Math.max(V.x, Math.min(...inside.map(n => n.x))), y0 = Math.max(V.y, Math.min(...inside.map(n => n.y)));
    const x1 = Math.min(V.x + V.w, Math.max(...inside.map(n => n.x + n.w))), y1 = Math.min(V.y + V.h, Math.max(...inside.map(n => n.y + n.h)));
    const cover = ((x1 - x0) * (y1 - y0)) / area(V);
    if (cover < T.sparse) warnings.push(`${where}: sparse stage, the drawing covers ${Math.round(cover * 100)}% of it (aim for the middle 60%)`);
  } else warnings.push(`${where}: the stage is empty`);
  return { errors, warnings };
}

function transitionIssues(A, B, frames, where) {
  const warnings = [];
  if (!A || !B) return warnings;
  const a = new Map(A.nodes.map(n => [n.key, n])), b = new Map(B.nodes.map(n => [n.key, n]));
  const entered = B.nodes.filter(n => !a.has(n.key)), exited = A.nodes.filter(n => !b.has(n.key));
  const changed = [], textChanged = [];
  for (const n of B.nodes) {
    const p = a.get(n.key); if (!p) continue;
    const geo = !TEXTY.has(n.type) && moved(p, n), look = p.paint !== n.paint || Math.abs(p.op - n.op) > 0.2;
    if (geo || (look && !TEXTY.has(n.type))) changed.push({ n, p, geo });
    else if (p.txt !== n.txt || (TEXTY.has(n.type) && (moved(p, n) || look))) textChanged.push(n);
  }
  const visual = [...entered.filter(n => !TEXTY.has(n.type)), ...exited.filter(n => !TEXTY.has(n.type)), ...changed.map(c => c.n)];
  const anyText = textChanged.length || entered.some(n => TEXTY.has(n.type)) || exited.some(n => TEXTY.has(n.type));
  if (!visual.length && anyText) warnings.push(`${where}: text-only step: only words change on the stage; show the change (move, grow, draw, recolour)`);
  if (!visual.length && !anyText) warnings.push(`${where}: nothing on the stage changes from the previous step`);
  // re-keyed: one shape exits and an identical one enters in the same place
  for (const x of exited) for (const y of entered) if (x.type === y.type && !TEXTY.has(x.type) && iou(x, y) > 0.6) { warnings.push(`${where}: "${x.key}" is replaced by "${y.key}" in the same place; reuse the key so it moves instead of blinking`); break; }
  // jumps: geometry changed but no sampled frame lies between the start and end
  for (const { n, p, geo } of changed) {
    if (!geo || p.txt !== n.txt) continue;   // a box resized by new text is a text change, not a jump
    const seen = frames.map(f => f.get(n.key)).filter(Boolean);
    if (seen.length >= 2 && seen.every(f => !moved(f, p, 1.5) || !moved(f, n, 1.5))) warnings.push(`${where}: "${n.key}" jumps to its new place instead of moving (paths need the same commands to morph)`);
  }
  // focal areas: cluster changed shapes
  const boxes = visual.map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h }));
  const parent = boxes.map((_, i) => i), find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const g = T.clusterGap;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A2 = boxes[i], B2 = boxes[j];
    if (inter({ x: A2.x - g, y: A2.y - g, w: A2.w + 2 * g, h: A2.h + 2 * g }, B2) > 0) parent[find(i)] = find(j);
  }
  const clusters = new Set(boxes.map((_, i) => find(i))).size;
  if (clusters > T.maxFocal) warnings.push(`${where}: ${clusters} separate areas change at once; one focal change per step (P1)`);
  return warnings;
}

// ---------- routes from lesson.json ----------
function routesOf(L) {
  const out = [];
  for (const t of L.tabs) {
    if (t.kind === 'stepper') t.steps.forEach((s, i) => out.push({ hash: `#/${L.slug}/${t.id}/${i + 1}`, where: `${t.id} ${i + 1}`, label: `${t.title} ${i + 1}`, step: s, prev: t.steps[i - 1], group: t.id }));
    else if (t.kind === 'lessons') for (const l of t.lessons) l.steps.forEach((s, i) => out.push({ hash: `#/${L.slug}/${t.id}:${l.id}/${i + 1}`, where: `${t.id}:${l.id} ${i + 1}`, label: `${l.title} ${i + 1}`, step: s, prev: l.steps[i - 1], group: `${t.id}:${l.id}` }));
    else if (t.kind === 'playground') out.push({ hash: `#/${L.slug}/${t.id}`, where: t.id, label: t.title, playground: t, group: t.id });
    else out.push({ hash: `#/${L.slug}/${t.id}`, where: t.id, label: t.title, doc: true, group: t.id });
  }
  return out;
}

const threeScene = (scenes, id) => scenes?.[id]?.mode === 'three';

export async function checkTopic(dir, browser, { widths = [1280, 390], frames = false } = {}) {
  dir = resolve(dir);
  const L = JSON.parse(readFileSync(join(dir, '_unfold', 'lesson.json'), 'utf8'));
  const page = join(dir, 'index.html');
  const errors = [], warnings = [];
  if (!existsSync(page)) return { slug: L.slug, errors: ['index.html is missing; run build-page.mjs first'], warnings, steps: 0 };
  let scenes = {};
  try { scenes = (await import(pathToFileURL(join(dir, '_unfold', 'scenes.js')).href + `?t=${Date.now()}`)).default; } catch { /* validate-lesson reports this */ }
  const routes = routesOf(L);
  const qa = join(dir, '_unfold', 'qa'); mkdirSync(qa, { recursive: true });
  if (frames) mkdirSync(join(qa, 'frames'), { recursive: true });
  const url = pathToFileURL(page).href;
  const sheets = {};
  let stepsChecked = 0, webglOff = 0;

  // Pass 1: the lesson's own style at every width, with transitions. Then each alternate style (lesson.altStyles)
  // at the first width, end states only.
  const prefKey = `unfold:style:${L.slug}`;
  const main = L.style || 'isometric';
  const passes = [...widths.map(width => ({ width, style: null, full: true })),
    ...[...new Set(L.altStyles || [])].filter(x => x !== main).map(style => ({ width: widths[0], style, full: false }))];
  for (const { width, style, full } of passes) {
    const p = await openPage(browser, { width, height: width < 600 ? 844 : 900, pref: { key: prefKey, value: style } });
    const tiles = [];
    for (const r of routes) {
      if (!full && (r.doc || r.playground)) continue;
      const where = `${r.where} @${width}${style ? ` [${style}]` : ''}`;
      const before = p.errors.length;
      await p.goto(url + r.hash);
      await p.evaluate(`window.__rc.settle(${T.settleMs})`);
      const stage = await p.evaluate('window.__rc.stage()');
      if (r.doc) { for (const e of p.errors.slice(before)) errors.push(`${where}: runtime error: ${e}`); continue; }
      if (!stage) { errors.push(`${where}: no stage rendered`); continue; }
      if (stage.error) errors.push(`${where}: ${stage.error}`);
      const issues = { errors: [], warnings: [] };
      const add = res => { issues.errors.push(...res.errors); issues.warnings.push(...res.warnings); };
      const snapEnd = stage.mode === 'svg' ? await p.evaluate('window.__rc.snap()') : null;
      add(endStateIssues(snapEnd, where));

      if (r.playground && full) {   // each range control at min and max
        for (const c of r.playground.controls.filter(c => (c.type || 'range') === 'range')) for (const v of [c.min, c.max]) {
          await p.evaluate(`(() => { const i = document.querySelector('[data-ctl="${c.id}"]'); i.value = ${v}; i.dispatchEvent(new Event('input')); })()`);
          await p.evaluate(`window.__rc.settle(${T.settleMs})`);
          const st2 = await p.evaluate('window.__rc.stage()');
          if (st2?.mode === 'svg') add(endStateIssues(await p.evaluate('window.__rc.snap()'), `${r.where} ${c.id}=${v} @${width}`));
        }
      }

      // transition from the previous step (same scene, SVG): sample every frame
      if (full && r.prev && r.prev.scene === r.step.scene && stage.mode === 'svg' && width === widths[0]) {
        const sc = JSON.stringify(r.step.scene), ps = JSON.stringify(r.prev.state || {}), cs = JSON.stringify(r.step.state || {});
        await p.evaluate(`window.__rc.render(${sc}, ${ps}, true)`);
        await p.evaluate(`window.__rc.settle(${T.settleMs})`);
        const A = await p.evaluate('window.__rc.snap()');
        await p.evaluate(`window.__rc.render(${sc}, ${cs}, false)`);
        const fr = []; let t = 0;
        for (; t < T.settleMs; t += T.frameMs) {
          await p.evaluate(`window.__clock.advance(${T.frameMs})`);
          const s = await p.evaluate('window.__rc.snap()');
          fr.push(new Map((s?.nodes || []).map(n => [n.key, n])));
          if (!(await p.evaluate('!!window.__unfold.player.stage?.inst?.isAnimating?.()'))) break;
        }
        const B = await p.evaluate('window.__rc.snap()');
        issues.warnings.push(...transitionIssues(A, B, fr.slice(0, -1), r.where));
        if (frames && t > T.frameMs * 2) {   // replay and photograph 25/50/75%
          await p.evaluate(`window.__rc.render(${sc}, ${ps}, true)`); await p.evaluate(`window.__rc.settle(${T.settleMs})`);
          await p.evaluate(`window.__rc.render(${sc}, ${cs}, false)`);
          let done = 0;
          for (const f of [0.25, 0.5, 0.75]) {
            await p.evaluate(`window.__clock.advance(${Math.round(t * f - done)})`); done = Math.round(t * f);
            const png = await p.shot({ x: stage.x, y: stage.y, width: stage.w, height: stage.h }, 0.5);
            writeFileSync(join(qa, 'frames', `${r.where.replace(/[^a-z0-9-]+/gi, '_')}-${f * 100}.png`), Buffer.from(png, 'base64'));
          }
          await p.evaluate(`window.__rc.settle(${T.settleMs})`);
        }
      }

      // 3D scenes: also check the 2D fallback with WebGL switched off
      if (full && width === widths[0] && threeScene(scenes, r.step?.scene || r.playground?.scene)) {
        const q = await openPage(browser, { width, height: 900, noWebGL: true });
        await q.goto(url + r.hash);
        await q.evaluate(`window.__rc.settle(${T.settleMs})`);
        const st3 = await q.evaluate('window.__rc.stage()');
        if (!st3 || st3.mode !== 'svg') issues.errors.push(`${r.where} (WebGL off): the 2D fallback did not render`);
        else add(endStateIssues(await q.evaluate('window.__rc.snap()'), `${r.where} (WebGL off)`));
        for (const e of q.errors) issues.errors.push(`${r.where} (WebGL off): runtime error: ${e}`);
        await q.close(); webglOff++;
      }

      for (const e of p.errors.slice(before)) issues.errors.push(`${where}: runtime error: ${e}`);
      errors.push(...new Set(issues.errors)); warnings.push(...new Set(issues.warnings));
      if (full && width === widths[0]) stepsChecked++;
      // contact-sheet tile: re-render the end state cleanly, then photograph the stage card
      await p.goto(url + r.hash); await p.evaluate(`window.__rc.settle(${T.settleMs})`);
      const st4 = await p.evaluate('window.__rc.stage()');
      const png = await p.shot({ x: st4.card.x, y: st4.card.y, width: st4.card.w, height: st4.card.h }, width < 600 ? 0.7 : 0.45);
      tiles.push({ png, label: r.label, title: r.step?.title || r.playground?.heading || '', bad: issues.errors.length, warn: issues.warnings.length });
    }
    await p.close();
    sheets[style ? `${width}:${style}` : width] = tiles;
  }

  // contact sheets: one tile per step, red = errors, amber = warnings
  for (const [sheet, tiles] of Object.entries(sheets)) {
    const [width, style] = sheet.split(':');
    const p = await openPage(browser, { width: 1600, height: 1000 });
    const html = `<style>body{margin:0;padding:16px;font:13px system-ui;background:#f4f4f1}h1{font-size:16px;margin:0 0 12px}
      .g{display:grid;grid-template-columns:repeat(${+width < 600 ? 6 : 4},1fr);gap:12px}figure{margin:0;background:#fff;border:2px solid #ddd;border-radius:8px;overflow:hidden}
      figure.bad{border-color:#e0442a}figure.warn{border-color:#f0b400}img{width:100%;display:block}figcaption{padding:6px 8px}b{display:block}</style>
      <h1>${esc(L.title)} · ${width}px · ${style || main} style · ${tiles.length} steps</h1><div class="g">${tiles.map(t => `<figure class="${t.bad ? 'bad' : t.warn ? 'warn' : ''}"><img src="data:image/png;base64,${t.png}"><figcaption><b>${esc(t.label)}</b>${esc(t.title)}${t.bad ? ` · ${t.bad} error(s)` : ''}${t.warn ? ` · ${t.warn} warning(s)` : ''}</figcaption></figure>`).join('')}</div>`;
    await p.evaluate(`document.open(); document.write(${JSON.stringify(html)}); document.close(); new Promise(r => setTimeout(r, 300))`);
    const h = await p.evaluate('document.documentElement.scrollHeight');
    await p.s('Emulation.setDeviceMetricsOverride', { width: 1600, height: Math.min(h, 16000), deviceScaleFactor: 1, mobile: false });
    const png = await p.shot({ x: 0, y: 0, width: 1600, height: Math.min(h, 16000) });
    writeFileSync(join(qa, style ? `contact-${style}.png` : width === String(widths[0]) ? 'contact.png' : `contact-${width}.png`), Buffer.from(png, 'base64'));
    await p.close();
  }
  const report = { slug: L.slug, checked: new Date().toISOString(), widths, styles: [main, ...passes.filter(x => x.style).map(x => x.style)], steps: stepsChecked, webglOff, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
  writeFileSync(join(qa, 'report.json'), JSON.stringify(report, null, 2));
  return report;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function logEntry(dir, r) {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const list = (h, xs) => xs.length ? `- ${h}:\n${xs.slice(0, 40).map(x => `  - ${x}`).join('\n')}${xs.length > 40 ? `\n  - …and ${xs.length - 40} more (see _unfold/qa/report.json)` : ''}\n` : '';
  return `\n## Render check · ${stamp}\n\n- Result: ${r.errors.length ? '✗ fail' : '✓ pass'} · ${r.errors.length} error(s), ${r.warnings.length} warning(s)\n` +
    `- Checked: ${r.steps} steps at ${r.widths.join(' and ')} px in ${r.styles.join(', ')} style; ${r.webglOff} 3D step(s) with WebGL off\n- Contact sheets: _unfold/qa/contact*.png\n` +
    list('Errors', r.errors) + list('Warnings', r.warnings);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
  const root = opt('--root'), all = opt('--all'), json = opt('--json'), noLog = opt('--no-log'), frames = opt('--frames'), w = opt('--widths');
  const widths = typeof w === 'string' ? w.split(',').map(Number) : [1280, 390];
  const dirs = all ? findTopics(resolve(root || 'topics')) : args.map(a => resolve(a));
  if (!dirs.length) { console.error('usage: render-check.mjs <topic-folder>... | --all [--root topics] [--widths 1280,390] [--frames] [--no-log] [--json]'); process.exit(2); }
  const browser = await launch();
  const results = [];
  try {
    for (const d of dirs) {
      const r = await checkTopic(d, browser, { widths, frames: !!frames });
      results.push(r);
      if (!noLog && existsSync(join(d, '_unfold'))) appendFileSync(join(d, '_unfold', 'build-log.md'), logEntry(d, r));
      if (!json) {
        console.log(`${r.errors.length ? '✗' : '✓'} ${relative(process.cwd(), d) || basename(d)}: ${r.steps} steps, ${r.errors.length} error(s), ${r.warnings.length} warning(s) · ${relative(process.cwd(), join(d, '_unfold', 'qa', 'contact.png'))}`);
        for (const e of r.errors) console.log(`  ERROR  ${e}`);
        for (const x of r.warnings) console.log(`  warn   ${x}`);
      }
    }
  } finally { browser.close(); }
  if (json) console.log(JSON.stringify(results, null, 2));
  process.exit(results.some(r => r.errors.length) ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(2); });
