# Motion and visual principles

Seven rules for every scene. Each comes from an established guide (listed at the end) and maps to a kit feature and to a check that `validate-lesson.mjs` or `render-check.mjs` runs. Read this before writing `scenes.js`.

The goal: a lesson that **shows** the idea through motion. A slide of labelled boxes that swap from step to step is not an animation.

## The rules

| # | Rule | In the kit | Checked by |
|---|---|---|---|
| P1 | **One focal change per step.** Change one thing; everything else holds still so the eye goes to the change. | Stable keys for things that persist; `delay` / `phase` to order several changes that belong to one idea | render-check: "N separate areas change at once" |
| P2 | **Use the duration tokens.** No ad-hoc timings. | `motion: 'quick'` (200 ms, small feedback) · `'state'` (520 ms, the default step change) · `'reveal'` (800 ms, a big entrance) | validator: unknown `motion` / `ease` values are errors |
| P3 | **Anticipation and overshoot only on key moments.** Most changes ease in and out; the one moment that matters may land with a small overshoot. | `ease: 'overshoot'` on that one element; `ease: 'out'` for things that arrive | Review the contact sheet |
| P4 | **Label the object, not a legend.** Put words on or right beside the thing they name. | `label` props on `box`, `rect`, `circle`, `person`, `icon`; `pointer` for a tag with a leader line | render-check: overlapping or clipped labels are errors |
| P5 | **Show only what this step needs.** Drop anything that doesn't serve the step's one idea; add detail step by step. | Leave keys out of a frame and they exit; bring them in later | validator: "N% of its drawing is text and rect boxes" |
| P6 | **Morph and draw on; don't swap slides.** Things move, grow, draw themselves and count; they don't blink out and back in. | `draw: true`, `write: true`, `along: { d, t }`, numbers in strings tween, paths with the same commands morph, `kit.seq` | render-check: "text-only step", "jumps", "replaced … in the same place" |
| P7 | **Respect reduced motion, and let people pause.** Everything must make sense as a still frame. | The kit sets durations to 0 and skips `kit.loop` under `prefers-reduced-motion`; the player shows a **Motion** pause button whenever a scene has a loop | Automatic |

## How to apply them

**Plan each step as "before → after → what moved".** If what moved is only words, the step is a slide. Find a picture of the change instead:

| What changes | Show it as |
|---|---|
| A quantity | A bar that grows, a line that rises, a number that counts up (`text: '42%'` → `'67%'`) |
| Data moving | A token gliding along a path (`along: { d, t }`) or between stages (`kit.pipeline`) |
| Order or position | Items that slide to their new place (same keys) |
| A process | Stages that light up in turn, with a token arriving (`kit.pipeline`, `kit.seq`) |
| Time | A timeline whose "now" marker moves (`kit.timeline`) |
| Comparison | Two columns or bars side by side (`kit.compare`) |
| Relationships | A graph whose path draws itself (`kit.graphWalk`) |
| People or roles | Generic figures (`kit.person`) with a pose, never a likeness of a real person |
| Things | An icon (`kit.icon`) or a shape, not a word in a box |

**Sequence within a step when the idea has a cause and an effect** (P1 plus P6). Declare the phases, then tag elements:

```js
kit.begin();
kit.seq('travel', 'arrive', 'count');
kit.circle('pkt', { along: { d: WIRE, t: 1 }, r: 6, fill: 'yellow', phase: 'travel' });
kit.rect('server', { x: 120, y: -30, w: 120, h: 60, fill: s.hit ? 'green-soft' : 'surface', phase: 'arrive' });
kit.text('hits', { x: 180, y: 60, text: `${s.hits} requests`, phase: 'count' });
kit.end();
```

Each phase starts when the previous one has had its 520 ms. Keep a step to at most 3 phases.

**Draw things on when they first appear** (P6): `draw: true` on a `path`, `line`, `sarrow`, `arrow`, `circle` or `rect` draws the stroke, then fades the fill in behind it. `write: true` writes a `text` letter by letter. The `line`, `sketch` and `chalk` styles turn draw-on on for every stroke.

**Count, don't snap** (P6): when a text or label keeps its key and only its numbers change (`'p = 0.42'` → `'p = 0.80'`), the numbers tween. Numeric metric chips count the same way. Set `count: false` on a text that must not count (an ID, for example).

## What render-check reports, and what to do

| Message | Meaning | Fix |
|---|---|---|
| ERROR text "…" is clipped by the … edge | A label runs off the stage at that width | Move it inward or shorten it; keep essentials inside ±320 × ±210 |
| ERROR labels "…" and "…" overlap | Two labels sit on top of each other | Space them out, shorten them, or show one per step |
| ERROR … is N% outside the stage | A shape is mostly off-stage | Bring it inside the 800 × 500 design area (`view: { scale, originX, originY }` helps) |
| ERROR runtime error / scene failed | The scene threw in a real browser | Fix the code; the message has the cause |
| warn sparse stage | The drawing covers less than 35% of the scene area | Enlarge the main object (`view.scale`), or add the picture that's missing |
| warn text-only step | Only words changed on the stage | Show the change (see the table above) |
| warn nothing on the stage changes | The stage is identical to the previous step | Make the step change something, or merge it with its neighbour |
| warn "…" jumps to its new place | A shape changed position without passing through the middle | Paths morph only when both have the same commands; draw both states with the same command list |
| warn "A" is replaced by "B" in the same place | A shape vanished and an identical one appeared | Reuse the key so it stays put or moves (key by identity, not position) |
| warn N separate areas change at once | Several unrelated parts of the stage change in one step (P1) | Split the step, or sequence the changes with `kit.seq` |
| warn (validator) N% of its drawing is text and rect boxes | The scene reads as a slide (P5, P6) | Use shapes, charts, people, icons, a template, draw-on and motion |

A warning can be right to ignore (a heatmap really is a grid of rects). Say why in the build log.

## Sources

Distilled from these guides. Builders don't need to open them; this page is the summary.

- *The Illusion of Life* (Frank Thomas and Ollie Johnston, 1981): Disney's 12 principles of animation, especially staging, timing, slow in and slow out, anticipation and follow-through (P1, P3).
- Pixar in a Box, Khan Academy: <https://www.khanacademy.org/computing/pixar> (story structure for ELI5 and Story tabs).
- Material Design 3, Motion: <https://m3.material.io/styles/motion/overview> (duration and easing tokens, P2).
- Apple Human Interface Guidelines, Motion: <https://developer.apple.com/design/human-interface-guidelines/motion> (purposeful, brief, optional motion; reduced motion, P7).
- Fluent 2, Motion: <https://fluent2.microsoft.design/motion> (matches the player's Fluent icons and palette).
- Carbon Design System, Motion: <https://carbondesignsystem.com/elements/motion/overview/> (productive motion for most changes, expressive motion for occasional important moments, P2/P3).
- Richard E. Mayer, *Multimedia Learning* (Cambridge University Press): coherence, signalling, spatial contiguity and segmenting principles (P1, P4, P5).
- Bret Victor, Explorable Explanations: <https://worrydream.com/ExplorableExplanations/> (the Playground tab).
- Distill: <https://distill.pub/> (quality bar for interactive ML diagrams).
- 3Blue1Brown's Manim (community edition): <https://www.manim.community/> (transformations: morph and draw on, P6).
- Edward Tufte, *The Visual Display of Quantitative Information*: data-ink ratio and small multiples (P5, chart scenes).
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>. 2.2.2 Pause, Stop, Hide (motion that starts automatically and lasts more than five seconds can be paused) and 2.3.3 Animation from Interactions (P7).
