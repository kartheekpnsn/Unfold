# Random Forest: lesson PRD

- **Slug:** random-forest
- **Folder:** Random-Forest
- **Duration:** 30m
- **Level:** beginner   (from grill.md; on mechanism only: the learner is a practitioner)
- **Domain:** ai-ml
- **Summary:** Why a random forest beats one deep tree: averaging unstable trees cuts variance, and random feature subsets lower the correlation that sets the floor averaging can't get below.
- **Player version:** 1.0.0

## 1. Learner profile
- Why: uses random forests at work.
- Starting point: already uses RF; wants the deep version, focused on *why it works*.
- Solid: adding trees doesn't overfit (error converges to a limit).
- Shaky: bias-variance decomposition (recall only), bagging, random feature subsets.
- Unknown: tree instability, variance of an average of correlated predictors (ρσ² floor), strength vs correlation, out-of-bag estimation, tuning consequences / sklearn defaults, permutation vs impurity importance.
- Misconceptions detected: "with enough trees the variance goes to zero"; "bootstrap overlap is the main reason bagged trees are alike (and the bootstrap is the main decorrelator)"; "OOB is a ~10% slice".
- Pitch: Assume they know what a model, a decision tree and `RandomForestClassifier` are; never explain fitting/predicting basics. Build the mechanism from the ground up, though: instability → averaging → correlation floor → feature subsampling → strength/correlation trade-off → OOB. Dwell on the ρσ² floor and the dominant-feature story; one quick step on "more trees don't overfit, but depth still matters". Use numbers and formulas, but introduce each symbol in plain words first.

## 2. Learning objectives
1. **Explain** why deep decision trees are the ideal thing to average (unstable, low-bias, high-variance) and why bagging barely helps stable learners like k-NN.
2. **Compute** the variance of an average of B correlated trees, Var = ρσ² + (1−ρ)σ²/B, and say which term more trees remove and which term only lower correlation removes.
3. **Explain** how random feature subsets per split (`max_features`) lower tree correlation when a few strong features dominate, and why too small a subset hurts (strength vs correlation).
4. **Describe** how out-of-bag error is formed (~37% of rows left out per tree, ~B/3 OOB votes per row) and why it is a held-out estimate.
5. **Map** the theory onto scikit-learn knobs: `max_features`, `n_estimators`, depth/leaf size, `oob_score`, and the impurity-vs-permutation importance caveat.

## 3. Tabs

### 3.1 ELI5 (`eli5`, kind `stepper`, icon `lightbulb`)

One analogy carried through: **a jury of noisy jurors** (research.md §3 #1). No jargon until step 4.

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows |
|---|---|---|---|---|---|---|
| 1 | One juror is shaky | A single juror is a decent but erratic judge: hear the case slightly differently and the verdict flips. | S3 | `jury` | svg | One juror figure; two slightly different evidence piles produce opposite verdict cards (✓ vs ✗). |
| 2 | Many jurors, independent mistakes | If many jurors each make *their own* mistakes, the majority is far more reliable than any one. | S7 | `jury` | svg | 9 jurors in a row; each has a random wrong/right badge (≈ 6 right, 3 wrong, wrong ones scattered); majority verdict card says ✓. |
| 3 | Same newspaper, same mistakes | If every juror read the same newspaper, they make the *same* mistake together and the jury is no better than one juror. | S8 | `jury` | svg | All 9 jurors holding an identical "newspaper" icon; the same 3-of-9 pattern becomes all-wrong together; majority card ✗. |
| 4 | Give each juror different evidence | Hand each juror a different random slice of the evidence at each question: mistakes become independent again. That's a **random forest**: jurors = decision trees, the slices = random rows (bootstrap) and random features at each split. | S7 S2 | `jury` | svg | Each juror gets a different coloured evidence card subset; wrong badges scatter again; majority ✓; labels appear: "juror = tree", "evidence slice = rows + features". |

- Callouts: step 3: insight, "Agreement isn't the goal; independent errors are." Step 4: warning, "Where it breaks: jurors with too little evidence each become worse, so there's a sweet spot (Technical tab)."
- Code / formula: none.

### 3.2 Core Mechanism (`core`, kind `stepper`, icon `branch`)

One main scene `forest-main`, a composite with panels: **data strip** (N=12 data chips), **trees row** (up to 5 mini trees), **feature cards** (p=9 cards, one "strong" glowing card), **correlation meter** (ρ, 0-1) and **variance bars** (stacked: floor ρσ² in dark, shrinking part (1−ρ)σ²/B in light). Each step changes one thing.

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows |
|---|---|---|---|---|---|---|
| 1 | One deep tree is unstable | A deep tree fits training data well but small data changes reshape it: low bias, high variance. Breiman calls this instability the vital element. | S2 S3 | `forest-main` | svg | Only the trees row: one tree drawn; then a ghost overlay of a different-shaped tree labelled "same data, 2 rows changed". Variance bar for 1 tree is tall (σ²). |
| 2 | Draw a bootstrap sample | Resample N rows *with replacement*: some rows appear twice, some not at all. | S3 | `forest-main` | svg | Data strip: 12 chips; a "bag" below receives 12 draws; chips drawn twice get a ×2 badge. |
| 3 | About 37% sit out | Each bootstrap leaves out about 37% (~1/3) of rows: the **out-of-bag** rows for that tree. | S11 | `forest-main` | svg | ~4-5 chips highlighted amber with "OOB" tags; counter "left out ≈ 37%". |
| 4 | Grow many trees, average them | One tree per bootstrap; average (regression) or vote (classification). Bagging cut tree error by 20-47% in Breiman's tests. | S3 | `forest-main` | svg | Trees row fills to 5 trees, each from its own bag; variance bar shrinks visibly; metric chip "B = 5". |
| 5 | But the trees look alike | One strong feature wins the root split in almost every bagged tree, so the trees are **correlated** and averaging helps less. Overlapping rows aren't the main issue. | S8 S2 | `forest-main` | svg | Feature cards: strong card glows; every tree's root node coloured the same as the strong card; correlation meter high (ρ ≈ 0.7). |
| 6 | Random features at each split | At every split, the tree may only choose from m random features (m ≈ √p, here 3 of 9). The strong card is often missing, so roots differ. | S2 S7 | `forest-main` | svg | Each tree is dealt 3 cards at its root; strong card absent for 3 of 5 trees; root colours now differ; correlation meter drops to ≈ 0.3. |
| 7 | Variance = floor + shrinking part | Var(average) = ρσ² + (1−ρ)σ²/B. More trees shrink only the second part; lower ρ lowers the floor. | S5 | `forest-main` | svg | Variance bars: two stacked bars side by side, "bagging (ρ=0.7)" vs "forest (ρ=0.3)"; light part small in both, dark floor much lower for the forest. Formula shown. |
| 8 | Edge case: the floor and the trade-off | Adding 1,000 trees never goes below ρσ²; and if m gets too small each tree gets weak. Randomness must cut correlation *while keeping strength*. | S5 S7 S9 | `forest-main` | svg | B slider-like label jumps to B=1000: light part ~0, dark floor remains (dashed line "floor ρσ²"); a small "m=1: trees weaker" warning badge on a tree. |

- Callouts: step 3: good-to-know, "Each row is OOB for ~B/3 trees. That's the free validation set." Step 5: insight, "Breiman: the randomness has to minimise ρ while maintaining strength [S7]." Step 8: warning, "More trees ≠ zero variance."
- whatChanged on each step (e.g. step 6: "+ m = 3 features per split", "~ ρ 0.7 → 0.3", "- strong feature at every root").
- Metrics chips: `B`, `ρ`, `m`, `Var` where relevant (σ² = 1 throughout, so Var = ρ + (1−ρ)/B; step 4: ρ 0.7, B 5 → 0.76; step 7 forest: ρ 0.3, B 5 → 0.44; step 8: B 1000, ρ 0.3 → ≈ 0.30).
- Code / formula: step 7 and 8 `formula`: "Var = ρσ² + (1−ρ)σ²/B".

### 3.3 Technical (`technical`, kind `stepper`, icon `math-formula`)

Tab `code` (Python, scikit-learn), shared by all steps:

```py
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance

rf = RandomForestClassifier(
    n_estimators=500,      # set high; not a regulariser
    max_features="sqrt",   # m: the correlation-vs-strength knob
    min_samples_leaf=1,    # depth/leaf size: still regularises
    oob_score=True,        # free held-out estimate
    n_jobs=-1, random_state=0,
).fit(X_train, y_train)

print(rf.oob_score_)       # OOB accuracy
imp = permutation_importance(rf, X_val, y_val)  # not rf.feature_importances_
```

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows |
|---|---|---|---|---|---|---|
| 1 | The variance floor, in numbers | B identically distributed trees, variance σ², pairwise correlation ρ: Var = ρσ² + (1−ρ)σ²/B → ρσ² as B → ∞. Worked example σ²=1, ρ=0.5 → floor 0.5, not 0. | S5 S6 | `variance-curve` | svg | Plot of Var vs B (1-200, log-ish x) with curves ρ = 0.1, 0.3, 0.5, 0.8; dashed floor per curve; ρ=0.5 curve highlighted, label "→ 0.5". Highlight none. |
| 2 | Strength vs correlation | Margin = P(vote right) − max P(vote other); strength s = expected margin. Breiman's bound: PE* ≤ ρ̄(1−s²)/s². Smaller ρ̄/s² is better. Regression analogue: PE*(forest) ≤ ρ̄·PE*(tree). | S7 | `strength-corr` | svg | Two meters (s, ρ̄) and a gauge for ρ̄(1−s²)/s²; a max_features dial at mid position. Highlight line 6. |
| 3 | max_features sweeps the trade-off | Sonar data: past F≈4 strength flat, correlation keeps rising, error dips then rises. 1,000 weak inputs: trees with 60-80% error give a 2.8-10.7% forest (Bayes 1.0%). | S7 | `strength-corr` | svg | Dial animates across F=1 → 4 → 25: s rises then plateaus, ρ̄ keeps rising, gauge dips then climbs; small table of the 1,000-input numbers (F, s, ρ, forest error). Highlight line 6. |
| 4 | More trees converge; depth still matters | Error converges almost surely as trees are added (no overfitting from B). But the limit depends on the trees: on low signal-to-noise data, shallower trees (larger leaf size) help. | S7 S10 S9 | `variance-curve` | svg | Error-vs-B curve flattening to a limit for "deep trees" and a lower limit for "shallower trees" on a noisy-data label. Highlight lines 5, 7. |
| 5 | Out-of-bag error | Each tree leaves out ~37% of rows; each row gets ~B/3 OOB votes; OOB error is about as accurate as a same-size test set, slightly pessimistic when B is small. | S11 S7 S2 | `oob-table` | svg | Grid: rows (8) × trees (6); cells dark = in-bag, amber = OOB; for row 3, OOB cells' votes are tallied into an OOB prediction vs truth. Highlight lines 8, 12. |
| 6 | sklearn defaults and importance | Defaults: n_estimators=100, max_features="sqrt", max_depth=None, bootstrap=True; regressor default max_features=1.0 = plain bagging. sklearn averages probabilities (soft vote). mtry is the knob most worth tuning. MDI (`feature_importances_`) is biased toward high-cardinality features: use permutation importance. | S12 S4 S9 S7 | `oob-table` | svg | Same grid; one column of the OOB data "shuffled" (cells jumbled) with an error bar rising; side list of defaults. Highlight lines 13. |

- Callouts: step 1: warning, "With ρ = 0.5 you can never get below half a tree's variance." Step 3: insight, "Weak trees are fine if they're nearly uncorrelated." Step 6: good-to-know, "max_features default changed 'auto' → 'sqrt' in 1.1; n_estimators 10 → 100 in 0.22 [S12]." Also step 6: warning, "Two features carrying the same information each look important when permuted separately [S7]."
- Formula per step: 1 "Var = ρσ² + (1−ρ)σ²/B"; 2 "PE* ≤ ρ̄(1−s²)/s²"; 4 "PE*(forest) ≤ ρ̄·PE*(tree)".

### 3.4 Check Yourself (`check`, kind `quiz`, icon `question-circle`). Questions in §5.

### 3.5 Related & Sources (`related`, kind `related`). Content in §6, §8.

## 4. Scenes

- **`jury`** · svg
  - Purpose: independent errors make a majority reliable; shared errors don't.
  - Elements: row of 1 or 9 juror figures (simple rounded heads/bodies), right (green ✓) / wrong (red ✗) badges, optional newspaper icon over each juror, coloured evidence cards, a large majority verdict card, optional labels.
  - State fields: `jurors: number`, `wrong: number[]` (indices wrong), `shared: boolean` (newspaper), `slices: boolean` (different evidence cards), `verdict: "right"|"wrong"|null`, `labels: boolean`, `flip: boolean` (step 1 two-piles view).
  - Transitions: badges fade/slide between patterns; newspaper icons drop in/out; verdict card flips.

- **`forest-main`** · svg
  - Purpose: the whole mechanism: instability → bootstrap → OOB → averaging → correlated roots → feature subsampling → variance floor.
  - Elements: data strip of 12 chips (grey; amber = OOB; ×2 badge = drawn twice); bag; trees row of up to 5 mini trees (root node colour = feature used; strong feature = gold); 9 feature cards (gold strong card glows); correlation meter (0-1, needle); variance bars (stacked dark floor ρσ² + light (1−ρ)σ²/B, σ² = 1; dashed floor line); small warning badge.
  - State fields: `panel: string[]` (which panels visible), `trees: number`, `ghost: boolean`, `drawn: number[]` (counts per chip), `oob: number[]`, `roots: string[]` (feature id per tree root), `dealt: string[][]` (cards dealt per tree), `rho: number`, `B: number`, `compare: boolean` (two stacked bars), `weakBadge: boolean`.
  - Transitions: chips fly into the bag; OOB chips turn amber; trees grow in one by one; root colours recolour; meter needle sweeps; bars animate height.

- **`variance-curve`** · svg
  - Purpose: Var(average) vs B for several ρ, and error-vs-B convergence.
  - Elements: axes (x: number of trees B, y: variance/error), curves per ρ, dashed floor lines, highlighted curve, labels.
  - State fields: `mode: "variance"|"error"`, `rhos: number[]`, `highlight: number`, `limits: {label, value}[]` (for error mode).
  - Transitions: curves draw left→right; highlight glows; floors fade in.

- **`strength-corr`** · svg
  - Purpose: max_features trades strength against correlation (Breiman's bound).
  - Elements: dial for F/max_features; meter s; meter ρ̄; gauge ρ̄(1−s²)/s²; optional small table.
  - State fields: `F: number`, `s: number`, `rho: number`, `table: boolean`. Use the 1,000-input numbers: F=1 → s .069, ρ .012, err 10.7%; F=10 → .22, .045, 3.0%; F=25 → .28, .065, 2.8% [S7].
  - Transitions: dial rotates; meters fill; gauge needle moves.

- **`oob-table`** · svg
  - Purpose: how OOB predictions and permutation importance are computed.
  - Elements: 8×6 grid (rows × trees); dark = in-bag, amber = OOB; vote tally box; feature column strip with a shuffle animation; error bar.
  - State fields: `focusRow: number|null`, `tally: {votesA, votesB, truth}`, `shuffle: boolean`, `errBefore: number`, `errAfter: number`, `defaults: boolean`.
  - Transitions: focus row highlights; amber cells pulse and send votes to tally; shuffled column jumbles; error bar grows.

All 2D; 3D is not justified (research.md §4).

## 5. Quiz

| # | Concept | Question | Options (A-D) | Answer | Why (cite) |
|---|---|---|---|---|---|
| 1 | Variance floor | Trees have variance σ² = 1 and pairwise correlation ρ = 0.3. As B → ∞, the variance of the average approaches… | A 0 · B 0.3 · C 0.7 · D 1 | B | Var = ρσ² + (1−ρ)σ²/B → ρσ² = 0.3 [S5] |
| 2 | Feature subsets | Why do plain bagged trees stay correlated? | A Bootstrap samples share most of their rows · B A few strong features win the top splits in nearly every tree · C Too few trees were grown to differ · D Every tree uses the same random seed | B | Strong predictors chosen in many bagged trees make them correlated [S8] [S2] |
| 3 | Variance formula | Which part of Var = ρσ² + (1−ρ)σ²/B does lowering max_features target? | A The (1−ρ)σ²/B part only · B Neither part · C The ρσ² floor, by lowering ρ · D σ², by making trees stronger | C | Lower max_features → less correlated trees, at some strength cost [S4] [S9] |
| 4 | OOB | With B = 100 trees, about how many OOB predictions does each training row get? | A About 10 · B About 50 · C About 37 · D All 100 | C | Each bootstrap leaves out ~37% of rows, so ~37 trees per row [S11] |
| 5 | Strength vs correlation | Past the point where strength plateaus, raising max_features further usually… | A raises error, as correlation keeps rising · B keeps lowering error · C has no effect at all · D lowers correlation | A | Sonar: strength flat past F≈4, correlation rising, error rose [S7] |
| 6 | Tree instability | Bagging helps deep trees much more than k-NN because deep trees are… | A biased, and averaging fixes bias · B unstable: small data changes reshape them · C slower, so bagging parallelises them · D shallow, so each one underfits | B | Instability is the vital element; k-NN is stable [S3] |
| 7 | Overfitting nuance | More trees don't overfit. What can still make a forest overfit noisy data? | A Using too many trees · B Turning oob_score on · C Using max_features="sqrt" · D Fully grown, very deep trees | D | Depth acts as regularisation on low signal-to-noise data [S10] |
| 8 | sklearn | In scikit-learn, RandomForestRegressor's default max_features=1.0 makes it… | A plain bagged trees · B Extra-Trees · C a single tree · D gradient boosting | A | max_features=1.0 is equivalent to bagged trees [S4] |

## 6. Related
- Prerequisites: `decision-trees` · Decision Trees (CART) · the base learner and its splits; `bias-variance` · Bias-Variance Trade-off · the whole argument is about the variance term; `bootstrap` · Bootstrap Resampling · bagging and OOB depend on it.
- Next: `gradient-boosting` · Gradient Boosting · the bias-reducing alternative; `extra-trees` · Extremely Randomized Trees · even more randomisation; `permutation-importance` · Permutation Importance & SHAP · interpreting forests properly; `ensemble-learning` · Ensemble Learning · the broader family RF belongs to.

## 7. Folder placement
- Parent folder: top level, because no ML / ensemble-learning topic exists yet (RF is a kind of ensemble method, a kind of ML).
- Adopts: none. Existing top-level topics (How-Do-Planes-Fly, LLM, Stacks) are not kinds or parts of Random Forest.

## 8. Sources to cite
- S1 · Cornell CS4780 Lecture 18: Bagging · bias-variance decomposition, bagging reduces variance
- S2 · ISLR2 Ch. 8 slides · tree overfitting, m ≈ √p, decorrelation, OOB ≈ B/3
- S3 · Breiman 1994, Bagging Predictors · bagging definition, instability, 20-47% gains, stable learners
- S4 · scikit-learn User Guide 1.11 · max_features bias/variance, defaults 1.0 / sqrt, soft voting, MDI bias, Extra-Trees
- S5 · Oslo STK2100 (ESL 15.1-15.3) · ρσ² + (1−ρ)σ²/B, floor
- S6 · Biau & Scornet 2015 · infinite-forest variance, convergence bound
- S7 · Breiman 2001, Random Forests · strength/correlation bound, sonar & 1,000-input results, convergence, OOB, permutation importance
- S8 · Wikipedia, Random forest · strong predictors correlate bagged trees, Ho 1995
- S9 · Probst, Wright & Boulesteix 2019 · mtry trade-off, tunability, more trees never worse for MSE/Brier
- S10 · Zhou & Mentch 2021 · depth as regularisation on low-SNR data
- S11 · Breiman, Out-of-Bag Estimation · ~37% OOB, ~37 OOB trees with K=100
- S12 · scikit-learn RandomForestClassifier API · defaults and version changes
