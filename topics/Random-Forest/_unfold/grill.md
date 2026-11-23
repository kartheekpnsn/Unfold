# Grill: Random Forest

- Date: 2026-11-23 · Questions: 7 · Pitch level: **Beginner** (on mechanism; the learner is a practitioner who already uses RF, so skip "what is a model / what is a tree" basics and keep it fast-paced)

## Concepts
| Concept | Tag | Evidence |
|---|---|---|
| Bias-variance decomposition | shaky | Q3 right (recall: averaging reduces variance); Q1 wrong at apply level |
| Decision trees are unstable, high-variance learners | unknown | Q2 "not sure" (why bagging helps trees but not k-NN) |
| Bagging | shaky | Explain-it mentions different rows + averaging; Q2 "not sure" on why it works |
| Variance of an average of correlated predictors | unknown | Q1 wrong (apply): said variance → 0 as B → ∞ |
| Random feature subsets at each split | shaky | Explain-it mentions different columns; Q4 wrong: blamed bootstrap overlap, not dominant features |
| Strength vs correlation (Breiman's bound) | unknown | Not reached; preceding chain unknown/shaky (cautious default) |
| Convergence: adding trees does not overfit | solid | Q7 right (predict): error settles to a limit going 500 → 5,000 trees |
| Out-of-bag estimation | unknown | Q5 wrong (recall): said ~10% OOB instead of ~37% |
| Tuning consequences and scikit-learn defaults | unknown | Not reached (cautious default) |
| Permutation vs impurity importance | unknown | Not reached (cautious default) |

## Misconceptions detected
- "With enough trees the variance goes to zero" (Q1)
- "The bootstrap is the main source of decorrelation" (Q4)
- OOB is a small (~10%) slice (Q5)

## Explain-it answer
> each tree sees different columns and different rows which captures different patterns. When averaged out they reduce variance and be more accurate
Verdict: partly, because the diversity + averaging + variance-reduction story is right, but it misses the key idea that what matters is *lower correlation between trees' errors* (the ρσ² floor), and that random columns trade a little per-tree strength for that.

## Log
1. [Apply] σ²=1, ρ=0.5, B→∞: variance of average? → "0, it vanishes" (wrong)
2. [Compare] Why does bagging help deep trees but not k-NN? → I'm not sure (not sure)
3. [Recall] Which error term does averaging reduce? → Variance (right)
4. [Recognise] Why do plain bagged trees look alike? → Bootstrap overlap (wrong)
5. [Recall] Share of rows out-of-bag per tree? → About 10% (wrong)
6. [Explain] Why does RF beat one deep tree? → see above (partly)
7. [Predict] 500 → 5,000 trees: test error? → Settles to a limit (right)

## Implications for the lesson
- Dwell on: tree instability (why trees are the ideal thing to average), the ρσ² + (1−ρ)σ²/B formula and its floor, how max_features lowers ρ (dominant-feature story), strength vs correlation, OOB (~37%, how OOB error is formed)
- Move fast through: bias-variance basics (recall is there), "more trees don't overfit" (already solid; spend the time on the nuance that depth still matters)
- Quiz should target: variance floor ρσ² (not 0), dominant features vs bootstrap as the decorrelation source, OOB fraction ≈ 37% and B/3 predictions per row, max_features as a strength/correlation knob
