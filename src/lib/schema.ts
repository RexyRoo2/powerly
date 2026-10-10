import { z } from "zod";

/**
 * Logical coordinate system.
 *
 * Every slide is laid out on a fixed 16:9 canvas measured in logical units,
 * NOT pixels. The browser renderer and the (future) PPTX exporter both read
 * elements against this same canvas, then scale it to whatever they're
 * actually drawing on. This is what keeps what-you-see-in-the-editor and
 * what-you-get-in-the-download from ever drifting apart.
 */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Position + size, in logical units, shared by every element on a slide. */
const BoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0).optional(),
});

/**
 * Elements never carry a literal hex color. They point at a role in the
 * active theme's palette instead — that's what makes switching themes
 * actually restyle a deck, rather than just changing a label.
 */
export const ColorRoleSchema = z.enum(["background", "surface", "text", "accent", "muted"]);
export type ColorRole = z.infer<typeof ColorRoleSchema>;

// ---------------------------------------------------------------------------
// Element types
// ---------------------------------------------------------------------------

export const TextElementSchema = BoxSchema.extend({
  type: z.literal("text"),
  id: z.string(),
  content: z.string(),
  role: z.enum(["title", "subtitle", "body", "caption", "label"]).default("body"),
  fontFamily: z.enum(["display", "body"]).default("body"),
  fontSize: z.number().positive().default(18),
  fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).default(400),
  color: ColorRoleSchema.default("text"),
  align: z.enum(["left", "center", "right"]).default("left"),
  lineHeight: z.number().positive().default(1.3),
});

export const ImageElementSchema = BoxSchema.extend({
  type: z.literal("image"),
  id: z.string(),
  src: z.string(),
  alt: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
  radius: z.number().min(0).default(0),
});

export const ShapeElementSchema = BoxSchema.extend({
  type: z.literal("shape"),
  id: z.string(),
  shape: z.enum(["rectangle", "ellipse", "line"]).default("rectangle"),
  fill: ColorRoleSchema.default("surface"),
  stroke: ColorRoleSchema.optional(),
  radius: z.number().min(0).default(0),
});

export const IconElementSchema = BoxSchema.extend({
  type: z.literal("icon"),
  id: z.string(),
  name: z.string(),
  color: ColorRoleSchema.default("accent"),
});

export const LineElementSchema = BoxSchema.extend({
  type: z.literal("line"),
  id: z.string(),
  color: ColorRoleSchema.default("muted"),
  thickness: z.number().positive().default(2),
});

export const ChartElementSchema = BoxSchema.extend({
  type: z.literal("chart"),
  id: z.string(),
  chartType: z.enum(["bar", "line", "pie"]).default("bar"),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    })
  ),
});

export const TableElementSchema = BoxSchema.extend({
  type: z.literal("table"),
  id: z.string(),
  rows: z.array(z.array(z.string())),
});

export const GroupElementSchema = BoxSchema.extend({
  type: z.literal("group"),
  id: z.string(),
  children: z.array(z.string()), // ids of grouped elements
});

/** Discriminated union — every element on a slide is exactly one of these. */
export const SlideElementSchema = z.discriminatedUnion("type", [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  IconElementSchema,
  LineElementSchema,
  ChartElementSchema,
  TableElementSchema,
  GroupElementSchema,
]);

export type TextElement = z.infer<typeof TextElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type ShapeElement = z.infer<typeof ShapeElementSchema>;
export type IconElement = z.infer<typeof IconElementSchema>;
export type LineElement = z.infer<typeof LineElementSchema>;
export type ChartElement = z.infer<typeof ChartElementSchema>;
export type TableElement = z.infer<typeof TableElementSchema>;
export type GroupElement = z.infer<typeof GroupElementSchema>;
export type SlideElement = z.infer<typeof SlideElementSchema>;

// ---------------------------------------------------------------------------
// Slide + Presentation
// ---------------------------------------------------------------------------

/**
 * Every deck used to pick ONE of a handful of fixed preset themes — the
 * same five color schemes reused by every student, regardless of subject.
 * Now the AI designs a bespoke palette for THIS deck's own subject (an
 * oceans topic should actually read as blue), the same way a human
 * designer — or the reference Claude "Slides" design system — would never
 * reuse one fixed palette across unrelated briefs. "Theme" as a fixed enum
 * is gone; a palette is now real generated data, not a lookup key.
 */
export const FontChoiceSchema = z.enum(["inter", "instrument-serif", "outfit"]);
export type FontChoice = z.infer<typeof FontChoiceSchema>;

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color like #1C1712");

const DEFAULT_PALETTE_COLORS = {
  background: "#1C1712",
  surface: "#2A231B",
  text: "#F2E9DA",
  accent: "#D97A52",
  muted: "#8FA389",
};

export const PaletteSchema = z.object({
  /** Short, evocative name the AI gives its own palette (e.g. "Ocean Depths") — shown on the deck's dashboard card instead of a fixed preset label. */
  name: z.string().trim().min(1).default("Custom"),
  colors: z
    .object({
      background: HexColorSchema,
      surface: HexColorSchema,
      text: HexColorSchema,
      accent: HexColorSchema,
      muted: HexColorSchema,
    })
    .default(DEFAULT_PALETTE_COLORS),
  fontDisplay: FontChoiceSchema.default("instrument-serif"),
  fontBody: FontChoiceSchema.default("inter"),
});
export type Palette = z.infer<typeof PaletteSchema>;

export const SlideSchema = z.object({
  id: z.string(),
  layout: z.string().default("blank"),
  background: ColorRoleSchema.default("background"),
  elements: z.array(SlideElementSchema),
});
export type Slide = z.infer<typeof SlideSchema>;

export const PresentationSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Short 1-3 word label (e.g. "Biology", "Debate club") shown on deck cards in the dashboard. */
  subject: z.string().trim().min(1).default("General"),
  /** This deck's own generated palette — see PaletteSchema above. */
  theme: PaletteSchema.default({
    name: "Custom",
    colors: DEFAULT_PALETTE_COLORS,
    fontDisplay: "instrument-serif",
    fontBody: "inter",
  }),
  slides: z.array(SlideSchema),
});
export type Presentation = z.infer<typeof PresentationSchema>;
