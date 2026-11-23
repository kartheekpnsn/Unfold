# Build log: Large Language Models (topics/LLM)

Built from `PRD.md`, `research.md` and `sources.json`. Five SVG scenes (`eli5-cabinet`, `llm-pipeline`, `attn-grid`, `logit-bars`, `kv-stack`); no three.js, as the PRD says.

## Loop 1
- First build: ✓ 0 errors, 0 warnings (295 KB).
- I took headless Chrome screenshots of all 21 steps and found these layout problems:
  - ELI5 step 1: the arrow from the "?" chip curved the wrong way and crossed the "illustrative scores" label.
  - ELI5 steps 3-4: the value flow lines ran sideways through the card row.
  - Core step 6: the "× L" label touched the dashed block outline.
  - Core step 7: the logit labels were crowded.
  - Core step 9: "… ×1,024" ran into the memory gauge.
  - Technical step 2: the chart title overlapped the 0.92 value.
  - Technical step 5: "softmax(u/τ)" overlapped the small-multiples boxes.
  - Technical step 6: the threshold label was crossed by the running-sum line.
- Fixes:
  - ELI5 step 1: short vertical arrow, and the caption now carries the "score every next piece" text.
  - ELI5 steps 3-4: each weight now sits inside its value card. The flows go down into a blended "the + context" card, and the residual-stream label moved to bottom-left.
  - Core step 6: moved "× L".
  - Core step 7: widened the logit bar spacing.
  - Core step 9: capped the drawn KV cards at 12.
  - Technical steps 2, 5 and 6: moved the chart title, narrowed the τ boxes and moved the threshold label.
- Rebuild: ✓.

## Loop 2
- The "× Eᵀ" label in core step 7 was hidden behind the arrow, and the blended card's text was clipped. I made the label a separate text element, made the card wider, and made the flow lines thinner.
- Rebuild: ✓ 0 errors, 0 warnings.

## Notes
- PRD core step 6 asked for "Only attention moves info between positions" in the narration. It didn't fit in 60 words, so it's a good-to-know callout on that step, and it's also shown in the scene.
- Technical step 5 asks for bars "animated across τ = 1, 0.5, 0.1, 100". One step has one state, so I showed all four τ values side by side as small charts, with τ = 0.5 highlighted and its full bars on the right.
- Technical step 7: the PRD scene shows both MHA and GQA. It's drawn as GQA, with the MHA memory level as a dashed ghost on the gauge.
- These values are illustrative and labelled as such in the scenes: the token ids, the attention scores and V values, and the "mat/floor/sofa/roof" logits. The temperature numbers 0.44, 0.59, 0.95 and 0.25 are computed in the scene with softmax(u/τ), and they match [S3].
- The residual stream uses a fixed purple hex (#8661C5) because the theme has no purple token.
