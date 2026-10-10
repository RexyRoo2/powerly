/**
 * The safety net under the layout templates.
 *
 * Templates (layoutTemplates.ts) give every element a hand-measured,
 * non-overlapping box. But box size alone doesn't guarantee the text that
 * goes IN the box actually fits at the font size chosen — a slot sized for
 * a short title still overflows if the model (or a "custom"-layout slide)
 * puts three sentences in it. This estimates whether content fits a given
 * box at a given font size, and if not, shrinks the font size in steps
 * (down to a sensible floor per text role) before falling back to a
 * truncation as an absolute last resort.
 *
 * This is a heuristic, not real font metrics (no canvas/font-rendering
 * available here) — it deliberately estimates on the generous-margin side
 * (wider average character, fuller line height) so it shrinks/truncates a
 * little early rather than a little late. Overestimating a bit and
 * shrinking unnecessary is a cosmetic cost; underestimating is the
 * overlap bug this exists to prevent.
 */

export type FitRole = "title" | "subtitle" | "body" | "caption" | "label";
export type FitFontFamily = "display" | "body";

// Average glyph width as a fraction of font size. Display faces used here
// run a bit wider/rounder than the body sans, so they get a larger ratio.
const AVG_CHAR_WIDTH_RATIO: Record<FitFontFamily, number> = {
  display: 0.58,
  body: 0.55,
};

// Never shrink a role's text past this floor — below it, text reads as
// broken/illegible rather than "a bit smaller", so truncation takes over.
const MIN_FONT_SIZE: Record<FitRole, number> = {
  title: 28,
  subtitle: 16,
  body: 14,
  caption: 11,
  label: 11,
};

const SHRINK_STEP = 2;
// Estimated capacity is treated as only 90% usable — word-wrap rarely
// fills a line edge-to-edge, so this keeps the estimate from being
// optimistic right at the boundary.
const USABLE_FRACTION = 0.9;
// A font's actual single-line height is bigger than its nominal size —
// ascenders, descenders, and built-in leading add roughly 20% on top, and
// the renderer's line-spacing multiplier scales THAT, not the raw font
// size. Measured empirically: without this, a multi-line title could pass
// the capacity check and still visually overflow its box (confirmed by
// rendering a real .pptx and comparing against the estimate — see the
// fix-verification deck test). This factor corrects for it.
const LINE_HEIGHT_FUDGE = 1.22;

function estimateCapacity(width: number, height: number, fontSize: number, lineHeight: number, fontFamily: FitFontFamily): number {
  const avgCharWidth = fontSize * AVG_CHAR_WIDTH_RATIO[fontFamily];
  const charsPerLine = Math.max(1, Math.floor(width / avgCharWidth));
  const lineHeightUnits = fontSize * lineHeight * LINE_HEIGHT_FUDGE;
  const maxLines = Math.max(1, Math.floor(height / lineHeightUnits));
  return Math.floor(charsPerLine * maxLines * USABLE_FRACTION);
}

export function fitTextToBox(params: {
  content: string;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: FitFontFamily;
  role: FitRole;
}): { content: string; fontSize: number; shrunk: boolean; truncated: boolean } {
  const { content, width, height, lineHeight, fontFamily, role } = params;
  let fontSize = params.fontSize;
  const floor = MIN_FONT_SIZE[role];
  let shrunk = false;

  let capacity = estimateCapacity(width, height, fontSize, lineHeight, fontFamily);
  while (content.length > capacity && fontSize - SHRINK_STEP >= floor) {
    fontSize -= SHRINK_STEP;
    shrunk = true;
    capacity = estimateCapacity(width, height, fontSize, lineHeight, fontFamily);
  }

  if (content.length <= capacity) {
    return { content, fontSize, shrunk, truncated: false };
  }

  // Still doesn't fit at the floor size — truncate rather than let it
  // silently overflow into whatever sits below it.
  const safeLength = Math.max(1, capacity - 1);
  const truncated = content.slice(0, safeLength).replace(/\s+\S*$/, "") + "…";
  return { content: truncated, fontSize, shrunk: true, truncated: true };
}
