# Scene cookbook

Read the two reference scene files first: `topics/Stacks/_unfold/scenes.js` (isometric SVG) and `topics/How-Do-Planes-Fly/_unfold/scenes.js` (three.js + SVG fallback + charts).

## The contract

```js
// <topic folder>/_unfold/scenes.js: no imports, no DOM at top level.
export default {
  'stack-main': {
    mode: 'svg',                         // 'svg' (default) or 'three'
    label: 'Stack: push and pop',        // accessible name of the stage
    view: { scale: 44, originX: -120, originY: 75 },   // optional projection setup
    mount(stage, kit) { /* once, when the scene first appears */ },
    render(state, prev, kit) { /* every step: draw the whole picture for `state` */ },
    // playground only:
    metrics(state) { return { size: 3 }; },
    note(state) { return 'One sentence with a citation [S1].'; },
  },
  'wing-3d': { mode: 'three', fallback: 'wing-2d', mount(stage, k3) {}, render(state, prev, k3) {} },
};
```

- `render` receives a **copy** of the step's `state`; `prev` is the previous step's state in the same scene (or `null`).
- The player calls `mount` once per scene instance, then `render` on every step that uses that scene. Switching to a different scene id unmounts the old one.
- Scenes are objects; `this` inside `mount`/`render` is the scene, so you can keep handles on `this` (see wing-3d).

## SVG kit: state-based drawing

```js
render(s, prev, kit) {
  kit.begin();                                           // start a frame
  kit.box('base', { x: -1.2, y: -1.2, z: 0, w: 2.4, d: 2.4, h: 0.16, color: 'line-strong' });
  s.stack.forEach((v, i) => kit.box('v-' + v, { x: -0.75, y: -0.75, z: 0.16 + i * 0.62, w: 1.5, d: 1.5, h: 0.56, color: 'blue', label: v }));
  kit.pointer('top', { x: 0.75, y: -0.75, z: …, text: 'top' });
  kit.end();                                             // diff + tween
}
```

**Keys are identity.** Same key in two frames → it tweens (position, size, colour, opacity). New key → it *enters* (drops in / fades in). Missing key → it *exits* (lifts and fades). So key by the thing's identity (`'v-' + value`, `'frame-' + i`), not by array position, if items move. A popped item that should glide into a "popped" tray must keep its key.

### Coordinates

- **World (isometric)**: `x` runs right-down, `y` runs left-down, `z` is up. 1 unit = `kit.scale` px (default 38). `kit.iso(x, y, z)` → screen `[sx, sy]`. Tune with `view: { scale, originX, originY }`.
- **Screen**: px from the stage centre; the visible area is about ±400 × ±250 (cropped to about ±320 × ±230 on phones, so keep essentials inside that).

### Primitives

All take `(key, props)`. Common props: `opacity`, `delay` (ms), `layer` (forces z-order; higher draws on top), `enter: 'drop'|'fade'|'grow'|'none'`, `exit: 'lift'|'fade'|'right'|'sink'`.

| Primitive | Space | Props |
|---|---|---|
| `box` | world | `x y z w d h`, `color`, `topColor`, `outline`, `dashed`, `label`, `labelOn: 'top'|'front'`, `labelColor`, `labelSize` |
| `plate` | world | flat rectangle at height `z`: `x y z w d`, `color`, `stroke`, `dashed`, `fill: 'none'`, `label`, `labelAt: [dx, dy]` |
| `token` | world | disc/coin at a point: `x y z r color label` |
| `label` | world | text at a point: `x y z text size weight color mono anchor dx dy` |
| `pointer` | world | tag with a dashed leader line: `x y z text dx dy color` |
| `arrow` | world | `from: [x,y,z]`, `to: [x,y,z]`, `color`, `width`, `dashed`, `curve` (px bend), `label`, `ldx`, `ldy` |
| `rect` | screen | `x y w h r fill stroke dashed label labelSize labelColor mono` |
| `text` | screen | `x y text size weight color anchor mono italic` (`\n` for lines) |
| `line` | screen | `x1 y1 x2 y2 color width dashed` |
| `sarrow` | screen | arrow `x1 y1 x2 y2 color width dashed curve label ldx ldy` |
| `path` | screen | `d stroke fill fillOpacity width dashed` (strings don't tween: they switch halfway) |
| `circle` | screen | `x y r fill stroke strokeWidth dashed label` |
| `chart` | screen | bar chart: `x y w h values[] max colors[] labels[] showValues decimals` |

Colours: a token name (`'blue'`, `'green'`, `'red'`, `'yellow'`, `'ink'`, `'ink-2'`, `'muted'`, `'surface'`, `'surface-2'`, `'line'`, `'line-strong'`, `'*-ink'`, `'*-soft'`) or a hex string. Tokens follow light/dark mode automatically; hex doesn't, so prefer tokens.

### Extras

- `kit.loop(fn)`: run `fn(nowMs)` every frame for ambient motion (flowing particles). Skipped under reduced motion; draw a correct static frame in `render` too.
- `kit.raw(cls)`: an `<g>` you own, outside the reconciler, for loop-driven drawing. `kit.svg.insertBefore(g, kit.world)` puts it underneath.
- `kit.colors()`: resolved token colours (`{ blue: '#00A4EF', … }`) for raw drawing.
- `kit.floor({ from, to })`: faint world-aligned dots. Usually unnecessary; the stage already has an isometric dot grid.
- `kit.duration` (ms) and `kit.reduced` (bool).

## Patterns that work

| Topic shape | Pattern | Example |
|---|---|---|
| Container with an order (stack, queue, deque, heap as array) | Boxes along one axis, a pointer tag for the active end, a dashed tray for removed items | `stack-main` |
| Array / memory | `plate` slots with index labels, `box` items sitting in slots, `pointer` for indices | `stack-array` |
| Process over time (call stack, pipeline, request path) | Frames stacked or lanes laid along `x`; `arrow` between stages; highlight the active frame | `call-stack` |
| Network / graph (DNS, routing, trees) | `token`s as nodes on the floor, `arrow`s with `curve`, labels; walk a highlighted path step by step | |
| Quantity vs quantity (lift vs angle, loss vs epoch) | Screen-space line chart with a moving `circle` marker; shaded regions with `rect` | `cl-curve` |
| Equation terms | Bars that grow per term with `enter: 'grow'` | `lift-eq` |
| History / story | A horizontal timeline in screen space: `line`, `circle` per event, `text` above/below, a highlighted "now" marker that moves per step | |
| Film structure (non-linear narrative) | Two rows: story order vs screen order, `rect` blocks per scene, `sarrow`s showing reordering | |

Rules of thumb:
- **One idea per step.** Change one thing; keep everything else still so the eye goes to the change.
- **Fill the stage.** The main object should take up the middle 60%. Leave the top ~40px for a caption or an operation pill.
- **Label on the object**, not in a legend.
- Use `metrics` chips for numbers that change; they glow when they change.
- **Timing**: the kit tweens 520ms with ease-in-out. Use `delay` (60-120ms per item) to stagger several things changing at once.

## three.js: when and how

Use `mode: 'three'` only if the PRD flags it: the subject is genuinely spatial (airflow around a body, molecules, orbits, physical mechanisms, layers seen in depth). Otherwise isometric SVG reads better and loads faster.

`mount(stage, k3)` gets:

| `k3.` | What |
|---|---|
| `THREE` | the vendored three.js module (r180) |
| `scene`, `camera`, `renderer`, `controls` | ready to use; `OrbitControls` lets the learner drag to rotate |
| `tween(obj, { 'position.y': 2, 'material.opacity': 0.5 }, { dur, delay })` | numeric/colour tweens on any object; dotted paths allowed |
| `cameraTo([x,y,z], [tx,ty,tz], { dur })` | glide the camera and orbit target |
| `onFrame(fn(dt, now))` | ambient animation; skipped when reduced motion is on |
| `onUpdate(fn(dt, now))` | runs every frame after tweens (rebuild geometry that depends on tweened params here) |
| `colors()`, `color(name)` | theme colours; set `k3.onThemeChange = () => {…}` to recolour on theme switch |
| `duration`, `reduced` | |

Pattern (see `wing-3d`): keep a params object `P` on `this`; `render` tweens `P` toward the step's targets; `onUpdate` rebuilds lines/arrows from `P`; `onFrame` moves particles. Text in 3D: canvas-texture sprites. Always provide an SVG `fallback` scene that shows the same idea in 2D (it doubles as a fast scene for ELI5 and Technical).
