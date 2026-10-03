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

/** A hex color string, e.g. "#1C1712". */
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be a hex color");

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
  color: ColorSchema.default("#F2E9DA"),
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
  fill: ColorSchema.default("#2A231B"),
  stroke: ColorSchema.optional(),
  radius: z.number().min(0).default(0),
});

export const IconElementSchema = BoxSchema.extend({
  type: z.literal("icon"),
  id: z.string(),
  name: z.string(),
  color: ColorSchema.default("#8FA389"),
});

export const LineElementSchema = BoxSchema.extend({
  type: z.literal("line"),
  id: z.string(),
  color: ColorSchema.default("#8FA389"),
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

export const ThemeSchema = z.enum([
  "minimal",
  "editorial",
  "futuristic",
  "academic",
  "playful",
]);
export type Theme = z.infer<typeof ThemeSchema>;

export const SlideSchema = z.object({
  id: z.string(),
  layout: z.string().default("blank"),
  background: ColorSchema.default("#1C1712"),
  elements: z.array(SlideElementSchema),
});
export type Slide = z.infer<typeof SlideSchema>;

export const PresentationSchema = z.object({
  id: z.string(),
  title: z.string(),
  theme: ThemeSchema.default("academic"),
  slides: z.array(SlideSchema),
});
export type Presentation = z.infer<typeof PresentationSchema>;
