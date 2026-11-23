---
name: topic-tree
description: "Keep the Unfold topic library organised as a folder tree where each subtopic lives inside the topic it is a kind of or part of (topics/ML/DL/LLM): decide where a new topic goes, move existing folders under a new topic that adopts them, rebuild the pages, and log every change. Use during an Unfold run, or when the user says things like 'move X under Y', 'reorganise my topics', 'what topics do I have', or 'fix my topic tree'."
---

# Topic tree

The library is `topics/`. A **topic** is a folder containing `_unfold/` (its lesson source) and, once built, `index.html`. **Subtopics are subfolders.** The folder tree *is* the knowledge graph:

```
topics/
  Stacks/
  ML/
    DL/
      LLM/
```

There is no separate hierarchy file: the nesting is the only record. All changes go through `scripts/tree.mjs`, which refuses impossible moves (a folder into itself, a name that already exists), appends one line per change to `topics/CHANGELOG.md`, and rebuilds every page after a move (each page bakes in its breadcrumbs and subtopic links). `create`, `move` and `rebuild` also rewrite `topics/index.html`, the library graph (folders as "contains" edges, plus each lesson's `related.prereqs`/`next`; unbuilt ones appear as suggested nodes). Never edit it by hand.

```
TREE="node .agents/skills/topic-tree/scripts/tree.mjs"
$TREE tree                                   # see the library
$TREE find "Deep Learning"                   # path or "none" (matches folder name, title or slug)
$TREE create "DL" --parent ML --reason "…"   # new topic folder: topics/ML/DL/_unfold/
$TREE move ML/LLM ML/DL --reason "…"         # move a topic and its subtopics; rebuilds all pages
$TREE move ML/LLM . --reason "…"             # move back to the top level
$TREE rebuild                                # rebuild every page
$TREE check                                  # built vs unfinished topics
```

## Placing a new topic N

1. **Look first:** `$TREE tree`, and `$TREE find` for N under its likely names (ML ↔ Machine Learning). Don't create a duplicate.
2. **Pick the parent:** the *most specific* existing topic that N **is a kind of** or **is part of**.
   - DL → `ML` (deep learning is a kind of machine learning). LLM → `ML/DL` if DL exists, else `ML`. DNS → `Networking` if it exists. Stacks → top level if there's no data-structures topic.
   - **Not** a parent: prerequisites (Linear Algebra is needed *for* ML; it isn't *a kind of* ML), siblings, loosely related topics. Those just appear in the lesson's Related tab.
   - Nothing fits → top level (`--parent .` or omit `--parent`).
3. **Create:** `$TREE create "<Name>" --parent <path> --reason "<N is a kind/part of parent>"`. Use the user's own term as the folder name: they said "ML", so the folder is `ML`, not `Machine-Learning`. Multi-word names become `How-Do-Planes-Fly`.

## Adopting existing topics (after N is built)

N may be the missing middle level for topics that already exist. Check:
- every **sibling** of N (other children of N's parent), and
- every **top-level** topic,

and for each, ask: is it a kind of / part of N? If yes: `$TREE move <its path> <N's path> --reason "<it is a kind/part of N>"`.

Example: the library has `ML/` and `ML/LLM/`. The user unfolds "DL", which goes to `ML/DL`. LLMs are deep-learning models, so `$TREE move ML/LLM ML/DL --reason "LLMs are deep-learning models"`. Result: `ML/DL/LLM`.

Be conservative: move only when the kind-of/part-of relation is clear. When unsure, leave it where it is and mention it in your report.

## Finishing

Always end with `$TREE rebuild`, then report each change in one line, as `topics/CHANGELOG.md` shows it.

## On request

- "Move X under Y" → `$TREE move X Y --reason "<user's reason>"`.
- "X shouldn't be under Y" → `$TREE move Y/X . --reason "…"` (back to top level) or under the right parent.
- "Delete X" → ask first, then remove the folder yourself (it deletes its subtopics too, so ask about those) and run `$TREE rebuild`.
