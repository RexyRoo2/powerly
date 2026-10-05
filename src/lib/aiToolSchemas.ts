/**
 * Shared JSON-schema fragments for the Anthropic tool-use calls in
 * api/generate and api/edit. Both only ever describe "text" and "shape"
 * elements — the only two types Slide.tsx / SlideEditor.tsx render — kept
 * in one place so the two routes can't quietly drift apart.
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

export const THEME_NAMES = ["minimal", "editorial", "futuristic", "academic", "playful"] as const;
