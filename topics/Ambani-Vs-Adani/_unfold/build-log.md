# Build log — Ambani vs Adani

## Target
- Approved beginner 30m PRD: ELI5 4, Core 8, Technical 6; quiz 8.
- Three SVG scenes, no 3D, branding, personal-wealth comparison or investment advice.
- All displayed scene text is supplied through lesson.json states.
- Financial baseline is FY2025–26, not current trading data. Legal verification stops at the supplied August documents.

## Implementation
- Read the skill, all four references, both reference lessons, and the three input files.
- Stable keyed primitives animate reveals, highlighted boundaries, service links, cash tokens and the construction-to-operation transition.
- Compact 560 × 440 canvas avoids the shared kit's phone edge crop; multi-line labels stay inside the stage.
- Illustrative cash tokens carry no quantities. Evidence cards preserve unlike metric labels and never scale numbers into ranking bars.
- Source objects preserve the supplied id, title, URL, publisher, trust and note.

## Loop 1
- PASS: build printed ✓, 266 KB; schema and all 18 scene states dry-ran without errors or warnings.
- Chrome checked all 18 states at 1200px and 390px. No runtime exceptions.
- Browser bounding-box inspection caught overlapping Core 2/6 labels and a clipped funding label in Core 7/8.

## Loop 2
- Separated the feedstock and margin labels, moved the integration label below engine labels, and inset the operating-funding label.
- Added explicit geometric rail and warehouse nodes to the APSEZ service chain, and a qualitative earnings-ramp path.
- PASS: rebuild printed ✓, 267 KB; final validation returned zero errors and zero warnings.
- All 18 scene states dry-ran successfully again.
- Chrome inspected all 18 rendered states at each of 1200px, 390px and 320px: 54/54 passed text-bounding-box checks, with no clipped or overlapping labels and no page horizontal overflow.
- ELI5 1, Core 2/7 and Technical 3 also loaded from direct file links in dark/reduced-motion mode with populated scenes.
- Check Yourself rendered; Related & Sources rendered all 12 links. No browser runtime exceptions. Temporary browser stopped.

## Final result
- Built `topics/Ambani-Vs-Adani/index.html`.
- Loops used: 2 of 3.
- Steps: ELI5 4; Core Mechanism 8; Technical 6.
- Quiz: 8 items; correct indices B/D/A/C/B/D/A/C.
- Scenes: 3 SVG scenes; no three.js bundle.
- Sources: 12, exactly matching the supplied source objects.
- Page size: 273,818 bytes (267.4 KiB).
- Narration lengths: all within 60 words; every factual step and quiz explanation cites supplied sources.
- No PRD item omitted. Review used browser DOM/SVG measurements, not a human screenshot assessment.

## Limitations
- No actual operating cash-flow totals or free-cash-flow rankings are inferred.
- Portfolio cash transferability and later legal developments remain unverified, as required by the PRD.
- The shared build script also regenerates the library navigation page; no player or other topic source is edited.
