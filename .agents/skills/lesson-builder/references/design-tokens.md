# Design tokens

Defined in `assets/player/theme.css`. Use token names in scenes (`color: 'blue'`), never raw hex, so light and dark mode and every style (the chalk board redefines them) all work.

## Palette

Neutral base with the Microsoft logo colours as accents.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAFAF8` | `#16171A` | page |
| `surface` | `#FFFFFF` | `#1F2024` | panes, cards, light box faces |
| `surface-2` | `#F3F3F0` | `#26272C` | code blocks, chips, floor plates |
| `ink` / `ink-2` | `#1B1B1F` / `#3A3A40` | `#EDEDED` / `#CFCFD2` | text |
| `muted` | `#737373` | `#9A9A9A` | secondary text, streamlines |
| `line` / `line-strong` | `#E6E6E1` / `#D4D4CE` | `#2E2F35` / `#3B3C43` | rules, outlines, bases |
| `red` | `#F25022` | | **removed, wrong, error, misconception** |
| `green` | `#7FBA00` | | **added, correct, done, "push"** |
| `blue` | `#00A4EF` | | **normal items, primary action, active step, links** |
| `yellow` | `#FFB900` | | **highlight, being looked at, "good to know", in flight** |
| `purple` | `#8661C5` | | **a fourth, neutral series** (e.g. a residual stream, a second dataset); no fixed meaning |

`*-ink` variants (`blue-ink`, `red-ink`, …) are contrast-tuned for text and thin lines in each mode. `*-soft` variants are pale fills for callouts and backgrounds. Yellow is a fill only; for yellow text use `yellow-ink`.

## Fixed meanings

The same colour means the same thing on every page:

- Something was just **added / is correct** → green.
- Something was **removed / is wrong / an error** → red. Never decorative.
- Something is **being inspected or highlighted** → yellow.
- Everything else that matters → blue. Background structure → `line-strong` / `surface-2`.

In the narration pane, "What changed" bullets follow it automatically: `+` green, `-` red, `~` yellow.

## Type

- Text: system UI (Segoe UI Variable / Segoe UI on Windows, SF on Mac).
- Code and numbers: **Cascadia Code** (vendored, OFL). Use `mono: true` on scene text that shows values, operations or code.

## Shape and motion

- Cards: 10px radius, 1px rules, soft shadow. The stage has an isometric dot grid.
- Transitions: 300-600ms, ease-in-out. Scenes tween 520ms by default. `prefers-reduced-motion` turns tweens into cuts and stops ambient loops.
- Icons: Fluent UI System Icons (MIT), vendored subset in `assets/player/icons/icons.js`. No logos or brand marks.
