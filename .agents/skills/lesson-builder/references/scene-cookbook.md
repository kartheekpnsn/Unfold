# Scene cookbook

Read the reference scene files first: `topics/Stacks/_unfold/scenes.js` (isometric SVG, sequencing, draw-on, counting), `topics/LLM/_unfold/scenes.js` (a sequenced pipeline plus a three.js `block-3d` scene with a 2D fallback) and `topics/How-Do-Planes-Fly/_unfold/scenes.js` (three.js + SVG fallback + charts). Then read `motion-and-visual-principles.md`: the seven rules every scene follows.

## The contract

```js
// <topic folder>/_unfold/scenes.js: no imports, no DOM at top level.
export default {
  'stack-main': {
    mode: 'svg',                         // 'svg' (default) or 'three'
    label: 'Stack: push and pop',        // accessible name of the stage
    view: { scale: 44, originX: -120, originY: 75 },   // optional projection setup; view.box: [x, y, w, h] fixes the drawing area
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
- The player calls `mount` once per scene instance, then `render` on every step that uses that scene. Switching to a different scene id (or style) unmounts the old one.
- Scenes are objects; `this` inside `mount`/`render` is the scene, so you can keep handles on `this` (see wing-3d).
- Don't reach into `kit.svg` to change the viewBox; use `view.box`.

## SVG kit: state-based drawing

```js
render(s, prev, kit) {
  kit.begin();                                           // start a frame
  kit.seq('move', 'point');                              // optional: phases play one after another
  kit.box('base', { x: -1.2, y: -1.2, z: 0, w: 2.4, d: 2.4, h: 0.16, color: 'line-strong' });
  s.stack.forEach((v, i) => kit.box('v-' + v, { x: -0.75, y: -0.75, z: 0.16 + i * 0.62, w: 1.5, d: 1.5, h: 0.56, color: 'blue', label: v, phase: 'move' }));
  kit.pointer('top', { x: 0.75, y: -0.75, z: …, text: 'top', phase: 'point' });
  kit.end();                                             // diff + tween
}
```

**Keys are identity.** Same key in two frames → it tweens (position, size, colour, opacity, and the numbers inside its text). New key → it *enters* (drops in / fades in / draws on). Missing key → it *exits* (lifts and fades). So key by the thing's identity (`'v-' + value`, `'frame-' + i`), not by array position, if items move. A popped item that should glide into a "popped" tray must keep its key.

### Coordinates

- **World (isometric)**: `x` runs right-down, `y` runs left-down, `z` is up. 1 unit = `kit.scale` px (default 38). `kit.iso(x, y, z)` → screen `[sx, sy]`. Tune with `view: { scale, originX, originY }`.
- **Screen**: px from the stage centre. The design area is 800 × 500 (±400 × ±250). On phones the view starts cropped to ±320 × ±230 and widens smoothly (up to the full design area) if the drawing needs it, so keep the essentials inside ±320 × ±210 for the biggest phone picture.

### Primitives

All take `(key, props)`. Common props: `opacity`, `delay` (ms), `layer` (forces z-order; higher draws on top), `enter: 'drop'|'fade'|'grow'|'draw'|'write'|'none'`, `exit: 'lift'|'fade'|'right'|'sink'|'undraw'`, plus the motion props below.

| Primitive | Space | Props |
|---|---|---|
| `box` | world | `x y z w d h`, `color`, `topColor`, `outline`, `dashed`, `label`, `labelOn: 'top'|'front'`, `labelColor`, `labelSize` |
| `plate` | world | flat rectangle at height `z`: `x y z w d`, `color`, `stroke`, `dashed`, `fill: 'none'`, `label`, `labelAt: [dx, dy]` |
| `token` | world | disc/coin at a point: `x y z r color label` |
| `label` | world | text at a point: `x y z text size weight color mono anchor dx dy` |
| `pointer` | world | tag with a dashed leader line: `x y z text dx dy color` (sized to the real text width) |
| `arrow` | world | `from: [x,y,z]`, `to: [x,y,z]`, `color`, `width`, `dashed`, `curve` (px bend), `label`, `ldx`, `ldy` |
| `rect` | screen | `x y w h r fill stroke dashed label labelSize labelColor mono` (labels shrink to fit the box) |
| `text` | screen | `x y text size weight color anchor mono italic` (`\n` for lines) |
| `line` | screen | `x1 y1 x2 y2 color width dashed` |
| `sarrow` | screen | arrow `x1 y1 x2 y2 color width dashed curve label ldx ldy` |
| `path` | screen | `d stroke fill fillOpacity width dashed` (morphs when both `d` strings have the same commands) |
| `circle` | screen | `x y r fill stroke strokeWidth dashed label` |
| `chart` | screen | bar chart: `x y w h values[] max colors[] labels[] showValues decimals` |
| `axis` | screen | `x y w h xMin xMax yMin yMax xLabel yLabel xTicks yTicks grid ticks` |
| `linechart` | screen | `x y w h series: [{ values[] \| points[[x,y]], color, label, dashed, width, area }]`, `xs`, axis props, `marker: { at, label, series }` |
| `scatter` | screen | `x y w h points: [{ x, y, color, r, label }]`, axis props, `fit: { slope, intercept, color }` |
| `person` | screen | generic pictogram figure, feet at `x y`: `size color pose: 'stand'|'wave'|'point'|'think'|'cheer'|'sit' label`. Never a likeness of a real person. |
| `icon` | screen | a vendored Fluent icon centred on `x y`: `name size color label` (names in `assets/player/icons/icons.js`) |

Colours: a token name (`'blue'`, `'green'`, `'red'`, `'yellow'`, `'purple'`, `'ink'`, `'ink-2'`, `'muted'`, `'surface'`, `'surface-2'`, `'line'`, `'line-strong'`, `'*-ink'`, `'*-soft'`) or a hex string. Tokens follow light/dark mode and the lesson's style automatically; hex doesn't, so prefer tokens.

### Motion props (see motion-and-visual-principles.md)

| Prop | What it does |
|---|---|
| `motion: 'quick'|'state'|'reveal'` | Duration token: 200 / 520 (default) / 800 ms |
| `ease: 'standard'|'out'|'overshoot'|'linear'` | Easing. `overshoot` only for the step's one key moment (P3) |
| `phase: 'name'` | Starts the element in that phase of `kit.seq(...)`; each phase starts 520 ms after the previous one. A number works too (`phase: 1`). |
| `draw: true` | On enter, the stroke draws itself and the fill fades in behind it |
| `write: true` | On enter, a `text` writes itself letter by letter |
| `along: { d, t }` | `circle`, `rect` or `text` placed at fraction `t` (0–1) along the SVG path `d`; tween `t` to move it along the path |
| `count: false` | Stop numbers in this text/label from tweening (they tween by default when the text keeps its key and its shape) |

Numbers inside strings tween when both strings have the same shape: `'p = 0.42'` → `'p = 0.80'`, `'size 2'` → `'size 3'`, or a path `d` with the same commands. Numeric metric chips above the stage count the same way.

### Extras

- `kit.seq(...names)`: declare the phase order for this frame (call right after `kit.begin()`). Keep to 3 phases.
- `kit.measure(text, { size, weight, mono })`: the text's real width in px.
- `kit.pointAt(d, t)`: `[x, y]` at fraction `t` along path `d`.
- `kit.loop(fn)`: run `fn(nowMs)` every frame for ambient motion (flowing particles). Skipped under reduced motion; draw a correct static frame in `render` too. The player shows a **Motion** pause button whenever a loop runs.
- `kit.raw(cls)`: an `<g>` you own, outside the reconciler, for loop-driven drawing. `kit.svg.insertBefore(g, kit.world)` puts it underneath.
- `kit.colors()`: resolved token colours (`{ blue: '#00A4EF', … }`) for raw drawing.
- `kit.floor({ from, to })`: faint world-aligned dots. Usually unnecessary; the stage already has a background.
- `kit.duration` (ms), `kit.reduced` (bool), `kit.style` (the active style name), `kit.motion` (the duration tokens).

## Templates

Templates draw a whole, common picture from a few props, using the primitives above. They keep keys stable, keep one focal change, label on the object and stay inside the safe area, so prefer them to hand-placing coordinates. Each takes a `key` prefix; combine them with your own primitives freely.

| Template | Props | Shows |
|---|---|---|
| `kit.caption(text)` | | A one-line caption across the top |
| `kit.pipeline(key, …)` | `stages: ['Text', { label, sub, color }], active, y, width, note, flow, color` | Stages in a row; the active one lights up and a token glides to it |
| `kit.timeline(key, …)` | `events: [{ when, title }], now, y, x0, x1, color` | Dated events on a line; past solid, future muted; "now" glides |
| `kit.compare(key, …)` | `left / right: { title, items[], value, valueText, color }, highlight: 'left'|'right', y, colW, max` | Two columns side by side, optional bars that grow and count |
| `kit.array(key, …)` | `items: [v \| { id, label, color }], highlight: [i], pointers: { name: i }, capacity, cell` | Isometric array slots with items that keep their identity |
| `kit.stack(key, …)` | `items` (bottom → top), `popped`, `color`, `top` | A stack of boxes, the top marked, popped items in a tray |
| `kit.graphWalk(key, …)` | `nodes: [{ id, x, y, label }], edges: [[a, b, label?]], path: [ids], at, visited, directed, r` | A graph; edges on the path draw themselves; a walker moves to `at` |
| `kit.chartStory(key, …)` | `kind: 'line'|'bar', series` or `values + labels, focus, note, x, y, w, h, xLabel, yLabel` | A chart whose highlighted point or bar moves per step, with a note |

```js
// A request travelling through a system, one stage per step
render(s, prev, kit) {
  kit.begin();
  kit.caption(s.caption);
  kit.pipeline('req', { stages: ['Browser', 'DNS', 'Server', { label: 'DB', sub: 'SELECT' }], active: s.at, y: -60, note: `${s.ms} ms` });
  kit.end();
}
```

## Patterns that work

| Topic shape | Pattern | Start from |
|---|---|---|
| Container with an order (stack, queue, deque, heap as array) | Boxes along one axis, a pointer tag for the active end, a dashed tray for removed items | `kit.stack`, `kit.array`; `stack-main` |
| Array / memory | `plate` slots with index labels, `box` items sitting in slots, `pointer` for indices | `kit.array`; `stack-array` |
| Process over time (call stack, pipeline, request path) | Stages laid along `x`; the active stage lights up; a token travels | `kit.pipeline`; LLM `llm-pipeline` |
| Network / graph (DNS, routing, trees) | Nodes, edges, a highlighted path that draws itself step by step | `kit.graphWalk` |
| Quantity vs quantity (lift vs angle, loss vs epoch) | A line chart with a moving marker; shaded regions with `rect` | `kit.chartStory`, `linechart`; planes `cl-curve` |
| Two things compared (two companies, two algorithms) | Two columns or two bars that grow and count | `kit.compare` |
| Equation terms | Bars that grow per term with `enter: 'grow'` | `chart`; planes `lift-eq` |
| History / story | A horizontal timeline whose "now" marker moves per step | `kit.timeline` |
| People, roles, organisations | Generic figures and icons with labels, arrows for flows of goods or money | `person`, `icon`, `along` for flows; Ambani `business-engines` |
| Correlation, clusters, data points | Points that move and recolour; a fit line | `scatter` |
| Film structure (non-linear narrative) | Two rows: story order vs screen order, `rect` blocks per scene, `sarrow`s showing reordering | `rect`, `sarrow` |

Rules of thumb:
- **One idea per step.** Change one thing; keep everything else still so the eye goes to the change (P1).
- **Show, don't label.** If the only change is words, find a picture of the change (P5, P6). The validator warns when a scene is mostly `text`/`rect`.
- **Fill the stage.** The main object should take up the middle 60%. Leave the top ~40px for a caption or an operation pill.
- **Label on the object**, not in a legend (P4).
- **Sequence cause → effect** with `kit.seq` instead of everything moving at once.
- Use `metrics` chips for numbers that change; they count and glow when they change.

## Styles

The lesson (and optionally each tab) names a style; the same scenes render in any of them. Learners can switch between `lesson.style` and `lesson.altStyles` on the stage. Read `references/styles/<style>.md` for each.

| Style | For | What changes |
|---|---|---|
| `isometric` (default) | DSA, software, systems | Solid shaded shapes |
| `line` | Physics, engineering, maths, statistics | Light tints with coloured outlines, a graph-paper grid, strokes draw on |
| `sketch` | ELI5 tabs, general explainers | Marker-like outlines with a hand wobble, a handwriting font, strokes draw on |
| `chalk` | Formulas, derivations | A dark board, chalky strokes and text |
| `pictogram` | Business, history, people, processes | Flat fills without outlines; use `person` and `icon` |
| `3d` | Layered or structural topics | `box`, `plate` and `token` become lit three.js meshes with shadows; labels, arrows and text stay crisp SVG on top. Falls back to `isometric` without WebGL. |

Write scenes with colour tokens and the kit's primitives and they work in every style. Check each declared style's contact sheet (`render-check.mjs` writes one per style).

## three.js: when and how

Two ways to get 3D:

1. **The `3d` style** (no extra code): any scene built from `box` / `plate` / `token` becomes real 3D with lighting and shadows. Use it as the lesson's style or as an alternate for layered or structural topics (stacks, memory, blocks, layers, pipelines of physical things).
2. **A `mode: 'three'` scene**, for anything spatial, layered in depth, or about scale: airflow around a body, molecules, orbits, physical mechanisms, a stack of network layers, a tensor. It always names an SVG `fallback` scene that shows the same idea in 2D (it doubles as a fast scene for ELI5 and Technical). three.js adds ~700 KB to the page, which is fine for a lesson that opens from disk.

`mount(stage, k3)` gets:

| `k3.` | What |
|---|---|
| `THREE` | the vendored three.js module (r180) |
| `scene`, `camera`, `renderer`, `controls` | ready to use; `OrbitControls` lets the learner drag to rotate |
| `tween(obj, { 'position.y': 2, 'material.opacity': 0.5 }, { dur, delay })` | numeric/colour tweens on any object; dotted paths allowed |
| `cameraTo([x,y,z], [tx,ty,tz], { dur })` | glide the camera and orbit target |
| `onFrame(fn(dt, now))` | ambient animation; skipped when reduced motion is on; pausable from the Motion button |
| `onUpdate(fn(dt, now))` | runs every frame after tweens (rebuild geometry that depends on tweened params here) |
| `label3d(text, { size, color, weight, bg })` | a camera-facing text sprite; `sprite.setText('…')` redraws it |
| `particles({ count, area, size, color })` | a point cloud; `points.update((i, p) => …)` moves each point |
| `flowField(v, { count, min, max, size, color, speed })` | particles carried by a velocity field `v(x, y, z) → [vx, vy, vz]` |
| `grid({ nx, ny, nz, cell, gap, color })` | an instanced grid of cubes (tensors, neurons, pixels); `grid.set(i, { value, color })` |
| `extrude(d, { depth, scale, color })` | an SVG path (M L H V C Q Z) extruded into a solid |
| `colors()`, `color(name)` | theme colours; set `k3.onThemeChange = () => {…}` to recolour on theme switch |
| `duration`, `reduced` | |

A step's `state.camera = { pos: [x, y, z], target: [x, y, z] }` glides the camera on that step without any code.

Pattern (see wing-3d): keep a params object `P` on `this`; `render` tweens `P` toward the step's targets; `onUpdate` rebuilds lines/arrows from `P`; `onFrame` moves particles. See LLM `block-3d` for a static structure with an ambient pulse.
