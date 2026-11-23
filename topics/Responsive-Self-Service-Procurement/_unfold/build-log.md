# Build log: Responsive Self Service Procurement

- Inputs: `_unfold/PRD.md`, `_unfold/research.md`, `_unfold/sources.json` (20 sources, all cited).
- Scenes (all svg): `food-court`, `ssp-pipeline`, `bu-zones`, `approval-lanes`, `match-bars`.
- Steps: ELI5 4 · Core 8 · Technical 6 · Quiz 7.

## Loop 1
- Result: ✓ built (290 KB), 1 warning: "the correct option is the longest one in most questions" (5 of 7).
- Change: rebalanced option lengths in quiz Q1, Q2, Q4, Q5 (made the answer shorter or lengthened distractors). No answer content changed.

## Loop 2
- Result: ✓ built, 0 errors, 0 warnings.
- Headless Chrome screenshots of ELI5 1/4, Core 1/2/5/7/8 and Technical 1-6 showed label collisions in `food-court` step 4 (wristband arrows crossing "local catalog"/"punchout", the fork label running into the truck, "Requisition" over the stamp, "PO to supplier" crossed by the buyer arrow), and the hold stage title in `ssp-pipeline` drawn white on pale red.
- Change: shortened arrows and moved labels in `food-court`; hold colour now takes precedence over the active colour in `ssp-pipeline`.

## Loop 3
- Result: ✓ built, 0 errors, 0 warnings. Screenshots re-checked: no overlaps.

## Notes
- PRD lists Proc BUs as "purple"; the palette has no purple token, so Proc BUs use `surface-2` with an `ink-2` outline (Req BUs stay blue).
- S19 and S20 (26A/26D features) are cited in Technical step 6 "what changed" lines, since the PRD gave them no narration slot.
- Technical step 6 has no Setup task code block (PRD asks for steps 1-5 only).
