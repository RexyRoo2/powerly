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
const GROWTH_STEP = 2;

// Below this fraction of a box's height, a short line or two is genuinely
// underusing its slot — "a line or two sitting in a corner" of an
// otherwise-empty box — and is worth growing rather than left small and
// stranded. Above this fraction, the box already reads as reasonably used;
// growing it further would be a cosmetic nudge nobody asked for.
const SPARSE_FRACTION = 0.55;

// How far a sparse slot's text may grow before it stops reading as
// "deliberately sized for short content" and starts reading as oversized/
// accidental. Only roles whose box is sized to hold real prose (body,
// subtitle) grow at all — a title or a big-statistic number is already a
// deliberate per-layout design choice, not something that should balloon
// just because this particular deck's content for it was short. Caption
// and label text stays small on purpose (it's meant to read as secondary),
// so it never grows either.
const MAX_GROWTH_RATIO: Record<FitRole, number> = {
  title: 1,
  subtitle: 1.15,
  body: 1.3,
  caption: 1,
  label: 1,
};
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

/**
 * The inverse question from estimateCapacity: not "how much fits", but "how
 * tall does THIS content actually render at this width/font size". Exported
 * so callers outside this file (the per-slide vertical-rebalancing pass in
 * presentationGen.ts) can tell a slide's real content height apart from its
 * slot's nominal box height, using the exact same estimate fitTextToBox
 * itself grows/shrinks against — two different estimates of "how tall is
 * this text" could disagree with each other and produce a worse result than
 * either alone.
 */
export function estimateTextBlockHeight(
  content: string,
  width: number,
  fontSize: number,
  lineHeight: number,
  fontFamily: FitFontFamily
): number {
  const avgCharWidth = fontSize * AVG_CHAR_WIDTH_RATIO[fontFamily];
  const charsPerLine = Math.max(1, Math.floor(width * USABLE_FRACTION / avgCharWidth));
  const lines = Math.max(1, Math.ceil(content.length / charsPerLine));
  return lines * fontSize * lineHeight * LINE_HEIGHT_FUDGE;
}

export function fitTextToBox(params: {
  content: string;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: FitFontFamily;
  role: FitRole;
}): { content: string; fontSize: number; shrunk: boolean; truncated: boolean; grew: boolean } {
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

  if (content.length > capacity) {
    // Still doesn't fit at the floor size — truncate rather than let it
    // silently overflow into whatever sits below it. Shrunk content is
    // already at the "needed more room" extreme, so it's never a grow
    // candidate too.
    const safeLength = Math.max(1, capacity - 1);
    const truncated = content.slice(0, safeLength).replace(/\s+\S*$/, "") + "…";
    return { content: truncated, fontSize, shrunk: true, truncated: true, grew: false };
  }

  // The opposite failure mode from overflow: content that uses only a
  // sliver of its box. Left alone, that's "a line or two sitting in a
  // corner" of an otherwise-empty slide — exactly what this grows out of.
  // Only roles meant to hold real prose grow (MAX_GROWTH_RATIO), only when
  // the content is genuinely sparse (SPARSE_FRACTION), and only up to
  // whatever size still provably fits the box — so this can make sparse
  // content look deliberately sized, but can never introduce an overflow
  // the shrink loop above would otherwise have caught.
  let grew = false;
  const usedAtBase = estimateTextBlockHeight(content, width, fontSize, lineHeight, fontFamily);
  const growthCeiling = Math.round(params.fontSize * MAX_GROWTH_RATIO[role]);
  if (usedAtBase < height * SPARSE_FRACTION && growthCeiling > fontSize) {
    let candidate = fontSize;
    while (candidate + GROWTH_STEP <= growthCeiling) {
      const next = candidate + GROWTH_STEP;
      const neededHeight = estimateTextBlockHeight(content, width, next, lineHeight, fontFamily);
      const neededCapacity = estimateCapacity(width, height, next, lineHeight, fontFamily);
      if (neededHeight > height || content.length > neededCapacity) break;
      candidate = next;
      grew = true;
    }
    fontSize = candidate;
  }

  return { content, fontSize, shrunk, truncated: false, grew };
}
