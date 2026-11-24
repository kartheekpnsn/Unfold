# PRD template

Copy this into `T/_unfold/PRD.md` (T = the topic folder) and fill every section. The Builder sees **only** this file, `research.md` and `sources.json`, so anything not written here won't be built. Cite claims with the `[S#]` ids from `sources.json`.

---

```markdown
# <Title>: lesson PRD

- **Slug:** <slug>
- **Folder:** <path under topics/, e.g. ML/DL>
- **Duration:** 30m | 2h
- **Level:** beginner | intermediate | advanced   (from grill.md)
- **Domain:** <subject slug, e.g. dsa, ai-ml, science, history, tech, film>
- **Summary:** <one sentence, used as the page description>
- **Player version:** <from state.json>
- **Style:** <isometric | line | sketch | chalk | pictogram | 3d>, from research.md §4 and the topic (see lesson-builder/references/styles/)
- **Alternate styles:** <1-2 the learner can switch to, e.g. sketch, 3d>
- **Tab styles:** <overrides, e.g. "eli5: sketch", or "none">

## 1. Learner profile
- Why: <from probe.md>
- Starting point: <from probe.md>
- Solid: <concepts marked solid in grill.md>
- Shaky: <concepts marked shaky>
- Unknown: <concepts marked unknown>
- Misconceptions detected: <list, or "none">
- Pitch: <one or two sentences on tone and depth: what to skip, what to dwell on>

## 2. Learning objectives (3-5)
1. <verb-first, checkable: "Explain…", "Trace…", "Predict…">

## 3. Tabs

One subsection per tab, in the required order for the duration (see lesson-builder/references/tabs.md).

### 3.x <Tab title> (`<tab id>`, kind `<stepper|lessons|playground|story|tradeoffs|quiz|cheatsheet|related>`)

For stepper tabs, a table, one row per step:

| # | Step title (≤ 60 chars) | Narration intent (one line) | Cite | Scene id | Mode | What the scene shows (state) | What moves |
|---|---|---|---|---|---|---|---|
| 1 | … | … | S2 | `stack-main` | svg | empty stack, base plate, "top = none" pointer | the tray outline draws on |
| 2 | … | … | S2 | `stack-main` | svg | [4] | box 4 drops in, then the "top" tag climbs to it |

"What moves" is required: name the change the learner *sees* (moves, grows, draws on, counts, recolours). A step where only words change is a slide; redesign it.

- Callouts: <step #: kind, text>
- Code / formula: <language + the snippet, and which lines each step highlights>, or "none"

For `lessons` (Deep Dive): 2-3 sub-lessons, each with an id, title and its own step table.
For `playground`: the scene, each control (id, label, type, min/max/step/default), and what `metrics(state)` and `note(state)` should say.
For `story`: timeline rows (when, title, text, cite) and misconception cards (myth, why, truth, cite).
For `tradeoffs`: use-when, avoid-when, pros, cons, and alternatives (tech) or perspectives (non-tech), each cited.
For `cheatsheet`: key facts, formulas/code, glossary terms.

## 4. Scenes

One entry per scene id used above:

- **`<scene-id>`** · svg | three (fallback: `<svg scene id>`)
  - Purpose: <the one idea it makes visible>
  - Template: <kit.pipeline / kit.timeline / kit.compare / kit.array / kit.stack / kit.graphWalk / kit.chartStory, or "custom">
  - Elements: <boxes / tokens / lanes / arrows / labels, with colour meanings>
  - State fields: <name: type, meaning>
  - Transitions: <what moves between steps, in order: e.g. "phase 1 box drops in, phase 2 tag climbs, size counts">

## 5. Quiz

Aim at the shaky and unknown concepts first. 4-8 items (30m) or 6-12 (2h). Four options of about equal length; vary the correct position.

| # | Concept | Question | Options (A-D) | Answer | Why (cite) |
|---|---|---|---|---|---|

## 6. Related
- Prerequisites: <id · title · why>
- Next: <id · title · why>

## 7. Folder placement
- Parent folder: <existing topic path> or "top level", because <kind-of / part-of reason>
- Adopts: <existing sibling or top-level folders that are kinds/parts of this topic, with reason; they move inside it after the build>, or "none"

## 8. Sources to cite
<S# · title · what it supports>
```
