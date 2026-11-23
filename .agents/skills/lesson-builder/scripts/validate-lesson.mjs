#!/usr/bin/env node
// validate-lesson.mjs: checks a topic folder's _unfold/lesson.json + _unfold/scenes.js without a browser:
// schema, tab set and budgets, citations, quiz rules, and a dry run of every scene for every step
// against a mock scene kit (catches render errors, unknown scene ids and unknown kit calls).
// Usage: node validate-lesson.mjs <topic-folder>... | --all [--root topics] [--json]
// Exit code 1 if any lesson has errors. Warnings never fail the run.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RULES = {
  tabs: {
    '30m': ['eli5', 'core', 'technical', 'check', 'related'],
    '2h': ['eli5', 'core', 'technical', 'deep-dive', 'playground', 'story', 'tradeoffs', 'check', 'cheatsheet', 'related'],
  },
  kinds: { eli5: 'stepper', core: 'stepper', technical: 'stepper', 'deep-dive': 'lessons', playground: 'playground', story: 'story',
    tradeoffs: 'tradeoffs', check: 'quiz', cheatsheet: 'cheatsheet', related: 'related' },
  steps: { eli5: [3, 5], core: [6, 10], technical: [3, 8] },
  deepDive: { lessons: [2, 3], steps: [2, 5] },
  quiz: { '30m': [4, 8], '2h': [6, 12] },
  narrationWords: 60,
  titleChars: 60,
  whatChanged: 4,
  objectives: [3, 5],
  optionRatio: 2.2, // longest / shortest option length
  levels: ['beginner', 'intermediate', 'advanced'],
};
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CITE = /\[(S\d+)\]/g;
const words = t => String(t || '').replace(CITE, '').replace(/[*`]/g, '').trim().split(/\s+/).filter(Boolean).length;

export async function validateTopic(dir) {
  const errors = [], warnings = [];
  const E = (where, msg) => errors.push(`${where}: ${msg}`), W = (where, msg) => warnings.push(`${where}: ${msg}`);
  const data = basename(dir) === '_unfold' ? dir : join(dir, '_unfold');
  const slug = basename(dirname(data));
  const lessonPath = join(data, 'lesson.json'), scenesPath = join(data, 'scenes.js');
  if (!existsSync(lessonPath)) return { slug, errors: ['_unfold/lesson.json is missing'], warnings };
  let L;
  try { L = JSON.parse(readFileSync(lessonPath, 'utf8')); } catch (e) { return { slug, errors: [`lesson.json is not valid JSON: ${e.message}`], warnings }; }

  // ---------- scenes ----------
  let scenes = {};
  if (!existsSync(scenesPath)) E('scenes.js', 'missing');
  else {
    try {
      const mod = await import(pathToFileURL(scenesPath).href + `?t=${Date.now()}`);
      scenes = mod.default || {};
      if (typeof scenes !== 'object') { E('scenes.js', 'default export must be an object of scenes'); scenes = {}; }
    } catch (e) { E('scenes.js', `failed to import in Node (no DOM access at module top level): ${e.message}`); }
    for (const [id, sc] of Object.entries(scenes)) {
      if (typeof sc.render !== 'function') E(`scene ${id}`, 'has no render(state, prev, kit) function');
      if (!['svg', 'three', undefined].includes(sc.mode)) E(`scene ${id}`, `mode must be "svg" or "three", got "${sc.mode}"`);
      if (sc.mode === 'three') {
        if (!sc.fallback) E(`scene ${id}`, 'three.js scenes need a "fallback" svg scene id for devices without WebGL');
        else if (!scenes[sc.fallback]) E(`scene ${id}`, `fallback "${sc.fallback}" is not defined`);
        else if (scenes[sc.fallback].mode === 'three') E(`scene ${id}`, `fallback "${sc.fallback}" must be an svg scene`);
      }
    }
  }
  const usedScenes = new Set();

  // ---------- top level ----------
  if (!SLUG.test(L.slug || '')) E('slug', 'must be lowercase-kebab-case');
  if (!L.title) E('title', 'missing');
  if (!RULES.tabs[L.duration]) E('duration', `must be "30m" or "2h", got "${L.duration}"`);
  if (!RULES.levels.includes(L.level)) E('level', `must be one of ${RULES.levels.join(', ')}`);
  if (!SLUG.test(L.domain || '')) E('domain', 'missing or not a slug');
  if (!L.summary) W('summary', 'missing one-line summary (used for the page description)');
  if (!L.playerVersion) W('playerVersion', 'missing; record the player version the lesson was built against');
  const [omin, omax] = RULES.objectives;
  if (!Array.isArray(L.objectives) || L.objectives.length < omin || L.objectives.length > omax) E('objectives', `need ${omin}-${omax} learning objectives`);

  // ---------- sources ----------
  const sources = Array.isArray(L.sources) ? L.sources : [];
  if (!sources.length) E('sources', 'no sources; every lesson must cite its claims');
  const srcIds = new Set();
  sources.forEach((s, i) => {
    const w = `sources[${i}]`;
    if (!/^S\d+$/.test(s.id || '')) E(w, `id must look like S1, got "${s.id}"`);
    if (srcIds.has(s.id)) E(w, `duplicate id ${s.id}`);
    srcIds.add(s.id);
    if (!s.title) E(w, 'missing title');
    if (!/^https?:\/\//.test(s.url || '')) E(w, 'url must be http(s)');
    if (!s.publisher) W(w, 'missing publisher');
  });
  const cited = new Set();
  const scanText = (where, text) => {
    for (const m of String(text ?? '').matchAll(CITE)) {
      cited.add(m[1]);
      if (!srcIds.has(m[1])) E(where, `cites ${m[1]}, which is not in sources`);
    }
    if (/<img|\.(png|jpe?g|gif|webp)\b/i.test(String(text ?? ''))) W(where, 'mentions an image; lessons use diagrams, not copied images');
  };
  const hasCite = t => /\[S\d+\]/.test(String(t || ''));
  (L.objectives || []).forEach((o, i) => scanText(`objectives[${i}]`, o));

  // ---------- tabs ----------
  const tabs = Array.isArray(L.tabs) ? L.tabs : [];
  const want = RULES.tabs[L.duration] || [];
  const ids = tabs.map(t => t.id);
  for (const id of want) if (!ids.includes(id)) E('tabs', `missing required tab "${id}" for a ${L.duration} lesson`);
  for (const id of ids) if (!want.includes(id)) E('tabs', `unexpected tab "${id}" for a ${L.duration} lesson`);
  if (new Set(ids).size !== ids.length) E('tabs', 'duplicate tab ids');
  if (want.length && ids.join() !== want.filter(i => ids.includes(i)).join()) W('tabs', `recommended order is ${want.join(', ')}`);

  const checkStep = (where, s, tab, code) => {
    if (!s.title) E(where, 'missing title');
    else if (s.title.length > RULES.titleChars) W(where, `title is ${s.title.length} chars (max ${RULES.titleChars})`);
    if (!s.narration) E(where, 'missing narration');
    const n = words(s.narration);
    if (n > RULES.narrationWords) E(where, `narration is ${n} words (max ${RULES.narrationWords} so the step fits on one screen)`);
    if (!s.scene) E(where, 'missing scene id');
    else { usedScenes.add(s.scene); if (!scenes[s.scene]) E(where, `scene "${s.scene}" is not defined in scenes.js`); }
    if (s.state != null && typeof s.state !== 'object') E(where, 'state must be an object');
    if ((s.whatChanged || []).length > RULES.whatChanged) W(where, `more than ${RULES.whatChanged} "what changed" lines`);
    if (s.callout && !['good-to-know', 'warning', 'insight'].includes(s.callout.kind)) E(where, `callout kind "${s.callout.kind}" must be good-to-know|warning|insight`);
    const c = s.code || code;
    const hl = s.code ? s.code.highlight : s.highlight;
    if (hl && !c?.src) E(where, 'highlights code lines but there is no code (step.code or tab.code)');
    if (hl && c?.src) { const max = c.src.split('\n').length; for (const l of hl) if (l < 1 || l > max) E(where, `highlight line ${l} is outside the code (1-${max})`); }
    scanText(where, s.narration); scanText(where, s.callout?.text); (s.whatChanged || []).forEach(w => scanText(where, typeof w === 'string' ? w : w.text));
    if (tab === 'technical' && !hasCite(s.narration)) E(where, 'technical steps must cite at least one source');
    if (tab === 'core' && !hasCite(s.narration)) W(where, 'no citation in this core step');
  };

  for (const t of tabs) {
    const kind = RULES.kinds[t.id];
    if (kind && t.kind !== kind) E(`tab ${t.id}`, `kind must be "${kind}", got "${t.kind}"`);
    if (!t.title) E(`tab ${t.id}`, 'missing title');
    if (t.kind === 'stepper') {
      const steps = t.steps || [];
      const [lo, hi] = RULES.steps[t.id] || [1, 12];
      if (steps.length < lo || steps.length > hi) E(`tab ${t.id}`, `has ${steps.length} steps (want ${lo}-${hi})`);
      steps.forEach((s, i) => checkStep(`${t.id} step ${i + 1}`, s, t.id, t.code));
    }
    if (t.kind === 'lessons') {
      const ls = t.lessons || [];
      const [lo, hi] = RULES.deepDive.lessons, [slo, shi] = RULES.deepDive.steps;
      if (ls.length < lo || ls.length > hi) E(`tab ${t.id}`, `has ${ls.length} sub-lessons (want ${lo}-${hi})`);
      ls.forEach((l, li) => {
        if (!SLUG.test(l.id || '')) E(`${t.id} lesson ${li + 1}`, 'id must be a slug');
        if ((l.steps || []).length < slo || (l.steps || []).length > shi) E(`${t.id}:${l.id}`, `has ${(l.steps || []).length} steps (want ${slo}-${shi})`);
        (l.steps || []).forEach((s, i) => checkStep(`${t.id}:${l.id} step ${i + 1}`, s, t.id, l.code));
      });
    }
    if (t.kind === 'playground') {
      usedScenes.add(t.scene);
      if (!scenes[t.scene]) E(`tab ${t.id}`, `scene "${t.scene}" is not defined in scenes.js`);
      if (!(t.controls || []).length) E(`tab ${t.id}`, 'needs at least one control');
      for (const c of t.controls || []) {
        if (!c.id || !c.label) E(`tab ${t.id}`, 'every control needs id and label');
        if ((c.type || 'range') === 'range' && !(c.min < c.max && c.value >= c.min && c.value <= c.max)) E(`control ${c.id}`, 'range needs min < max and min <= value <= max');
        if (c.type === 'choice' && !(c.options || []).some(o => o.value === c.value)) E(`control ${c.id}`, 'choice value must be one of its options');
      }
      if (scenes[t.scene] && typeof scenes[t.scene].metrics !== 'function') W(`tab ${t.id}`, `scene "${t.scene}" has no metrics(state) readout`);
      scanText(`tab ${t.id}`, t.intro);
    }
    if (t.kind === 'story') {
      if ((t.timeline || []).length < 3) E(`tab ${t.id}`, 'timeline needs at least 3 entries');
      if ((t.misconceptions || []).length < 2) E(`tab ${t.id}`, 'needs at least 2 misconceptions');
      (t.timeline || []).forEach((x, i) => { if (!x.when || !x.title) E(`story timeline ${i + 1}`, 'needs when and title'); scanText(`story timeline ${i + 1}`, x.text); if (!hasCite(x.text)) E(`story timeline ${i + 1}`, 'dated claims must be cited'); });
      (t.misconceptions || []).forEach((m, i) => { if (!m.myth || !m.why || !m.truth) E(`misconception ${i + 1}`, 'needs myth, why and truth'); [m.myth, m.why, m.truth].forEach(x => scanText(`misconception ${i + 1}`, x)); });
    }
    if (t.kind === 'tradeoffs') {
      const parts = ['useWhen', 'avoidWhen', 'pros', 'cons'];
      for (const p of parts) if (!(t[p] || []).length) E(`tab ${t.id}`, `missing "${p}" list`);
      if (!(t.alternatives || []).length && !(t.perspectives || []).length) E(`tab ${t.id}`, 'needs alternatives (tech) or perspectives (non-tech)');
      [...parts.flatMap(p => t[p] || []), ...(t.alternatives || []).map(a => a.when), ...(t.perspectives || []).map(p => p.view), t.intro].forEach(x => scanText(`tab ${t.id}`, x));
    }
    if (t.kind === 'cheatsheet') {
      if (!(t.glossary || []).length) E(`tab ${t.id}`, 'needs a glossary');
      [...(t.facts || []), ...(t.glossary || []).map(g => g.def), ...(t.formulas || []).map(f => f.note)].forEach(x => scanText(`tab ${t.id}`, x));
    }
  }
  for (const id of Object.keys(scenes)) {
    const isFallback = Object.values(scenes).some(s => s.fallback === id);
    if (!usedScenes.has(id) && !isFallback) W(`scene ${id}`, 'defined but never used');
  }

  // ---------- quiz ----------
  const quiz = Array.isArray(L.quiz) ? L.quiz : [];
  const [qlo, qhi] = RULES.quiz[L.duration] || [4, 12];
  if (quiz.length < qlo || quiz.length > qhi) E('quiz', `has ${quiz.length} questions (want ${qlo}-${qhi} for ${L.duration})`);
  const positions = [];
  let longestIsAnswer = 0;
  quiz.forEach((q, i) => {
    const w = `quiz ${i + 1}`;
    if (!q.q) E(w, 'missing question text');
    if (!Array.isArray(q.options) || q.options.length !== 4) { E(w, 'needs exactly 4 options'); return; }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) { E(w, `answer must be an index 0-3, got ${q.answer}`); return; }
    if (new Set(q.options).size !== 4) E(w, 'options must be distinct');
    const lens = q.options.map(o => String(o).replace(/[*`]/g, '').length);
    const ratio = Math.max(...lens) / Math.max(1, Math.min(...lens));
    if (ratio > RULES.optionRatio && Math.max(...lens) - Math.min(...lens) > 12) E(w, `options differ too much in length (${Math.min(...lens)}-${Math.max(...lens)} chars); keep them about equal so length doesn't give the answer away`);
    if (lens[q.answer] === Math.max(...lens) && lens.filter(l => l === lens[q.answer]).length === 1) longestIsAnswer++;
    if (!q.concept) E(w, 'needs a concept tag (ties the question to a grill gap)');
    if (!q.why) E(w, 'needs a "why" explanation');
    else if (!hasCite(q.why)) W(w, '"why" has no citation');
    scanText(w, q.q); scanText(w, q.why); q.options.forEach(o => scanText(w, o));
    positions.push(q.answer);
  });
  if (quiz.length >= 4) {
    const counts = [0, 1, 2, 3].map(p => positions.filter(x => x === p).length);
    if (Math.max(...counts) > Math.ceil(quiz.length / 2)) E('quiz', `correct answers cluster at one position (${counts.join('/')} across A/B/C/D); vary them`);
    if (counts.filter(c => c > 0).length < 3) W('quiz', 'correct answers use fewer than 3 of the 4 positions');
    if (longestIsAnswer > quiz.length / 2) W('quiz', 'the correct option is the longest one in most questions');
  }

  // ---------- related ----------
  const rel = L.related || {};
  for (const k of ['prereqs', 'next']) {
    if (!Array.isArray(rel[k])) { E('related', `missing "${k}" list`); continue; }
    rel[k].forEach((r, i) => { if (!SLUG.test(r.id || '') || !r.title) E(`related.${k}[${i}]`, 'needs a slug id and a title'); });
  }
  if (!(rel.next || []).length) W('related', 'no next topics; the graph grows from these');

  for (const s of sources) if (!cited.has(s.id)) E(`sources ${s.id}`, 'is never cited; cite it or remove it');

  // ---------- dry-run every scene against a mock kit ----------
  const runs = [];
  for (const t of tabs) {
    if (t.kind === 'stepper') runs.push([t.id, t.steps || []]);
    if (t.kind === 'lessons') for (const l of t.lessons || []) runs.push([`${t.id}:${l.id}`, l.steps || []]);
    if (t.kind === 'playground') {
      const st = { ...(t.state || {}) };
      for (const c of t.controls || []) st[c.id] = c.value;
      const variants = [st, ...(t.controls || []).filter(c => (c.type || 'range') === 'range').flatMap(c => [{ ...st, [c.id]: c.min }, { ...st, [c.id]: c.max }])];
      runs.push([t.id, variants.map(v => ({ scene: t.scene, state: v, playground: true }))]);
    }
  }
  for (const [where, steps] of runs) {
    const mounted = new Map();
    let prev = null, prevScene = null;
    steps.forEach((s, i) => {
      let sc = scenes[s.scene];
      if (!sc) return;
      if (sc.mode === 'three') sc = scenes[sc.fallback];   // Node has no WebGL: exercise the 2D fallback
      if (!sc || typeof sc.render !== 'function') return;
      const label = `${where} ${s.playground ? 'control setting' : 'step'} ${i + 1}`;
      try {
        let kit = mounted.get(sc);
        if (!kit) { kit = mockKit(); mounted.set(sc, kit); sc.mount?.call(sc, fakeEl(), kit); }
        if (prevScene !== sc) prev = null;
        sc.render.call(sc, structuredClone(s.state || {}), prev, kit);
        if (s.playground) { if (sc.metrics) sc.metrics(s.state); if (sc.note) sc.note(s.state); }
        prev = s.state || {}; prevScene = sc;
      } catch (e) { E(label, `scene "${s.scene}" threw while rendering: ${e.message}`); }
    });
  }
  return { slug, errors, warnings };
}

// ---------- mock kit: same surface as scene-kit.js, records nothing, throws on unknown calls ----------
const PRIMS = ['box', 'plate', 'token', 'label', 'pointer', 'arrow', 'rect', 'text', 'line', 'sarrow', 'path', 'circle', 'chart'];
const TOKENS = ['red', 'green', 'blue', 'yellow', 'ink', 'ink-2', 'muted', 'surface', 'surface-2', 'line', 'line-strong', 'bg',
  'red-ink', 'green-ink', 'blue-ink', 'yellow-ink', 'red-soft', 'green-soft', 'blue-soft', 'yellow-soft'];
function fakeEl() {
  return new Proxy({ innerHTML: '', style: {}, dataset: {}, clientWidth: 800, clientHeight: 500 }, {
    get: (t, k) => (k in t ? t[k] : () => fakeEl()), set: (t, k, v) => { t[k] = v; return true; } });
}
function mockKit() {
  let open = false;
  const colors = Object.fromEntries(TOKENS.map(t => [t, '#888888']));
  const k = {
    W: 800, H: 500, scale: 38, origin: [0, 40], duration: 0, paused: false, reduced: true, svg: fakeEl(), world: fakeEl(), primitives: PRIMS,
    begin() { open = true; }, end() { if (!open) throw new Error('kit.end() called without kit.begin()'); open = false; },
    iso: (x = 0, y = 0, z = 0) => { for (const v of [x, y, z]) if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`kit.iso got a non-number (${v})`); return [0, 0]; },
    view() {}, colors: () => colors, color: () => '#888888', shade: () => '#888888',
    loop() {}, clearLoops() {}, setPaused() {}, isAnimating: () => false, raw: () => fakeEl(), background() {}, floor() {}, refreshColors() {}, clear() {}, destroy() {},
  };
  for (const p of PRIMS) k[p] = (key, props = {}) => {
    if (!open) throw new Error(`kit.${p}() called outside kit.begin()/kit.end()`);
    if (key == null) throw new Error(`kit.${p}() needs a key`);
    if (typeof props !== 'object') throw new Error(`kit.${p}('${key}') props must be an object`);
  };
  return new Proxy(k, { get: (t, prop) => { if (prop in t || typeof prop === 'symbol') return t[prop]; throw new Error(`kit.${String(prop)} does not exist (see scene-cookbook.md)`); } });
}

/** Every folder under root that holds a topic (has _unfold/lesson.json), depth-first. */
export function findTopics(root) {
  const out = [];
  const walk = d => {
    if (existsSync(join(d, '_unfold', 'lesson.json'))) out.push(d);
    for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith('.') && e.name !== '_unfold') walk(join(d, e.name));
  };
  if (existsSync(root)) walk(resolve(root));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
  const rootFlag = flag('--root');
  const json = flag('--json'), all = flag('--all');
  const dirs = all ? findTopics(resolve(rootFlag || 'topics')) : args.map(a => resolve(a));
  if (!dirs.length) { console.error('usage: validate-lesson.mjs <topic-folder>... | --all [--root topics] [--json]'); process.exit(2); }
  const results = [];
  for (const d of dirs) results.push(await validateTopic(d));
  if (json) console.log(JSON.stringify(results, null, 2));
  else for (const r of results) {
    console.log(`${r.errors.length ? '✗' : '✓'} ${r.slug}: ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
    for (const e of r.errors) console.log(`  ERROR  ${e}`);
    for (const w of r.warnings) console.log(`  warn   ${w}`);
  }
  process.exit(results.some(r => r.errors.length) ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
