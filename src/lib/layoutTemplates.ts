import { SLIDE_WIDTH, SLIDE_HEIGHT } from "./schema";

/**
 * Design rules, as code.
 *
 * The old approach let the model invent x/y/width/height for every element
 * on every slide, from scratch, every time. That means the model was doing
 * pixel-perfect spatial math (predicting exactly how many lines a title
 * will wrap to at a given width/font size) that language models are
 * genuinely bad at — and when it guessed wrong, nothing caught it, so
 * elements overlapped (e.g. a title wrapping to 2 lines and colliding with
 * an accent line positioned for 1 line).
 *
 * This file defines a fixed library of hand-measured, pre-spaced slide
 * layouts. Each layout is a named set of "slots" — a slot is a safe
 * x/y/width/height region, measured once by a human (not guessed per-slide
 * by the model) with real margins and real gaps between neighbors. The
 * model's job becomes much simpler and much safer: pick a layout that fits
 * the content, then fill in that layout's slots by name. It never
 * chooses raw geometry for anything that has a slot.
 *
 * "custom" is the one escape hatch for content that genuinely doesn't fit
 * any template (e.g. a full-bleed image slide) — the model still supplies
 * x/y/width/height there, same as before, but it should be rare, and
 * textFit.ts still runs over it as a backstop.
 */

export type SlotRole = "title" | "subtitle" | "body" | "caption" | "label";
export type SlotFontFamily = "display" | "body";
export type SlotAlign = "left" | "center" | "right";

export type Slot = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Suggested defaults — the model can override role/fontFamily/align/color
   * for variety, but never the geometry. */
  fontSize: number;
  fontFamily: SlotFontFamily;
  role: SlotRole;
  align?: SlotAlign;
  lineHeight?: number;
  optional?: boolean;
};

export type LayoutTemplate = {
  name: string;
  description: string;
  slots: Record<string, Slot>;
};

const M = 80; // side margin
const TOP = 60;

const BASE_LAYOUT_TEMPLATES: Record<string, LayoutTemplate> = {
  title: {
    name: "title",
    description: "Opening slide. Eyebrow (optional) + big title + short subtitle.",
    slots: {
      eyebrow: { x: M, y: 200, width: 600, height: 32, fontSize: 15, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 244, width: 1120, height: 190, fontSize: 56, fontFamily: "display", role: "title" },
      subtitle: { x: M, y: 450, width: 900, height: 90, fontSize: 20, fontFamily: "body", role: "subtitle", optional: true, lineHeight: 1.4 },
    },
  },

  "title-body": {
    name: "title-body",
    description: "The default, general-purpose slide: title + one block of supporting text.",
    slots: {
      eyebrow: { x: M, y: TOP, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 96, width: 1120, height: 130, fontSize: 40, fontFamily: "display", role: "title" },
      body: { x: M, y: 260, width: 1120, height: 380, fontSize: 20, fontFamily: "body", role: "body", lineHeight: 1.45 },
    },
  },

  "big-statistic": {
    name: "big-statistic",
    description: "One big number or short phrase, centered, with a small caption. Use sparingly — only when there's one standout stat or line worth saying alone.",
    slots: {
      eyebrow: { x: M, y: 140, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      stat: { x: M, y: 260, width: 1120, height: 200, fontSize: 120, fontFamily: "display", role: "title" },
      caption: { x: M, y: 480, width: 900, height: 90, fontSize: 20, fontFamily: "body", role: "body", optional: true, lineHeight: 1.4 },
    },
  },

  "stat-pair": {
    name: "stat-pair",
    description: "Title + two side-by-side stat callouts. Good for comparing two numbers from the notes.",
    slots: {
      eyebrow: { x: M, y: TOP, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 96, width: 1120, height: 90, fontSize: 32, fontFamily: "display", role: "title" },
      statAValue: { x: M, y: 240, width: 520, height: 110, fontSize: 64, fontFamily: "display", role: "title" },
      statALabel: { x: M, y: 360, width: 520, height: 70, fontSize: 18, fontFamily: "body", role: "body", lineHeight: 1.4 },
      statBValue: { x: 680, y: 240, width: 520, height: 110, fontSize: 64, fontFamily: "display", role: "title" },
      statBLabel: { x: 680, y: 360, width: 520, height: 70, fontSize: 18, fontFamily: "body", role: "body", lineHeight: 1.4 },
      footnote: { x: M, y: 470, width: 1120, height: 60, fontSize: 16, fontFamily: "body", role: "caption", optional: true },
    },
  },

  "three-cards": {
    name: "three-cards",
    description: "Title + three cards in a row — a 3-step process, or three short comparison points. Only use when the content really is three parallel items.",
    slots: {
      eyebrow: { x: M, y: TOP, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 96, width: 1120, height: 70, fontSize: 32, fontFamily: "display", role: "title" },
      card1Bg: { x: 72, y: 210, width: 362, height: 230, fontSize: 1, fontFamily: "body", role: "label", optional: true },
      card1Title: { x: M, y: 230, width: 346, height: 40, fontSize: 20, fontFamily: "body", role: "subtitle" },
      card1Body: { x: M, y: 280, width: 346, height: 150, fontSize: 16, fontFamily: "body", role: "body", lineHeight: 1.4 },
      card2Bg: { x: 459, y: 210, width: 362, height: 230, fontSize: 1, fontFamily: "body", role: "label", optional: true },
      card2Title: { x: 467, y: 230, width: 346, height: 40, fontSize: 20, fontFamily: "body", role: "subtitle" },
      card2Body: { x: 467, y: 280, width: 346, height: 150, fontSize: 16, fontFamily: "body", role: "body", lineHeight: 1.4 },
      card3Bg: { x: 846, y: 210, width: 362, height: 230, fontSize: 1, fontFamily: "body", role: "label", optional: true },
      card3Title: { x: 854, y: 230, width: 346, height: 40, fontSize: 20, fontFamily: "body", role: "subtitle" },
      card3Body: { x: 854, y: 280, width: 346, height: 150, fontSize: 16, fontFamily: "body", role: "body", lineHeight: 1.4 },
      footnote: { x: M, y: 470, width: 1120, height: 60, fontSize: 16, fontFamily: "body", role: "caption", optional: true },
    },
  },

  "two-column": {
    name: "two-column",
    description: "Title + a left/right split, each with its own small heading and body text.",
    slots: {
      eyebrow: { x: M, y: TOP, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 96, width: 1120, height: 70, fontSize: 32, fontFamily: "display", role: "title" },
      leftHeading: { x: M, y: 200, width: 520, height: 40, fontSize: 20, fontFamily: "body", role: "subtitle" },
      leftBody: { x: M, y: 246, width: 520, height: 340, fontSize: 18, fontFamily: "body", role: "body", lineHeight: 1.45 },
      rightHeading: { x: 680, y: 200, width: 520, height: 40, fontSize: 20, fontFamily: "body", role: "subtitle" },
      rightBody: { x: 680, y: 246, width: 520, height: 340, fontSize: 18, fontFamily: "body", role: "body", lineHeight: 1.45 },
    },
  },

  "chart-text": {
    name: "chart-text",
    description: "Title + a chart on the left and a short takeaway beside it. Only use with real numeric data from the notes.",
    slots: {
      eyebrow: { x: M, y: TOP, width: 600, height: 30, fontSize: 14, fontFamily: "body", role: "label", optional: true },
      title: { x: M, y: 96, width: 1120, height: 70, fontSize: 32, fontFamily: "display", role: "title" },
      chart: { x: M, y: 200, width: 680, height: 420, fontSize: 1, fontFamily: "body", role: "label" },
      takeaway: { x: 800, y: 220, width: 400, height: 380, fontSize: 18, fontFamily: "body", role: "body", lineHeight: 1.45 },
    },
  },

  table: {
    name: "table",
    description: "Title + a data table. Only use for real structured info from the notes.",
    slots: {
      title: { x: M, y: 70, width: 1120, height: 70, fontSize: 36, fontFamily: "display", role: "title" },
      table: { x: M, y: 180, width: 1120, height: 460, fontSize: 1, fontFamily: "body", role: "label" },
    },
  },

  closing: {
    name: "closing",
    description: "Closing slide — one summary statement drawn from the material, plus a short line underneath.",
    slots: {
      statement: { x: M, y: 240, width: 1120, height: 220, fontSize: 48, fontFamily: "display", role: "title", lineHeight: 1.25 },
      subtext: { x: M, y: 480, width: 1000, height: 100, fontSize: 20, fontFamily: "body", role: "body", optional: true, lineHeight: 1.4 },
    },
  },

  custom: {
    name: "custom",
    description:
      "Escape hatch only — use this just when nothing above fits (e.g. a full-bleed photo slide). Elements here must supply their own x/y/width/height, inside the 1280x720 canvas with real margins (60-100 units) and no overlaps. Prefer a template above whenever one reasonably fits.",
    slots: {},
  },
};

// Layout NAMES and descriptions are profile-independent (shown to the
// model as-is, see presentationGen.ts's LAYOUT_DOCS) — only the actual
// pixel geometry of each slot varies by spacing profile, below.
export const LAYOUT_TEMPLATES: Record<string, LayoutTemplate> = BASE_LAYOUT_TEMPLATES;
export const LAYOUT_NAMES = Object.keys(LAYOUT_TEMPLATES);

export function isKnownLayout(layout: string): boolean {
  return Object.prototype.hasOwnProperty.call(LAYOUT_TEMPLATES, layout);
}

// ---------------------------------------------------------------------------
// Spacing profiles
//
// Every generated deck used the exact same hand-measured pixel coordinates
// for a given layout name — "title" was always the identical geometry,
// deck after deck. Only the TEXT changed, never the composition. This is
// as much a reason generated decks read as interchangeable as the color
// palette ever was.
//
// Each profile below is a single uniform scale + shift applied to EVERY
// slot in EVERY template, from the canvas's true center. That's
// deliberately the lowest-risk way to get a genuinely different margin/
// density/alignment feel per deck without hand-authoring a second full set
// of measurements (and the overlap/bounds risk that would carry): a
// uniform affine transform applied identically to every box in a template
// can only ever preserve their relative positions and gaps, scaled — it
// can't introduce a NEW overlap where the hand-measured original had none,
// and assertNoOverlaps() below re-verifies every profile anyway.
// ---------------------------------------------------------------------------

export type SpacingProfile = "balanced" | "airy" | "bold" | "editorial";
export const SPACING_PROFILE_NAMES: SpacingProfile[] = ["balanced", "airy", "bold", "editorial"];

type ProfileTransform = { scale: number; shiftX: number; shiftY: number };

const SPACING_PROFILE_TRANSFORMS: Record<SpacingProfile, ProfileTransform> = {
  // Unchanged — today's hand-measured geometry, exactly as before profiles existed.
  balanced: { scale: 1, shiftX: 0, shiftY: 0 },
  // Pulled in from every edge: noticeably more whitespace, a quieter, more editorial-magazine feel.
  airy: { scale: 0.88, shiftX: 0, shiftY: 0 },
  // Pushed out toward every edge: smaller margins, content fills more of the canvas, a denser/bolder feel.
  bold: { scale: 1.08, shiftX: 0, shiftY: -4 },
  // A genuine compositional change, not just density: the whole content block shifts right, so the
  // left margin reads noticeably bigger than the right — an asymmetric, off-center editorial layout.
  editorial: { scale: 0.95, shiftX: 36, shiftY: 0 },
};

function transformSlot(slot: Slot, t: ProfileTransform): Slot {
  const cx = SLIDE_WIDTH / 2;
  const cy = SLIDE_HEIGHT / 2;
  return {
    ...slot,
    x: Math.round(cx + (slot.x - cx) * t.scale + t.shiftX),
    y: Math.round(cy + (slot.y - cy) * t.scale + t.shiftY),
    width: Math.round(slot.width * t.scale),
    height: Math.round(slot.height * t.scale),
    fontSize: Math.round(slot.fontSize * t.scale),
  };
}

function buildTemplatesForProfile(profile: SpacingProfile): Record<string, LayoutTemplate> {
  if (profile === "balanced") return BASE_LAYOUT_TEMPLATES;
  const t = SPACING_PROFILE_TRANSFORMS[profile];
  const out: Record<string, LayoutTemplate> = {};
  for (const [key, template] of Object.entries(BASE_LAYOUT_TEMPLATES)) {
    const slots: Record<string, Slot> = {};
    for (const [slotName, slot] of Object.entries(template.slots)) {
      slots[slotName] = transformSlot(slot, t);
    }
    out[key] = { ...template, slots };
  }
  return out;
}

const TEMPLATES_BY_PROFILE: Record<SpacingProfile, Record<string, LayoutTemplate>> = {
  balanced: BASE_LAYOUT_TEMPLATES,
  airy: buildTemplatesForProfile("airy"),
  bold: buildTemplatesForProfile("bold"),
  editorial: buildTemplatesForProfile("editorial"),
};

export function getSlot(layout: string, slotName: string, profile: SpacingProfile = "balanced"): Slot | undefined {
  return TEMPLATES_BY_PROFILE[profile]?.[layout]?.slots[slotName];
}

// Sanity-checked once at module load, in dev, so a geometry mistake in a
// template (now the ONE place layout bugs could hide) is caught immediately
// instead of showing up as a rendering bug in someone's generated deck. Runs
// over every spacing profile, not just the base set — a transform preset
// that pushes a slot out of bounds (e.g. too aggressive a shift/scale) is
// caught here too, not discovered in a real deck.
//
// A "*Bg" slot (a card's background panel) is deliberately excluded from
// the overlap check against its own card's content slots — a background
// shape sitting behind its card's title/body text is the whole point of
// it, not a collision. Real collisions are between two pieces of content
// competing for the same space, which this still catches.
function assertNoOverlaps() {
  for (const profile of SPACING_PROFILE_NAMES) {
    const templates = TEMPLATES_BY_PROFILE[profile];
    for (const template of Object.values(templates)) {
      const boxes = Object.entries(template.slots);
      for (let i = 0; i < boxes.length; i++) {
        const [nameA, a] = boxes[i];
        if (a.x < 0 || a.y < 0 || a.x + a.width > SLIDE_WIDTH || a.y + a.height > SLIDE_HEIGHT) {
          throw new Error(`layoutTemplates: [${profile}] "${template.name}.${nameA}" falls outside the ${SLIDE_WIDTH}x${SLIDE_HEIGHT} canvas`);
        }
        for (let j = i + 1; j < boxes.length; j++) {
          const [nameB, b] = boxes[j];
          if (nameA.endsWith("Bg") || nameB.endsWith("Bg")) continue; // background panel, expected to underlap its card's content
          const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
          if (overlaps) {
            throw new Error(`layoutTemplates: [${profile}] "${template.name}.${nameA}" overlaps "${template.name}.${nameB}"`);
          }
        }
      }
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  assertNoOverlaps();
}

// ---------------------------------------------------------------------------
// Stack regions
//
// A multi-column layout's slots above are all FIXED heights — a card body
// with one sentence and a card body with five get the identical box, so the
// short one strands its text at the top of empty space and the long one has
// to shrink or overflow. A "stack region" is an ordered list of one column's
// own slot names: presentationGen.ts measures each slot's REAL content
// height (not its nominal box height) and re-stacks them tightly, one right
// after another, starting from the same fixed top every sibling column
// already shares — so card/column headings across a row stay aligned with
// each other exactly as before. Only a slot's height, and everything below
// it in its OWN column, ever moves; x/width/fontSize/fontFamily/lineHeight
// above remain the one source of truth for every slot, stacked or not.
// ---------------------------------------------------------------------------

export const STACK_REGIONS: Record<string, string[][]> = {
  "two-column": [
    ["leftHeading", "leftBody"],
    ["rightHeading", "rightBody"],
  ],
  "three-cards": [
    ["card1Title", "card1Body"],
    ["card2Title", "card2Body"],
    ["card3Title", "card3Body"],
  ],
  "stat-pair": [
    ["statAValue", "statALabel"],
    ["statBValue", "statBLabel"],
  ],
};

// Which "*Bg" slot (if any) wraps a given region, by that region's index in
// STACK_REGIONS above — only three-cards has a background panel per column.
export const STACK_REGION_BG_SLOTS: Record<string, Array<string | undefined>> = {
  "three-cards": ["card1Bg", "card2Bg", "card3Bg"],
};
