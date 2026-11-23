# _unfold/state.json

Each topic folder's `_unfold/state.json` records where the run is, so an interrupted run can resume. Write it yourself (plain JSON) and update `phase` after every phase.

```jsonc
{
  "title": "Large Language Models",   // clean human title
  "topic": "LLM",                     // what the user typed
  "folder": "ML/DL/LLM",              // path under topics/ (update it if the folder is moved)
  "duration": "30m",                  // or "2h"
  "level": "intermediate",            // set after the grill
  "phase": "grill",                   // last completed phase
  "phases": { "intake": "2026-11-23T10:00:00Z", "probe": "…", "research": "…", "grill": "…" },
  "runs": [ { "started": "…", "mode": "new", "finished": "…" } ],   // mode: new | upgrade | regenerate | from-prd
  "notes": [ "research: 9 sources, 6 primary" ]
}
```

## Phases, in order

| phase | written after | resume by |
|---|---|---|
| `intake` | folder created, duration chosen | asking the probe questions |
| `probe` | `probe.md` | starting the Researcher |
| `research` | `research.md`, `sources.json` | running the grill |
| `grill` | `grill.md` | writing the PRD |
| `prd` | `PRD.md` confirmed | starting the Builder |
| `build` | `index.html` built | adopting folders and rebuilding |
| `done` | moves made, pages rebuilt, user told | nothing to resume |

## Everything in `_unfold/`

| File | Written in |
|---|---|
| `state.json` | every phase |
| `probe.md` | probe |
| `research.md`, `sources.json` | research |
| `grill.md` | grill |
| `PRD.md` | PRD |
| `lesson.json`, `scenes.js`, `build-log.md` | build |
