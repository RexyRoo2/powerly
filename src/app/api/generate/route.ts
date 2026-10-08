import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { PresentationSchema } from "@/lib/schema";
import {
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  IMAGE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
  THEME_NAMES,
} from "@/lib/aiToolSchemas";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_NOTES_LENGTH = 12000;
const MAX_IMAGES = 4;
const MAX_IMAGE_DECODED_BYTES = 6 * 1024 * 1024; // 6MB per image, decoded
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type UploadedImage = { id: string; mediaType: string; data: string };

// Covers every element type Slide.tsx / SlideEditor.tsx actually know how
// to render. Icon and group elements are still deferred to a later
// milestone — asking the model for them now would just produce slides
// with invisible elements.
const ELEMENT_SCHEMAS = [
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  IMAGE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
];

const GENERATE_TOOL: Anthropic.Tool = {
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
            layout: { type: "string", description: "Short label for this slide's layout, e.g. 'title-body', 'big-statistic', 'two-column', 'quote', 'chart', 'table'." },
            background: { type: "string", enum: ["background", "surface"] },
            elements: {
              type: "array",
              items: { anyOf: ELEMENT_SCHEMAS },
            },
          },
          required: ["elements"],
        },
      },
    },
    required: ["title", "subject", "theme", "slides"],
  },
};

const SYSTEM_PROMPT = `You are Powerly's presentation architect. Powerly turns a student's own notes (and optionally photos they attach — handwritten notes, textbook pages, diagrams, graphs) into a clear, well-organized slide deck for a school presentation. You do NOT invent facts the student didn't provide, and you do NOT do their assignment for them — you organize and present what they already gave you.

Given the student's material, call create_presentation. Rules:

- Element types available: "text", "shape", "line" (a thin divider — prefer this over a thin shape rectangle), "image" (see below), "chart" (bar/line/pie), "table". No other types are rendered yet.
- The canvas is 1280 x 720 logical units. Every element needs x, y, width, height inside that canvas. Leave real margins (60-100 units from the edges), don't let elements overlap, and give text enough width to wrap sensibly at the font size you chose.
- Produce between 4 and 10 slides depending on how much material there is. Start with a title slide. End with a clean closing slide (a summary or key takeaway drawn from the material — never invent a quote or statistic that isn't in it).
- Every text element needs a "role" (title, subtitle, body, caption, or label). Pick "color": "text" for normal copy, "accent" for the one most important number or phrase per slide (use it sparingly, 1-2 elements per slide at most), "muted" for captions and labels.
- Use "fontFamily": "display" only for slide titles or one big standalone statement per slide. Use "body" for everything else.
- If attached images contain photographed/handwritten notes, read and incorporate their content the same as typed notes. If an attached image is itself worth showing on the slide as a visual (a diagram or graph the student photographed), place it with an "image" element whose "src" is EXACTLY the image's given id (e.g. "upload-1") — never invent a URL or filename, and never use an id that wasn't given to you.
- Use a "chart" only for real numeric data present in the material — never invent numbers. Use a "table" only for real structured info (a comparison, a list of terms, stats) — keep it small enough to read on a slide.
- Vary layout across slides — don't repeat "title + one paragraph" every time. Mix in: a title with 2-3 short supporting blocks spaced apart, a big single statistic or short phrase centered, a simple two-column split, a chart with a short takeaway beside it, a comparison table. A thin "line" or thin "shape" rectangle (height 4-6, fill "accent") under a title makes a nice divider — use it occasionally, not on every slide.
- Pick ONE "theme" for the whole deck based on the subject's tone: academic or editorial for history/humanities, minimal or futuristic for science/tech/math, playful for something lighter or creative. Don't ask — just choose the best fit.
- Give the whole presentation a short, clear "title", and a short "subject" label (1-3 words, e.g. "Biology", "History", "Debate club") that best categorizes it.`;

// Shared budget across /api/generate AND /api/edit (same underlying
// counter) — generous enough for a real study session (generate a deck,
// then ask the AI to tweak it a dozen times), capped enough that one
// account can't quietly run up the Anthropic bill.
const AI_CALL_LIMIT = 30;
const AI_CALL_WINDOW_SECONDS = 60 * 60; // 1 hour

export async function POST(req: Request) {
  // This calls the paid Anthropic API, so it has to be gated behind a real
  // signed-in user — reachable directly (no proxy/middleware enforces
  // this), it was previously open to anyone on the internet, logged in or
  // not.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to generate a presentation." }, { status: 401 });
  }

  let body: { notes?: string; images?: UploadedImage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const notes = (body.notes ?? "").trim();
  const images = Array.isArray(body.images) ? body.images : [];

  if (!notes && images.length === 0) {
    return NextResponse.json({ error: "Add some notes or attach an image first." }, { status: 400 });
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `That's a lot of notes — trim it to under ${MAX_NOTES_LENGTH.toLocaleString()} characters for now.` },
      { status: 400 }
    );
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Attach at most ${MAX_IMAGES} images.` }, { status: 400 });
  }
  const imagesById = new Map<string, string>(); // id -> data: URI, for later src resolution
  for (const img of images) {
    if (!img || typeof img.id !== "string" || !img.id) {
      return NextResponse.json({ error: "One of the attached images is missing an id." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_MEDIA_TYPES.has(img.mediaType)) {
      return NextResponse.json({ error: "Attached images must be JPEG, PNG, WEBP, or GIF." }, { status: 400 });
    }
    const decodedBytes = Math.floor((img.data?.length ?? 0) * 0.75);
    if (!img.data || decodedBytes > MAX_IMAGE_DECODED_BYTES) {
      return NextResponse.json({ error: "One of the attached images is too large." }, { status: 400 });
    }
    imagesById.set(img.id, `data:${img.mediaType};base64,${img.data}`);
  }

  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_ai_rate_limit", {
    p_limit: AI_CALL_LIMIT,
    p_window_seconds: AI_CALL_WINDOW_SECONDS,
  });
  if (rateLimitError) {
    console.error("Rate limit check failed", rateLimitError);
    return NextResponse.json({ error: "Something went wrong. Try again in a moment." }, { status: 500 });
  }
  if (!withinLimit) {
    return NextResponse.json(
      { error: "You've hit the generation limit for now — try again in a little while." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation isn't configured yet — ANTHROPIC_API_KEY is missing on the server." },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  const content: Anthropic.MessageParam["content"] = [];
  if (images.length > 0) {
    content.push({
      type: "text",
      text: "The student attached these images (photos of notes, textbook pages, diagrams, etc.) as material for the deck:",
    });
    for (const img of images) {
      content.push({ type: "text", text: `Image id "${img.id}":` });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: img.data,
        },
      });
    }
  }
  content.push({
    type: "text",
    text: notes
      ? `Student's notes:\n\n${notes}`
      : "The student didn't type any notes — work from the attached images only.",
  });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [GENERATE_TOOL],
      tool_choice: { type: "tool", name: "create_presentation" },
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    console.error("Anthropic request failed", err);
    return NextResponse.json({ error: "The AI request failed. Try again in a moment." }, { status: 502 });
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "The AI didn't return a presentation. Try again." }, { status: 502 });
  }

  let presentation: ReturnType<typeof shapeIntoPresentation>;
  try {
    presentation = shapeIntoPresentation(toolUse.input, imagesById);
  } catch (err) {
    console.error("Failed to normalize the AI's presentation output", err);
    return NextResponse.json(
      { error: "The AI produced something malformed. Try again, or try shorter notes." },
      { status: 502 }
    );
  }

  const parsed = PresentationSchema.safeParse(presentation);
  if (!parsed.success) {
    console.error("Generated presentation failed schema validation", parsed.error.flatten());
    // Normalization above should catch almost everything — if it still
    // fails, include a short diagnostic (not just a dead-end message) so
    // it's actually fixable from a bug report instead of a guess.
    const issues = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join(" | ");
    return NextResponse.json(
      { error: `The AI produced something malformed. Try again, or try shorter notes. [${issues}]` },
      { status: 502 }
    );
  }

  return NextResponse.json({ presentation: parsed.data });
}

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
 * Normalizes one element's fields by type, coercing what's fixable.
 * Returns null if the element is too broken to use (missing geometry, or an
 * unrecognized/unresolvable type) — callers drop it rather than fail.
 */
function normalizeElement(
  el: Record<string, unknown>,
  imagesById: Map<string, string>
): Record<string, unknown> | null {
  if (!el || typeof el !== "object") return null;
  const box = {
    x: num(el.x, NaN),
    y: num(el.y, NaN),
    width: positiveNum(el.width, NaN),
    height: positiveNum(el.height, NaN),
  };
  if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) {
    return null; // no usable position/size — can't place this on the canvas
  }

  switch (el.type) {
    case "text":
      if (typeof el.content !== "string" || !el.content.trim()) return null;
      return {
        ...box,
        type: "text",
        content: el.content,
        role: pick(el.role, TEXT_ROLES, "body"),
        fontFamily: pick(el.fontFamily, FONT_FAMILIES, "body"),
        fontSize: positiveNum(el.fontSize, 18),
        fontWeight: FONT_WEIGHTS.has(num(el.fontWeight, 400) as 400 | 500 | 600 | 700)
          ? (num(el.fontWeight, 400) as 400 | 500 | 600 | 700)
          : 400,
        color: pick(el.color, COLOR_ROLES, "text"),
        align: pick(el.align, ALIGNS, "left"),
        lineHeight: positiveNum(el.lineHeight, 1.3),
      };
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
function shapeIntoPresentation(input: unknown, imagesById: Map<string, string>) {
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
    const elementsInput = Array.isArray(slide?.elements) ? slide.elements : [];
    const elements = elementsInput
      .map((el, elIndex): Record<string, unknown> | null => {
        const normalized = normalizeElement(el, imagesById);
        if (!normalized) return null;
        return { ...normalized, id: `${slideId}-el-${elIndex + 1}` };
      })
      .filter((el): el is Record<string, unknown> => el !== null);
    return {
      id: slideId,
      layout: slide.layout ?? "blank",
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
