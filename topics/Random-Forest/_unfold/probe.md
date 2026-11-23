# Probe: Random Forest

- **Why learning:** Using it at work.
- **Starting point:** Uses random forests already; wants the deep version.
- **Scope:** Why it works: bias-variance, decorrelating trees (bootstrap + random feature subsets), the variance of an average of correlated predictors, out-of-bag error, theory behind averaging.

*Research focus:* The mechanism behind random forests' accuracy: decision-tree variance, bagging, random feature selection at splits (max_features) and how it lowers tree correlation, the ρσ² + (1−ρ)σ²/B variance formula, generalization error bound (Breiman 2001: strength vs correlation), out-of-bag estimation, and practical consequences (why more trees don't overfit, how max_features trades bias vs variance) with scikit-learn defaults.
