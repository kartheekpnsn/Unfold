---
name: topic-research
description: "Research a topic from primary, high-trust web sources into a fixed research.md (concepts as a dependency chain, cited claims, analogies, visual metaphors, misconceptions, trade-offs, timeline, prerequisites, quiz seeds) plus sources.json. Use when Unfold's research phase runs, or whenever the user asks to \"research X\" for learning or teaching purposes, even if they don't mention Unfold."
---

# Topic research

You turn a topic into a research pack that later phases depend on. You never rely on memory for facts: every claim comes from a page you actually opened in this session.

## Inputs

- The topic folder T, and `T/_unfold/probe.md` (why the learner wants it, where they start, research focus) and `T/_unfold/state.json` (duration). If you were invoked outside Unfold, ask nothing: use the user's message as the focus and assume 30 minutes.

## Tools

Use whichever web search and web fetch tools your harness gives you. **If you have none, stop and say so.** Do not write a research pack from memory, not even a "draft".

## Depth

| Duration | Sources | Claims |
|---|---|---|
| 30m | 8-12 | 25-40 |
| 2h | 20-30 | 60-100 |

## Method

1. **Map the topic.** Search broadly (3-5 queries) to find the key concepts and the best sources. Write the concept list as a **dependency chain**: each concept only needs the ones above it.
2. **Pick sources by trust**, following `references/source-trust.md`: primary and institutional first (official docs, standards, NASA/NIH/university pages, the original paper, the author's own site), then textbooks and reputable encyclopedias, then quality explainers. Avoid content farms and SEO listicles. Prefer the most recent version of a fact that changes.
3. **Read, don't skim.** Fetch each source and extract claims in your own words. One claim per line, ending with its source id: `Lift is perpendicular to the oncoming flow · [S1]`. Copy numbers exactly. If two sources disagree, record both and say which you trust and why.
4. **Collect teaching material** while reading: analogies, visual metaphors, misconceptions, debates, the story of how the idea came to be.
5. **Check yourself.** Every concept in the chain has at least two claims; every claim has a source id; every source in `sources.json` is cited at least once; nothing you write is from memory.
6. **Pitch at the probe.** The research focus in `probe.md` decides depth. A beginner doing it for curiosity needs strong analogies; an interview candidate needs complexity numbers and edge cases.

## Output 1: `T/_unfold/research.md`

Use `references/research-template.md` exactly: same headings, same order. Later phases parse it.

## Output 2: `T/_unfold/sources.json`

```json
[
  { "id": "S1", "title": "What is Lift?", "url": "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-lift/",
    "publisher": "NASA Glenn Research Center", "accessed": "2026-11-23", "trust": "primary", "note": "Defines lift; flow-turning explanation" }
]
```

`trust` is one of `primary`, `institutional`, `reference`, `secondary`. Ids are `S1…Sn` in the order you first cite them. Record the URL you actually read (after redirects).

## Non-tech topics

History, film, art and current events have the same structure with different emphasis:
- "Trade-offs" becomes **debates and perspectives**: name each camp, what it argues, and who argues it.
- Visual metaphors are timelines, maps, structure diagrams, cause-and-effect chains. Never plan to use stills, posters, photos of real people or lyrics.
- For film, cite interviews, screenplays-as-published, and scholarship; paraphrase, don't quote at length.

## Report

Finish with five lines: number of sources and their trust mix, the concept chain on one line, the strongest visual metaphor you found, the most common misconception, and anything you could not verify.
