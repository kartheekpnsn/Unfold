// Unfold player: the shared engine every topic page boots.
// build-page.mjs inlines this engine, the topic's lesson.json + scenes.js, and the folder navigation
// into one self-contained index.html, so pages open from disk with no server.
// Route: #/<topic>/<tab>/<step>   (deep-dive sub-lessons: #/<topic>/deep-dive:<sub>/<step>)

import { createKit } from 'unfold/scene-kit';
import { createThreeKit, webglAvailable } from 'unfold/three-stage';
import { icon } from 'unfold/icons';
import { esc, md, highlightLines, initTheme, copyText, progressFor, saveProgress, PLAYER_VERSION } from 'unfold/util';
import { renderQuiz } from 'unfold/quiz';

const STEPPER_KINDS = new Set(['stepper', 'lessons']);
const DEFAULT_ICONS = { eli5: 'lightbulb', core: 'flash', technical: 'code', 'deep-dive': 'layer', playground: 'options',
  story: 'history', tradeoffs: 'scales', check: 'question-circle', cheatsheet: 'document-text', related: 'branch' };
const AUTOPLAY_MS = 4500;

// nav = { crumbs: [{title, href}], children: [{title, href}], topics: [{title, href, key}] } (hrefs relative to this page)
export function boot({ lesson, scenes, nav }) {
  new Player(lesson, scenes || {}, nav || { crumbs: [], children: [], topics: [] }).start();
}

const keyOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

class Player {
  constructor(lesson, scenes, nav) {
    this.lesson = lesson; this.scenes = scenes; this.nav = nav;
    this.tabs = lesson.tabs;
    this.stage = null;     // { sceneId, scene, inst, el, mode }
    this.prevState = null;
    this.mountToken = 0;
    this.autoplay = null;
    this.route = null;
    this.progress = progressFor(lesson.slug);
  }

  start() {
    document.title = `${this.lesson.title} · Unfold`;
    document.body.innerHTML = this.skeleton();
    this.$ = sel => document.querySelector(sel);
    initTheme(this.$('#theme-btn'), () => { this.stage?.inst?.refreshColors?.(); this.$('#theme-btn').innerHTML = icon(this.isDark() ? 'weather-sunny' : 'weather-moon', 18); });
    this.renderNav(this.$('.pane-tree'));
    this.$('.menu-btn').addEventListener('click', () => document.body.classList.toggle('tree-open'));
    this.bindTabs();
    this.bindKeys();
    this.bindSearch();
    addEventListener('hashchange', () => this.onRoute());
    this.onRoute();
  }

  isDark() { return document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); }

  skeleton() {
    const tabs = this.tabs.map((t, i) => `<button class="tab" role="tab" data-tab="${esc(t.id)}" title="${esc(t.title)} (${i + 1})">
      ${icon(t.icon || DEFAULT_ICONS[t.id] || 'circle-hint', 16)}<span class="label">${esc(t.title)}</span></button>`).join('');
    return `
      <header class="topbar">
        <button class="icon-btn menu-btn" aria-label="Topics">${icon('navigation', 18)}</button>
        <a class="brand" href="${esc(this.nav.home || '#')}" title="All topics"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span>Unfold</span></a>
        <nav class="tabs${this.tabs.length > 6 ? ' many' : ''}" role="tablist" aria-label="Lesson tabs">${tabs}</nav>
        <div class="top-actions">
          <div class="search">${icon('search', 16)}<input type="search" placeholder="Search steps & topics" aria-label="Search"><div class="search-results"></div></div>
          <button class="icon-btn" id="theme-btn" aria-label="Toggle dark mode">${icon('weather-moon', 18)}</button>
        </div>
      </header>
      <div class="shell">
        <aside class="pane-tree"></aside>
        <main class="center" id="center"></main>
        <aside class="pane-narr" id="narr" aria-live="polite"></aside>
      </div>`;
  }

  // ---------- folder navigation (left pane) ----------
  renderNav(el) {
    const N = this.nav, L = this.lesson;
    const link = (t, cls = '') => `<li><a href="${esc(t.href)}" class="${cls}">${icon(cls === 'current' ? 'book-open' : 'circle-hint', 14)}${esc(t.title)}</a></li>`;
    let html = `<div class="tree-title">Topics</div><nav class="tree" aria-label="Topics">`;
    if (N.home) html += `<ul><li><a href="${esc(N.home)}">${icon('organization', 14)}All topics (graph)</a></li></ul>`;
    if (N.crumbs.length) html += `<div class="tree-domain">Part of</div><ul>${N.crumbs.map(c => link(c)).join('')}</ul>`;
    html += `<div class="tree-domain">This topic</div><ul><li><a href="#" class="current" aria-current="page">${icon('book-open', 14)}${esc(L.title)}</a>`;
    if (N.children.length) html += `<ul>${N.children.map(c => link(c)).join('')}</ul>`;
    html += `</li></ul>`;
    const others = N.topics.filter(t => !t.self && !N.crumbs.some(c => c.href === t.href) && !N.children.some(c => c.href === t.href));
    if (others.length) html += `<div class="tree-domain">Other topics</div><ul>${others.map(t => `<li><a href="${esc(t.href)}" style="padding-left:${8 + 12 * (t.depth || 0)}px">${icon('circle-hint', 14)}${esc(t.title)}</a></li>`).join('')}</ul>`;
    el.innerHTML = html + `</nav><div class="tree-foot">${N.topics.length} topic${N.topics.length === 1 ? '' : 's'} in your library</div>`;
  }
  findTopic(r) { const k = keyOf(r.id), t = keyOf(r.title); return this.nav.topics.find(x => x.key === k || keyOf(x.title) === t || x.key === t); }

  // ---------- routing ----------
  parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    let [, tabSeg, stepSeg] = parts;
    let [tabId, sub] = (tabSeg || '').split(':');
    let tab = this.tabs.find(t => t.id === tabId) || this.tabs[0];
    if (tab.kind === 'lessons') { if (!tab.lessons.some(l => l.id === sub)) sub = tab.lessons[0].id; } else sub = null;
    const steps = this.stepsOf(tab, sub);
    let step = Math.max(1, parseInt(stepSeg, 10) || 1);
    if (steps) step = Math.min(step, steps.length);
    return { tab, sub, step };
  }
  hashFor(tabId, sub, step) { return `#/${this.lesson.slug}/${tabId}${sub ? ':' + sub : ''}${step ? '/' + step : ''}`; }
  go(tabId, sub, step, replace = false) {
    const h = this.hashFor(tabId, sub, step);
    if (location.hash === h) return;
    if (replace) history.replaceState(null, '', h); else location.hash = h;
    if (replace) this.onRoute();
  }
  stepsOf(tab, sub) {
    if (tab.kind === 'stepper') return tab.steps;
    if (tab.kind === 'lessons') return (tab.lessons.find(l => l.id === sub) || tab.lessons[0]).steps;
    return null;
  }

  onRoute() {
    const r = this.parseHash();
    const canonical = this.hashFor(r.tab.id, r.sub, this.stepsOf(r.tab, r.sub) ? r.step : null);
    if (location.hash !== canonical) history.replaceState(null, '', canonical);
    const tabChanged = !this.route || this.route.tab !== r.tab || this.route.sub !== r.sub;
    this.route = r;
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === r.tab.id)));
    document.querySelector(`.tab[data-tab="${CSS.escape(r.tab.id)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    document.body.classList.remove('tree-open');
    if (tabChanged) this.renderTab(r);
    else if (STEPPER_KINDS.has(r.tab.kind)) this.showStep(r.step - 1);
  }

  // ---------- tabs ----------
  bindTabs() {
    document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => this.go(b.dataset.tab, null, null)));
  }

  teardownStage() {
    this.stopAutoplay();
    this.mountToken++;
    if (this.stage?.inst) { try { this.stage.inst.destroy(); } catch (e) { console.error(e); } }
    this.stage = null;
    this.prevState = null;
  }

  renderTab(r) {
    this.teardownStage();
    const shell = document.querySelector('.shell');
    const center = this.$('#center'), narr = this.$('#narr');
    const { tab } = r;
    const wide = !STEPPER_KINDS.has(tab.kind) && tab.kind !== 'playground';
    shell.classList.toggle('wide', wide);
    narr.hidden = wide;
    center.innerHTML = '';
    narr.innerHTML = '';
    window.scrollTo(0, 0);

    if (STEPPER_KINDS.has(tab.kind)) {
      center.innerHTML = this.headHtml(tab) + (tab.kind === 'lessons' ? this.subtabsHtml(tab, r.sub) : '') + this.stageCardHtml(true);
      narr.innerHTML = this.narrSkeleton();
      this.bindStageControls();
      this.renderRail();
      this.showStep(r.step - 1, { first: true });
    } else if (tab.kind === 'playground') {
      center.innerHTML = this.headHtml(tab) + this.stageCardHtml(false);
      this.renderPlayground(tab, narr);
    } else if (tab.kind === 'quiz') {
      renderQuiz(center, this.lesson);
    } else if (tab.kind === 'related') {
      center.innerHTML = this.relatedHtml();
      center.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy)));
    } else if (tab.kind === 'cheatsheet') {
      center.innerHTML = this.cheatsheetHtml(tab);
      center.querySelector('[data-print]')?.addEventListener('click', () => print());
    } else if (tab.kind === 'story') {
      center.innerHTML = this.storyHtml(tab);
    } else if (tab.kind === 'tradeoffs') {
      center.innerHTML = this.tradeoffsHtml(tab);
    } else {
      center.innerHTML = `<div class="doc"><p class="lede">Unknown tab kind “${esc(tab.kind)}”.</p></div>`;
      console.error(`Unknown tab kind: ${tab.kind}`);
    }
  }

  headHtml(tab) {
    const L = this.lesson;
    const totalSteps = this.tabs.reduce((n, t) => n + (t.kind === 'stepper' ? t.steps.length : t.kind === 'lessons' ? t.lessons.reduce((m, l) => m + l.steps.length, 0) : 0), 0);
    return `<div class="lesson-head">
      <h1>${esc(L.title)}</h1>
      <div class="meta">
        <span class="chip level">${esc(cap(L.level))}</span>
        <span class="chip">${icon('history', 14)} ${L.duration === '2h' ? '2 hours' : '30 min'}</span>
        <span class="chip">${totalSteps} steps</span>
        <span class="chip">${icon(tab.icon || DEFAULT_ICONS[tab.id] || 'circle-hint', 14)} ${esc(tab.title)}</span>
      </div></div>`;
  }
  subtabsHtml(tab, sub) {
    return `<div class="subtabs">${tab.lessons.map(l => `<a href="${this.hashFor(tab.id, l.id, 1)}" class="${l.id === sub ? 'on' : ''}">${esc(l.title)}</a>`).join('')}</div>`;
  }
  stageCardHtml(withRail) {
    return `<section class="stage-card">
      <div class="stage-top">
        <div class="metrics" id="metrics"></div>
        <div class="ctrls">
          ${withRail ? `<button class="btn" id="replay-btn" title="Replay this step (R)">${icon('arrow-counterclockwise', 16)}<span>Replay</span></button>
          <button class="btn" id="play-btn" title="Autoplay steps (Space)">${icon('play', 16)}<span>Play</span></button>` : ''}
        </div>
      </div>
      <div class="stage" id="stage"></div>
      ${withRail ? '<div class="rail" id="rail" role="tablist" aria-label="Steps"></div>' : ''}
    </section>`;
  }
  narrSkeleton() {
    return `<div><div class="step-count" id="step-count"></div><h2 class="step-title" id="step-title"></h2></div>
      <div class="narration" id="narration"></div>
      <div id="callout"></div>
      <div id="changed"></div>
      <div><div class="nav-btns">
        <button class="btn" id="back-btn">${icon('arrow-left', 16)} Back</button>
        <button class="btn primary" id="next-btn">Next ${icon('arrow-right', 16)}</button>
      </div></div>
      <div class="kbd-hint"><kbd>←</kbd> <kbd>→</kbd> steps · <kbd>Space</kbd> play · <kbd>R</kbd> replay · <kbd>1</kbd>–<kbd>9</kbd> tabs</div>
      <div id="code"></div>
      ${this.objectivesHtml()}`;
  }
  objectivesHtml() {
    const done = this.progress.objectives || {};
    return `<div><div class="section-label">You'll learn</div><ul class="objectives">${(this.lesson.objectives || []).map((o, i) =>
      `<li><label><input type="checkbox" data-obj="${i}" ${done[i] ? 'checked' : ''}><span>${md(o, this.lesson.sources)}</span></label></li>`).join('')}</ul></div>`;
  }

  bindStageControls() {
    this.$('#replay-btn')?.addEventListener('click', () => this.replay());
    this.$('#play-btn')?.addEventListener('click', () => this.toggleAutoplay());
    this.$('#back-btn')?.addEventListener('click', () => this.stepBy(-1));
    this.$('#next-btn')?.addEventListener('click', () => this.stepBy(1));
    document.querySelectorAll('[data-obj]').forEach(cb => cb.addEventListener('change', () => {
      this.progress.objectives = { ...(this.progress.objectives || {}), [cb.dataset.obj]: cb.checked };
      saveProgress(this.lesson.slug, this.progress);
    }));
    // swipe between steps on touch devices
    const st = this.$('#stage');
    let x0 = null;
    st.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', e => {
      if (x0 == null || this.stage?.mode === 'three') return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) this.stepBy(dx < 0 ? 1 : -1);
    });
  }

  renderRail() {
    const steps = this.stepsOf(this.route.tab, this.route.sub);
    this.$('#rail').innerHTML = steps.map((s, i) => `<div class="rail-step" data-i="${i}">
      <button class="rail-dot" role="tab" title="${esc(s.title)}" aria-label="Step ${i + 1}: ${esc(s.title)}">${i + 1}</button></div>`).join('');
    this.$('#rail').querySelectorAll('.rail-step').forEach(el => el.querySelector('button').addEventListener('click', () => {
      this.stopAutoplay();
      this.go(this.route.tab.id, this.route.sub, +el.dataset.i + 1);
    }));
  }

  stepBy(d) {
    if (!this.route || !STEPPER_KINDS.has(this.route.tab.kind)) return;
    const steps = this.stepsOf(this.route.tab, this.route.sub);
    const n = this.route.step + d;
    if (n > steps.length && d > 0) {
      const nextTab = this.tabs[this.tabs.indexOf(this.route.tab) + 1];
      if (nextTab && !this.autoplay) this.go(nextTab.id, null, null);
      return;
    }
    if (n < 1 || n > steps.length) return;
    this.go(this.route.tab.id, this.route.sub, n);
  }

  // ---------- stepper ----------
  async showStep(i, { first = false } = {}) {
    const { tab, sub } = this.route;
    const steps = this.stepsOf(tab, sub);
    const step = steps[i];
    const prevStep = this.lastStepShown;
    this.lastStepShown = step;
    const L = this.lesson;

    // narration pane
    this.$('#step-count').textContent = `Step ${i + 1} / ${steps.length}`;
    this.$('#step-title').textContent = step.title;
    this.$('#narration').innerHTML = md(step.narration, L.sources, { block: true });
    const c = step.callout;
    const cIcon = { 'good-to-know': 'lightbulb', warning: 'warning', insight: 'sparkle' };
    const cLabel = { 'good-to-know': 'Good to know', warning: 'Watch out', insight: 'Insight' };
    this.$('#callout').innerHTML = c ? `<div class="callout ${esc(c.kind)}">${icon(cIcon[c.kind] || 'info', 16)}<div><b>${cLabel[c.kind] || 'Note'}</b>${md(c.text, L.sources)}</div></div>` : '';
    const changed = (step.whatChanged || []).map(w => {
      const t = typeof w === 'string' ? w : w.text;
      const kind = typeof w === 'string' ? (t[0] === '-' ? 'rm' : t[0] === '~' ? 'hl' : 'add') : (w.kind || 'add');
      return `<li class="${kind}">${md(t.replace(/^[-+~]\s*/, ''), L.sources)}</li>`;
    }).join('');
    this.$('#changed').innerHTML = changed ? `<div class="section-label">What changed</div><ul class="changed-list">${changed}</ul>` : '';
    const code = step.code || (tab.code && { ...tab.code, highlight: step.highlight || [] });
    let codeHtml = '';
    if (step.formula) codeHtml += `<div class="section-label">Formula</div><div class="formula">${esc(step.formula)}</div>`;
    if (code?.src) {
      const hl = new Set(code.highlight || []);
      codeHtml += `<div class="section-label" style="margin-top:${step.formula ? 12 : 0}px">${esc(code.title || (code.lang === 'pseudo' ? 'Pseudocode' : 'Code'))}</div>
        <div class="code" aria-label="code">${highlightLines(code.src).map((l, n) => `<span class="ln${hl.has(n + 1) ? ' hl' : ''}" data-n="${n + 1}">${l || ' '}</span>`).join('')}</div>`;
    }
    this.$('#code').innerHTML = codeHtml;
    this.$('#back-btn').disabled = i === 0;
    const nextBtn = this.$('#next-btn');
    const last = i === steps.length - 1;
    const nextTab = last ? this.tabs[this.tabs.indexOf(tab) + 1] : null;
    nextBtn.disabled = last && !nextTab;
    nextBtn.innerHTML = last && nextTab ? `${esc(nextTab.title)} ${icon('arrow-right', 16)}` : `Next ${icon('arrow-right', 16)}`;

    // metrics (highlight those that changed since the previous step)
    const pm = prevStep?.metrics || {};
    this.$('#metrics').innerHTML = Object.entries(step.metrics || {}).map(([k, v]) =>
      `<span class="metric${!first && pm[k] !== undefined && String(pm[k]) !== String(v) ? ' changed' : ''}">${esc(k)} <b>${esc(v)}</b></span>`).join('');

    // rail + progress
    this.$('#rail').querySelectorAll('.rail-step').forEach((el, j) => {
      el.classList.toggle('active', j === i);
      el.classList.toggle('done', j < i);
      el.querySelector('button').setAttribute('aria-selected', String(j === i));
    });
    this.$('#rail').querySelector('.rail-step.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const vk = tab.id + (sub ? ':' + sub : '');
    this.progress.visited = { ...(this.progress.visited || {}), [vk]: Math.max(this.progress.visited?.[vk] || 0, i + 1) };
    saveProgress(L.slug, this.progress);

    await this.renderScene(step.scene, step.state, { instant: first, animateIn: !first });
  }

  async ensureStage(sceneId) {
    if (this.stage && this.stage.sceneId === sceneId) return this.stage;
    const token = ++this.mountToken;
    if (this.stage?.inst) { try { this.stage.inst.destroy(); } catch (e) { console.error(e); } }
    this.stage = null; this.prevState = null;
    const el = this.$('#stage');
    el.innerHTML = '';
    let scene = this.scenes[sceneId];
    if (!scene) throw new Error(`Scene "${sceneId}" is not defined in scenes.js`);
    let mode = scene.mode || 'svg', badge = '';
    let inst;
    if (mode === 'three') {
      if (webglAvailable()) {
        inst = await createThreeKit(el);
        badge = `${icon('cube', 14)} Drag to rotate`;
      } else {
        const fb = scene.fallback && this.scenes[scene.fallback];
        if (!fb) throw new Error(`WebGL is unavailable and scene "${sceneId}" has no fallback`);
        scene = fb; mode = 'svg';
        badge = `${icon('info', 14)} 3D unavailable on this device, showing 2D`;
      }
    }
    if (mode === 'svg') inst = createKit(el, { label: scene.label || sceneId, ...(scene.view || {}) });
    if (token !== this.mountToken) { inst.destroy(); return null; }
    if (badge) el.insertAdjacentHTML('beforeend', `<div class="stage-badge">${badge}</div>`);
    scene.mount?.(el, inst);
    this.stage = { sceneId, scene, inst, el, mode };
    return this.stage;
  }

  async renderScene(sceneId, state, { instant = false, duration, animateIn = false } = {}) {
    try {
      const st = await this.ensureStage(sceneId);
      if (!st) return;
      const prev = this.prevState;
      const inst = st.inst;
      const saved = inst.duration;
      if (instant || (!prev && !animateIn)) inst.duration = 0;
      else if (duration != null) inst.duration = Math.min(saved, duration);
      st.scene.render(structuredClone(state || {}), prev, inst);
      inst.duration = saved;
      this.prevState = structuredClone(state || {});
    } catch (e) {
      console.error(e);
      const el = this.$('#stage');
      if (el) el.innerHTML = `<div class="stage-error">This scene failed to render: ${esc(e.message)}</div>`;
      this.stage = null;
    }
  }

  async replay() {
    const { tab, sub, step } = this.route;
    const steps = this.stepsOf(tab, sub);
    const cur = steps[step - 1], prev = steps[step - 2];
    if (prev && prev.scene === cur.scene && this.stage) {
      await this.renderScene(prev.scene, prev.state, { instant: true });
      setTimeout(() => this.renderScene(cur.scene, cur.state), 60);
    } else {
      this.teardownStageOnly();
      await this.renderScene(cur.scene, cur.state, { animateIn: true });
    }
  }
  teardownStageOnly() {
    this.mountToken++;
    if (this.stage?.inst) this.stage.inst.destroy();
    this.stage = null; this.prevState = null;
  }

  toggleAutoplay() { this.autoplay ? this.stopAutoplay() : this.startAutoplay(); }
  startAutoplay() {
    const btn = this.$('#play-btn');
    if (!btn) return;
    const steps = this.stepsOf(this.route.tab, this.route.sub);
    if (this.route.step >= steps.length) this.go(this.route.tab.id, this.route.sub, 1);
    btn.innerHTML = `${icon('pause', 16)}<span>Pause</span>`;
    this.autoplay = setInterval(() => {
      const s = this.stepsOf(this.route.tab, this.route.sub);
      if (this.route.step >= s.length) return this.stopAutoplay();
      this.stepBy(1);
    }, AUTOPLAY_MS);
  }
  stopAutoplay() {
    clearInterval(this.autoplay); this.autoplay = null;
    const btn = this.$('#play-btn');
    if (btn) btn.innerHTML = `${icon('play', 16)}<span>Play</span>`;
  }

  // ---------- playground ----------
  renderPlayground(tab, narr) {
    const values = {};
    for (const c of tab.controls) values[c.id] = c.value;
    const L = this.lesson;
    narr.innerHTML = `<div><div class="step-count">Playground</div><h2 class="step-title">${esc(tab.heading || 'Try it yourself')}</h2></div>
      <div class="narration">${md(tab.intro || '', L.sources, { block: true })}</div>
      <div class="controls">${tab.controls.map(c => this.controlHtml(c)).join('')}</div>
      <div id="pg-notes" class="narration"></div>
      ${this.objectivesHtml()}`;
    const update = (instant = false) => {
      const state = { ...(tab.state || {}), ...values };
      const scene = this.scenes[tab.scene];
      const metrics = scene?.metrics?.(state) || {};
      this.$('#metrics').innerHTML = Object.entries(metrics).map(([k, v]) => `<span class="metric">${esc(k)} <b>${esc(v)}</b></span>`).join('');
      const note = scene?.note?.(state);
      this.$('#pg-notes').innerHTML = note ? `<div class="callout insight">${icon('sparkle', 16)}<div><b>What you're seeing</b>${md(note, L.sources)}</div></div>` : '';
      this.renderScene(tab.scene, state, { instant, duration: 180 });
    };
    narr.querySelectorAll('[data-ctl]').forEach(inp => {
      const c = tab.controls.find(x => x.id === inp.dataset.ctl);
      if (c.type === 'choice') {
        inp.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          values[c.id] = JSON.parse(b.dataset.v);
          inp.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          update();
        }));
      } else if (c.type === 'toggle') {
        inp.addEventListener('change', () => { values[c.id] = inp.checked; update(); });
      } else {
        inp.addEventListener('input', () => {
          values[c.id] = +inp.value;
          narr.querySelector(`output[for="ctl-${c.id}"]`).textContent = `${inp.value}${c.unit || ''}`;
          update();
        });
      }
    });
    update(true);
  }
  controlHtml(c) {
    if (c.type === 'choice') return `<div class="control"><label>${esc(c.label)}</label><div class="seg" data-ctl="${esc(c.id)}">${c.options.map(o =>
      `<button data-v='${esc(JSON.stringify(o.value))}' aria-pressed="${o.value === c.value}">${esc(o.label)}</button>`).join('')}</div></div>`;
    if (c.type === 'toggle') return `<div class="control"><label><span>${esc(c.label)}</span><input type="checkbox" data-ctl="${esc(c.id)}" ${c.value ? 'checked' : ''}></label></div>`;
    return `<div class="control"><label for="ctl-${esc(c.id)}"><span>${esc(c.label)}</span><output for="ctl-${esc(c.id)}">${esc(c.value)}${esc(c.unit || '')}</output></label>
      <input type="range" id="ctl-${esc(c.id)}" data-ctl="${esc(c.id)}" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.value}"></div>`;
  }

  // ---------- document tabs ----------
  relatedHtml() {
    const L = this.lesson;
    const card = r => {
      const n = this.findTopic(r);
      const built = !!n;
      const cmd = `unfold: "${r.title}"`;
      return `<div class="card${built ? '' : ' ghost'}">
        <h3>${icon(built ? 'book-open' : 'circle-hint', 16)}${built ? `<a href="${esc(n.href)}">${esc(r.title)}</a>` : esc(r.title)}
          <span class="tag ${built ? 'built' : 'ghost'}" style="margin-left:auto">${built ? 'Built' : 'Not built yet'}</span></h3>
        ${r.why ? `<p>${md(r.why, L.sources)}</p>` : ''}
        ${built ? '' : `<div class="cmd">${esc(cmd)}<button data-copy='${esc(cmd)}'>Copy</button></div>`}
      </div>`;
    };
    const rel = L.related || {};
    return `<div class="doc">
      <div><h2>Before this</h2><p class="lede">Prerequisites that make this topic easier.</p></div>
      <div class="cards">${(rel.prereqs || []).map(card).join('') || '<p class="lede">None needed.</p>'}</div>
      <div><h2>Where to go next</h2><p class="lede">Topics that build on this one.</p></div>
      <div class="cards">${(rel.next || []).map(card).join('')}</div>
      <div><h2>Sources</h2><p class="lede">Every claim in this lesson cites one of these. Accessed ${esc(L.sourcesAccessed || '')}.</p></div>
      <ol class="sources">${(L.sources || []).map(s => `<li id="src-${esc(s.id)}"><span class="sid">${esc(s.id)}</span>
        <div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc([s.publisher, s.trust].filter(Boolean).join(' · '))}</small></div></li>`).join('')}</ol>
      <p class="lede" style="font-size:12px">Built with Unfold player ${PLAYER_VERSION}.</p>
    </div>`;
  }
  cheatsheetHtml(tab) {
    const S = this.lesson.sources;
    return `<div class="doc">
      <div style="display:flex;align-items:flex-end;gap:12px"><div><h2>${esc(this.lesson.title)}: cheatsheet</h2><p class="lede">One page, print-friendly.</p></div>
        <button class="btn no-print" data-print style="margin-left:auto">${icon('print', 16)} Print</button></div>
      ${tab.facts?.length ? `<div class="card"><h3>${icon('star', 16)} Key facts</h3><ul>${tab.facts.map(f => `<li>${md(f, S)}</li>`).join('')}</ul></div>` : ''}
      ${tab.formulas?.length ? `<div class="card"><h3>${icon('math-formula', 16)} Formulas & code</h3>${tab.formulas.map(f =>
        `<div style="margin:10px 0"><div class="section-label">${esc(f.label)}</div><div class="formula">${esc(f.expr)}</div>${f.note ? `<p style="margin-top:6px">${md(f.note, S)}</p>` : ''}</div>`).join('')}</div>` : ''}
      ${tab.glossary?.length ? `<div class="card"><h3>${icon('book-open', 16)} Glossary</h3><dl class="glossary">${tab.glossary.map(g => `<dt>${esc(g.term)}</dt><dd>${md(g.def, S)}</dd>`).join('')}</dl></div>` : ''}
    </div>`;
  }
  storyHtml(tab) {
    const S = this.lesson.sources;
    return `<div class="doc">
      <div><h2>How we got here</h2><p class="lede">${md(tab.intro || 'The story behind the idea.', S)}</p></div>
      <ol class="timeline">${(tab.timeline || []).map(t => `<li><div class="when">${esc(t.when)}</div><h3>${esc(t.title)}</h3><p>${md(t.text, S)}</p></li>`).join('')}</ol>
      <div><h2>Misconceptions</h2><p class="lede">Each one: the mistake, why it's wrong, and the correct idea.</p></div>
      <div class="cards">${(tab.misconceptions || []).map(m => `<div class="card myth">
        <div class="row m"><b>Mistake</b><span>${md(m.myth, S)}</span></div>
        <div class="row w"><b>Why</b><span>${md(m.why, S)}</span></div>
        <div class="row t"><b>Instead</b><span>${md(m.truth, S)}</span></div></div>`).join('')}</div>
    </div>`;
  }
  tradeoffsHtml(tab) {
    const S = this.lesson.sources;
    const list = (title, ic, items, color) => items?.length ? `<div class="card"><h3><span style="color:var(--${color}-ink)">${icon(ic, 16)}</span>${esc(title)}</h3><ul>${items.map(x => `<li>${md(x, S)}</li>`).join('')}</ul></div>` : '';
    return `<div class="doc">
      <div><h2>${esc(tab.heading || 'Trade-offs')}</h2><p class="lede">${md(tab.intro || 'When to reach for it, and when not to.', S)}</p></div>
      <div class="cards quad">
        ${list('Use it when', 'checkmark-circle', tab.useWhen, 'green')}
        ${list('Avoid it when', 'dismiss-circle', tab.avoidWhen, 'red')}
        ${list('Pros', 'arrow-up-right', tab.pros, 'blue')}
        ${list('Cons', 'warning', tab.cons, 'yellow')}
      </div>
      ${tab.perspectives?.length ? `<h2>Perspectives</h2><div class="cards">${tab.perspectives.map(p => `<div class="card"><h3>${icon('people', 16)}${esc(p.name)}</h3><p>${md(p.view, S)}</p></div>`).join('')}</div>` : ''}
      ${tab.alternatives?.length ? `<h2>Alternatives</h2><div class="cards">${tab.alternatives.map(a => `<div class="card"><h3>${icon('arrow-sync', 16)}${esc(a.name)}</h3><p>${md(a.when, S)}</p></div>`).join('')}</div>` : ''}
    </div>`;
  }

  // ---------- keyboard ----------
  bindKeys() {
    addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { this.stopAutoplay(); this.stepBy(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { this.stopAutoplay(); this.stepBy(-1); e.preventDefault(); }
      else if (e.key === ' ' && STEPPER_KINDS.has(this.route?.tab.kind)) { this.toggleAutoplay(); e.preventDefault(); }
      else if (e.key === 'r' || e.key === 'R') { if (STEPPER_KINDS.has(this.route?.tab.kind)) this.replay(); }
      else if (/^[1-9]$/.test(e.key)) { const t = this.tabs[+e.key - 1]; if (t) this.go(t.id, null, null); }
      else if (e.key === '/') { this.$('.search input').focus(); e.preventDefault(); }
    });
  }

  // ---------- search ----------
  bindSearch() {
    const input = this.$('.search input'), box = this.$('.search-results');
    const items = [];
    for (const n of this.nav.topics) if (!n.self) items.push({ title: n.title, kind: 'topic', href: n.href });
    for (const t of this.tabs) {
      if (t.kind === 'stepper') t.steps.forEach((s, i) => items.push({ title: s.title, kind: t.title, href: this.hashFor(t.id, null, i + 1) }));
      if (t.kind === 'lessons') t.lessons.forEach(l => l.steps.forEach((s, i) => items.push({ title: s.title, kind: l.title, href: this.hashFor(t.id, l.id, i + 1) })));
    }
    const run = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.classList.remove('open'); return; }
      const hits = items.filter(it => it.title.toLowerCase().includes(q)).slice(0, 12);
      box.innerHTML = hits.length ? hits.map(h => h.href ? `<a href="${esc(h.href)}">${esc(h.title)}<small>${esc(h.kind)}</small></a>`
        : '').join('') : '<div class="empty">No matches</div>';
      box.classList.add('open');
      box.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => { input.value = ''; box.classList.remove('open'); }));
    };
    input.addEventListener('input', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; box.classList.remove('open'); input.blur(); }
      if (e.key === 'Enter') box.querySelector('a')?.click();
    });
    addEventListener('click', e => { if (!e.target.closest('.search')) box.classList.remove('open'); });
  }
}

const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
