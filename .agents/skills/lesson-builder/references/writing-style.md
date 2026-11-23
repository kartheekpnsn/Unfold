# Writing style

## Everywhere

- Short sentences. Active voice. Plain words; define a term the first time you use it, in **bold**.
- **≤ 60 words of narration per step** (validator-enforced) so every step fits on one screen with its callout.
- Cite every factual claim with `[S#]` right after the sentence it supports. Analogies and your own framing don't need citations.
- Narrate the change: the scene shows *what*, the narration says *why it matters*. Don't describe pixels ("the blue box moves left").
- No hype ("amazing", "simply", "just"), no rhetorical questions in a row, no exclamation marks.
- Paraphrase sources. Quote only short phrases, attributed, and never lyrics or long dialogue.

## Voice per tab

| Tab | Voice | Example |
|---|---|---|
| ELI5 | Warm, concrete, second person. One analogy carried through. Name the real term only at the end of a step, after the idea lands. | "Picture a pile of clean plates. You only ever add to the top or take from the top." |
| Core | Calm narrator walking through one mechanism. Each step: what happened, then why. | "6 goes **on top of** 4. Nothing below the top moves." |
| Technical | Precise, at the grill's level. Definitions, numbers, complexity, formulas. Every step cites. | "Removing from the end of a dynamic array takes amortized **O(1)** time [S1]." |
| Deep Dive | Like Technical, one sub-topic per sub-lesson, building on what Core showed. | |
| Story | Past tense, dated, cited. Who did what, and why it mattered for the idea. | |
| Misconceptions | Respectful: the myth is common for a reason. Mistake → why it's wrong → correct idea. | |
| Trade-offs | Balanced. For non-tech topics, present each camp fairly and attribute views. | |

## Step titles

≤ 60 characters. Name the event or idea: "push(6)", "Pop on empty: underflow", "Air goes down, wing goes up". Not "Step 3" or "Next".

## Callouts (at most one per step)

- `good-to-know`: a useful aside or connection ("A queue is the opposite…").
- `warning`: a common bug or dangerous misunderstanding.
- `insight`: the "aha" that ties two ideas together.

## Quiz rules

- Aim at the concepts `grill.md` marked **shaky** or **unknown** first; tag each question with its `concept`.
- Four options, **about equal length** and the same grammatical form. Distractors come from real misconceptions.
- **Vary the correct position** across questions; no position holds more than half the answers.
- The correct option should not usually be the longest.
- `why` explains the right answer in one or two sentences and cites a source.
- Mix patterns: recall, apply, predict-the-next-step, spot-the-flaw.

## Objectives

3-5, verb-first and checkable: "Explain…", "Trace…", "Predict…", "Spot…". They appear as a checklist the learner ticks.
