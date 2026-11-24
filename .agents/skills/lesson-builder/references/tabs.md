# Tabs and the lesson.json contract

## Tab sets (order matters; the validator enforces it)

| Duration | Tabs |
|---|---|
| **30m** | `eli5` · `core` · `technical` · `check` · `related` |
| **2h** | `eli5` · `core` · `technical` · `deep-dive` · `playground` · `story` · `tradeoffs` · `check` · `cheatsheet` · `related` |

## What each tab is for

| id | title | kind | Budget | Job |
|---|---|---|---|---|
| `eli5` | ELI5 | `stepper` | **3-5 steps** | Analogy-led. No jargon until the last step, which names the real term. One analogy carried through, from research.md §3. |
| `core` | Core Mechanism | `stepper` | **6-10 steps** (aim 8) | The one animation that *is* the topic. One main scene; each step changes one thing. Ends on an edge case or failure mode (underflow, stall, collision). |
| `technical` | Technical | `stepper` | **3-8 steps** | Precise definitions, formulas/pseudocode/code, key numbers, at the grill's pitch level. Every step cites. Code goes in `tab.code` with `step.highlight` lines. |
| `deep-dive` | Deep Dive | `lessons` | **2-3 sub-lessons × 2-5 steps** | The parts the grill showed they're ready for. Each sub-lesson is its own stepper. |
| `playground` | Playground | `playground` | 1-4 controls | Sliders/toggles driving a scene. The scene exports `metrics(state)` (readouts) and `note(state)` (one cited sentence explaining what they see). |
| `story` | Story & Misconceptions | `story` | timeline 4-8, misconceptions 2-5 | How the idea came to be (dated, cited) plus mistake → why it's wrong → correct idea cards. |
| `tradeoffs` | Trade-offs | `tradeoffs` | 2-5 per list | Use when / avoid when / pros / cons / alternatives. Non-tech: "perspectives" (camps and what they argue) instead of alternatives. |
| `check` | Check Yourself | `quiz` | 30m: 4-8, 2h: 6-12 | Questions live in top-level `quiz`, aimed at the grill's shaky/unknown concepts. |
| `cheatsheet` | Cheatsheet | `cheatsheet` | one printed page | Key facts, formulas/code, glossary. |
| `related` | Related & Sources | `related` | | Rendered from top-level `related` + `sources`. At build time each prereq/next is matched (by id or title) against topics already in the library: matches become links, the rest show "not built yet". |

Icons: pick from the vendored Fluent set (`assets/player/icons/icons.js`), e.g. `lightbulb`, `flash`, `stack`, `airplane`, `code`, `layer`, `options`, `history`, `scales`, `question-circle`, `document-text`, `branch`, `brain-circuit`, `globe`, `beaker`, `video-clip`, `server`, `molecule`, `rocket`, `map`, `people`, `timeline`, `calculator`, `math-formula`. Defaults are used if you omit `icon`.

## lesson.json

```jsonc
{
  "slug": "stacks",                         // lowercase-kebab id of the topic (folder name may differ, e.g. "ML")
  "title": "Stacks",
  "duration": "30m",                        // "30m" | "2h"
  "level": "beginner",                      // beginner | intermediate | advanced (from grill.md)
  "domain": "dsa",                          // subject area slug (dsa, ai-ml, science, history, tech, film…)
  "summary": "One sentence.",
  "playerVersion": "1.1.0",                 // from state.json
  "style": "isometric",                     // optional: isometric | line | sketch | chalk | pictogram | 3d (from the PRD)
  "altStyles": ["sketch", "3d"],            // optional: styles the learner can switch to on the stage
  "sourcesAccessed": "2026-11-23",
  "objectives": ["3-5 items, markdown-lite allowed"],
  "tabs": [ /* see below */ ],
  "quiz": [
    { "q": "Question?", "options": ["A", "B", "C", "D"], "answer": 2, "concept": "lifo", "why": "Explanation [S1]." }
  ],
  "related": {
    "prereqs": [ { "id": "arrays", "title": "Arrays", "why": "One line." } ],
    "next":    [ { "id": "queues", "title": "Queues", "why": "One line." } ]
  },
  "sources": [ { "id": "S1", "title": "…", "url": "https://…", "publisher": "…", "trust": "Primary: official docs" } ]
}
```

### Stepper tab

```jsonc
{ "id": "core", "title": "Core Mechanism", "icon": "stack", "kind": "stepper",
  "style": "line",                                         // optional: this tab's style (overrides lesson.style)
  "code": { "lang": "py", "title": "Python", "src": "line 1\nline 2" },   // optional, shared by all steps
  "steps": [
    {
      "title": "push(6)",                                   // ≤ 60 chars
      "scene": "stack-main",                                // id in scenes.js
      "state": { "stack": [4, 6], "op": "push(6)" },        // whatever the scene's render() reads
                                                            // three.js scenes: state.camera = { pos: [x,y,z], target: [x,y,z] } glides the view
      "narration": "≤ 60 words, **bold** key terms, cite [S2].",
      "callout": { "kind": "good-to-know", "text": "…" },   // optional: good-to-know | warning | insight
      "whatChanged": ["+ pushed 6", "~ top is now 6", "- popped 5"],   // optional, ≤ 4; + green, - red, ~ yellow
      "metrics": { "size": 2, "top": 6 },                   // optional chips above the stage; changed values glow
      "highlight": [3],                                     // optional: lines of tab.code to highlight
      "code": { "lang": "py", "title": "…", "src": "…", "highlight": [2] },   // optional per-step code (overrides tab.code)
      "formula": "L = Cl · (ρ · V² / 2) · A"               // optional, shown above code
    }
  ] }
```

### Deep Dive (`lessons`)

```jsonc
{ "id": "deep-dive", "title": "Deep Dive", "kind": "lessons",
  "lessons": [ { "id": "boundary-layer", "title": "Boundary layer & stall", "steps": [ /* stepper steps */ ] } ] }
```
Route: `#/<slug>/deep-dive:<lesson-id>/<step>`.

### Playground

```jsonc
{ "id": "playground", "title": "Playground", "kind": "playground", "heading": "Fly the wing",
  "scene": "wing-3d", "intro": "One or two sentences.",
  "state": { "flow": true },                                  // fixed state merged under the controls
  "controls": [
    { "id": "aoa", "label": "Angle of attack", "type": "range", "min": -4, "max": 20, "step": 1, "value": 5, "unit": "°" },
    { "id": "pressure", "label": "Show pressure", "type": "toggle", "value": true },
    { "id": "view", "label": "View", "type": "choice", "value": "side", "options": [ { "value": "side", "label": "Side" } ] }
  ] }
```
The scene receives `{ ...state, aoa, pressure, view }` and should export `metrics(state)` → `{ label: value }` and `note(state)` → markdown string (cite!).

### Story

```jsonc
{ "id": "story", "title": "Story & Misconceptions", "kind": "story", "intro": "…",
  "timeline": [ { "when": "1903", "title": "…", "text": "… [S8]" } ],
  "misconceptions": [ { "myth": "…", "why": "… [S4]", "truth": "… [S4]" } ] }
```

### Trade-offs

```jsonc
{ "id": "tradeoffs", "title": "Trade-offs", "kind": "tradeoffs", "heading": "…", "intro": "…",
  "useWhen": ["…"], "avoidWhen": ["…"], "pros": ["…"], "cons": ["…"],
  "alternatives": [ { "name": "Queue", "when": "…" } ],          // tech topics
  "perspectives": [ { "name": "The 'Newton' camp", "view": "…" } ] // non-tech topics (or both)
}
```

### Cheatsheet

```jsonc
{ "id": "cheatsheet", "title": "Cheatsheet", "kind": "cheatsheet",
  "facts": ["… [S1]"], "formulas": [ { "label": "Lift equation", "expr": "L = …", "note": "… [S2]" } ],
  "glossary": [ { "term": "Stall", "def": "… [S3]" } ] }
```

### Quiz, Related

`{ "id": "check", "title": "Check Yourself", "kind": "quiz" }` and `{ "id": "related", "title": "Related & Sources", "kind": "related" }`. Their content lives in top-level `quiz`, `related`, `sources`.

## Markdown-lite (all text fields)

`**bold**`, `*em*`, `` `code` ``, `[S3]` citation chips, `[text](https://url)` links. In narration, a blank line (`\n\n`) starts a new paragraph. Nothing else.

## Styles

`style` picks how every scene is drawn (see `scene-cookbook.md` § Styles and `references/styles/`). Choose it in the PRD from the topic: `isometric` for DSA and systems, `line` for physics, maths and statistics, `sketch` for ELI5 and general explainers, `chalk` for formulas, `pictogram` for business, history and people, `3d` for layered or structural topics. A tab may override it (ELI5 in `sketch` is a good default). List one or two `altStyles` so the learner can switch; `render-check.mjs` checks every declared style. The learner's choice overrides the tab styles.
