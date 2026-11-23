#!/usr/bin/env node
// build-library.mjs: write <library>/index.html, a self-contained graph of every topic in the library.
//   Nodes: built topics, topics still in progress, and topics the lessons suggest (prereqs / next) that aren't built yet.
//   Edges: folder nesting (parent contains child) plus each lesson's related.prereqs / related.next.
// Called automatically by build-page.mjs and tree.mjs; run by hand with:
//   node build-library.mjs [--root topics]

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const P = join(here, '..', 'assets', 'player');
const read = f => readFileSync(join(P, f), 'utf8');
const dataJs = src => `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`;
const jsonInHtml = o => JSON.stringify(o).replace(/</g, '\\u003c');
const keyOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg transform='rotate(45 10 10)'%3E%3Crect x='3' y='3' width='6.5' height='6.5' rx='1' fill='%23F25022'/%3E%3Crect x='10.5' y='3' width='6.5' height='6.5' rx='1' fill='%237FBA00'/%3E%3Crect x='3' y='10.5' width='6.5' height='6.5' rx='1' fill='%2300A4EF'/%3E%3Crect x='10.5' y='10.5' width='6.5' height='6.5' rx='1' fill='%23FFB900'/%3E%3C/g%3E%3C/svg%3E";

/** Every topic folder (has _unfold/) under root, depth-first, with what we know about it. */
function scan(root) {
  const out = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === '_unfold') continue;
      const p = join(d, e.name);
      if (existsSync(join(p, '_unfold'))) {
        const L = readJson(join(p, '_unfold', 'lesson.json'));
        const S = readJson(join(p, '_unfold', 'state.json'));
        const path = relative(root, p).split(sep).join('/');
        const parentPath = relative(root, dirname(p)).split(sep).join('/');
        out.push({
          id: path, path, name: e.name, parent: parentPath && parentPath !== '.' ? parentPath : null,
          title: L?.title || S?.title || e.name.replace(/-/g, ' '),
          slug: L?.slug || '', summary: L?.summary || '', level: L?.level || S?.level || '', duration: L?.duration || S?.duration || '',
          domain: L?.domain || '', phase: S?.phase || '',
          status: L && existsSync(join(p, 'index.html')) ? 'built' : 'draft',
          href: path.split('/').map(encodeURIComponent).join('/') + '/index.html',
          related: L?.related || { prereqs: [], next: [] },
        });
      }
      walk(p);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

export function libraryGraph(root) {
  const topics = scan(resolve(root));
  const byKey = new Map();
  for (const t of topics) for (const k of [t.slug, t.name, t.title]) if (keyOf(k) && !byKey.has(keyOf(k))) byKey.set(keyOf(k), t.id);
  // A topic whose parent folder isn't a topic (shouldn't happen) hangs off the nearest topic ancestor.
  const ids = new Set(topics.map(t => t.id));
  for (const t of topics) while (t.parent && !ids.has(t.parent)) t.parent = t.parent.includes('/') ? t.parent.slice(0, t.parent.lastIndexOf('/')) : null;

  const nodes = topics.map(({ related, ...t }) => ({ ...t, prereqs: [], next: [], suggestedBy: [] }));
  const node = id => nodes.find(n => n.id === id);
  const edges = [];
  const edgeSet = new Set();
  const addEdge = (source, target, kind) => {
    const k = `${source}>${target}`, rk = `${target}>${source}`;
    if (source === target || edgeSet.has(k) || (kind !== 'contains' && edgeSet.has(rk))) return;
    edgeSet.add(k); edges.push({ source, target, kind });
  };
  for (const t of nodes) if (t.parent) addEdge(t.parent, t.id, 'contains');

  for (const t of topics) {
    const me = node(t.id);
    for (const kind of ['prereqs', 'next']) for (const r of t.related?.[kind] || []) {
      const match = byKey.get(keyOf(r.id)) || byKey.get(keyOf(r.title));
      let target = match;
      if (!target) {
        target = 'suggested:' + (keyOf(r.id) || keyOf(r.title));
        let s = node(target);
        if (!s) { s = { id: target, title: r.title || r.id, status: 'suggested', suggestedBy: [] }; nodes.push(s); }
        s.suggestedBy.push({ from: t.id, title: t.title, as: kind === 'prereqs' ? 'prereq' : 'next', why: r.why || '' });
      }
      me[kind].push({ id: target, title: r.title || r.id, why: r.why || '' });
      if (kind === 'prereqs') addEdge(target, t.id, 'prereq'); else addEdge(t.id, target, 'next');
    }
  }
  return { nodes, edges, generated: new Date().toISOString().slice(0, 10) };
}

export function buildLibrary(root) {
  root = resolve(root);
  if (!existsSync(root)) return null;
  const graph = libraryGraph(root);
  const css = read('theme.css').replace(/url\("fonts\/([^"]+)"\)/g, (m, f) =>
    `url("data:font/woff2;base64,${readFileSync(join(P, 'fonts', f)).toString('base64')}")`) + '\n' + read('library.css');
  const imports = {
    'unfold/util': dataJs(read('util.js')),
    'unfold/icons': dataJs(read('icons/icons.js')),
    'unfold/library': dataJs(read('library.js')),
  };
  const built = graph.nodes.filter(n => n.status === 'built').length;
  const html = `<!doctype html>
<!-- Generated by Unfold (lesson-builder/scripts/build-library.mjs) from the topic folders. Don't edit: it is rewritten on every build. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Topic Library · Unfold</title>
<meta name="description" content="${built} lesson${built === 1 ? '' : 's'} and how they connect.">
<link rel="icon" href="${FAVICON}">
<style>${css}</style>
<script type="importmap">${JSON.stringify({ imports })}</script>
<script type="application/json" id="unfold-graph">${jsonInHtml(graph)}</script>
<script type="module">
import { boot } from 'unfold/library';
boot(JSON.parse(document.getElementById('unfold-graph').textContent));
</script>
</head>
<body class="library"><noscript><p style="padding:24px">This page needs JavaScript.</p></noscript></body>
</html>
`;
  const out = join(root, 'index.html');
  writeFileSync(out, html);
  return { out, bytes: Buffer.byteLength(html), nodes: graph.nodes.length, edges: graph.edges.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = resolve(ri >= 0 ? args[ri + 1] : 'topics');
  const r = buildLibrary(root);
  if (!r) { console.error(`no library at ${root}`); process.exit(2); }
  console.log(`✓ ${relative(process.cwd(), r.out)} (${Math.round(r.bytes / 1024)} KB, ${r.nodes} nodes, ${r.edges} links)`);
}
