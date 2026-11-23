# Build log: Random Forest

Built from PRD.md, research.md and sources.json only. All scenes are 2D SVG, as the PRD says (no three.js).

## Loop 1: validation
- Failed: `sources S1: is never cited`.
- Fix: Core step 4 now cites [S1] for "averaging attacks the variance term of the error".

## Loop 2: validation
- Passed: ✓ 0 errors, 0 warnings (276 KB).
- Visual check (headless Chrome screenshots of ELI5 1 and 4, Core 1, 3, 6 and 8, Technical 2, 3, 4 and 6) found these layout problems:
  - Core 1: the "Var of the average" title overlapped the 1.00 bar value.
  - Core 7-8: the "bagging ρ=0.7" and "forest ρ=0.3" bar names ran into each other.
  - Core 2-3: the ×2/×3 draw-count badges sat between chips, so it wasn't clear which chip they belonged to.
  - ELI5 1: the single juror was too small for the stage.
  - Technical 4: the "deep trees" label sat on top of its curve.

## Loop 3: layout fixes
- Variance bars are shorter (max 150 px) and the title moved up. The bar names are now two lines in compare mode. ×N badges sit under their chip, where "OOB" goes for rows that were never drawn (a chip can't have both). The single juror is drawn 1.7× larger. The error-curve label moved up.
- Passed: ✓. After a re-screenshot, one small follow-up: the "dark = floor · light = …" legend overlapped the bar names, so it moved above the bars. Rebuilt: ✓ 0 errors, 0 warnings, 276 KB.

## Deviations from the PRD
- Technical step 6: the PRD lists two callouts (good-to-know about default version changes, and a warning about duplicate features). The player allows one callout per step, so the warning is the callout. The version-change facts (n_estimators 10 → 100 in 0.22, max_features "auto" → "sqrt" in 1.1 [S12]) appear in the scene's defaults panel.
- Technical step 3: the PRD wanted the dial to animate F = 1 → 4 → 25 within one step. Steps are single states, so step 2 shows F = 10 and step 3 shows F = 25, with the 1,000-input table (all three F rows) and a shape-only sonar sketch.
- Technical step 2: the meters use Breiman's real F = 10 values from the 1,000-input run (s .22, ρ̄ .045) [S7]. The right panel shows a made-up example row to define the margin (0.55 − 0.30 = 0.25), labelled "example row".
- Technical 4 error curves and Technical 6 error bars (0.12 → 0.27) are illustrative and are labelled "shape only" / "illustrative" on the stage.
- Core: the variance bar is drawn as one solid bar until step 7, where it splits into floor + shrinking part, so the floor isn't revealed before the formula.
