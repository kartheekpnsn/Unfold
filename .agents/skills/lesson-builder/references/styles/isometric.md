# Style: isometric (default)

**What it is.** Clean isometric diagrams: solid, softly shaded blocks on a dotted floor, crisp labels, flat colour accents. The look of a well-made technical illustration.

**What it isn't.** Not a 3D render (no lighting or shadows: that's `3d`), not hand-drawn, not a chart-only style.

**Materials.** Solid fills; the top face lighter and the right face darker than the base colour; thin darker outlines. Background: a staggered dot lattice.

**Colour.** Fixed meanings from `design-tokens.md`. Neutral things in `surface` / `line-strong`; one accent per idea.

**Motion.** Things drop in, lift out and glide; `state` timing (520 ms) for step changes, `overshoot` only on the one key arrival.

**Do.** Stack, slot and lay things out along the isometric axes; label faces and tops; keep the main object in the middle 60%.
**Don't.** Mix isometric and flat-screen layouts for the same object; use colour for decoration.

**Use for.** Data structures, memory, systems, anything made of parts in space.
