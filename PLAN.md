# Unfold: PLAN.md

> **Unfold**: type a topic, get a step-through, animated explainer pitched at your level, added to a living knowledge graph of everything you've learned.

---

## 1. Name

**Unfold** (recommended). Every lesson unfolds one step at a time, like the reference sites, and the graph unfolds as you learn more. It's short, works as a command (`/unfold Stacks`), and doesn't clash with any of the four target tools.

Alternatives considered:

| Name | Why not first choice |
|---|---|
| Lattice | Good graph image, but says nothing about the explainers |
| Stepwise | Describes the pages but not the graph |
| Grokgraph | Catchy, but "Grok" is now xAI's product name |
| Explorables | Nod to Bret Victor's "explorable explanations"; hard to say as a command |

---

## 2. Decisions locked in

| # | Decision | Choice |
|---|---|---|
| Q1 | Hosting | One git repo, deployed to **GitHub Pages** by a workflow |
| Q2 | Rendering | **Isometric SVG step-animations by default** (like the samples); **three.js only when the topic is spatial** (airflow, molecules, orbits, network layers) |
| Q3 | Page layout | **Tabs on top, a stepper inside each tab**: animated stage in the centre, narration on the right, numbered steps along the bottom, topic tree on the left. URL `#/<topic>/<tab>/<step>` |
| Q4 | 30-min tabs | ELI5 · Core Mechanism · Technical · Check Yourself · Relevant Topics & Sources |
| Q5 | 2-hour tabs | The five above **plus** Deep Dive (2-3 sub-lessons) · Playground · Story & Misconceptions · **Trade-offs** (when to use, when not, pros, cons, alternatives) · Cheatsheet |
| Q6 | Grill timing | **2-3 probe questions → research → full grill** (questions built from the research) → PRD |
| Q7 | Grill format | **One question at a time**, multiple choice in a pop-up, adaptive; about 5-7 questions for 30 min, 10-12 for 2 h |
| Q8 | Graph edits | **Fully automatic** placement and re-parenting, each change logged in `graph/CHANGELOG.md` and committed on its own so it can be reverted |
| Q9 | Ghost nodes | **Yes**: prerequisites and next topics appear as faded, dashed nodes that link to "not built yet" plus the command to build them |
| Q10 | Palette | Neutral base with the **Microsoft logo colours as accents**, light and dark modes |
| Q11 | Harnesses | **Claude Code, Codex, GitHub Copilot** now; M365 Copilot deferred (see §9) |
| Q12 | Re-runs | **Ask each time**: upgrade in place / regenerate from scratch / cancel |
| Q13 | Page build | **Shared player plus per-topic data**: hand-built engine; each topic contributes `lesson.json` and `scenes.js` |

---

## 3. What a run looks like

```
/unfold "How do planes fly"
   │
   ├─ 0 Intake      exists already? ask: upgrade/regenerate/cancel · ask: 30 min or 2 h
   ├─ 1 Probe       2-3 questions: why are you learning this? what do you already know?
   ├─ 2 Research    ── Researcher subagent (fresh context, web) → research.md + sources.json
   ├─ 3 Grill       adaptive, one at a time, built from research → grill.md (level per concept)
   ├─ 4 PRD         PRD.md: learner profile, objectives, tab/step outline, scenes, quiz, graph placement
   │                one confirm pop-up: Build it / Tweak first
   ├─ 5 Build       ── Builder subagent (fresh context) → lesson.json + scenes.js
   │                validate schema · headless browser check of every step · screenshots
   ├─ 6 Graph       graph-keeper: add node, ghost prereqs/next, re-parent, changelog
   └─ 7 Ship        commit (topic + graph as separate commits) → push → Pages deploys
```

The user is asked something at four points: intake, probe, grill and the PRD confirm. Everything else runs unattended.

### Phase details

**0. Intake.** Slugify the topic and look it up in `graph.json`. A built node triggers the re-run question (Q12); a ghost node just gets promoted. Ask for the duration and write `state.json`, which records the current phase so an interrupted run can resume.

**1. Probe (2-3 questions).** Borrowed from the `teach` skill's *mission* idea: *why* you want this (curiosity, interview, work, exam) and a self-rated starting point. Research is then aimed at the right depth. Output: `probe.md`.

**2. Research.** Runs in a subagent with a fresh context window so dozens of pages of reading don't crowd out the main session. It favours primary and high-trust sources and never relies on the model's memory for facts. Output `research.md` is a fixed structure so later phases can depend on it:
- Key concepts (ordered as a dependency chain)
- Claims with citations, one per line: `claim · [S3]`
- Analogies for ELI5 (2-3 candidates)
- **Visual metaphors**: for each core concept, what the animation could show and whether it needs 3D
- Common misconceptions
- Trade-offs / when (not) to use: for non-tech topics this becomes "debates and perspectives"
- Timeline / story (2 h)
- Prerequisites and next topics (candidate graph neighbours)
- Suggested quiz items

Depth: about 8-12 sources for 30 min, 20-30 for 2 h. `sources.json` holds title, URL, publisher, date accessed and a trust note.

**3. Grill.** Main agent only, because subagents can't talk to the user. Questions come from `research.md`, one at a time, multiple choice with one "explain it in one sentence" free-text question. After each answer it gives one line of feedback, then picks the next question adaptively (harder if right, probe the gap if wrong). Following the `teach` skill's quiz rule, answer options are equal length and the correct answer's position varies. Output `grill.md`: each concept marked **unknown / shaky / solid**, misconceptions detected, and the chosen pitch level (Beginner / Intermediate / Advanced).

**4. PRD.** The replayable contract (the "store all intermediate artifacts" requirement). Anyone, or any of the three tools, can rebuild the page from `PRD.md` + `research.md` alone. It contains the learner profile, 3-5 learning objectives, the tab list, and for every tab the step titles, one-line narration intent, scene id, SVG or three.js, and what the scene shows. It also has the quiz items aimed at the shaky concepts, the planned graph placement, and the sources to cite. One confirm pop-up follows (`Build it` / `Tweak first`), skippable with `--yes`.

**5. Build.** A subagent that gets only `PRD.md`, `research.md` and the player docs, not the chat history. It writes `lesson.json` (all text) and `scenes.js` (custom animations built from the player's scene kit). Then it runs:
- `scripts/validate-lesson.mjs`: schema, every scene id exists, every claim's source id exists, quiz rules
- `scripts/check-page.mjs`: headless Chromium visits every tab and step, fails on any console error, and saves screenshots to `work/screens/`

It fixes and reruns until both pass (maximum 3 loops), then reports.

**6. Graph.** See §6. Automatic, with a changelog.

**7. Ship.** Commit `topic(<slug>): <duration>` and, separately, `graph: <summary>`. Push; the Pages workflow deploys `site/`.

---

## 4. Skills (5) and why

All skills follow the open SKILL.md standard. Per the skill-creator guidance: a "pushy" description, a body under about 300 lines, and details moved into `references/`, `scripts/` and `assets/`.

| Skill | Invoked by | Job | Why it's its own skill |
|---|---|---|---|
| **`unfold`** | **User** (`/unfold`, `$unfold`) | Orchestrator: intake, probe, phase order, `state.json`, PRD writing, confirm gate, ship. Holds the PRD template. | The single front door. User-invoked only (like `grill-me`) so it never fires by accident. |
| **`topic-research`** | `unfold` → Researcher | Web research to the fixed `research.md` structure plus `sources.json`, with source-trust rules. | Runs in a fresh context, and is reusable alone ("just research X for me"). |
| **`learner-grill`** | `unfold` (main agent) | Adaptive one-at-a-time assessment → `grill.md`. | mattpocock's `grilling` stress-tests a *plan*; this tests *your understanding*, so it has different rules (hidden answers, feedback, mastery tags). Borrows its "facts are my job, decisions are yours" split and its confirm-before-acting gate. |
| **`lesson-builder`** | `unfold` → Builder | PRD → `lesson.json` + `scenes.js`; validate; browser check. References: tab specs, scene cookbook, design tokens, writing style, quiz rules. | The biggest body of know-how (how to make it look like the samples). Loaded only when building. |
| **`graph-keeper`** | `unfold`, or user ("fix my graph") | Place node, ghost nodes, re-parent, changelog, via `scripts/graph.mjs` so every edit is deterministic and validated. | Graph logic is fiddly and must be correct across runs. A script plus a small skill beats prose instructions. |

What is deliberately **not** a skill: the player engine and graph viewer. They're ordinary code in the repo, built once by hand and reused by every topic. Putting them in a skill would make the agent regenerate them each time, which is exactly the drift Q13 avoids.

### Skill file layout

```
.agents/skills/
  unfold/
    SKILL.md
    agents/openai.yaml          # Codex: display name + allow_implicit_invocation: false
    references/prd-template.md
    references/state-schema.md
  topic-research/
    SKILL.md
    references/research-template.md
    references/source-trust.md  # what counts as high-trust, per domain (DSA, ML, science, history, film…)
  learner-grill/
    SKILL.md
    references/question-patterns.md   # recall, apply, spot-the-bug, predict-the-next-step, explain
  lesson-builder/
    SKILL.md
    references/tabs.md          # spec for every tab (30 m + 2 h)
    references/scene-cookbook.md # isometric SVG primitives, three.js when-and-how, animation timing
    references/design-tokens.md
    references/writing-style.md # ELI5 vs technical voice, step length, narration rules
    scripts/validate-lesson.mjs
    scripts/check-page.mjs
  graph-keeper/
    SKILL.md
    scripts/graph.mjs
```

---

## 5. Agents (1 principal + 2 subagents) and why

| Agent | Runs | Why it exists |
|---|---|---|
| **Principal (Unfold)** | The normal chat session running the `unfold` skill | Owns every interaction with you (pop-ups, grill, confirm) and the graph. Subagents can't ask the user questions, so this can't be delegated. |
| **Researcher** | `topic-research` in a **fresh context** | Research reads a lot; isolating it keeps the main context clean for the grill. Has web tools; no write access outside `work/`. |
| **Builder** | `lesson-builder` in a **fresh context** | Builds from the PRD alone. This proves the PRD is a complete, replayable spec, and keeps the long code-writing/debug loop out of the main session. |

Not added, on purpose:
- **Reviewer/fact-checker agent.** The validator already enforces citation coverage. Add it in v2 if the evals in §10 show factual slips.
- **Grill agent.** It needs the user, so it stays in the principal.
- **Graph agent.** It's about 20 seconds of scripted work, not worth a context switch.

### Portability rule: skills hold the logic, agents are thin

Agent file formats differ in each tool. Each agent is therefore a ~10-line wrapper that says "follow skill X, write only to `work/`". There's one source file per agent in `agents/`, and `scripts/sync-agents.mjs` generates:

| Tool | Skills read from | Subagent file |
|---|---|---|
| Claude Code | `.claude/skills/` (synced copy of `.agents/skills/`) | `.claude/agents/unfold-researcher.md` |
| Codex | `.agents/skills/` | `.codex/agents/unfold-researcher.toml` |
| GitHub Copilot (CLI / VS Code agent mode) | `.agents/skills/` (also reads `.claude/skills/`) | `.github/agents/unfold-researcher.agent.md` |

**Fallback:** if a tool can't spawn subagents, `unfold` runs the skill inline. The output is the same, just with a heavier context.

### Tool-agnostic wording inside the skills

The skills never name a specific tool. They say things like:
- "Ask with your harness's multiple-choice/ask-user tool if it has one; otherwise ask in plain text with lettered options and wait."
- "Use whichever web search and fetch tools you have. If you have none, stop and say so; never research from memory."
- "Start the subagent with a fresh context window." Codex forks the parent context by default; mattpocock's repo hit the same issue.

---

## 6. Knowledge graph

### Data (`site/graph/graph.json`)

```json
{
  "nodes": [
    { "id": "machine-learning", "title": "Machine Learning", "status": "built",
      "duration": "2h", "level": "intermediate", "domain": "ai-ml",
      "href": "topics/machine-learning/", "icon": "brain-circuit", "updated": "2026-11-23" },
    { "id": "linear-algebra", "title": "Linear Algebra", "status": "ghost", "domain": "math" }
  ],
  "edges": [
    { "from": "machine-learning", "to": "deep-learning", "type": "parent" },
    { "from": "linear-algebra", "to": "machine-learning", "type": "prereq" },
    { "from": "deep-learning", "to": "transformers", "type": "parent" }
  ]
}
```

- **`parent`** edges form the "is a part/kind of" tree (a forest: one root per domain). Each node has at most one parent.
- **`prereq` / `next` / `related`** are cross-links, drawn lighter.
- **Ghost nodes** (`status: ghost`) come from a page's Prerequisites and Next lists.

### Automatic placement algorithm (graph-keeper)

When a new node **N** arrives:
1. **Find the parent.** Pick the most specific existing node that N is a kind/part of (e.g. DL → ML). If none fits, N becomes a new domain root.
2. **Adopt children.** Look at the parent's current children: any child that is a kind/part of N moves under N. (Transformers: ML → DL, matching your example.)
3. **Merge ghosts.** If N already exists as a ghost, promote it and keep its edges.
4. **Add ghosts** for N's prerequisites and next topics that don't exist yet.
5. **Validate** with `graph.mjs check`: no cycles, one parent at most, every `href` exists for built nodes, slugs unique.
6. **Log** one line per change in `graph/CHANGELOG.md` (`2026-11-23 · moved transformers: machine-learning → deep-learning (reason: transformers are a deep-learning architecture)`) and commit separately. Undo = `git revert`.

Steps 1-2 are the agent's judgement; `graph.mjs` performs every write (`add`, `set-parent`, `link`, `promote`, `check`), so the JSON is never hand-edited.

### Graph view (`site/index.html`, the home page)

Obsidian-style force-directed graph in plain SVG plus a small force simulation (no framework):
- Node colour = top-level domain (the four logo accents, then tints for further domains). Faded and dashed = ghost. A ring shows your quiz progress (from `localStorage`).
- Click a built node → opens its page. Click a ghost → card with "Not built yet · run `/unfold <topic>`".
- Search, domain filter, toggle cross-links, a "zoom to subtree" button.
- The left pane on every topic page is the same tree, so the graph and the pages stay in sync.

---

## 7. Page design

### Layout (from the reference sites, adapted for tabs)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ◆ Unfold   [ELI5][Core][Technical][Check][Related] …2h tabs…   🔍  ◐     │
├────────────┬──────────────────────────────────────────┬───────────────────┤
│ Topic tree │  Title · 30 min · Beginner · 8 steps     │ STEP 3 / 8        │
│ (graph)    │  ┌ metric chips ┐        ⟲ Replay ⏸ Pause │ Step title        │
│            │                                          │ Narration…        │
│            │        animated stage (SVG / three.js)   │ ✱ Good to know    │
│            │                                          │ What changed      │
│            │                                          │ ← Back   Next →   │
│            ├──────────────────────────────────────────┤ Pseudocode/formula│
│            │ ①─②─③─④─⑤─⑥─⑦─⑧  step rail              │ You'll learn ☑    │
└────────────┴──────────────────────────────────────────┴───────────────────┘
```
Keyboard: ← → steps, Space pause, R replay, 1-9 tabs. Responsive: on mobile the panes stack and the stepper becomes swipeable.

### Tabs

| Tab | 30m | 2h | Content |
|---|---|---|---|
| ELI5 | ✓ | ✓ | Analogy-led stepper, about 5 steps, no jargon |
| Core Mechanism | ✓ | ✓ | The one animation that *is* the topic (8-10 steps) |
| Technical | ✓ | ✓ | Precise definitions, formulas/pseudocode/code, key numbers, pitched at the grill level |
| Deep Dive | | ✓ | 2-3 sub-lessons, each its own stepper |
| Playground | | ✓ | Sliders/inputs driving the scene (push/pop; angle of attack vs lift; attention weights) |
| Story & Misconceptions | | ✓ | Timeline of how it came to be, plus "mistake → why it's wrong → correct idea" cards |
| Trade-offs | | ✓ | When to use, when not, pros, cons, alternatives. For history/film topics: competing perspectives and debates |
| Check Yourself | ✓ | ✓ | Quiz aimed at the concepts the grill marked shaky; instant feedback; scores saved locally |
| Cheatsheet | | ✓ | One print-friendly page: glossary, formulas, key facts |
| Related & Sources | ✓ | ✓ | Prerequisites and Next (linking to graph nodes, built or ghost) plus numbered sources |

### Visual system

- **Theme:** minimal, lots of whitespace, thin 1px rules, rounded 10px cards, a subtle isometric dot-grid behind the stage (as in the samples).
- **Palette:**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFAF8` | `#16171A` | page |
| `--surface` | `#FFFFFF` | `#1F2024` | panes, cards |
| `--ink` | `#1B1B1F` | `#EDEDED` | text |
| `--muted` | `#737373` | `#9A9A9A` | secondary text, ghost nodes |
| `--red` | `#F25022` | | warnings, "pop"/remove, misconceptions |
| `--green` | `#7FBA00` | | correct, done, "push"/add |
| `--blue` | `#00A4EF` | | primary actions, active step, links |
| `--yellow` | `#FFB900` | | highlight, "good to know", in-flight |

Accents are tuned for contrast in each mode (yellow text never on white; it's used as a fill). The colour meanings stay the same everywhere, so red always means "removed/wrong".
- **Type:** system UI stack (Segoe UI on Windows) for text; Cascadia Code (MIT/OFL, Microsoft) for code and numbers.
- **Icons:** Fluent UI System Icons (MIT, Microsoft): a vendored subset, used for tabs, callouts and graph nodes. **No logos or brand marks**, and no photos of real people or film stills (film and history topics use diagrams, timelines and icons only).
- **Animation:** 300-600 ms eased transitions between step states; scenes are *state-based* (step N defines the state, the engine tweens to it), so Back works and deep links render correctly. `prefers-reduced-motion` turns tweens into cuts.
- **3D:** three.js (pinned, vendored in `site/player/vendor/`) only for scenes flagged `mode: "three"` in the PRD; OrbitControls for drag-to-rotate; it falls back to a static SVG if WebGL is unavailable.

### Per-topic data contract (sketch)

```jsonc
// site/topics/stacks/lesson.json
{
  "slug": "stacks", "title": "Stacks", "duration": "30m", "level": "beginner",
  "objectives": ["…"],
  "tabs": [
    { "id": "core", "title": "Core Mechanism", "icon": "stack",
      "steps": [
        { "title": "A bigger one arrives", "scene": "stack-main", "state": { "stack": [4,6], "incoming": 5 },
          "narration": "6 is bigger than the top… [S2]", "callout": { "kind": "good-to-know", "text": "…" },
          "whatChanged": ["pushed 6"], "metrics": { "size": 2 }, "code": { "lang": "py", "src": "…", "highlight": [3,4] } }
      ] }
  ],
  "quiz": [ { "q": "…", "options": ["…","…","…","…"], "answer": 2, "concept": "lifo", "why": "…" } ],
  "related": { "prereqs": ["arrays"], "next": ["monotonic-stack", "queues"] },
  "sources": [ { "id": "S2", "title": "…", "url": "…" } ]
}
```
`scenes.js` exports `{ "stack-main": { mode: "svg", mount(stage, kit), render(state, prev) } }`. The **scene kit** in the player supplies isometric primitives (box, slab, arrow, label, token, queue lane, chart) so topic scenes are short.

---

## 8. Repository layout

```
unfold/
├── AGENTS.md                 # rules for every tool (Codex + Copilot read this)
├── CLAUDE.md                 # one line: "@AGENTS.md"
├── .agents/skills/…          # canonical skills (§4)
├── .claude/skills/…          # synced copy for Claude Code (scripts/sync-agents.mjs)
├── agents/                   # agent sources → generated into .claude/.codex/.github
├── .github/workflows/pages.yml
├── scripts/
│   ├── new-topic.mjs         # creates work/ + site/ folders, state.json
│   └── sync-agents.mjs
├── work/<slug>/              # intermediate artifacts, committed, not deployed
│   ├── state.json            # phase, duration, timestamps, run history
│   ├── probe.md
│   ├── research.md
│   ├── sources.json
│   ├── grill.md
│   ├── PRD.md                # the replayable spec
│   ├── build-log.md          # validator and browser-check results per loop
│   └── screens/              # screenshot per tab/step from check-page
├── graph/CHANGELOG.md
└── site/                     # GitHub Pages root
    ├── index.html            # graph home
    ├── graph/graph.json, graph.js
    ├── player/               # player.js, scene-kit.js, three-stage.js, quiz.js, theme.css, icons/, vendor/
    └── topics/<slug>/index.html (thin shell), lesson.json, scenes.js
```

Replication guarantee: `work/<slug>/PRD.md` + `research.md` + the player version recorded in `state.json` are enough for any of the three tools to rebuild the page (`/unfold <topic>` → "regenerate from PRD").

---

## 9. M365 Copilot (deferred)

Not in v1, by your choice. The design keeps it cheap to add later:
- All skills are already standard SKILL.md, and M365 Copilot Chat/Cowork accepts SKILL.md uploads.
- The cheapest v2 path is a **research + grill + PRD** mode: M365 writes `PRD.md` and `research.md` to OneDrive, you drop them into `work/<slug>/`, and any of the other tools runs `/unfold <topic>` → "build from existing PRD". The orchestrator already supports resuming from `state.json`, so this needs no new skill.

---

## 10. Implementation plan (building Unfold itself)

| Milestone | Deliverable | Done when |
|---|---|---|
| **M0 Scaffold** | Repo, AGENTS.md, Pages workflow, `sync-agents.mjs`, `new-topic.mjs` | An empty site deploys to Pages |
| **M1 Player + design system** | `site/player/*`, theme tokens, scene kit, tabs/stepper/routing/narration/quiz, light/dark, keyboard, reduced-motion | A **hand-written "Stacks" lesson** looks and feels on par with the two sample sites (side-by-side screenshot review) |
| **M2 three.js stage** | `three-stage.js` with the same state-tween contract, WebGL fallback | A hand-written "Lift on a wing" scene runs in the Core tab |
| **M3 Graph** | `graph.mjs` (add/set-parent/link/promote/check), graph home page, left-pane tree | The ML → Transformers → DL re-parent scenario passes as a scripted test |
| **M4 Validators** | `validate-lesson.mjs`, `check-page.mjs` (Playwright) | Both catch a deliberately broken lesson |
| **M5 Skills** | Five SKILL.md files + references, written with skill-creator guidance | Each skill passes skill-creator's quick validation; descriptions trigger correctly |
| **M6 Agents + portability** | Agent sources, generated wrappers for the 3 tools | The same topic runs end to end in **Claude Code, Codex and Copilot CLI** |
| **M7 Evals** | 6 eval topics, one per domain (below), rubric scoring, iterate on skills | Every topic scores ≥ 4/5 on every rubric line |
| **M8 Polish** | Progress rings, search, print styles for Cheatsheet, README | You use it for a week without touching the code |

**Eval topics:** Stacks (DSA) · Transformers (AI/ML) · How do planes fly (science, 3D) · The French Revolution (history) · How DNS works (tech) · How Christopher Nolan structures non-linear films (movies).

**Rubric:**
- Is the content right for the learner's level?
- Is every claim cited?
- Does the animation clarify rather than decorate?
- Does every step fit on one screen?
- Does the quiz target the grill's gaps?
- Is the graph placement correct?
- Are there zero console errors?
- Is the page usable on mobile?

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Generated animations look generic | Scene kit plus a cookbook of worked scene patterns; M1 sets a hand-made quality bar; screenshots reviewed in evals |
| A tool lacks web search | `topic-research` stops and says so rather than researching from memory; document how to enable search per tool in README |
| A tool lacks subagents or forks context | Inline fallback; "fresh context" wording in every dispatch |
| Fully automatic re-parenting makes a bad move | Validated by script, one changelog line per change, separate git commit → `git revert` |
| Pages too long for "30 min" | `tabs.md` sets step budgets per tab (e.g. ELI5 ≤ 5 steps, narration ≤ 60 words/step); the validator enforces them |
| Copyrighted material in film/history topics | Diagrams, timelines and icons only; paraphrase with citations; no stills, posters or lyrics |
| Player changes break old topics | `state.json` records the player version; `check-page.mjs` runs over all topics in CI |

---

## 12. Reference material this plan draws on

- **mattpocock/skills**: `grilling` (design tree, frontier, facts vs decisions, confirm gate), `grill-me` (user-invoked wrapper; `disable-model-invocation` plus Codex `allow_implicit_invocation: false`), `teach` (mission, lessons, reference sheets, learning records, equal-length quiz options), and the repo's one-source, three-harness packaging.
- **obra/superpowers `brainstorming`**: one question at a time, multiple choice preferred, approval gate before building, design written to a dated doc.
- **anthropics skill-creator**: SKILL.md anatomy, progressive disclosure, under ~500 lines, scripts for repeated work, eval loop and description tuning.
- **designed-to-scale / byte-sized-algorithms** (inspected live): three-pane layout, isometric SVG stage (no canvas/three.js), metric chips, step rail with per-step URLs, "Good to know" and "What changed" callouts, pseudocode panel with highlighted lines.