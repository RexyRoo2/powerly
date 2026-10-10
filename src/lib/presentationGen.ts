import type Anthropic from "@anthropic-ai/sdk";
import {
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  IMAGE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
  THEME_NAMES,
  withOptionalGeometry,
} from "./aiToolSchemas";
import { LAYOUT_NAMES, LAYOUT_TEMPLATES, getSlot, isKnownLayout, type Slot } from "./layoutTemplates";
import { fitTextToBox, type FitRole, type FitFontFamily } from "./textFit";

/**
 * Pure presentation-generation logic for /api/generate — the AI tool
 * definition, system prompt, and the normalization that turns the model's
 * raw tool-call output into a real Presentation object. Deliberately has no
 * dependency on next/server or Supabase, so it can be exercised directly
 * (e.g. from a test script) without standing up a request or a signed-in
 * session — just an Anthropic.Message's tool_use input.
 */

// Covers every element type Slide.tsx / SlideEditor.tsx actually know how
// to render. Icon and group elements are still deferred to a later
// milestone — asking the model for them now would just produce slides
// with invisible elements.
// x/y/width/height are optional here (unlike api/edit's copy of these same
// schemas) — a slotted element omits them entirely and gets its real
// geometry resolved from the chosen layout template server-side. See
// layoutTemplates.ts and withOptionalGeometry.
const ELEMENT_SCHEMAS = [
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  IMAGE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
].map(withOptionalGeometry);

const LAYOUT_DOCS = Object.values(LAYOUT_TEMPLATES)
  .map((t) => `  - "${t.name}": ${t.description}${t.name === "custom" ? "" : ` Slots: ${Object.keys(t.slots).join(", ")}.`}`)
  .join("\n");

export const GENERATE_TOOL: Anthropic.Tool = {
  name: "create_presentation",
  description: "Create a structured student presentation from the given notes and/or images.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short title for the whole presentation." },
      subject: {
        type: "string",
        description: "Short 1-3 word subject/category label for this deck, e.g. 'Biology', 'History', 'Debate club'. Shown on the deck's card in the student's dashboard.",
      },
      theme: {
        type: "string",
        enum: THEME_NAMES,
        description: "Single best-fit visual theme for this deck's subject and tone.",
      },
      slides: {
        type: "array",
        minItems: 4,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            layout: {
              type: "string",
              enum: LAYOUT_NAMES,
              description: "Which named layout template this slide uses. Pick the one that best fits the content for this slide — see the system prompt for what each one offers.",
            },
            background: { type: "string", enum: ["background", "surface"] },
            elements: {
              type: "array",
              items: { anyOf: ELEMENT_SCHEMAS },
            },
          },
          required: ["layout", "elements"],
        },
      },
    },
    required: ["title", "subject", "theme", "slides"],
  },
};

export const SYSTEM_PROMPT = `You are Powerly's presentation architect. Powerly turns a student's own notes (and optionally photos they attach — handwritten notes, textbook pages, diagrams, graphs) into a clear, well-organized slide deck for a school presentation. You do NOT invent facts the student didn't provide, and you do NOT do their assignment for them — you organize and present what they already gave you.

Given the student's material, call create_presentation. Rules:

- Element types available: "text", "shape", "line" (a thin divider — prefer this over a thin shape rectangle), "image" (see below), "chart" (bar/line/pie), "table". No other types are rendered yet.

LAYOUT — read this carefully, it's different from freeform design:
Every slide picks exactly one "layout" from this fixed list. Each layout has a named set of "slots" — a slot is a pre-measured, safe region on the canvas that will never overlap another slot in the same layout. For every element that fills a slot, set its "slot" field to that slot's name and leave x/y/width/height OUT ENTIRELY — the server places it for you, correctly, every time. Do NOT try to compute x/y/width/height for a slotted element; it will be ignored.
${LAYOUT_DOCS}
Only use layout "custom" when a slide genuinely doesn't fit any template above (e.g. a full-bleed photo). On "custom" (and only there), supply x/y/width/height yourself: stay inside the 1280 x 720 canvas, leave real margins (60-100 units from the edges), and don't let elements overlap.

Some layouts have optional slots (e.g. "eyebrow", "footnote", "subtitle") — skip them when they'd add nothing; don't force content into every optional slot just because it exists. When you do use an "eyebrow" label, write it in normal sentence case ("Why it matters"), NOT tracked-out ALL CAPS, and don't join two words with a middle dot ("·") — both are generic AI-slide tells, not a style choice. Vary whether slides even have an eyebrow at all; using one on every single slide is itself a tell.

- Produce between 4 and 10 slides depending on how much material there is. Start with layout "title". End with layout "closing" (a summary or key takeaway drawn from the material — never invent a quote or statistic that isn't in it).
- Every text element needs a "role" (title, subtitle, body, caption, or label) — a slotted element's slot already suggests one, but you can override it for a reason. Pick "color": "text" for normal copy, "accent" for the one most important number or phrase per slide (use it sparingly, 1-2 elements per slide at most), "muted" for captions and labels.
- Use "fontFamily": "display" only for slide titles or one big standalone statement per slide (most slots already default to the right one). Use "body" for everything else.
- If attached images contain photographed/handwritten notes, read and incorporate their content the same as typed notes. If an attached image is itself worth showing on the slide as a visual (a diagram or graph the student photographed), place it with an "image" element whose "src" is EXACTLY the image's given id (e.g. "upload-1") — never invent a URL or filename, and never use an id that wasn't given to you.
- Use a "chart" only for real numeric data present in the material — never invent numbers. Use a "table" only for real structured info (a comparison, a list of terms, stats) — keep it small enough to read on a slide.
- Vary layout across slides — don't repeat "title-body" every time. Reach for "big-statistic", "stat-pair", "three-cards" (only when the content is genuinely 2-3 parallel items), "two-column", "chart-text", or "table" wherever the content actually fits that shape better than a title + paragraph.
- Keep slotted text roughly within what the slot is sized for — a short, punchy line, not a full paragraph, unless the slot is specifically a "body" slot. If content for a slot genuinely runs long, that's fine; it will shrink to fit automatically rather than overflow.
- Pick ONE "theme" for the whole deck based on the subject's tone: academic or editorial for history/humanities, minimal or futuristic for science/tech/math, playful for something lighter or creative. Don't ask — just choose the best fit.
- Give the whole presentation a short, clear "title", and a short "subject" label (1-3 words, e.g. "Biology", "History", "Debate club") that best categorizes it.`;

// ---------------------------------------------------------------------------
// Normalization
//
// The tool-use JSON schema tells the model what's allowed, but it's not a
// hard guarantee — an enum field can still come back slightly off (e.g.
// "column" instead of "bar", a numeric value sent as a string, a chart with
// only one data point). Previously a single element like that failed Zod
// validation for the WHOLE deck. Instead we clamp/coerce anything
// fixable here, and drop only the individual element if it's beyond
// repair — so one odd element costs a slide element, not the whole deck.
// ---------------------------------------------------------------------------

const COLOR_ROLES = new Set(["background", "surface", "text", "accent", "muted"]);
const TEXT_ROLES = new Set(["title", "subtitle", "body", "caption", "label"]);
const FONT_FAMILIES = new Set(["display", "body"]);
const FONT_WEIGHTS = new Set([400, 500, 600, 700]);
const ALIGNS = new Set(["left", "center", "right"]);
const SHAPE_KINDS = new Set(["rectangle", "ellipse", "line"]);
const FITS = new Set(["cover", "contain"]);
const CHART_TYPES = new Set(["bar", "line", "pie"]);

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function positiveNum(v: unknown, fallback: number): number {
  const n = num(v, fallback);
  return n > 0 ? n : fallback;
}

function pick<T extends string>(v: unknown, allowed: Set<T>, fallback: T): T {
  return typeof v === "string" && allowed.has(v as T) ? (v as T) : fallback;
}

/**
 * Resolves an element's real geometry. If it names a "slot" that exists on
 * the slide's layout template, that slot's hand-measured box wins — ALWAYS
 * — regardless of what (if anything) the model also sent for x/y/width/
 * height. This is the actual fix for the title/accent-line collision bug:
 * the model is no longer the source of truth for geometry on any element
 * that has a slot, so it can't place two slotted elements on top of each
 * other even if it tried.
 *
 * Falls back to explicit x/y/width/height (the old behavior) when there's
 * no slot — the "custom" layout, or a slot name that doesn't exist on this
 * layout. Returns null when neither resolves to real numbers.
 */
function resolveGeometry(
  el: Record<string, unknown>,
  layout: string
): { x: number; y: number; width: number; height: number; slot?: Slot } | null {
  const slotName = typeof el.slot === "string" ? el.slot : undefined;
  if (slotName) {
    const slot = getSlot(layout, slotName);
    if (slot) {
      return { x: slot.x, y: slot.y, width: slot.width, height: slot.height, slot };
    }
  }
  const x = num(el.x, NaN);
  const y = num(el.y, NaN);
  const width = positiveNum(el.width, NaN);
  const height = positiveNum(el.height, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null; // no usable position/size — can't place this on the canvas
  }
  return { x, y, width, height };
}

/**
 * Normalizes one element's fields by type, coercing what's fixable.
 * Returns null if the element is too broken to use (missing geometry, or an
 * unrecognized/unresolvable type) — callers drop it rather than fail.
 */
function normalizeElement(
  el: Record<string, unknown>,
  imagesById: Map<string, string>,
  layout: string
): Record<string, unknown> | null {
  if (!el || typeof el !== "object") return null;
  const geometry = resolveGeometry(el, layout);
  if (!geometry) return null;
  const { x, y, width, height, slot } = geometry;
  const box = { x, y, width, height };

  switch (el.type) {
    case "text": {
      if (typeof el.content !== "string" || !el.content.trim()) return null;
      const role = pick(el.role, TEXT_ROLES, slot?.role ?? "body");
      const fontFamily = pick(el.fontFamily, FONT_FAMILIES, slot?.fontFamily ?? "body");
      const fontSize = positiveNum(el.fontSize, slot?.fontSize ?? 18);
      const lineHeight = positiveNum(el.lineHeight, slot?.lineHeight ?? 1.3);
      const align = pick(el.align, ALIGNS, slot?.align ?? "left");

      // The last line of defense: even with a hand-measured slot, long
      // content at a given font size can still be more than the box can
      // hold. Shrink (then, as an absolute last resort, truncate) rather
      // than let it silently overflow into whatever's next.
      const fitted = fitTextToBox({
        content: el.content,
        width,
        height,
        fontSize,
        lineHeight,
        fontFamily: fontFamily as FitFontFamily,
        role: role as FitRole,
      });

      return {
        ...box,
        type: "text",
        content: fitted.content,
        role,
        fontFamily,
        fontSize: fitted.fontSize,
        fontWeight: FONT_WEIGHTS.has(num(el.fontWeight, 400) as 400 | 500 | 600 | 700)
          ? (num(el.fontWeight, 400) as 400 | 500 | 600 | 700)
          : 400,
        color: pick(el.color, COLOR_ROLES, "text"),
        align,
        lineHeight,
      };
    }
    case "shape":
      return {
        ...box,
        type: "shape",
        shape: pick(el.shape, SHAPE_KINDS, "rectangle"),
        fill: pick(el.fill, COLOR_ROLES, "surface"),
        radius: num(el.radius, 0),
      };
    case "line":
      return {
        ...box,
        type: "line",
        color: pick(el.color, COLOR_ROLES, "muted"),
        thickness: positiveNum(el.thickness, 2),
      };
    case "image": {
      const resolvedSrc = imagesById.get(String(el.src));
      if (!resolvedSrc) return null; // unknown/invented image id — drop rather than ship a broken image
      return {
        ...box,
        type: "image",
        src: resolvedSrc,
        alt: typeof el.alt === "string" ? el.alt : "",
        fit: pick(el.fit, FITS, "cover"),
        radius: num(el.radius, 0),
      };
    }
    case "chart": {
      const rawData = Array.isArray(el.data) ? el.data : [];
      const data = rawData
        .map((d) => {
          if (!d || typeof d !== "object") return null;
          const entry = d as Record<string, unknown>;
          if (typeof entry.label !== "string") return null;
          const value = num(entry.value, NaN);
          if (!Number.isFinite(value)) return null;
          return { label: entry.label, value };
        })
        .filter((d): d is { label: string; value: number } => d !== null);
      if (data.length === 0) return null; // nothing real to chart
      return {
        ...box,
        type: "chart",
        chartType: pick(el.chartType, CHART_TYPES, "bar"),
        data,
      };
    }
    case "table": {
      const rawRows = Array.isArray(el.rows) ? el.rows : [];
      const rows = rawRows
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => row.map((cell) => (typeof cell === "string" ? cell : String(cell ?? ""))));
      if (rows.length === 0) return null; // nothing to show
      return { ...box, type: "table", rows };
    }
    default:
      return null; // unrecognized/unsupported element type — drop rather than fail the deck
  }
}

/**
 * The model never invents ids — we assign them deterministically here so
 * they're always unique, instead of trusting the model to not collide.
 */
export function shapeIntoPresentation(input: unknown, imagesById: Map<string, string>) {
  const raw = input as {
    title?: string;
    subject?: string;
    theme?: string;
    slides?: Array<{
      layout?: string;
      background?: string;
      elements?: Array<Record<string, unknown>>;
    }>;
  };

  const slidesInput = Array.isArray(raw.slides) ? raw.slides : [];
  const slides = slidesInput.map((slide, slideIndex) => {
    const slideId = `slide-${slideIndex + 1}`;
    // An unrecognized layout name (the model should never send one, since
    // it's a closed enum in the tool schema, but inputs are never fully
    // trusted) falls back to "custom" — elements on it need their own
    // explicit x/y/width/height rather than a slot that doesn't exist.
    const layout = typeof slide?.layout === "string" && isKnownLayout(slide.layout) ? slide.layout : "custom";
    const elementsInput = Array.isArray(slide?.elements) ? slide.elements : [];
    const elements = elementsInput
      .map((el, elIndex): Record<string, unknown> | null => {
        const normalized = normalizeElement(el, imagesById, layout);
        if (!normalized) return null;
        return { ...normalized, id: `${slideId}-el-${elIndex + 1}` };
      })
      .filter((el): el is Record<string, unknown> => el !== null);
    return {
      id: slideId,
      layout,
      background: pick(slide.background, new Set(["background", "surface"]), "background"),
      elements,
    };
  });

  return {
    id: `gen-${Date.now()}`,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Untitled presentation",
    subject: typeof raw.subject === "string" && raw.subject.trim() ? raw.subject.trim() : "General",
    theme: pick(raw.theme, new Set(THEME_NAMES), "academic"),
    slides,
  };
}
