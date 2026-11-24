#!/usr/bin/env node
// build-page.mjs: turn a topic folder's _unfold/lesson.json + _unfold/scenes.js into ONE self-contained
// index.html (player, styles, fonts, icons, three.js when needed, lesson data and folder navigation all inlined).
// The page opens straight from disk: no server, no network, no other files.
//
// Usage:
//   node build-page.mjs <topic-folder>            build one page (validates first; refuses on errors)
//   node build-page.mjs --all [--root topics]     rebuild every topic under the library root
//   add --force to build despite validation errors (not recommended)
//
// Run --all after any folder is added or moved: breadcrumbs and links are baked into every page.
// Every build also rewrites <library>/index.html, the topic graph (see build-library.mjs).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTopic, findTopics } from './validate-lesson.mjs';
import { buildLibrary } from './build-library.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const P = join(here, '..', 'assets', 'player');
const read = f => readFileSync(join(P, f), 'utf8');
const jsonInHtml = o => JSON.stringify(o).replace(/</g, '\\u003c');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const keyOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg transform='rotate(45 10 10)'%3E%3Crect x='3' y='3' width='6.5' height='6.5' rx='1' fill='%23F25022'/%3E%3Crect x='10.5' y='3' width='6.5' height='6.5' rx='1' fill='%237FBA00'/%3E%3Crect x='3' y='10.5' width='6.5' height='6.5' rx='1' fill='%2300A4EF'/%3E%3Crect x='10.5' y='10.5' width='6.5' height='6.5' rx='1' fill='%23FFB900'/%3E%3C/g%3E%3C/svg%3E";

/** The library root is the nearest ancestor folder that is NOT itself a topic (has no _unfold/). */
export function libraryRoot(topicDir) {
  let d = resolve(topicDir);
  while (existsSync(join(dirname(d), '_unfold', 'lesson.json')) && dirname(d) !== d) d = dirname(d);
  return dirname(d);
}

function href(from, to) {
  const rel = relative(from, to).split(sep).map(encodeURIComponent).join('/');
  return (rel ? rel + '/' : '') + 'index.html';
}

function navFor(topicDir, root) {
  const all = findTopics(root);
  const title = d => { try { return JSON.parse(readFileSync(join(d, '_unfold', 'lesson.json'), 'utf8')).title; } catch { return basename(d); } };
  const crumbs = [];
  for (let d = dirname(topicDir); d.startsWith(root) && d !== root; d = dirname(d)) if (all.includes(d)) crumbs.unshift({ title: title(d), href: href(topicDir, d) });
  const children = all.filter(d => dirname(d) === topicDir).map(d => ({ title: title(d), href: href(topicDir, d) }));
  const topics = all.map(d => {
    let slug = '';
    try { slug = JSON.parse(readFileSync(join(d, '_unfold', 'lesson.json'), 'utf8')).slug; } catch { /* ignore */ }
    return { title: title(d), href: href(topicDir, d), key: keyOf(slug || basename(d)), depth: relative(root, d).split(sep).length - 1, self: d === topicDir };
  });
  return { home: href(topicDir, root), crumbs, children, topics };
}

export async function buildPage(topicDir, { root, force = false } = {}) {
  topicDir = resolve(topicDir);
  root = resolve(root || libraryRoot(topicDir));
  const res = await validateTopic(topicDir);
  if (res.errors.length && !force) return { ...res, built: false };
  const lesson = JSON.parse(readFileSync(join(topicDir, '_unfold', 'lesson.json'), 'utf8'));
  const scenesSrc = readFileSync(join(topicDir, '_unfold', 'scenes.js'), 'utf8');
  const styles = [lesson.style, ...(lesson.altStyles || []), ...(lesson.tabs || []).map(t => t.style)].filter(Boolean);
  const needs3d = /mode\s*:\s*['"]three['"]/.test(scenesSrc) || styles.includes('3d');
  const needsHand = styles.some(s => s === 'sketch' || s === 'chalk');

  // Modules ship as plain text (no base64: ~25% smaller) and become blob: URLs in an import map at boot.
  const modules = {
    'unfold/util': read('util.js'),
    'unfold/templates': read('scene-templates.js'),
    'unfold/icons': read('icons/icons.js'),
    'unfold/scene-kit': read('scene-kit.js'),
    'unfold/quiz': read('quiz.js'),
    'unfold/three-stage': read('three-stage.js'),
    'unfold/player': read('player.js'),
    'unfold/scenes': scenesSrc,
  };
  if (needs3d) {
    modules['three/core'] = read('vendor/three.core.min.js');
    modules['three'] = read('vendor/three.module.min.js');
    modules['three/orbit'] = read('vendor/OrbitControls.js');
  }
  for (const [name, src] of Object.entries(modules)) {
    if (/<\/script|<!--/i.test(src)) {
      const msg = `${name === 'unfold/scenes' ? 'scenes.js' : name} contains "</script" or "<!--", which would break the page; split the string (e.g. '<' + '/script')`;
      return { ...res, errors: [...res.errors, msg], built: false };
    }
  }
  const fontCss = (file, family, weight) => `@font-face { font-family: "${family}"; src: url("data:font/woff2;base64,${readFileSync(join(P, 'fonts', file)).toString('base64')}") format("woff2"); font-weight: ${weight}; font-display: swap; }`;
  let css = read('theme.css').replace(/url\("fonts\/([^"]+)"\)/g, (m, f) =>
    `url("data:font/woff2;base64,${readFileSync(join(P, 'fonts', f)).toString('base64')}")`);
  if (needsHand) css = fontCss('patrick-hand-latin-400-normal.woff2', 'Patrick Hand', 400) + '\n' + css;

  const scripts = Object.entries(modules).map(([name, src]) => `<script type="text/plain" data-module="${name}">${src}</script>`).join('\n');
  const html = `<!doctype html>
<!-- Generated by Unfold (lesson-builder/scripts/build-page.mjs) from _unfold/lesson.json + _unfold/scenes.js.
     Don't edit this file: edit those two and rebuild. Bundles three.js (MIT), Fluent UI System Icons (MIT), Cascadia Code (OFL-1.1)${needsHand ? ', Patrick Hand (OFL-1.1)' : ''}. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(lesson.title)} · Unfold</title>
<meta name="description" content="${esc(lesson.summary || '')}">
<link rel="icon" href="${FAVICON}">
<style>${css}</style>
<script type="application/json" id="unfold-lesson">${jsonInHtml(lesson)}</script>
<script type="application/json" id="unfold-nav">${jsonInHtml(navFor(topicDir, root))}</script>
${scripts}
<script>
(() => {
  const imports = {};
  for (const s of document.querySelectorAll('script[data-module]')) imports[s.dataset.module] = URL.createObjectURL(new Blob([s.textContent], { type: 'text/javascript' }));
  const map = document.createElement('script'); map.type = 'importmap'; map.textContent = JSON.stringify({ imports }); document.head.appendChild(map);
  const boot = document.createElement('script'); boot.type = 'module';
  boot.textContent = "import { boot } from 'unfold/player'; import scenes from 'unfold/scenes'; const data = id => JSON.parse(document.getElementById(id).textContent); boot({ lesson: data('unfold-lesson'), scenes, nav: data('unfold-nav') });";
  document.head.appendChild(boot);
})();
</script>
</head>
<body><noscript><p style="padding:24px">This lesson needs JavaScript.</p></noscript></body>
</html>
`;
  const out = join(topicDir, 'index.html');
  writeFileSync(out, html);
  buildLibrary(root);   // topics/index.html: the graph of every topic
  return { ...res, built: true, out, bytes: Buffer.byteLength(html) };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force'), all = args.includes('--all');
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : null;
  const pos = args.filter((a, i) => !a.startsWith('--') && !(ri >= 0 && i === ri + 1));
  let dirs;
  if (all) {
    const r = root || resolve('topics');
    if (!existsSync(r)) { console.error(`no library at ${r}`); process.exit(2); }
    dirs = findTopics(r);
  } else dirs = pos.map(p => resolve(p));
  if (!dirs.length) { console.error('usage: build-page.mjs <topic-folder>... | --all [--root topics] [--force]'); process.exit(2); }
  let failed = 0;
  for (const d of dirs) {
    const r = await buildPage(d, { root: all ? (root || resolve('topics')) : root, force });
    const name = relative(process.cwd(), d) || d;
    if (r.built) console.log(`✓ ${name}/index.html (${Math.round(r.bytes / 1024)} KB)${r.errors.length ? ` built with ${r.errors.length} error(s) (--force)` : ''}`);
    else { failed++; console.log(`✗ ${name}: not built, fix these first`); }
    for (const e of r.errors) console.log(`  ERROR  ${e}`);
    for (const w of r.warnings) console.log(`  warn   ${w}`);
  }
  process.exit(failed ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
