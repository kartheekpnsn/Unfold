#!/usr/bin/env node
// tree.mjs: the topic library is a folder tree. A topic is a folder with _unfold/ inside; subtopics are subfolders.
//   topics/ML/            ← Machine Learning
//   topics/ML/DL/         ← Deep Learning (a kind of ML)
//   topics/ML/DL/LLM/     ← Large Language Models (a kind of DL)
//
// Usage (all paths are relative to the library root, default ./topics):
//   tree                                 print the hierarchy
//   find "<name>"                        is this topic already in the library? prints its path or "none"
//   create "<Name>" [--parent <path>] [--reason "…"]   make <parent>/<Name>/_unfold/ for a new topic
//   move <path> <new-parent-path|.> --reason "…"      move a topic (with all its subtopics) and rebuild every page
//   rebuild                              rebuild every page (links and breadcrumbs are baked into each page) and topics/index.html (the graph)
//   check                                every topic has a page; lists unfinished topics
// Options: --root <dir> (default ./topics)
// Every create/move appends one line to <root>/CHANGELOG.md.

import { existsSync, mkdirSync, renameSync, readFileSync, readdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const builder = join(here, '..', '..', 'lesson-builder', 'scripts', 'build-page.mjs');
const libraryBuilder = join(here, '..', '..', 'lesson-builder', 'scripts', 'build-library.mjs');
const refreshGraph = async () => (await import(libraryBuilder)).buildLibrary(ROOT);   // topics/index.html

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const ROOT = resolve(opt('--root') || 'topics');
const reason = opt('--reason');
const parentOpt = opt('--parent');
const [cmd, ...pos] = args;

const keyOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const rel = p => relative(ROOT, p).split(sep).join('/') || '.';
const today = () => new Date().toISOString().slice(0, 10);

/** All topic folders (have _unfold/), depth-first. done = has a built lesson. */
function topics() {
  const out = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === '_unfold') continue;
      const p = join(d, e.name);
      if (existsSync(join(p, '_unfold'))) {
        let L = null;
        try { L = JSON.parse(readFileSync(join(p, '_unfold', 'lesson.json'), 'utf8')); } catch { /* in progress */ }
        out.push({ path: p, name: e.name, title: L?.title || e.name, slug: L?.slug || '', done: !!L && existsSync(join(p, 'index.html')) });
      }
      walk(p);
    }
  };
  if (existsSync(ROOT)) walk(ROOT);
  return out;
}

/** Folder name from what the user typed: keep their casing (ML stays ML), capitalise lowercase words, join with "-". */
export function folderName(term) {
  return String(term).replace(/["'`’]/g, '').replace(/[^\p{L}\p{N}+#.\s-]/gu, ' ').trim().split(/[\s-]+/).filter(Boolean)
    .map(w => (w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join('-').replace(/\.+$/, '').slice(0, 60);
}

function log(line) {
  mkdirSync(ROOT, { recursive: true });
  const f = join(ROOT, 'CHANGELOG.md');
  if (!existsSync(f)) writeFileSync(f, '# Topic tree changelog\n\nOne line per change, written by topic-tree/scripts/tree.mjs.\n\n');
  appendFileSync(f, `- ${today()} · ${line}${reason ? ` (reason: ${reason})` : ''}\n`);
}

function resolveTopic(p) {
  const full = resolve(ROOT, p);
  if (!full.startsWith(ROOT) || !existsSync(join(full, '_unfold'))) throw new Error(`"${p}" is not a topic folder under ${rel(ROOT) === '.' ? ROOT : ROOT}`);
  return full;
}

async function rebuildAll() {
  const { buildPage } = await import(builder);
  let n = 0;
  for (const t of topics().filter(t => existsSync(join(t.path, '_unfold', 'lesson.json')))) {
    const r = await buildPage(t.path, { root: ROOT });
    if (r.built) n++; else console.log(`  ! ${rel(t.path)} not rebuilt: ${r.errors[0]}`);
  }
  await refreshGraph();
  return n;
}

try {
  switch (cmd) {
    case 'tree': {
      const all = topics();
      if (!all.length) { console.log(`(empty library at ${ROOT})`); break; }
      for (const t of all) {
        const depth = rel(t.path).split('/').length - 1;
        console.log(`${'  '.repeat(depth)}${t.done ? '●' : '◌'} ${t.name}${t.title !== t.name ? `  "${t.title}"` : ''}${t.done ? '' : '  (in progress)'}`);
      }
      break;
    }
    case 'find': {
      const q = keyOf(pos.join(' '));
      const hit = topics().find(t => keyOf(t.name) === q || keyOf(t.title) === q || keyOf(t.slug) === q);
      console.log(hit ? JSON.stringify({ path: rel(hit.path), title: hit.title, done: hit.done }) : 'none');
      break;
    }
    case 'create': {
      const name = folderName(pos.join(' '));
      if (!name) throw new Error('create needs a name');
      const parent = parentOpt && parentOpt !== '.' ? resolveTopic(parentOpt) : ROOT;
      const dir = join(parent, name);
      if (existsSync(dir)) throw new Error(`${rel(dir)} already exists`);
      const clash = topics().find(t => keyOf(t.name) === keyOf(name));
      if (clash) throw new Error(`a topic named ${clash.name} already exists at ${rel(clash.path)}`);
      mkdirSync(join(dir, '_unfold'), { recursive: true });
      log(`created ${rel(dir)}`);
      await refreshGraph();
      console.log(rel(dir));
      break;
    }
    case 'move': {
      const [from, to] = pos;
      if (!from || !to) throw new Error('usage: move <path> <new-parent-path|.> --reason "…"');
      const src = resolveTopic(from);
      const dstParent = to === '.' ? ROOT : resolveTopic(to);
      if (dstParent === src || dstParent.startsWith(src + sep)) throw new Error(`can't move ${rel(src)} inside itself`);
      const dst = join(dstParent, basename(src));
      if (dst === src) { console.log('(no change)'); break; }
      if (existsSync(dst)) throw new Error(`${rel(dst)} already exists`);
      renameSync(src, dst);
      log(`moved ${rel(src)} → ${rel(dst)}`);
      console.log(`✓ moved ${rel(src)} → ${rel(dst)}`);
      console.log(`✓ rebuilt ${await rebuildAll()} page(s)`);
      break;
    }
    case 'rebuild': console.log(`✓ rebuilt ${await rebuildAll()} page(s)`); break;
    case 'check': {
      const all = topics();
      const pending = all.filter(t => !t.done);
      console.log(`${all.length - pending.length} built topic(s), ${pending.length} in progress`);
      for (const t of pending) console.log(`  ◌ ${rel(t.path)}: ${existsSync(join(t.path, '_unfold', 'lesson.json')) ? 'lesson.json present, page not built' : 'no lesson yet'}`);
      break;
    }
    case 'name': console.log(folderName(pos.join(' '))); break;
    default:
      console.error('usage: tree.mjs tree | find "<name>" | create "<Name>" [--parent p] | move <path> <new-parent|.> --reason "…" | rebuild | check | name "<term>"  [--root topics]');
      process.exit(2);
  }
} catch (e) { console.error('✗ ' + e.message); process.exit(1); }
