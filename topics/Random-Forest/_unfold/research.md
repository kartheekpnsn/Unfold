# Research: Random Forest

- Slug: Random-Forest · Duration: 30m · Researched: 2026-11-23 · Sources: 12
- Focus (from probe): For a practitioner who already uses random forests: why they work. Tree variance, bagging, random feature subsets (max_features) lowering tree correlation, the ρσ² + (1−ρ)σ²/B formula, Breiman's strength-vs-correlation bound, out-of-bag error, and what this means in practice (more trees don't overfit, max_features trades bias for variance, scikit-learn defaults).

## 1. Key concepts (dependency chain)
1. **Bias-variance decomposition**: expected test error splits into variance + bias + noise, and averaging many models attacks the variance term · [S1]
2. **Decision trees are unstable, high-variance learners** (needs 1): a deep tree fits training data well but small changes in the data can change it a lot, so it overfits · [S2] [S3]
3. **Bagging (bootstrap aggregation)** (needs 2): train one tree per bootstrap resample of the data and average or vote, which lowers variance · [S3] [S2]
4. **Variance of an average of correlated predictors** (needs 3): for B identically distributed predictors with variance σ² and pairwise correlation ρ, Var(average) = ρσ² + (1−ρ)σ²/B, so ρσ² is a floor more trees cannot remove · [S5]
5. **Random feature subsets at each split (mtry / max_features)** (needs 4): each split may only choose among m randomly drawn features, which lowers ρ between trees at some cost in individual tree accuracy · [S5] [S7]
6. **Strength vs correlation (Breiman's bound)** (needs 5): forest error ≤ ρ̄(1−s²)/s², where s is the average tree "strength" (margin) and ρ̄ the mean correlation between trees; regression analogue PE*(forest) ≤ ρ̄·PE*(tree) · [S7]
7. **Convergence: adding trees does not overfit** (needs 4, 6): as the number of trees grows, the forest's error converges almost surely to a limit; extra trees only remove the (1−ρ)σ²/B term · [S7] [S6]
8. **Out-of-bag (OOB) estimation** (needs 3): each bootstrap sample leaves out about a third (~37%) of rows; predicting each row with only the trees that never saw it gives a built-in test-error estimate · [S11] [S7]
9. **Tuning consequences and scikit-learn defaults** (needs 5-8): max_features, sample size and leaf size are the knobs on the strength-vs-correlation trade-off; n_estimators is "set high", not tuned · [S4] [S9] [S12]
10. **Permutation (OOB) importance vs impurity importance** (needs 8): Breiman's importance permutes one feature in the OOB rows and measures the rise in error; the impurity-based (MDI) default is biased · [S7] [S4]

## 2. Claims
### Bias-variance decomposition
- Expected test error can be written as the sum of a variance term, a bias term and a noise term, and bagging aims to shrink the variance term · [S1]
- Averaging n independent observations each with variance σ² gives a mean with variance σ²/n: averaging reduces variance · [S2]
- scikit-learn: random forests reduce variance by combining diverse trees, "sometimes at the cost of a slight increase in bias" · [S4]

### Decision trees are unstable, high-variance learners
- A large tree may fit the training set well but is likely to overfit and do poorly on the test set; a smaller tree may have lower variance · [S2]
- Breiman calls instability the "vital element": if perturbing the learning set can cause significant changes in the predictor, bagging can improve accuracy · [S3]
- Breiman lists neural nets, classification and regression trees, and subset selection in linear regression as unstable, and k-nearest neighbours as stable · [S3]
- In Breiman 2001's tables one tree is far worse than the forest, e.g. letters: one tree 19.8% test error vs Forest-RI 3.5%; vowel: 30.4% vs 3.4% · [S7]

### Bagging
- Bagging forms multiple versions of a predictor from bootstrap replicates of the learning set and aggregates them, averaging for numeric outputs and plurality vote for classes · [S3]
- In Breiman's 1994 report, bagging classification trees cut test misclassification by 20% to 47%, and bagging regression trees cut test MSE by 22% to 46% · [S3]
- Bagging can push a good but unstable procedure a significant step toward optimality but can slightly degrade stable ones: "Bagging stable classifiers is not a good idea" · [S3]
- The bootstrap datasets are not independent, so the law of large numbers does not formally apply, but bagging still reduces variance well in practice · [S1]

### Variance of an average of correlated predictors
- For B i.i.d. predictors with variance σ² the average has variance σ²/B; if they are identically distributed with positive pairwise correlation ρ, it is ρσ² + ((1−ρ)/B)σ² · [S5]
- As B increases this tends to ρσ², which does not shrink with more trees and may not be much smaller than a single tree's σ² · [S5]
- So the correlation between trees must not be too large; RF gets this through random input selection at each split · [S5]
- Friedman et al. (ESL) write the variance of the infinite forest at x as the correlation between two trees at x times the variance of a single tree at x · [S6]

### Random feature subsets at each split
- A fresh random selection of m of the p predictors is taken at each split, and the split may use only those; typically m ≈ √p (4 of 13 for the Heart data) · [S2]
- If one or a few features are very strong predictors, they get chosen in many bagged trees, making the trees correlated; feature randomness breaks this · [S8]
- Breiman: "the randomness injected has to minimize the correlation ρ while maintaining strength" · [S7]
- Lower mtry gives less correlated trees and lets moderate variables avoid being masked by strong ones, but makes each tree worse on average: a stability-vs-accuracy trade-off · [S9]
- Breiman found it surprising that splitting on one randomly chosen variable per node (F = 1) worked well; the average absolute error difference between F = 1 and F = int(log₂M + 1) was under 1% · [S7]

### Strength vs correlation (Breiman's bound)
- The margin is the probability that trees vote for the right class minus the largest probability for any other class; strength s is the expected margin · [S7]
- Theorem 2.3: PE* ≤ ρ̄(1−s²)/s²; Breiman says the bound is likely loose but suggestive, and the ratio ρ̄/s² is a guide: "the smaller it is, the better" · [S7]
- On the sonar data (60 inputs, 208 examples), past about F = 4 strength stayed constant while correlation kept rising; error dipped from F = 1 to about F = 4-8 then rose gradually · [S7]
- In a 1,000-weak-input simulation: F = 1 gave 10.7% error (strength .069, correlation .012); F = 10 gave 3.0% (.22, .045); F = 25 gave 2.8% (.28, .065), against a 1.0% Bayes rate, though individual trees had 80%, 65% and 60% error · [S7]
- Regression (Theorem 11.2): PE*(forest) ≤ ρ̄·PE*(tree), with ρ̄ the weighted correlation between trees' residuals · [S7]

### Convergence: adding trees does not overfit
- Theorem 1.2: as trees are added, generalization error converges almost surely (Strong Law of Large Numbers), which Breiman says explains why forests do not overfit as more trees are added · [S7]
- Scornet (2015) bounds the gap between a finite forest of M trees and the infinite forest by (8/M)·(‖m‖²∞ + σ²(1 + 4 log n)) under regularity assumptions · [S6]
- For MSE and Brier score more trees are always better; OOB error-rate curves occasionally rise slightly; the biggest gain often comes from the first 100 trees · [S9]
- Adding trees doesn't overfit, but tree depth acts as regularisation: shallower trees help when signal-to-noise is low · [S10]

### Out-of-bag estimation
- Each bootstrap sample leaves out about 37% of the examples; with K = 100 trees each example has about 37 trees for which it is out of bag, at no extra computing cost · [S11]
- OOB error: for each training row, aggregate votes only over trees whose bootstrap sample did not contain it; Breiman cites evidence it is as accurate as a test set of the same size · [S7]
- Because each OOB prediction uses only about a third of the trees, OOB tends to overestimate the current error until past the point where test error converges · [S7]
- Each row gets around B/3 OOB predictions; for large B the OOB error is essentially leave-one-out CV error for bagging · [S2]

### Tuning consequences and scikit-learn defaults
- scikit-learn 1.9.1 RandomForestClassifier defaults: n_estimators=100, criterion="gini", max_depth=None, min_samples_split=2, min_samples_leaf=1, max_features="sqrt", bootstrap=True, oob_score=False · [S12]
- n_estimators default changed from 10 to 100 in 0.22; max_features default changed from "auto" to "sqrt" in 1.1 · [S12]
- max_features: "The lower the greater the reduction of variance, but also the greater the increase in bias" · [S4]
- Empirical good values: 1.0 (all features) for regression and "sqrt" for classification; 1.0 is equivalent to bagged trees, and 0.3 is "a typical default in the literature" · [S4]
- scikit-learn averages trees' predicted class probabilities instead of Breiman's one-tree-one-vote · [S4]
- In a 38-dataset tunability study, tuning mtry gave the largest average AUC gain (0.006), then sample size (0.004), then node size (0.001) · [S9]

### Permutation (OOB) importance vs impurity importance
- Breiman's importance permutes one variable in each tree's OOB rows and reports the percent rise in OOB misclassification · [S7]
- Two variables carrying the same information each look important when noised separately, yet adding the second after the first gives no gain · [S7]
- Impurity-based importance (MDI) is computed on training data and favours high-cardinality features · [S4]

## 3. Analogies for ELI5
1. **Jury of independent-minded jurors**: each juror (tree) is noisy, but if their mistakes are independent, a majority is far more reliable than any one of them; if they all read the same newspaper (one dominant feature), they make the same mistakes and the jury is no better than one juror. Random feature subsets are like giving each juror a different subset of the evidence at each question. · where it breaks: jurors aren't retrained on resampled cases, and the "strength" side (each juror must still beat a coin flip, s > 0) is easy to forget.
2. **Averaging correlated thermometers**: averaging 100 thermometers that share the same calibration error removes the random jitter (σ²/B part) but not the shared bias-like drift (ρσ² floor). Making thermometers from different factories lowers ρ. · where it breaks: thermometers don't get worse when you diversify them, but trees do lose strength when m shrinks.
3. **Portfolio diversification**: the variance of a portfolio of equally risky, correlated assets falls toward ρσ², not zero; diversification only helps through low correlation. · where it breaks: the audience may not know finance; also no "return" analogue to strength.
- Pick: **#2 (thermometers)** for the variance formula, because the ρσ² floor maps directly onto a picture; use the jury (#1) as the hook for strength vs correlation. This learner already uses RF, so analogies should be brief and quickly mapped onto the formula.

## 4. Visual metaphors
| Concept | What the animation could show | Step-by-step state changes | 3D needed? | Why |
|---|---|---|---|---|
| Tree instability | 2D scatter of points with a deep tree's axis-aligned partition | train on dataset → swap ~5 points → partition boundaries jump visibly → overlay several such partitions | no | Axis-aligned regions read best flat |
| Bootstrap + OOB | A row of N data "chips"; draws with replacement into a bag | draw N times (some chips twice) → highlight chips never drawn (~37%, ~1/3) as OOB → repeat for tree 2, 3 → per-row counter of "trees that never saw me" (~B/3) | no | It's counting and set membership |
| ρσ² + (1−ρ)σ²/B | Plot of Var(average) vs B, one curve per ρ, with a dashed floor at ρσ² | slider B from 1 → 100: curves fall then flatten → slide ρ down: floor drops → annotate the two terms as two stacked bars that shrink differently | no | A 2D chart with a slider is the clearest view |
| Random feature subsets | A tree's root split choosing among feature cards; one "strong" card glows | bagging: every tree picks the strong card at the root (trees look alike) → RF: each split deals m=√p random cards, strong card absent in many → trees diverge → correlation meter drops | no | Card dealing is a flat, sequential process |
| Strength vs correlation | Two meters (s and ρ̄) and the bound ρ̄(1−s²)/s² as a gauge, driven by an F/max_features slider | F=1: low s, very low ρ → F≈4: s plateaus → F large: ρ climbs, error rises (sonar pattern) | no | It's a trade-off curve, not a spatial thing |
| Convergence with more trees | Test/OOB error vs number of trees, with individual noisy tree votes accumulating | 1 tree jagged → 10 → 100 → 1,000: curve flattens to a limit, never turns back up | no | Line chart |
| Permutation importance | OOB table; shuffle one column; error bar rises | intact OOB error → shuffle feature j → re-predict → Δerror bar → repeat per feature, show two duplicate features each looking important | no | Table + bar chart |

3D is not justified for this topic: nothing in it is spatial.

## 5. Common misconceptions
- **Myth:** Random forests can't overfit. · **Why it's wrong:** Breiman's theorem only says error converges as trees are added; the limit itself depends on tree depth, mtry and data noise, and deep trees can overfit noisy data. · **Correct idea:** Adding trees doesn't overfit; the individual trees (depth, leaf size, mtry) still set the bias-variance balance. · [S7] [S10]
- **Myth:** With enough trees the variance goes to zero. · **Why it's wrong:** Var = ρσ² + (1−ρ)σ²/B, so only the second term shrinks with B. · **Correct idea:** Variance falls to the floor ρσ²; lowering ρ (feature subsampling) is what lowers the floor. · [S5]
- **Myth:** Fewer trees regularise a forest, so tune n_estimators like boosting rounds. · **Why it's wrong:** Unlike boosting, bagging and RF don't overfit as B grows; B is "set high", not tuned. · **Correct idea:** Pick B where the OOB curve flattens, for compute reasons only. · [S2] [S9]
- **Myth:** Random features help because each tree gets more accurate. · **Why it's wrong:** Lower mtry makes individual trees worse; the gain comes from lower correlation. · **Correct idea:** It trades a little strength for a lot less correlation (minimise ρ̄/s²). · [S9] [S7]
- **Myth:** The bootstrap is the main source of decorrelation in RF. · **Why it's wrong:** Bagged trees stay correlated when a few strong predictors dominate every tree's top splits. · **Correct idea:** Split-level feature sampling is the "small tweak that decorrelates the trees". · [S2] [S8]
- **Myth:** OOB error is a biased, optimistic training error. · **Why it's wrong:** Each OOB prediction uses only trees that never saw the row, and Breiman found it as accurate as a same-size test set. · **Correct idea:** OOB is held-out; if anything it is slightly pessimistic when B is small, because it uses about a third of the trees. · [S7] [S11]
- **Myth:** feature_importances_ tells you which features matter for prediction. · **Why it's wrong:** MDI is computed on training data and favours high-cardinality features. · **Correct idea:** Use permutation importance on held-out or OOB data, and watch out for correlated features splitting importance. · [S4] [S7]
- **Myth:** scikit-learn uses Breiman's majority vote. · **Why it's wrong:** It averages class probabilities across trees. · **Correct idea:** Soft voting: predict = argmax of mean predict_proba. · [S4] [S12]

## 6. Trade-offs / when (not) to use
- Use when: you need a strong off-the-shelf model with little tuning and a built-in error estimate; RF works reasonably well with default hyperparameters in most cases · [S9]
- Use when: there are many weak inputs; Breiman's 1,000-input simulation reached 2.8% error against a 1.0% Bayes rate · [S7]
- Use when: labels are noisy; with 5% label noise Adaboost's error rose 43.2% on breast cancer vs 1.8% for Forest-RI · [S7]
- Avoid when: you need a single interpretable model, since the forest loses a single tree's interpretability · [S8]
- Avoid when: features relate linearly to the target, since RF may not improve on a linear base learner · [S8]
- Avoid when: memory is tight and trees are fully grown; default trees can be very large (O(M·N·log N)) · [S4]
- Pros: variance reduction without much bias, parallel over trees, OOB estimates, few sensitive knobs (mtry most important) · [S4] [S9] · Cons: limited by the ρσ² floor, biased MDI importance, deep trees overfit low-SNR data · [S5] [S4] [S10]
- Alternatives: **Bagged trees** (max_features=1.0): a special case of RF, usually slightly worse in classification · [S4] [S2]; **Extra-Trees**: random thresholds as well, often slightly lower variance and slightly higher bias, no bootstrap by default · [S4]; **Boosting**: reduces bias with weak learners and can overfit if B is too large; choose when you can afford tuning · [S4] [S2]

## 7. Timeline / story
- 1994 (Sept): Breiman's Technical Report 421 "Bagging Predictors" introduces bagging and names instability as the key · [S3]
- 1995: Tin Kam Ho's random decision forests use the random subspace method · [S8]
- 1996: Breiman's OOB work, building on Tibshirani (1996) and Wolpert & Macready (1996), shows left-out (~37%) examples give accurate error estimates · [S11] [S7]
- 1997: Amit & Geman search over random feature subsets at each node for character recognition; Breiman credits it as influential · [S7]
- 2001 (January): Breiman's "Random Forests" combines bagging with random feature selection and proves the convergence theorem and the strength/correlation bound · [S7]
- 2006: "Random Forests" registered as a trademark (Breiman and Cutler) · [S8]
- 2015: Biau & Scornet review: "little has been proven mathematically" for Breiman's original procedure; consistency results exist for simplified variants · [S6]
- scikit-learn 0.22: default n_estimators 10 → 100; 1.1: default max_features "auto" → "sqrt" · [S12]

## 8. Prerequisites and next topics
- Prerequisites: Decision trees / CART (the base learner and its split criterion), Bias-variance trade-off (the whole argument is about the variance term), Bootstrap resampling (bagging and OOB depend on it), basic variance and correlation (for the ρσ² formula)
- Next: Gradient boosting (the bias-reducing alternative), Extremely randomized trees (more randomisation), Permutation feature importance / SHAP (interpreting forests), Quantile regression forests or infinitesimal-jackknife uncertainty (forest prediction intervals)
- Broader topic this is a kind/part of: Ensemble learning

## 9. Suggested quiz items
- Variance formula: With ρ = 0.5 and σ² = 1, what does the variance of the average approach as B → ∞? · answer: ρσ² = 0.5 · common wrong answer: 0 · [S5]
- Variance formula: Which term does adding trees shrink, and which does max_features shrink? · answer: trees shrink (1−ρ)σ²/B; max_features lowers ρ, so the ρσ² floor · common wrong answer: trees shrink both · [S5] [S4]
- Feature subsets: Why does bagging alone leave trees correlated? · answer: a few strong predictors dominate the top splits of nearly every tree · common wrong answer: because bootstrap samples overlap · [S8] [S2]
- Strength/correlation: In Breiman's bound PE* ≤ ρ̄(1−s²)/s², what happens as max_features grows beyond the point where strength plateaus? · answer: correlation keeps rising so error rises (sonar: plateau past F≈4) · common wrong answer: error keeps falling · [S7]
- Convergence: You go from 500 to 5,000 trees; can test error get worse because of overfitting? · answer: no, error converges to a limit; only compute cost rises (MSE/Brier never worse) · common wrong answer: yes, like boosting · [S7] [S9]
- Overfitting nuance: If RF doesn't overfit with more trees, what can still make it overfit? · answer: deep trees on low signal-to-noise data; depth/min_samples_leaf act as regularisation · common wrong answer: nothing · [S10]
- OOB: Roughly what fraction of rows is out-of-bag for a given tree, and how many OOB predictions does each row get with B = 100? · answer: about 37% (~1/3); about 37 · common wrong answer: 50%, 50 · [S11]
- OOB: Why can OOB error be slightly pessimistic with few trees? · answer: each OOB prediction averages only ~1/3 of the trees · common wrong answer: because it's training error · [S7]
- sklearn defaults: What is max_features by default in RandomForestClassifier, and what does max_features=1.0 make a forest? · answer: "sqrt"; bagged trees · common wrong answer: "auto"/log2 · [S12] [S4]
- sklearn combining: Does sklearn's RandomForestClassifier use hard majority voting? · answer: no, it averages predicted probabilities · common wrong answer: yes, like Breiman · [S4]
- Weak learners: Can a forest of trees with 80% individual error be accurate? · answer: yes if correlation is very low (Breiman's 1,000-input example, 10.7% forest error at F=1) · common wrong answer: no, trees must beat 50% individually · [S7]
- Importance: Two identical informative features: what do permutation importances show? · answer: both look important, though either alone gives the gain · common wrong answer: one gets all the importance · [S7]
- Tuning: Which RF hyperparameter typically gives the largest gain from tuning? · answer: mtry (0.006 mean AUC gain in a 38-dataset study) · common wrong answer: n_estimators · [S9]
- Bagging: Which base learners benefit from bagging? · answer: unstable, high-variance ones (deep trees); stable ones like k-NN don't · common wrong answer: any model equally · [S3]

## 10. Gaps and conflicts
- **ESL itself not opened:** The ρσ² + (1−ρ)σ²/B formula (ESL eq. 15.1) and "variance = ρ(x)σ²(x)" are cited from University of Oslo course slides that cover ESL 15.1-15.3 [S5] and from Biau & Scornet's restatement [S6]; the ESL PDF links on the authors' site returned 404. The ESL quotes on full-grown trees come via Zhou & Mentch [S10].
- **Bias: same or slightly higher?** The ESL-based slides say RF keeps the bias of an individual tree [S5]; scikit-learn says variance reduction comes "sometimes at the cost of a slight increase in bias", and smaller max_features increases bias [S4]. Both are consistent if "bias" in [S5] means bias of a bootstrap tree, which feature subsampling already raises relative to a full-data, all-feature tree. Trust scikit-learn's practical framing; teach it as "roughly unchanged, slightly up as m shrinks".
- **Default mtry differs by source:** √p (classification) and p/3 (regression) are common [S9] [S8]; ESL-based slides give ⌊√p⌋ and ⌊p/3⌋ [S5]; the R randomForest default is ⌈p/3⌉ for regression per Biau & Scornet [S6]; Breiman 2001 used F=1 and int(log₂M+1) [S7]; scikit-learn's regressor default is 1.0, i.e. all features (bagging) [S4]. Teach scikit-learn's actual defaults and flag the regression difference.
- **"Does not overfit":** Breiman's claim is about adding trees [S7]. Segal (2004) and later work show depth matters [S10]; Segal's paper itself could not be opened (eScholarship returned empty), so it's cited only through [S10].
- **OOB bias direction:** Breiman says OOB overestimates error with few trees but is unbiased once past convergence [S7]; Probst et al. note bias in rare cases such as n < 20 with many predictors [S9]. No real conflict.
- **Breiman 2001 typo:** its introduction describes bagging as a random selection "without replacement", but Section 3.1 says each training set is drawn "with replacement". The 1994 bagging report uses bootstrap replicates (with replacement) [S3]. Trust "with replacement".
- **37% / 1/e:** Sources give "about 37%" [S11], "about one-third" [S7] [S6] and "around two-thirds used" [S2]. The limit (1−1/N)^N → 1/e ≈ 0.368 is standard maths but was not stated verbatim in any opened source.
- **Not verified:** the journal venue of Breiman 2001 (Machine Learning 45, 2001) — the Springer page needed a login, so only the January 2001 Berkeley version was read. Ho 1995 and the 2006 trademark come only from Wikipedia [S8].
