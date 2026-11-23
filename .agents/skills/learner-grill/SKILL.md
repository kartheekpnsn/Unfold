---
name: learner-grill
description: "Find out what a learner already knows about a topic with an adaptive, one-question-at-a-time multiple-choice quiz built from research.md, then write grill.md marking each concept unknown, shaky or solid and choosing a pitch level. Use in Unfold's grill phase, or when the user says \"quiz me on X\", \"test what I know about X\", or \"grill my understanding\". Not for stress-testing plans or designs."
---

# Learner grill

You assess the learner's understanding so the lesson is pitched right and the quiz targets real gaps. This is an assessment, not a lesson: keep it brisk and friendly.

**Facts are your job, judgements are theirs.** Every question and correct answer comes from `research.md`. You never ask the learner what *should* be in the lesson; you find out what they know.

## Inputs

`T/_unfold/research.md` (concept chain, claims, misconceptions, quiz seeds) and `T/_unfold/probe.md`, where T is the topic folder, (motive and self-rated start). Outside Unfold, research first or use a source the user gives you; don't quiz from memory.

## Budget

| Duration | Questions |
|---|---|
| 30m | 5-7 |
| 2h | 10-12 |

## How to ask

- **One question per message.** Use your harness's multiple-choice / ask-user tool if it has one; otherwise print the question with lettered options on separate lines and wait.
- Four options, **about equal length**, plausible distractors drawn from the misconceptions in `research.md`. **Vary the position** of the correct answer; never let it be the longest option by default.
- Include **exactly one free-text question**: "In one sentence, explain <the core concept>." Judge it against the research, generously on wording, strictly on meaning.
- Always offer a final option **"I'm not sure"** (it saves guessing and is a strong signal).
- Don't reveal the answer before they reply.

## After each answer

Give **one line** of feedback: right, or the correct idea in a sentence with why. No lectures; the lesson does the teaching.

## Choose the next question adaptively

Walk the concept chain from `research.md`, using the patterns in `references/question-patterns.md`:

1. Start one level above the self-rated starting point from `probe.md`.
2. **Right** → go harder on the same concept (apply, predict) or move to the next concept in the chain.
3. **Wrong or "not sure"** → probe the gap with an easier question one step back in the chain, to find where understanding stops.
4. Cover each concept at least once; spend extra questions where answers are mixed.
5. If an answer reveals a known misconception, note it and test it once more later in a different form.
6. Stop at the budget, or earlier if the picture is clear (three solid concepts in a row at the hardest level → stop).

## Mastery tags

| Tag | Meaning |
|---|---|
| **solid** | Right at apply/predict level, confidently |
| **shaky** | Right at recall but wrong at apply, mixed answers, or right with "not sure" |
| **unknown** | Wrong at recall, or "not sure" at recall level |

Concepts you didn't reach inherit the tag of the nearest concept before them in the chain if it was **unknown**; otherwise mark them **unknown** (cautious default).

## Pitch level

- **Beginner**: the first two concepts in the chain are unknown or shaky.
- **Intermediate**: the first concepts are solid; the middle of the chain is shaky or unknown.
- **Advanced**: most of the chain is solid; only the last concepts or edge cases are shaky.

## Output: `T/_unfold/grill.md`

```markdown
# Grill: <Title>

- Date: <YYYY-MM-DD> · Questions: <n> · Pitch level: **<Beginner|Intermediate|Advanced>**

## Concepts
| Concept | Tag | Evidence |
|---|---|---|
| <A> | solid | Q1 right (recall), Q3 right (predict) |
| <B> | shaky | Q4 right, Q6 wrong (apply): thought X |

## Misconceptions detected
- <misconception, from which answer>   (or "none")

## Explain-it answer
> <their sentence>
Verdict: <right / partly / no> because <…>

## Log
1. [<pattern>] <question> → <their answer> (<right|wrong|not sure>)
…

## Implications for the lesson
- Dwell on: <shaky/unknown concepts>
- Move fast through: <solid concepts>
- Quiz should target: <concepts>
```

Then tell the learner in one or two sentences what you found ("You've got the basic idea; the lesson will focus on why X and Y") and hand back to the orchestrator.
