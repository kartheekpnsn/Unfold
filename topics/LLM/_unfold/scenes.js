// Scenes for "Large Language Models". State-based: render(state, prev, kit) draws the whole picture for one step.
// Colour meaning (shared across Unfold): yellow = query / being looked at, blue = keys and normal items,
// green = values / added / kept, red = removed or failure. The residual stream uses a fixed purple hex.

const RESID = '#8661C5';
const HEADS = ['blue', 'blue-ink', 'blue', 'blue-ink', 'blue', 'blue-ink', 'blue', 'blue-ink'];

function softmax(xs, tau = 1) {
  const z = xs.map(x => x / tau), m = Math.max(...z);
  const e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / s);
}
const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

function lock(kit, key, cx, cy, color = 'muted') {
  kit.path(key + '-a', { d: `M${cx - 6},${cy - 2} v-5 a6,6 0 0 1 12,0 v5`, stroke: color, width: 2.2 });
  kit.rect(key + '-b', { x: cx - 9, y: cy - 3, w: 18, h: 14, r: 3, fill: color, stroke: 'none' });
}

// ---------- ELI5: the filing cabinet ----------
const E_WORDS = ['The', 'cat', 'sat', 'on', 'the'];
const E_TAGS = ['starter', 'animal', 'action', 'place', 'noun next'];
const E_CARDS = ['opens', 'fur, pet', 'resting', 'a surface', 'one thing'];
const eW = 92, eGap = 10, eX = i => -301 + i * (eW + eGap), eCx = i => eX(i) + eW / 2;
const eli5Cabinet = {
  mode: 'svg',
  label: 'Attention as a filing cabinet: a question, folder labels and a blend of contents',
  render(s, prev, kit) {
    kit.begin();
    const st = s.stage || 'hook', names = !!s.showLabels;
    const W = s.weights || [0.05, 0.15, 0.3, 0.4, 0.1];
    const rowY = 0, asking = st !== 'hook';
    if (s.caption) kit.text('caption', { x: 0, y: -222, text: s.caption, size: 15, weight: 600, color: 'ink-2' });

    // word chips
    E_WORDS.forEach((w, i) => {
      const me = i === 4 && asking;
      kit.rect('w' + i, { x: eX(i), y: rowY, w: eW, h: 40, r: 10, fill: me ? 'yellow-soft' : 'surface', stroke: me ? 'yellow' : 'line-strong', strokeWidth: me ? 2 : 1, label: w, labelSize: 16, mono: true });
    });
    // the next (future) slot
    const locked = st === 'blend' || st === 'names';
    kit.rect('w5', { x: eX(5), y: rowY, w: eW, h: 40, r: 10, fill: 'surface-2', stroke: locked ? 'muted' : 'blue', dashed: true, label: locked ? '' : '?', labelColor: 'blue-ink', labelSize: 18 });
    if (locked) {
      lock(kit, 'lock', eCx(5), rowY + 18);
      kit.text('lock-t', { x: eCx(5), y: rowY + 58, text: names ? 'causal mask' : 'later: locked', size: 12, weight: 700, color: names ? 'ink' : 'muted' });
    }

    if (st === 'hook') {
      // candidate fan
      const cands = s.candidates || [];
      cands.forEach((c, i) => {
        const y = -165 + i * 36;
        kit.rect('cand-' + c.tok, { x: 40, y, w: 70, h: 28, r: 8, fill: i === 0 ? 'green-soft' : 'surface', stroke: i === 0 ? 'green' : 'line-strong', label: c.tok, mono: true, labelSize: 13, delay: i * 80 });
        kit.rect('candbar-' + c.tok, { x: 120, y: y + 6, w: c.p * 360, h: 16, r: 4, fill: i === 0 ? 'green' : 'blue', stroke: 'none', enter: 'grow', delay: i * 80 });
        kit.text('candv-' + c.tok, { x: 128 + c.p * 360, y: y + 14, text: fmt(c.p), size: 12, mono: true, anchor: 'start', color: 'ink-2' });
      });
      kit.sarrow('fan-arrow', { x1: eCx(5) + 20, y1: rowY - 4, x2: eCx(5) + 20, y2: -165 + cands.length * 36 - 4, color: 'blue' });
      kit.text('loop-t', { x: 0, y: 110, text: 'pick one → add it to the end → read everything again → repeat', size: 14, weight: 600, color: 'ink-2' });
      kit.text('illus', { x: 40, y: -165 + cands.length * 36 + 12, text: 'illustrative scores', size: 11, color: 'muted', anchor: 'start' });
    }

    if (asking) {
      // sticky note: the question
      kit.rect('note', { x: eX(4) - 20, y: -96, w: eW + 40, h: 62, r: 6, fill: 'yellow', stroke: 'yellow-ink', label: names ? 'Q (query)\nwhat am I\nsitting on?' : 'what am I\nsitting on?', labelSize: 12, labelColor: '#1B1B1F', layer: 3 });
      // folder labels on every word
      E_WORDS.forEach((w, i) => {
        kit.rect('tag' + i, { x: eX(i) + 6, y: rowY + 48, w: eW - 12, h: 24, r: 12, fill: 'blue-soft', stroke: 'blue', label: (names ? 'K: ' : '') + E_TAGS[i], labelSize: 11, labelColor: 'blue-ink', delay: i * 60 });
      });
    }
    if (st === 'query') {
      E_WORDS.forEach((w, i) => {
        if (i === 4) return;
        kit.sarrow('match' + i, { x1: eCx(i), y1: rowY - 4, x2: eX(4) - 18, y2: -60 + i * 6, color: 'yellow-ink', width: 1 + W[i] * 14, curve: -24 - i * 4, delay: i * 80 });
      });
      kit.text('match-t', { x: -150, y: -130, text: 'thicker line = better match', size: 12, weight: 600, color: 'muted' });
    }
    if (st === 'blend' || st === 'names') {
      E_WORDS.forEach((w, i) => {
        const y = rowY + 86;
        kit.rect('card' + i, { x: eX(i) + 4, y, w: eW - 8, h: 40, r: 6, fill: 'green-soft', stroke: 'green', label: (names ? 'V: ' : '') + E_CARDS[i] + '\n' + Math.round(W[i] * 100) + '%', labelSize: 11, labelColor: 'green-ink', delay: i * 60 });
        kit.sarrow('flow' + i, { x1: eCx(i), y1: y + 42, x2: eX(3) + 70 + i * 22, y2: rowY + 164, color: 'green', width: 1 + W[i] * 10, curve: i < 3 ? -20 : 0, delay: i * 80 });
      });
      kit.rect('blended', { x: eX(3) + 44, y: rowY + 166, w: 150, h: 34, r: 8, fill: 'green', stroke: 'green-ink', label: '"the" + context', labelColor: '#ffffff', labelSize: 12, delay: 300 });
      kit.text('blend-t', { x: -150, y: -140, text: 'take a mix of every earlier folder', size: 13, weight: 600, color: 'green-ink' });
    }
    if (names) {
      kit.text('resid-t', { x: -301, y: 178, text: 'residual stream: each word’s notebook,\nadded to by every layer', size: 12, weight: 700, color: RESID, anchor: 'start' });
      kit.line('resid', { x1: -301, y1: 204, x2: -40, y2: 204, color: RESID, width: 3 });
      kit.text('attn-t', { x: -150, y: -112, text: 'this whole mixing step = attention', size: 13, weight: 700, color: 'ink' });
    }
    kit.end();
  },
};

// ---------- Core: the whole pipeline ----------
const STAGES = [['text', 'Text'], ['tokens', 'Tokens'], ['embed', 'Embed + pos'], ['block', 'Block × L'], ['head', 'LM head'], ['softmax', 'Softmax'], ['sample', 'Sample']];
const LIT = { tokens: ['tokens'], embed: ['embed'], pos: ['embed'], 'attn-score': ['block'], 'attn-blend': ['block'], block: ['block'], head: ['head', 'softmax'], loop: ['sample'], window: ['tokens'] };
const SB = 82, SG = 10, SX = i => -317 + i * (SB + SG), SY = -228;
const ROWY = i => -118 + i * 50;          // column layout rows (chip top)
const SCORES = [[0.9], [0.4, 1.2], [0.3, 1.4, 0.8], [0.1, 0.7, 1.5, 0.6], [0.2, 1.1, 1.6, 1.9, 0.5]];
const GX = j => -205 + j * 50;

function pipelineStrip(s, kit) {
  const lit = LIT[s.active] || [];
  const warn = s.active === 'window';
  STAGES.forEach(([id, name], i) => {
    const on = lit.includes(id);
    kit.rect('st-' + id, { x: SX(i), y: SY, w: SB, h: 32, r: 8, fill: on ? (warn ? 'red-soft' : 'blue') : 'surface', stroke: on ? (warn ? 'red' : 'blue-ink') : 'line-strong', label: name, labelSize: 12, labelColor: on ? (warn ? 'red-ink' : '#ffffff') : 'ink-2', layer: 2 });
    if (i < STAGES.length - 1) kit.sarrow('st-ar-' + i, { x1: SX(i) + SB + 1, y1: SY + 16, x2: SX(i + 1) - 1, y2: SY + 16, color: 'muted', width: 1.2 });
  });
  if (s.shape && lit.length) {
    const i = STAGES.findIndex(([id]) => id === lit[lit.length - 1]);
    kit.text('shape-badge', { x: Math.max(-260, Math.min(260, SX(i) + SB / 2)), y: SY + 48, text: s.shape, size: 12, weight: 700, mono: true, color: warn ? 'red-ink' : 'blue-ink' });
  }
  if (s.active === 'loop') kit.sarrow('st-loop', { x1: SX(6) + SB / 2, y1: SY + 34, x2: SX(1) + SB / 2, y2: SY + 36, color: 'green-ink', width: 2, curve: -34, label: 'append, run again', ldy: 34 });
}

const llmPipeline = {
  mode: 'svg',
  label: 'One forward pass of a decoder-only language model, stage by stage',
  render(s, prev, kit) {
    kit.begin();
    pipelineStrip(s, kit);
    const a = s.active || 'tokens';
    const toks = s.tokens || ['The', 'cat', 'sat', 'on', 'the'];
    const ids = s.ids || [];
    const column = ['embed', 'pos', 'attn-score', 'attn-blend', 'block', 'head'].includes(a);
    const N = toks.length;

    // token chips (persist across steps so they glide between layouts)
    if (a === 'tokens') {
      kit.text('rawtext', { x: 0, y: -128, text: '"' + toks.join(' ') + '"', size: 18, weight: 600, mono: true });
      kit.sarrow('split', { x1: 0, y1: -110, x2: 0, y2: -40, color: 'muted', label: 'BPE split', ldx: 44, ldy: 0 });
      const w = 90, g = 14, x0 = -(N * w + (N - 1) * g) / 2;
      toks.forEach((t, i) => {
        kit.rect('tok-' + i, { x: x0 + i * (w + g), y: -20, w, h: 40, r: 10, fill: 'surface', stroke: 'blue', label: t, labelSize: 16, mono: true, delay: i * 70 });
        kit.text('id-' + i, { x: x0 + i * (w + g) + w / 2, y: 40, text: String(ids[i] ?? ''), size: 15, weight: 700, mono: true, color: 'blue-ink', delay: i * 70 });
      });
      kit.text('ids-t', { x: 0, y: 70, text: 'example ids', size: 12, color: 'muted' });
      kit.text('vocab-t', { x: 0, y: 140, text: 'vocabulary: 50,257 subword tokens (GPT-2)', size: 14, weight: 600, color: 'ink-2' });
    } else if (column) {
      const focus = a === 'head';
      toks.forEach((t, i) => kit.rect('tok-' + i, { x: -310, y: ROWY(i) + 4, w: 72, h: 36, r: 9, fill: 'surface', stroke: (a.startsWith('attn') && i === N - 1) ? 'yellow' : 'blue', strokeWidth: (a.startsWith('attn') && i === N - 1) ? 2 : 1, label: t, labelSize: 14, mono: true, opacity: focus && i < N - 1 ? 0.3 : 1 }));
    }

    if (a === 'embed' || a === 'pos') {
      toks.forEach((t, i) => {
        for (let j = 0; j < 8; j++) kit.rect(`vec-${i}-${j}`, { x: -220 + j * 21, y: ROWY(i) + 8, w: 18, h: 28, r: 3, fill: 'blue', stroke: 'none', opacity: 0.25 + 0.7 * Math.abs(Math.sin(i * 3.1 + j * 1.7)), delay: i * 60 });
        if (a === 'pos') kit.rect('pos-' + i, { x: -48, y: ROWY(i) + 8, w: 46, h: 28, r: 6, fill: 'green-soft', stroke: 'green', label: '+p' + i, labelSize: 12, labelColor: 'green-ink', mono: true, enter: 'grow', delay: i * 70 });
      });
      kit.text('x-lab', { x: -136, y: ROWY(N) + 6, text: 'X: one row per token', size: 12, weight: 700, color: 'blue-ink' });
    }
    if (a === 'embed') {
      kit.rect('E', { x: 130, y: -130, w: 120, h: 280, r: 8, fill: 'surface-2', stroke: 'line-strong' });
      kit.text('E-t', { x: 190, y: 168, text: 'E  [50,257 × d]', size: 13, weight: 700, mono: true });
      toks.forEach((t, i) => {
        const y = -112 + i * 56;
        kit.rect('Erow-' + i, { x: 132, y, w: 116, h: 10, r: 2, fill: 'yellow', stroke: 'none', delay: i * 60 });
        kit.text('Erow-t' + i, { x: 260, y: y + 5, text: 'row ' + (ids[i] ?? i), size: 11, mono: true, anchor: 'start', color: 'yellow-ink' });
        kit.sarrow('Earr-' + i, { x1: 128, y1: y + 5, x2: -48, y2: ROWY(i) + 22, color: 'muted', width: 1.2, curve: 10, delay: i * 60 });
      });
    }
    if (a === 'pos') {
      kit.circle('rope', { x: 170, y: -20, r: 46, fill: 'none', stroke: 'line-strong', strokeWidth: 2 });
      kit.sarrow('rope-v1', { x1: 170, y1: -20, x2: 216, y2: -20, color: 'blue', width: 2 });
      kit.sarrow('rope-v2', { x1: 170, y1: -20, x2: 200, y2: -55, color: 'green', width: 2.5 });
      kit.path('rope-arc', { d: 'M200,-20 A30,30 0 0 0 188,-44', stroke: 'yellow-ink', width: 2 });
      kit.text('rope-t', { x: 170, y: 50, text: 'or RoPE: rotate q and k\nby an angle set by position', size: 12, weight: 600, color: 'ink-2' });
      kit.text('add-t', { x: 170, y: -110, text: 'added: sinusoidal or learned', size: 12, weight: 600, color: 'green-ink' });
    }

    if (a === 'attn-score' || a === 'attn-blend') {
      const blend = a === 'attn-blend';
      const w = softmax(SCORES[N - 1]);
      toks.forEach((t, j) => kit.text('kcol-' + j, { x: GX(j) + 22, y: -132, text: t, size: 12, weight: 700, mono: true, color: 'blue-ink' }));
      kit.text('k-lab', { x: GX(0) - 10, y: -150, text: 'keys →', size: 11, color: 'muted', anchor: 'start' });
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const fut = j > i, last = i === N - 1;
        const val = fut ? '-inf' : (blend && last ? fmt(w[j]) : fmt(SCORES[i][j], 1));
        kit.rect(`cell-${i}-${j}`, {
          x: GX(j), y: ROWY(i), w: 44, h: 44, r: 4,
          fill: fut ? 'ink-2' : last ? (blend ? 'green-soft' : 'yellow-soft') : 'blue-soft',
          stroke: fut ? 'ink-2' : last ? (blend ? 'green' : 'yellow') : 'line-strong',
          label: val, labelSize: 11, mono: true, labelColor: fut ? 'surface' : 'ink',
          opacity: blend && !last ? 0.3 : 1, delay: (i + j) * 30,
        });
      }
      if (!blend) {
        kit.text('mask-t', { x: 190, y: -60, text: 'upper triangle = future\nmasked to -inf', size: 13, weight: 700, color: 'ink-2' });
        kit.text('row-t', { x: 190, y: 104, text: '← last row: "the" scores\nitself and earlier tokens', size: 13, weight: 700, color: 'yellow-ink' });
      } else {
        kit.text('w-t', { x: GX(2) + 22, y: ROWY(N) + 18, text: 'softmax: weights sum to 1', size: 12, weight: 700, color: 'green-ink' });
        toks.forEach((t, j) => {
          kit.rect('v-' + j, { x: 60, y: ROWY(j) + 8, w: 76, h: 28, r: 6, fill: 'green-soft', stroke: 'green', label: 'v · ' + t, labelSize: 11, labelColor: 'green-ink', mono: true, delay: j * 60 });
          kit.sarrow('vflow-' + j, { x1: 138, y1: ROWY(j) + 22, x2: 218, y2: 150, color: 'green', width: 1 + w[j] * 16, curve: 12, delay: j * 80 });
        });
        kit.rect('out', { x: 210, y: 150, w: 100, h: 44, r: 10, fill: 'green', stroke: 'green-ink', strokeWidth: 2, label: 'new "the"', labelColor: '#ffffff', labelSize: 13, mono: true });
        kit.text('out-t', { x: 260, y: 212, text: 'Σ wⱼ vⱼ  [1 × d]', size: 12, weight: 700, mono: true, color: 'green-ink' });
      }
    }

    if (a === 'block') {
      toks.forEach((t, i) => {
        const cy = ROWY(i) + 22;
        kit.line('lane-' + i, { x1: -238, y1: cy, x2: 60, y2: cy, color: RESID, width: 3 });
        kit.circle('plus1-' + i, { x: -82, y: cy, r: 10, fill: 'surface', stroke: RESID, strokeWidth: 2, label: '+', labelColor: RESID, labelSize: 14 });
        kit.rect('ffn-' + i, { x: -58, y: cy - 15, w: 62, h: 30, r: 6, fill: 'surface', stroke: 'blue', label: 'FFN', labelSize: 12, labelColor: 'blue-ink', delay: i * 50 });
        kit.circle('plus2-' + i, { x: 28, y: cy, r: 10, fill: 'surface', stroke: RESID, strokeWidth: 2, label: '+', labelColor: RESID, labelSize: 14 });
      });
      kit.rect('attnbox', { x: -205, y: ROWY(0) + 2, w: 96, h: ROWY(N - 1) - ROWY(0) + 40, r: 8, fill: 'surface', stroke: 'blue', strokeWidth: 2, layer: 1 });
      for (let h = 0; h < 4; h++) kit.rect('head-' + h, { x: -199 + h * 22, y: ROWY(0) + 10, w: 18, h: ROWY(N - 1) - ROWY(0) + 24, r: 4, fill: HEADS[h], stroke: 'none', opacity: 0.75, layer: 1.1, delay: h * 70 });
      kit.text('attn-lab', { x: -157, y: -140, text: 'attention · h heads', size: 12, weight: 700, color: 'blue-ink' });
      kit.text('ffn-lab', { x: -27, y: -140, text: 'per position', size: 12, weight: 700, color: 'blue-ink' });
      kit.rect('xL', { x: -246, y: -156, w: 316, h: 300, r: 12, fill: 'none', stroke: 'muted', dashed: true });
      kit.text('xL-t', { x: 98, y: 130, text: '× L', size: 18, weight: 700, mono: true, color: 'ink' });
      kit.text('resid-lab', { x: -100, y: 170, text: 'residual stream', size: 12, weight: 700, color: RESID });
      kit.text('llama', { x: 195, y: -40, text: 'LLaMA-7B\nL = 32 layers\nh = 32 heads\nd = 4,096', size: 14, weight: 600, mono: true, color: 'ink-2' });
      kit.text('mix-t', { x: 195, y: 70, text: 'only attention moves\ninformation between\npositions', size: 12, weight: 600, color: 'muted' });
    }

    if (a === 'head') {
      const cy = ROWY(N - 1) + 22;
      kit.rect('hvec', { x: -228, y: cy - 16, w: 70, h: 32, r: 6, fill: 'blue', stroke: 'blue-ink', label: 'h [1×d]', labelColor: '#ffffff', labelSize: 11, mono: true });
      kit.sarrow('h-to-l', { x1: -156, y1: cy, x2: -114, y2: 60, color: 'muted', curve: 10 });
      kit.text('h-to-l-t', { x: -172, y: 50, text: '× Eᵀ', size: 13, weight: 700, mono: true, color: 'ink-2' });
      const P = s.probs || [];
      const base = 120;
      kit.line('lbase', { x1: -112, y1: base, x2: 62, y2: base, color: 'line-strong' });
      kit.line('pbase', { x1: 120, y1: base, x2: 315, y2: base, color: 'line-strong' });
      kit.text('l-title', { x: -25, y: -140, text: 'logits  [1 × 50,257]', size: 12, weight: 700, mono: true });
      kit.text('p-title', { x: 215, y: -140, text: 'probabilities', size: 12, weight: 700 });
      kit.sarrow('softmax-ar', { x1: 66, y1: 20, x2: 116, y2: 20, color: 'muted', label: 'softmax', ldy: -14 });
      P.forEach((o, i) => {
        const lh = o.logit / 4.5 * 200, ph = o.p * 400;
        kit.rect('lbar-' + i, { x: -108 + i * 42, y: base - lh, w: 30, h: lh, r: 3, fill: 'blue', stroke: 'none', delay: i * 70 });
        kit.text('lval-' + i, { x: -93 + i * 42, y: base - lh - 10, text: o.logit.toFixed(1), size: 11, mono: true });
        kit.rect('pbar-' + i, { x: 126 + i * 40, y: base - ph, w: 32, h: ph, r: 3, fill: i === 0 ? 'green' : 'blue', stroke: 'none', delay: 200 + i * 70 });
        kit.text('pval-' + i, { x: 142 + i * 40, y: base - ph - 10, text: fmt(o.p), size: 11, mono: true });
        kit.text('lname-' + i, { x: -93 + i * 42, y: base + 14, text: o.tok, size: 10, mono: true, color: 'muted' });
        if (i === 0) kit.rect('tok-' + N, { x: 120, y: base + 4, w: 44, h: 22, r: 6, fill: 'green-soft', stroke: 'green', label: o.tok, labelSize: 11, mono: true });
        else kit.text('pname-' + i, { x: 142 + i * 40, y: base + 14, text: o.tok, size: 10, mono: true, color: 'muted' });
      });
      kit.text('more-l', { x: -25, y: base + 40, text: '… 50,257 total', size: 11, color: 'muted' });
      kit.text('more-p', { x: 215, y: base + 40, text: '… rest share the remainder', size: 11, color: 'muted' });
      kit.text('illus', { x: 215, y: base + 62, text: 'illustrative values', size: 11, color: 'muted' });
    }

    if (a === 'loop' || a === 'window') {
      const win = a === 'window';
      if (!win) {
        const w = 78, g = 10, x0 = -(toks.length * w + (toks.length - 1) * g) / 2;
        toks.forEach((t, i) => {
          const fresh = i === toks.length - 1;
          kit.rect('tok-' + i, { x: x0 + i * (w + g), y: -140, w, h: 36, r: 9, fill: fresh ? 'green-soft' : 'surface', stroke: fresh ? 'green' : 'blue', strokeWidth: fresh ? 2 : 1, label: t, labelSize: 14, mono: true });
        });
      } else {
        kit.rect('inbar-bg', { x: -300, y: -140, w: 560, h: 30, r: 6, fill: 'surface-2', stroke: 'line-strong' });
        kit.rect('inbar', { x: -300, y: -140, w: 560 * Math.min(1, (s.kvLen || 0) / (s.limit || 1024)), h: 30, r: 6, fill: 'blue-soft', stroke: 'blue', enter: 'grow', label: `${(s.kvLen || 0).toLocaleString('en-US')} / ${(s.limit || 1024).toLocaleString('en-US')} tokens`, labelSize: 12, mono: true });
        kit.line('limit', { x1: 260, y1: -152, x2: 260, y2: -98, color: 'red', width: 3, dashed: true });
        kit.text('limit-t', { x: 260, y: -88, text: 'context limit', size: 12, weight: 700, color: 'red-ink' });
      }
      // KV cache for one layer (repeated per layer)
      const n = Math.min(s.kvLen || 0, 12), cw = 24, cg = 5, kx = -220;
      kit.text('kv-title', { x: kx, y: -64, text: 'KV cache (one layer; every layer keeps its own)', size: 12, weight: 700, anchor: 'start', color: 'ink-2' });
      kit.text('Klab', { x: kx - 14, y: -14, text: 'K', size: 15, weight: 700, mono: true, color: 'blue-ink' });
      kit.text('Vlab', { x: kx - 14, y: 44, text: 'V', size: 15, weight: 700, mono: true, color: 'green-ink' });
      for (let i = 0; i < n; i++) {
        const fresh = !win && i === n - 1;
        kit.rect('kc-' + i, { x: kx + i * (cw + cg), y: -34, w: cw, h: 40, r: 4, fill: 'blue', stroke: fresh ? 'yellow' : 'blue-ink', strokeWidth: fresh ? 3 : 1, delay: i * 25 });
        kit.rect('vc-' + i, { x: kx + i * (cw + cg), y: 24, w: cw, h: 40, r: 4, fill: 'green', stroke: fresh ? 'yellow' : 'green-ink', strokeWidth: fresh ? 3 : 1, delay: i * 25 });
      }
      if (win) kit.text('kv-more', { x: kx + n * (cw + cg) + 8, y: 15, text: '… ×' + (s.kvLen || 0).toLocaleString('en-US'), size: 13, weight: 700, mono: true, anchor: 'start', color: 'red-ink' });
      if (!win) {
        kit.rect('qcard', { x: 120, y: -34, w: 70, h: 40, r: 6, fill: 'yellow-soft', stroke: 'yellow-ink', dashed: true, label: 'new q', labelSize: 12, mono: true, labelColor: 'yellow-ink' });
        kit.text('q-t', { x: 155, y: 24, text: 'used once,\nnot cached', size: 11, weight: 600, color: 'muted' });
        kit.text('new-t', { x: kx, y: 100, text: 'this step computes q, k, v for the new token only', size: 12, weight: 600, anchor: 'start', color: 'ink-2' });
      }
      // memory gauge
      const frac = Math.min(1, (s.kvLen || 0) / (s.limit || 1024));
      kit.rect('gauge-bg', { x: 250, y: -40, w: 34, h: 170, r: 6, fill: 'surface-2', stroke: 'line-strong' });
      const gh = Math.max(4, 170 * frac);
      kit.rect('gauge', { x: 250, y: 130 - gh, w: 34, h: gh, r: 6, fill: frac > 0.8 ? 'red' : 'green', stroke: 'none' });
      kit.text('gauge-t', { x: 267, y: 150, text: 'KV memory', size: 11, weight: 700, color: frac > 0.8 ? 'red-ink' : 'muted' });
      if (win) kit.text('lin-t', { x: kx, y: 140, text: 'grows by one K and one V per token, per layer', size: 12, weight: 600, anchor: 'start', color: 'red-ink' });
    }
    kit.end();
  },
};

// ---------- Technical: exact attention arithmetic ----------
const AG_TOK = ['The', 'cat', 'sat', 'on', 'the'];
const AG_RAW = [[7.2], [3.2, 9.6], [2.4, 11.2, 6.4], [0.8, 5.6, 12, 4.8], [1.6, 8.8, 12.8, 15.2, 4.0]]; // raw q·k, d_k = 64
const AG_V = [[0.2, -0.5, 0.9, 0.1], [0.8, 0.3, -0.2, 0.6], [-0.1, 0.7, 0.4, -0.3], [0.5, -0.2, 0.1, 0.9], [0.3, 0.4, -0.6, 0.2]];
const AGX = j => -262 + j * 46, AGY = i => -150 + i * 46;
const attnGrid = {
  mode: 'svg',
  label: 'Scaled dot-product attention: scores, mask, softmax and the value blend',
  render(s, prev, kit) {
    kit.begin();
    const view = s.view || 'full', scaled = s.scaled !== false, masked = s.masked !== false;
    const r = s.highlightRow ?? 4;
    const rowScores = i => AG_RAW[i].map(v => (scaled ? v / 8 : v));
    if (s.caption) kit.text('caption', { x: 0, y: -222, text: s.caption, size: 15, weight: 600, color: 'ink-2' });

    if (view === 'full' || view === 'scale') {
      AG_TOK.forEach((t, j) => kit.text('col-' + j, { x: AGX(j) + 20, y: -166, text: t, size: 11, weight: 700, mono: true, color: 'blue-ink' }));
      AG_TOK.forEach((t, i) => kit.text('row-' + i, { x: AGX(0) - 8, y: AGY(i) + 20, text: t, size: 11, weight: 700, mono: true, anchor: 'end', color: i === r ? 'yellow-ink' : 'ink-2' }));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const fut = j > i, hl = i === r;
        kit.rect(`c-${i}-${j}`, {
          x: AGX(j), y: AGY(i), w: 40, h: 40, r: 4,
          fill: fut ? (masked ? 'ink-2' : 'surface') : hl ? 'yellow-soft' : 'blue-soft',
          stroke: fut ? (masked ? 'ink-2' : 'line') : hl ? 'yellow' : 'line-strong',
          label: fut ? (masked ? '-inf' : '') : fmt(rowScores(i)[j], 1), labelSize: 11, mono: true, labelColor: fut ? 'surface' : 'ink', delay: (i + j) * 25,
        });
      }
      kit.text('grid-t', { x: AGX(2) + 20, y: AGY(5) + 12, text: scaled ? 'QKᵀ / √d_k  (d_k = 64)' : 'QKᵀ  (unscaled)', size: 12, weight: 700, mono: true });
    }
    const w = softmax(rowScores(r));
    if (view === 'full') {
      kit.text('w-title', { x: 20, y: -166, text: 'w = softmax(row)', size: 11, weight: 700, color: 'yellow-ink' });
      for (let j = 0; j < 5; j++) {
        const on = j <= r;
        kit.rect('w-' + j, { x: -20, y: AGY(j) + 10, w: on ? Math.max(2, w[j] * 140) : 2, h: 20, r: 3, fill: 'yellow', stroke: 'none', enter: 'grow', delay: j * 70 });
        kit.text('wv-' + j, { x: -14 + (on ? w[j] * 140 : 0), y: AGY(j) + 20, text: on ? fmt(w[j]) : '0', size: 11, mono: true, anchor: 'start' });
        AG_V[j].forEach((v, c) => kit.rect(`V-${j}-${c}`, { x: 120 + c * 45, y: AGY(j), w: 40, h: 40, r: 4, fill: 'green-soft', stroke: 'green', label: fmt(v, 1), labelSize: 11, mono: true, delay: j * 40 }));
      }
      kit.text('V-title', { x: 208, y: -166, text: 'V  [5 × d_v]', size: 11, weight: 700, mono: true, color: 'green-ink' });
      const out = [0, 1, 2, 3].map(c => w.reduce((acc, wj, j) => acc + (j <= r ? wj * AG_V[j][c] : 0), 0));
      out.forEach((v, c) => kit.rect('out-' + c, { x: 120 + c * 45, y: AGY(5) + 34, w: 40, h: 40, r: 4, fill: 'green', stroke: 'green-ink', label: fmt(v), labelSize: 11, mono: true, labelColor: '#ffffff', delay: 300 }));
      kit.text('out-t', { x: 110, y: AGY(5) + 54, text: 'out = w · V', size: 12, weight: 700, mono: true, anchor: 'end', color: 'green-ink' });
    }
    if (view === 'scale') {
      const raw = softmax(AG_RAW[r]), sc = softmax(AG_RAW[r].map(v => v / 8));
      kit.text('raw-t', { x: 165, y: -192, text: 'softmax without ÷√d_k', size: 12, weight: 700, color: 'red-ink' });
      kit.chart('raw-c', { x: 40, y: -160, w: 250, h: 100, values: raw, max: 1, labels: AG_TOK, showValues: true, decimals: 2, colors: raw.map(v => (v > 0.5 ? 'red' : 'line-strong')) });
      kit.text('sc-t', { x: 165, y: -18, text: 'softmax with ÷√d_k', size: 12, weight: 700, color: 'green-ink' });
      kit.chart('sc-c', { x: 40, y: -2, w: 250, h: 100, values: sc, max: 1, labels: AG_TOK, showValues: true, decimals: 2, colors: sc.map(() => 'green') });
      kit.text('mask-n', { x: 165, y: 160, text: 'mask: e^(-inf) = 0 weight\na score of 0 would still give e^0 = 1', size: 12, weight: 600, color: 'ink-2' });
    }
    if (view === 'heads') {
      const X0 = -280, SW = 70;
      kit.text('h-title', { x: 0, y: -190, text: 'x: d_model = 512', size: 13, weight: 700, mono: true });
      for (let h = 0; h < 8; h++) {
        kit.rect('slice-' + h, { x: X0 + h * SW, y: -172, w: SW - 2, h: 30, r: 4, fill: HEADS[h], stroke: 'none', label: '64', labelColor: '#ffffff', labelSize: 11, mono: true, delay: h * 60 });
        kit.sarrow('sl-ar-' + h, { x1: X0 + h * SW + 34, y1: -140, x2: X0 + h * SW + 34, y2: -104, color: 'muted', width: 1.2, delay: h * 60 });
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
          kit.rect(`mg-${h}-${i}-${j}`, { x: X0 + h * SW + 7 + j * 11, y: -98 + i * 11, w: 10, h: 10, r: 1, fill: j > i ? 'ink-2' : HEADS[h], stroke: 'none', opacity: j > i ? 0.8 : 0.35 + 0.6 * Math.abs(Math.sin(h * 1.3 + i * 0.7 + j * 2.1)), delay: h * 60 });
        }
        kit.text('hn-' + h, { x: X0 + h * SW + 34, y: -32, text: 'head ' + (h + 1), size: 10, color: 'muted' });
        kit.sarrow('cc-ar-' + h, { x1: X0 + h * SW + 34, y1: -20, x2: X0 + h * SW + 34, y2: 18, color: 'muted', width: 1.2 });
      }
      kit.rect('concat', { x: X0, y: 22, w: 8 * SW - 2, h: 30, r: 4, fill: 'surface', stroke: 'blue', label: 'Concat(head₁ … head₈)  [N × 512]', labelSize: 12, mono: true });
      kit.sarrow('wo-ar', { x1: 0, y1: 56, x2: 0, y2: 96, color: 'blue', label: '× W^O', ldx: 34, ldy: 0 });
      kit.rect('mhout', { x: X0, y: 100, w: 8 * SW - 2, h: 30, r: 4, fill: 'blue', stroke: 'blue-ink', label: 'MultiHead output  [N × 512]', labelColor: '#ffffff', labelSize: 12, mono: true });
      kit.text('dk-t', { x: 0, y: 170, text: 'd_k = 512 / 8 = 64   ·   LLaMA-7B: d = 4,096, 32 heads, 32 layers', size: 13, weight: 700, mono: true, color: 'ink-2' });
    }
    kit.end();
  },
};

// ---------- Technical: logits, temperature, top-k, top-p ----------
const LOGITS = [1.2, 0.9, 0.1, -0.5], LT = ['A', 'B', 'C', 'D'];
const PBASE = 150, PSCALE = 290, PX = i => 40 + i * 66;
const logitBars = {
  mode: 'svg',
  label: 'Logits turned into probabilities, reshaped by temperature, top-k and top-p',
  render(s, prev, kit) {
    kit.begin();
    const mode = s.mode || 'probs', tau = s.tau ?? 1;
    const det = mode === 'determinism';
    kit.rect('tau', { x: -90, y: -236, w: 180, h: 34, r: 17, fill: 'surface', stroke: mode === 'temp' || det ? 'yellow' : 'line-strong', strokeWidth: mode === 'temp' || det ? 2 : 1, label: det ? 'τ = 0 (greedy)' : `τ = ${tau}`, labelSize: 15, mono: true, layer: 5 });

    if (mode === 'logits' || mode === 'probs') {
      const zero = 30;
      kit.line('l-zero', { x1: -300, y1: zero, x2: -60, y2: zero, color: 'line-strong' });
      kit.text('l-title', { x: -180, y: -150, text: 'logits u', size: 13, weight: 700, mono: true });
      LOGITS.forEach((v, i) => {
        const h = Math.abs(v) * 90, x = -290 + i * 58;
        kit.rect('lg-' + i, { x, y: v >= 0 ? zero - h : zero, w: 40, h, r: 3, fill: 'blue', stroke: 'none', delay: i * 60 });
        kit.text('lgv-' + i, { x: x + 20, y: v >= 0 ? zero - h - 12 : zero + h + 12, text: v.toFixed(1), size: 12, mono: true, weight: 700 });
        kit.text('lgn-' + i, { x: x + 20, y: zero + 74, text: LT[i], size: 12, mono: true, color: 'muted' });
      });
    }
    if (mode === 'temp') {
      const taus = [1, 0.5, 0.1, 100];
      taus.forEach((t, k) => {
        const y = -175 + k * 84, on = t === tau;
        kit.rect('tb-' + k, { x: -312, y: y - 16, w: 250, h: 80, r: 8, fill: on ? 'yellow-soft' : 'surface', stroke: on ? 'yellow' : 'line', layer: -1 });
        kit.text('tl-' + k, { x: -302, y: y + 26, text: 'τ ' + t, size: 12, weight: 700, mono: true, anchor: 'start' });
        kit.chart('tc-' + k, { x: -240, y, w: 168, h: 40, values: softmax(LOGITS, t), max: 1, labels: LT, showValues: true, decimals: 2, colors: ['blue', 'blue', 'blue', 'blue'] });
      });
    }
    if (mode === 'logits' || mode === 'probs' || mode === 'temp') {
      kit.sarrow('sm-ar', { x1: -40, y1: 0, x2: 22, y2: 0, color: 'muted', label: 'softmax(u/τ)', ldy: -16, mono: true });
    }

    if (mode === 'logits' || mode === 'probs' || mode === 'temp') {
      const p = softmax(LOGITS, tau);
      kit.line('p-base', { x1: 30, y1: PBASE, x2: 300, y2: PBASE, color: 'line-strong' });
      kit.text('p-title', { x: 165, y: -175, text: 'probabilities', size: 13, weight: 700 });
      p.forEach((v, i) => {
        const h = v * PSCALE;
        kit.rect('p-' + i, { x: PX(i), y: PBASE - h, w: 50, h, r: 3, fill: i === 0 ? 'green' : 'blue', stroke: 'none', delay: i * 60 });
        kit.text('pv-' + i, { x: PX(i) + 25, y: PBASE - h - 12, text: fmt(v), size: 13, mono: true, weight: 700 });
        kit.text('pn-' + i, { x: PX(i) + 25, y: PBASE + 16, text: LT[i], size: 12, mono: true, color: 'muted' });
      });
    }

    if (mode === 'topk' || mode === 'topp') {
      const p = softmax(LOGITS, tau), k = s.k || 2, thr = s.p || 0.9;
      let cum = 0, keepP = 0;
      const cums = p.map(v => (cum += v));
      keepP = cums.findIndex(c => c >= thr - 1e-9) + 1;
      const panels = [['k', -300, k, `top-k, k = ${k}`, `always keeps ${k}`], ['p', 30, keepP, `top-p, p = ${thr}`, `keeps ${keepP} here: size adapts`]];
      const SC = 260;
      panels.forEach(([id, x0, keep, title, foot]) => {
        const kept = p.slice(0, keep), mass = kept.reduce((a, b) => a + b, 0);
        kit.text(id + '-title', { x: x0 + 130, y: -190, text: title, size: 13, weight: 700, mono: true });
        kit.line(id + '-base', { x1: x0, y1: PBASE, x2: x0 + 260, y2: PBASE, color: 'line-strong' });
        kit.text(id + '-foot', { x: x0 + 130, y: PBASE + 44, text: foot, size: 12, weight: 600, color: 'ink-2' });
        p.forEach((v, i) => {
          const x = x0 + 10 + i * 62, isKept = i < keep;
          const key = id === 'p' ? 'p-' + i : id + 'b-' + i;
          const h = (isKept ? v / mass : v) * SC;
          if (isKept) kit.rect(id + 'ghost-' + i, { x, y: PBASE - v * SC, w: 44, h: v * SC, r: 3, fill: 'none', stroke: 'muted', dashed: true, layer: 0.5 });
          kit.rect(key, { x, y: PBASE - h, w: 44, h, r: 3, fill: isKept ? 'green' : 'red-soft', stroke: isKept ? 'none' : 'red', dashed: !isKept, opacity: isKept ? 1 : 0.6, delay: i * 70 });
          kit.text(id + 'v-' + i, { x: x + 22, y: PBASE - h - 12, text: isKept ? fmt(v / mass) : 'cut', size: 12, mono: true, weight: 700, color: isKept ? 'ink' : 'red-ink' });
          kit.text(id + 'n-' + i, { x: x + 22, y: PBASE + 16, text: LT[i], size: 12, mono: true, color: 'muted' });
        });
        if (id === 'k') kit.line('k-cut', { x1: x0 + 10 + keep * 62 - 9, y1: PBASE + 4, x2: x0 + 10 + keep * 62 - 9, y2: -150, color: 'yellow-ink', width: 2, dashed: true });
        if (id === 'p') {
          let d = '';
          cums.forEach((c, i) => { d += (i ? 'L' : 'M') + (x0 + 32 + i * 62) + ',' + (PBASE - c * SC).toFixed(1); });
          kit.path('cum', { d, stroke: 'yellow-ink', width: 2 });
          cums.forEach((c, i) => kit.circle('cumpt-' + i, { x: x0 + 32 + i * 62, y: PBASE - c * SC, r: 4, fill: 'yellow', stroke: 'yellow-ink' }));
          kit.line('thr', { x1: x0, y1: PBASE - thr * SC, x2: x0 + 260, y2: PBASE - thr * SC, color: 'yellow-ink', dashed: true });
          kit.text('thr-t', { x: x0 + 4, y: PBASE - thr * SC + 12, text: 'running sum ≥ ' + thr, size: 11, weight: 700, color: 'yellow-ink', anchor: 'start' });
        }
      });
      kit.text('renorm', { x: 0, y: 214, text: 'kept bars renormalised (dashed = before); cut bars get probability 0', size: 12, color: 'muted' });
    }

    if (det) {
      const p = [1, 0, 0, 0];
      kit.line('p-base', { x1: -300, y1: PBASE, x2: -60, y2: PBASE, color: 'line-strong' });
      kit.text('p-title', { x: -180, y: -175, text: 'greedy: always the top token', size: 13, weight: 700 });
      p.forEach((v, i) => {
        const h = Math.max(2, v * PSCALE), x = -290 + i * 58;
        kit.rect('p-' + i, { x, y: PBASE - h, w: 44, h, r: 3, fill: i === 0 ? 'green' : 'line-strong', stroke: 'none' });
        kit.text('pv-' + i, { x: x + 22, y: PBASE - h - 12, text: v.toFixed(0), size: 13, mono: true, weight: 700 });
        kit.text('pn-' + i, { x: x + 22, y: PBASE + 16, text: LT[i], size: 12, mono: true, color: 'muted' });
      });
      kit.text('d1-t', { x: 95, y: -150, text: 'ordinary kernels: 80 unique', size: 12, weight: 700, color: 'red-ink' });
      for (let i = 0; i < 80; i++) kit.rect('out-' + i, { x: 25 + (i % 10) * 14, y: -130 + Math.floor(i / 10) * 14, w: 11, h: 11, r: 2, fill: 'red-soft', stroke: 'red', delay: i * 6 });
      kit.text('d2-t', { x: 260, y: -150, text: 'batch-invariant: 1', size: 12, weight: 700, color: 'green-ink' });
      kit.rect('out-one', { x: 235, y: -128, w: 50, h: 40, r: 6, fill: 'green-soft', stroke: 'green', label: '1', labelSize: 15, mono: true, labelColor: 'green-ink' });
      kit.text('d-foot', { x: 165, y: 30, text: 'same prompt · τ = 0 · 1,000 completions', size: 12, weight: 600, color: 'ink-2' });
      kit.text('d-why', { x: 165, y: 70, text: 'cause: results vary with server batch size', size: 12, weight: 600, color: 'muted' });
    }
    kit.end();
  },
};

// ---------- Technical: the KV cache ----------
const KVL = 3, KCW = 22, KCG = 4, KX = -200;
const kvStack = {
  mode: 'svg',
  label: 'The KV cache: per-layer stacks of past keys and values',
  render(s, prev, kit) {
    kit.begin();
    const n = s.step || 1, gqa = s.view === 'gqa', shown = Math.min(n, 12);
    for (let l = 0; l < KVL; l++) {
      const y = -190 + l * 86;
      kit.text('lay-' + l, { x: -305, y: y + 28, text: 'layer ' + (l + 1), size: 12, weight: 700, anchor: 'start', color: 'ink-2' });
      kit.text('kl-' + l, { x: KX - 10, y: y + 12, text: 'K', size: 12, weight: 700, mono: true, anchor: 'end', color: 'blue-ink' });
      kit.text('vl-' + l, { x: KX - 10, y: y + 44, text: 'V', size: 12, weight: 700, mono: true, anchor: 'end', color: 'green-ink' });
      for (let i = 0; i < shown; i++) {
        const fresh = i === shown - 1;
        kit.rect(`k-${l}-${i}`, { x: KX + i * (KCW + KCG), y, w: KCW, h: 26, r: 3, fill: 'blue', stroke: fresh ? 'yellow' : 'blue-ink', strokeWidth: fresh ? 3 : 1, delay: l * 80 });
        kit.rect(`v-${l}-${i}`, { x: KX + i * (KCW + KCG), y: y + 32, w: KCW, h: 26, r: 3, fill: 'green', stroke: fresh ? 'yellow' : 'green-ink', strokeWidth: fresh ? 3 : 1, delay: l * 80 });
      }
      kit.text('hx-' + l, { x: KX + shown * (KCW + KCG) + 8, y: y + 28, text: gqa ? '× 2 KV heads' : '× 8 heads', size: 12, weight: 700, mono: true, anchor: 'start', color: gqa ? 'green-ink' : 'ink-2' });
    }
    if (s.showQ) {
      kit.rect('qcard', { x: 200, y: -190, w: 90, h: 58, r: 6, fill: 'yellow-soft', stroke: 'yellow-ink', dashed: true, label: 'q (new)', labelSize: 13, mono: true, labelColor: 'yellow-ink' });
      kit.text('q-t', { x: 245, y: -112, text: 'used, not cached', size: 11, weight: 600, color: 'muted' });
    }
    kit.text('shape', { x: 245, y: -60, text: '[batch, heads,\nseq_len, head_dim]', size: 11, weight: 700, mono: true, color: 'ink-2' });
    // heads sharing diagram
    for (let h = 0; h < 8; h++) {
      const qx = -300 + h * 34;
      const g = gqa ? Math.floor(h / 4) : h;
      const kvx = gqa ? -262 + g * 136 : qx;
      kit.rect('qh-' + h, { x: qx, y: 76, w: 26, h: 20, r: 4, fill: 'yellow', stroke: 'yellow-ink', label: 'q' + (h + 1), labelSize: 9, mono: true, labelColor: '#1B1B1F' });
      kit.line('ql-' + h, { x1: qx + 13, y1: 98, x2: kvx + 13, y2: 128, color: 'muted', width: 1.2 });
      kit.rect('kvk-' + h, { x: kvx, y: 130, w: 12, h: 22, r: 2, fill: 'blue', stroke: 'blue-ink' });
      kit.rect('kvv-' + h, { x: kvx + 14, y: 130, w: 12, h: 22, r: 2, fill: 'green', stroke: 'green-ink' });
    }
    kit.text('mode-t', { x: 150, y: 100, text: gqa ? 'GQA: 8 query heads\nshare 2 KV heads' : 'MHA: one K/V pair\nper query head', size: 13, weight: 700, color: gqa ? 'green-ink' : 'ink-2' });
    // memory gauge
    const per = gqa ? 2 : 8, full = 12 * KVL * 8, used = n * KVL * per, GW = 600;
    kit.text('mem-t', { x: -300, y: 182, text: `KV memory: ${n} tokens × ${KVL} layers × ${per} KV heads`, size: 12, weight: 700, anchor: 'start', color: 'ink-2' });
    kit.rect('mem-bg', { x: -300, y: 196, w: GW, h: 18, r: 6, fill: 'surface-2', stroke: 'line-strong' });
    if (gqa) kit.rect('mem-mha', { x: -300, y: 196, w: GW * (n * KVL * 8) / full, h: 18, r: 6, fill: 'none', stroke: 'muted', dashed: true, layer: 2 });
    kit.rect('mem', { x: -300, y: 196, w: Math.max(4, GW * used / full), h: 18, r: 6, fill: 'green', stroke: 'none' });
    if (gqa) kit.text('mem-mha-t', { x: -300 + GW * (n * KVL * 8) / full + 6, y: 222, text: 'MHA would need this', size: 11, color: 'muted', anchor: 'end' });
    kit.end();
  },
};

export default {
  'eli5-cabinet': eli5Cabinet,
  'llm-pipeline': llmPipeline,
  'attn-grid': attnGrid,
  'logit-bars': logitBars,
  'kv-stack': kvStack,
};
