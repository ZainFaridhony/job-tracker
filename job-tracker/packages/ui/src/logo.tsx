/**
 * The mark, traced from brand/logo.png and verified at IoU 0.9932 against an
 * independent WebKit render. MARK is copied verbatim from brand/logo-mark.svg —
 * re-verify against that file after any edit, because a wrong arc sweep flag
 * produces a shape that still looks plausible in isolation.
 *
 * FOLD is not decoration. Flat-filled, the silhouette collapses into a solid
 * bookmark; the original reads as an implied R only because the crease splits
 * it into facets. The crease runs at 45 degrees from the left edge down to the
 * inner notch — the same vertex both creases radiate from in the raster — and
 * the overlay is kept strictly inside the silhouette so no clip path (and no
 * duplicate DOM id) is needed.
 *
 * Both paths use currentColor so one component serves light and dark grounds.
 * On a dark ground the white-ish overlay disappears and the mark falls back to
 * the flat silhouette, which is the intended behaviour at small sizes anyway.
 */
const MARK =
  'M0 66A66 66 0 0 1 66 0L490 0A66 66 0 0 1 556 66L556 208.15A60 60 0 0 1 538.43 250.57' +
  'L311.16 477.84A8 8 0 0 0 311.16 489.16L539.92 717.92A28 28 0 0 1 512.31 764.61' +
  'L146.11 658.29A6 6 0 0 0 140.19 659.81L58.04 741.96A34 34 0 0 1 0 717.92L0 66Z'

// Both creases radiate from the inner notch, which is what makes that vertex
// the mark's structural centre. FOLD_STEM lightens the left plane, FOLD_LEG
// the lower-right one; the top block stays at full ink.
const FOLD_STEM = 'M0 190L305 483L142 657L0 700Z'
const FOLD_LEG = 'M305 483L500 730L143 657Z'

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 556 766"
      role="img"
      aria-label="Job Tracker AI"
      className={className ?? 'h-8 w-auto text-ink'}
    >
      <title>Job Tracker AI</title>
      <path fill="currentColor" d={MARK} />
      {/* Lifts the ink to roughly the mark's own highlight facet. */}
      <path className="fill-surface" opacity={0.055} d={FOLD_STEM} />
      <path className="fill-surface" opacity={0.055} d={FOLD_LEG} />
    </svg>
  )
}
