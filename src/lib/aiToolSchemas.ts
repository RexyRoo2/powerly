/**
 * Shared JSON-schema fragments for the Anthropic tool-use calls in
 * api/generate and api/edit. Every fragment here describes an element type
 * Slide.tsx / SlideEditor.tsx actually know how to render — kept in one
 * place so the two routes can't quietly drift apart. Icon and group
 * elements are still deferred to a later milestone.
 */

export const TEXT_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description: "A text element.",
  properties: {
    type: { type: "string", const: "text" },
    content: { type: "string" },
    role: { type: "string", enum: ["title", "subtitle", "body", "caption", "label"] },
    fontFamily: { type: "string", enum: ["display", "body"] },
    fontSize: {
      type: "number",
      description: "Logical units; canvas is 720 tall. Titles ~48-64, body ~18-24, caption ~13-15.",
    },
    fontWeight: { type: "number", enum: [400, 500, 600, 700] },
    color: { type: "string", enum: ["text", "accent", "muted"] },
    align: { type: "string", enum: ["left", "center", "right"] },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "content", "x", "y", "width", "height"],
} as const;

export const SHAPE_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description: "A simple shape — mostly used as a thin accent rule or a card background panel.",
  properties: {
    type: { type: "string", const: "shape" },
    shape: { type: "string", enum: ["rectangle", "ellipse"] },
    fill: { type: "string", enum: ["surface", "accent", "muted"] },
    radius: { type: "number" },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "x", "y", "width", "height"],
} as const;

export const LINE_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description: "A thin horizontal divider rule. Prefer this over a thin shape rectangle for dividers.",
  properties: {
    type: { type: "string", const: "line" },
    color: { type: "string", enum: ["text", "accent", "muted"] },
    thickness: { type: "number", description: "Logical units, typically 2-6." },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "x", "y", "width", "height"],
} as const;

export const IMAGE_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description:
    "Places a student-uploaded image on the slide. `src` MUST be exactly one of the uploaded image ids given to you (e.g. \"upload-1\") — never a URL, filename, or anything invented. Only use this for an image actually worth showing as a visual (a diagram, graph, or photo the student wants on the slide), not for every uploaded image.",
  properties: {
    type: { type: "string", const: "image" },
    src: { type: "string", description: "An uploaded image id, exactly as given." },
    alt: { type: "string" },
    fit: { type: "string", enum: ["cover", "contain"] },
    radius: { type: "number" },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "src", "x", "y", "width", "height"],
} as const;

export const CHART_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description:
    "A bar, line, or pie chart. Use ONLY for real numeric data present in the student's notes — never invent numbers.",
  properties: {
    type: { type: "string", const: "chart" },
    chartType: { type: "string", enum: ["bar", "line", "pie"] },
    data: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "number" },
        },
        required: ["label", "value"],
      },
    },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "chartType", "data", "x", "y", "width", "height"],
} as const;

export const TABLE_ELEMENT_JSON_SCHEMA = {
  type: "object",
  description:
    "A simple data table. Put column headers in the first row. Use for real structured info from the notes (a comparison, a list of terms, stats) — keep it small enough to read on a slide (at most ~5 columns, ~6 rows).",
  properties: {
    type: { type: "string", const: "table" },
    rows: {
      type: "array",
      minItems: 2,
      maxItems: 7,
      items: {
        type: "array",
        items: { type: "string" },
      },
    },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
  required: ["type", "rows", "x", "y", "width", "height"],
} as const;

export const THEME_NAMES = ["minimal", "editorial", "futuristic", "academic", "playful"] as const;
