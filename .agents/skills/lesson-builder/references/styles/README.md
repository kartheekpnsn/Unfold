# Styles

A style is a skin on the scene kit: the same `scenes.js` draws in any style. Pick one per lesson in the PRD (`lesson.style`), optionally override it per tab (`tab.style`), and list one or two alternates (`lesson.altStyles`) that the learner can switch to on the stage.

| Style | Pick it for | Spec |
|---|---|---|
| `isometric` | DSA, software, systems (the default) | [isometric.md](isometric.md) |
| `line` | Physics, engineering, maths, statistics | [line.md](line.md) |
| `sketch` | ELI5 tabs, general explainers | [sketch.md](sketch.md) |
| `chalk` | Formulas, derivations, proofs | [chalk.md](chalk.md) |
| `pictogram` | Business, history, people, processes | [pictogram.md](pictogram.md) |
| `3d` | Layered or structural topics | [3d.md](3d.md) |

Rules for every style:
- Colours keep their fixed meanings (green added, red removed, yellow looked at, blue normal); styles change how a colour is painted, never what it means.
- At most three colours carry meaning in one scene.
- Every style must pass `render-check.mjs` (it checks each declared style and writes `_unfold/qa/contact-<style>.png`) and look right in light and dark mode.
- No likenesses of real people, logos or copied artwork in any style.
