# Style: line (blueprint)

**What it is.** A technical drawing on graph paper: thin, precise coloured outlines over pale tinted fills, a light blue grid, strokes that draw themselves as they appear.

**What it isn't.** Not a sketch (no wobble or handwriting), not a dark blueprint sheet, not a chart with heavy fills.

**Materials.** Fills at about 10% of their colour; outlines in each colour's dark `-ink`, 1.5× the normal width; a 24 px grid in pale blue. Text keeps the normal fonts (code and numbers stay monospace).

**Colour.** Fixed meanings, carried mostly by the outline colour. White text on coloured fills turns to dark ink automatically, since the fills are pale.

**Motion.** Every stroke draws on when it first appears (like a pen on paper), then things move and morph. Prefer `draw` and morphing paths over blinking.

**Do.** Use vectors (`sarrow`), dimension-like labels, axes, line charts and scatter plots; build a figure up stroke by stroke across steps.
**Don't.** Rely on solid fills to carry meaning (they're pale); crowd the grid with text.

**Use for.** Physics (forces, flows, waves), engineering, maths, statistics and ML charts.
