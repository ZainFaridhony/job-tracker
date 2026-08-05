# Brand assets — Job Tracker AI

Design tokens live in `docs/PRD.md` Appendix A. This file covers the mark itself.

## Files

| File | Use |
|---|---|
| `logo-mark.svg` | **Primary.** Silhouette in `currentColor` plus the two fold facets. Flat-filled the mark collapses into a solid bookmark; the crease is what makes it read as an R. |
| `logo-mark-ink.svg` | Standalone `#1E1E1E`. Documents, email, anywhere CSS can't reach. |
| `logo-mark-reverse.svg` | Standalone white, for dark grounds. |
| `favicon.svg` | 1024² square, mark at 75% height, optically centred. |
| `logo.png` | Raster master as supplied, 1254². Retains the fold gradient. |
| `archive/` | The superseded sage identity. Kept for reference only — do not use. |

## Provenance

The SVGs were traced from `logo.png` by sampling its silhouette row by row, fitting the
straight edges and corner radii, then verifying the result.

**Verification:** the SVG was rendered independently through WebKit (`qlmanage`) and compared
against the original raster. **IoU 0.9932** — the residual 0.7% is antialiasing width and
resampling, not shape error. Aspect ratio matches to within a pixel (0.7250 rendered vs
0.7258 exact).

Re-verify after any edit to the path. A wrong arc sweep flag produces a shape that still
looks plausible in isolation.

## Geometry

`viewBox="0 0 556 766"`, tight to the mark — consumers control their own spacing.

The outline is one closed path over seven vertices. Five are convex, two concave:

| Vertex | Position | Radius | |
|---|---|---|---|
| Top-left | `0, 0` | 66 | |
| Top-right | `556, 0` | 66 | |
| Right shoulder | `556, 233` | 60 | vertical edge into the 45° diagonal |
| Inner notch | `305.5, 483.5` | 8 | **concave** — both creases radiate from here |
| Leg tip | `617, 795` | 28 | narrow wedge, so the round cuts back ~109 units |
| Stem/leg split | `142.7, 657.3` | 6 | **concave** |
| Stem tip | `0, 800` | 34 | |

Every straight edge is vertical, horizontal, or exactly 45° — except the leg's inner edge,
which runs at `dx/dy = 3.445`. The two fold creases in the raster both emanate from the inner
notch at 45°, which is why that vertex is the mark's structural centre.

## Usage

**Clear space:** at least 20% of the mark's height on every side. Nothing sits inside it.

**Minimum size:** 24px tall. Below that the fold turns to mud — use `logo-mark-ink.svg`,
which is the flat single-tone variant.

**Colour:** `ink` `#1E1E1E` on light grounds, white on `surface-inverse`. Never any other
colour — the mark is one ink on one ground, and the palette takes its cue from that (PRD §9).

**Never:** recolour, outline, rotate, stretch, add a shadow, or apply the raster's gradient to
the SVG. The gradient belongs to the logo, not to the interface.

## Still missing

- **Wordmark lockup.** Needs "Job Tracker AI" set in Geist and converted to outlines. Not
  generated here — fabricating glyph outlines would produce something that is not Geist.
  Spec once made: wordmark cap height equal to 45% of the mark's height, baseline aligned to
  the mark's optical centre, gap equal to the mark's stem width.
- **Raster favicons.** `favicon.svg` covers modern browsers; 180px `apple-touch-icon.png` and
  32/16px PNG fallbacks still needed.
- **Vector master with the fold.** The SVGs here are deliberately flat. A two-tone or gradient
  vector should come from the original design source, not from tracing a lossy raster —
  `logo.png` carries 2,761 distinct colours for what is a two-colour mark.
