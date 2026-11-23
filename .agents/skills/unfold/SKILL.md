---
name: unfold
description: "Turn a topic into a self-contained, animated, step-through explainer page (index.html) pitched at the learner's level, filed in a folder tree where subtopics live inside their parent topic (ML/DL/LLM). Use ONLY when the user runs /unfold or $unfold, selects the unfold agent, or explicitly asks Unfold to build, upgrade or regenerate a lesson. Runs intake, a short probe, web research, an adaptive grill, a PRD, the build and the folder placement."
disable-model-invocation: true
argument-hint: "\"topic\" [--yes] [--duration 30m|2h]"
---

# Unfold: orchestrator

The user names a topic ("Stacks", "ML", "How do planes fly"). You end with a folder holding one `index.html` that opens by double-click, no server needed:

```
topics/
  Stacks/index.html
  ML/index.html
  ML/DL/index.html
  ML/DL/LLM/index.html
```

A subtopic lives **inside** the folder of the topic it is a kind of or part of. When a new topic arrives, existing folders that belong under it **move into it** (LLM moves into DL when DL arrives). Each topic folder also holds `_unfold/`: the lesson source and every intermediate artifact.

```
0 Intake + placement → 1 Probe → 2 Research (subagent) → 3 Grill → 4 PRD + confirm → 5 Build (subagent) → 6 Adopt + rebuild → 7 Report
```

You ask the user something at exactly four points: intake, probe, grill, PRD confirm. You are the only agent that talks to the user; the Researcher and Builder are subagents with fresh context and cannot ask questions.

Shorthands used below (run from the repo root):

```
TREE="node .agents/skills/topic-tree/scripts/tree.mjs"
BUILD="node .agents/skills/lesson-builder/scripts/build-page.mjs"
```

## How to ask the user

- **One question at a time**, multiple choice where possible.
- Use your harness's ask-user / multiple-choice tool if it has one. Otherwise print the question with lettered options (A, B, C…) on separate lines, then **stop and wait**.
- Never ask what you can find out yourself.

## Phase 0: Intake and placement

1. `$TREE find "<topic>"`. Also try the obvious long or short form ("ML" ↔ "Machine Learning").
2. **Already exists and built?** Ask: *Upgrade in place* (keep the PRD, rebuild with new research if useful) / *Regenerate from scratch* / *Cancel*. If its `_unfold/PRD.md` exists, also offer *Rebuild from the existing PRD* (jump to Build).
3. **Exists but unfinished** (no `index.html`)? Read `_unfold/state.json` and ask: *Resume from <phase>* / *Start over* / *Cancel*.
4. **New:** decide where it goes, following the `topic-tree` skill. Run `$TREE tree`, pick the most specific existing topic it is a kind of / part of (or none → top level), then `$TREE create "<Name>" --parent <path> --reason "<why>"`. Use the user's own term as the folder name ("ML", "LLM", "Stacks"). The command prints the folder path; call it **T** from here on.
5. Ask the **duration** unless given: *30 minutes* (ELI5, Core, Technical, Check Yourself, Related) or *2 hours* (adds Deep Dive, Playground, Story & Misconceptions, Trade-offs, Cheatsheet).
6. Write `T/_unfold/state.json` (see `references/state-schema.md`) with phase `intake`.

Update `state.json`'s `phase` after every phase below, so an interrupted run can resume.

## Phase 1: Probe (2-3 questions)

1. **Why are you learning this?** Curiosity / an interview or exam / using it at work / teaching someone.
2. **Where are you starting from?** Never heard of it / I know the words but not how it works / I use it but want the deep version.
3. Only if needed: one scoping question ("ML: the whole field, or how models learn?").

Write `T/_unfold/probe.md`: the answers plus one line, *Research focus:*. Phase → `probe`.

## Phase 2: Research (Researcher subagent)

Start the **unfold-researcher** subagent **with a fresh context**: don't fork this conversation (in Codex, ask for a new, non-forked agent). Give it only:

> Research the Unfold topic in folder `T` for a `<30m|2h>` lesson. Read `.agents/skills/topic-research/SKILL.md` and follow it. Inputs: `T/_unfold/probe.md`, `T/_unfold/state.json`. Write only `T/_unfold/research.md` and `T/_unfold/sources.json`.

No subagents in your tool? Follow `topic-research` yourself, inline.

Check `research.md` has every template section and `sources.json` has ≥ 8 sources (30m) or ≥ 20 (2h). If the researcher had no web access, stop and tell the user how to enable web search; **never continue from memory**. Phase → `research`.

## Phase 3: Grill

Follow the `learner-grill` skill yourself (it needs the user). It writes `T/_unfold/grill.md` with each concept marked **unknown / shaky / solid** and a pitch level. Phase → `grill`.

## Phase 4: PRD and confirm

Write `T/_unfold/PRD.md` from `references/prd-template.md`, using only `probe.md`, `research.md`, `grill.md` and `.agents/skills/lesson-builder/references/tabs.md`. The PRD is the **replayable contract**: any of the three tools must be able to rebuild the page from `PRD.md` + `research.md` alone. Include the placement (parent, and which existing folders this topic will adopt).

Show a short summary (level, objectives, tabs with step counts, 3D scenes if any, folder placement and planned moves) and ask once: *Build it* / *Tweak first*. Skip the question with `--yes`. Phase → `prd`.

## Phase 5: Build (Builder subagent)

Start the **unfold-builder** subagent **with a fresh context**. Give it only:

> Build the Unfold lesson in folder `T`. Read `.agents/skills/lesson-builder/SKILL.md` and follow it. Inputs: `T/_unfold/PRD.md`, `T/_unfold/research.md`, `T/_unfold/sources.json`. Write `T/_unfold/lesson.json`, `T/_unfold/scenes.js` and `T/_unfold/build-log.md`, then build `T/index.html`.

No subagents? Follow `lesson-builder` inline. Afterwards confirm: `$BUILD T` prints ✓. If it still fails after the builder's 3 loops, show the user the remaining errors and stop. Phase → `build`.

## Phase 6: Adopt and rebuild

Follow the `topic-tree` skill: for each sibling folder (same parent as T) and each top-level folder that is a kind/part of the new topic, `$TREE move <path> <T> --reason "…"`. Example: T = `ML/DL`; `ML/LLM` exists; LLMs are deep-learning models → `$TREE move ML/LLM ML/DL --reason "LLMs are deep-learning models"`.

Then `$TREE rebuild` (always, even with no moves): every page bakes in its breadcrumbs and subtopic links, so the parent page must learn about its new child. Phase → `done`.

## Phase 7: Report

Tell the user, in a few lines: the file to open (`T/index.html`), that `topics/index.html` shows it on the library graph, level and duration, any folders moved (one line each, as in `topics/CHANGELOG.md`), and the result of `$TREE tree`.

Don't commit or push unless the user asks.

## Rules

- **Never research from memory.** Facts come from `research.md`, which cites `sources.json`.
- **Never edit the player** (`.agents/skills/lesson-builder/assets/player/`) for one topic, and never hand-edit an `index.html`: change `_unfold/lesson.json` or `_unfold/scenes.js` and rebuild.
- **Move folders only with `tree.mjs move`** (it logs the change and rebuilds every page).
- **No copyrighted media**: no film stills, posters, logos, photos of real people or lyrics. Diagrams, timelines and icons only.

## Files

- `references/prd-template.md`: the PRD structure. Fill every section.
- `references/state-schema.md`: what `_unfold/state.json` holds.
