// Scenes for "Stacks". Hand-written M1 reference lesson: the quality bar for generated topics.
// Each scene is state-based: render(state, prev, kit) draws the whole picture for one step.


// ---------- ELI5: a pile of plates ----------
const plates = {
  mode: 'svg',
  label: 'A pile of plates',
  view: { scale: 50, originY: 50, originX: -90 },
  render(s, prev, kit) {
    kit.begin();
    kit.plate('table', { x: -2, y: -2, w: 4, d: 4, color: 'surface-2', stroke: 'line-strong', label: s.tableLabel || 'TABLE' });
    const list = s.plates || [];
    list.forEach((p, i) => {
      const top = i === list.length - 1;
      const hl = s.highlightTop && top, fresh = s.hand === 'in' && top;
      kit.box('plate-' + p, {
        x: -1.3, y: -1.3, z: 0.02 + i * 0.3, w: 2.6, d: 2.6, h: 0.24,
        color: hl ? 'yellow' : fresh ? 'green' : 'surface', outline: hl ? 'yellow-ink' : fresh ? 'green-ink' : 'line-strong',
        topColor: hl ? 'yellow-soft' : fresh ? 'green-soft' : 'surface',
        label: top ? p : '', labelColor: 'ink-2', labelOn: 'top', labelSize: 16,
      });
      if (s.names?.[i]) kit.pointer('name-' + p, { x: 1.3, y: -1.3, z: 0.14 + i * 0.3, text: s.names[i], dx: 120 - i * 10, dy: -40 - i * 26, color: top ? 'blue-ink' : 'muted' });
    });
    const topZ = 0.02 + list.length * 0.3;
    if (s.hand === 'in') kit.arrow('hand', { from: [-3.6, 1.6, topZ + 2.6], to: [-1.3, 0.4, topZ + 0.5], color: 'green-ink', label: 'push: add on top', curve: -40, width: 2.5, ldx: -60, ldy: -30 });
    if (s.taken) {
      kit.box('plate-' + s.taken, { x: 1.4, y: -4.4, z: 0.6, w: 2.6, d: 2.6, h: 0.24, color: 'red-soft', outline: 'red-ink', topColor: 'red-soft', label: s.taken, labelColor: 'red-ink', labelOn: 'top', labelSize: 16, exit: 'fade' });
      kit.arrow('hand', { from: [0.6, -0.6, topZ + 0.4], to: [2.0, -3, 1.4], color: 'red-ink', label: 'pop: take from top', curve: -50, width: 2.5, ldx: 10, ldy: -40 });
    }
    if (s.caption) kit.text('caption', { x: 40, y: -215, text: s.caption, size: 16, weight: 600, color: 'ink-2' });
    kit.end();
  },
};

// ---------- Core: push / pop / peek with a "popped" tray ----------
// Colour meaning (same everywhere): green = just added, blue = resting, yellow = being looked at, red = removed.
const BOX = 1.5, H = 0.56, GAP = 0.06;
const stackMain = {
  mode: 'svg',
  label: 'Stack: push, pop and peek',
  view: { scale: 44, originY: 75, originX: -120 },
  render(s, prev, kit) {
    kit.begin();
    const stack = s.stack || [];
    const fresh = /^push/.test(s.op || '');
    kit.box('base', { x: -1.15, y: -1.15, z: 0, w: 2.3, d: 2.3, h: 0.16, color: 'line-strong', outline: 'line-strong', topColor: 'surface-2' });
    kit.label('base-label', { x: 1.15, y: 1.15, z: 0, text: 'STACK', size: 11, weight: 700, color: 'muted', dy: 16 });
    stack.forEach((v, i) => {
      const isTop = i === stack.length - 1;
      const col = isTop && s.peek ? 'yellow' : isTop && fresh ? 'green' : 'blue';
      kit.box('v-' + v, {
        x: -BOX / 2, y: -BOX / 2, z: 0.16 + i * (H + GAP), w: BOX, d: BOX, h: H,
        color: col, label: v, labelColor: col === 'yellow' ? '#1B1B1F' : '#ffffff', labelSize: 17,
      });
    });
    const topZ = 0.16 + stack.length * (H + GAP);
    if (stack.length) {
      kit.pointer('top', { x: BOX / 2, y: -BOX / 2, z: topZ - H / 2 - GAP, text: s.peek ? `top · peek → ${stack[stack.length - 1]}` : 'top', dx: 80, dy: -26, color: s.peek ? 'yellow-ink' : 'blue-ink' });
    } else {
      kit.pointer('top', { x: 0, y: 0, z: 0.16, text: 'top = none', dx: 80, dy: -26, color: 'muted' });
    }
    // popped tray to the right; popped items keep their key, so they glide out of the stack into the tray
    const popped = s.popped || [];
    const STEP = 1.65, slots = Math.max(4, popped.length);
    kit.plate('tray', { x: 2.3, y: -0.95 - (slots - 1) * STEP - 0.1, w: 1.7, d: (slots - 1) * STEP + BOX + 0.2, z: 0, color: 'surface', stroke: 'muted', dashed: true });
    kit.label('tray-label', { x: 2.3, y: -0.95 - (slots - 1) * STEP - 0.1, z: 0, text: 'POPPED (1st → last)', size: 11, weight: 700, color: 'muted', dy: -14 });
    popped.forEach((v, i) => kit.box('v-' + v, { x: 2.4, y: -0.95 - i * STEP, z: 0, w: BOX, d: BOX, h: 0.3, color: 'red', label: v, labelOn: 'top', labelColor: '#ffffff', labelSize: 15, delay: s.stagger ? i * 90 : 0 }));
    if (s.op) kit.rect('op', { x: -150, y: -228, w: 300, h: 40, r: 20, fill: s.error ? 'red-soft' : 'surface', stroke: s.error ? 'red' : 'line-strong', label: s.op, labelSize: 16, labelColor: s.error ? 'red-ink' : 'ink', mono: true, layer: 20 });
    if (s.error) kit.text('err', { x: 0, y: -170, text: s.error, size: 14, weight: 700, color: 'red-ink', mono: true, layer: 20 });
    kit.end();
  },
};

// ---------- Technical: array-backed stack ----------
const stackArray = {
  mode: 'svg',
  label: 'Array-backed stack',
  view: { scale: 46, originY: 40, originX: -30 },
  render(s, prev, kit) {
    kit.begin();
    const cap = s.capacity || 4, items = s.items || [];
    const x0 = -cap / 2 * 1.2;
    for (let i = 0; i < cap; i++) {
      const isNew = s.grew && i >= s.grew;
      kit.plate('slot-' + i, { x: x0 + i * 1.2, y: -0.55, w: 1.1, d: 1.1, z: 0, color: isNew ? 'green-soft' : 'surface', stroke: isNew ? 'green' : 'line-strong', dashed: isNew, enter: 'fade' });
      kit.label('idx-' + i, { x: x0 + i * 1.2 + 0.55, y: 0.55, z: 0, text: String(i), size: 12, color: 'muted', mono: true, dx: -10, dy: 14 });
    }
    items.forEach((v, i) => {
      const hl = s.highlight === i;
      kit.box('item-' + v, { x: x0 + i * 1.2 + 0.1, y: -0.45, z: 0, w: 0.9, d: 0.9, h: 0.7, color: hl ? 'green' : 'blue', label: v, labelOn: 'top', labelColor: '#ffffff', labelSize: 15 });
    });
    const t = items.length - 1;
    if (t >= 0) kit.pointer('top', { x: x0 + t * 1.2 + 0.55, y: -0.45, z: 0.7, text: `top = ${t}`, dx: 0, dy: -70, color: 'blue-ink' });
    else kit.pointer('top', { x: x0 + 0.55, y: -0.45, z: 0, text: 'top = -1 (empty)', dx: 0, dy: -70, color: 'muted' });
    kit.text('cap', { x: 0, y: 215, text: `size ${items.length} · capacity ${cap}`, size: 13, mono: true, color: 'muted' });
    if (s.note) kit.text('note', { x: 0, y: -195, text: s.note, size: 15, weight: 600, color: s.noteColor || 'ink-2' });
    kit.end();
  },
};

// ---------- Technical: the call stack ----------
const callStack = {
  mode: 'svg',
  label: 'The call stack',
  view: { scale: 34, originY: 150 },
  render(s, prev, kit) {
    kit.begin();
    const frames = s.frames || [];
    kit.box('floor', { x: -2.4, y: -1.4, z: 0, w: 4.8, d: 2.8, h: 0.15, color: 'line-strong', outline: 'line-strong', topColor: 'surface-2' });
    frames.forEach((f, i) => {
      const top = i === frames.length - 1;
      const over = s.overflow && i >= frames.length - 2;
      kit.box('f-' + i, { x: -2, y: -1, z: 0.15 + i * 0.62, w: 4, d: 2, h: 0.56, color: over ? 'red' : top ? 'blue' : 'surface-2', outline: over ? 'red-ink' : top ? 'blue-ink' : 'line-strong',
        topColor: over ? 'red-soft' : top ? 'blue-soft' : 'surface', label: f, labelColor: over || top ? '#ffffff' : 'ink-2', labelSize: 15, delay: s.stagger ? i * 60 : 0 });
    });
    if (s.returning) kit.pointer('ret', { x: 2, y: -1, z: 0.15 + frames.length * 0.62 + 0.4, text: s.returning, dx: 70, dy: -30, color: 'green-ink' });
    if (s.limit) {
      const [lx, ly] = kit.iso(-2.4, 1.4, 0.15 + s.limit * 0.62);
      const [rx, ry] = kit.iso(2.4, 1.4, 0.15 + s.limit * 0.62);
      kit.line('limit', { x1: lx - 30, y1: ly, x2: rx + 30, y2: ry, color: 'red', dashed: true, width: 2 });
      kit.text('limit-l', { x: rx + 36, y: ry, text: 'stack limit', size: 12, weight: 700, color: 'red-ink', anchor: 'start' });
    }
    if (s.note) kit.text('note', { x: 0, y: -205, text: s.note, size: 15, weight: 600, color: s.overflow ? 'red-ink' : 'ink-2' });
    kit.end();
  },
};

export default { plates, 'stack-main': stackMain, 'stack-array': stackArray, 'call-stack': callStack };
