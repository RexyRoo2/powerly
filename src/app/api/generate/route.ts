import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PresentationSchema } from "@/lib/schema";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_NOTES_LENGTH = 12000;

// Keep this schema small and honest: it only describes the element types
// Slide.tsx / SlideEditor.tsx actually know how to render (text, shape).
// Icon/chart/table/image arrive in later milestones — asking the model for
// them now would just produce slides with invisible elements.
const GENERATE_TOOL: Anthropic.Tool = {
  name: "create_presentation",
  description: "Create a structured student presentation from the given notes.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short title for the whole presentation." },
      theme: {
        type: "string",
        enum: ["minimal", "editorial", "futuristic", "academic", "playful"],
        description: "Single best-fit visual theme for this deck's subject and tone.",
      },
      slides: {
        type: "array",
        minItems: 4,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            layout: { type: "string", description: "Short label for this slide's layout, e.g. 'title-body', 'big-statistic', 'two-column', 'quote'." },
            background: { type: "string", enum: ["background", "surface"] },
            elements: {
              type: "array",
              items: {
                anyOf: [
                  {
                    type: "object",
                    description: "A text element.",
                    properties: {
                      type: { type: "string", const: "text" },
                      content: { type: "string" },
                      role: { type: "string", enum: ["title", "subtitle", "body", "caption", "label"] },
                      fontFamily: { type: "string", enum: ["display", "body"] },
                      fontSize: { type: "number", description: "Logical units; canvas is 720 tall. Titles ~48-64, body ~18-24, caption ~13-15." },
                      fontWeight: { type: "number", enum: [400, 500, 600, 700] },
                      color: { type: "string", enum: ["text", "accent", "muted"] },
                      align: { type: "string", enum: ["left", "center", "right"] },
                      x: { type: "number" },
                      y: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" },
                    },
                    required: ["type", "content", "x", "y", "width", "height"],
                  },
                  {
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
                  },
                ],
              },
            },
          },
          required: ["elements"],
        },
      },
    },
    required: ["title", "theme", "slides"],
  },
};

const SYSTEM_PROMPT = `You are Powerly's presentation architect. Powerly turns a student's own notes into a clear, well-organized slide deck for a school presentation. You do NOT invent facts the student didn't provide, and you do NOT do their assignment for them — you organize and present what they already wrote.

Given the student's notes, call create_presentation. Rules:

- Use ONLY "text" and "shape" elements — nothing else is rendered yet.
- The canvas is 1280 x 720 logical units. Every element needs x, y, width, height inside that canvas. Leave real margins (60-100 units from the edges), don't let elements overlap, and give text enough width to wrap sensibly at the font size you chose.
- Produce between 4 and 10 slides depending on how much is in the notes. Start with a title slide. End with a clean closing slide (a summary or key takeaway drawn from the notes — never invent a quote or statistic that isn't in them).
- Every text element needs a "role" (title, subtitle, body, caption, or label). Pick "color": "text" for normal copy, "accent" for the one most important number or phrase per slide (use it sparingly, 1-2 elements per slide at most), "muted" for captions and labels.
- Use "fontFamily": "display" only for slide titles or one big standalone statement per slide. Use "body" for everything else.
- Vary layout across slides — don't repeat "title + one paragraph" every time. Mix in: a title with 2-3 short supporting blocks spaced apart, a big single statistic or short phrase centered, a simple two-column split. A thin "shape" rectangle (height 4-6, fill "accent") under a title makes a nice divider — use it occasionally, not on every slide.
- Pick ONE "theme" for the whole deck based on the subject's tone: academic or editorial for history/humanities, minimal or futuristic for science/tech/math, playful for something lighter or creative. Don't ask — just choose the best fit.
- Give the whole presentation a short, clear "title".`;

export async function POST(req: Request) {
  let body: { notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const notes = (body.notes ?? "").trim();
  if (!notes) {
    return NextResponse.json({ error: "Paste some notes first." }, { status: 400 });
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `That's a lot of notes — trim it to under ${MAX_NOTES_LENGTH.toLocaleString()} characters for now.` },
      { status: 400 }
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

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      tools: [GENERATE_TOOL],
      tool_choice: { type: "tool", name: "create_presentation" },
      messages: [{ role: "user", content: `Student's notes:\n\n${notes}` }],
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

  const presentation = shapeIntoPresentation(toolUse.input);

  const parsed = PresentationSchema.safeParse(presentation);
  if (!parsed.success) {
    console.error("Generated presentation failed schema validation", parsed.error.flatten());
    return NextResponse.json(
      { error: "The AI produced something malformed. Try again, or try shorter notes." },
      { status: 502 }
    );
  }

  return NextResponse.json({ presentation: parsed.data });
}

/**
 * The model never invents ids — we assign them deterministically here so
 * they're always unique, instead of trusting the model to not collide.
 */
function shapeIntoPresentation(input: unknown) {
  const raw = input as {
    title?: string;
    theme?: string;
    slides?: Array<{
      layout?: string;
      background?: string;
      elements?: Array<Record<string, unknown>>;
    }>;
  };

  const slides = (raw.slides ?? []).map((slide, slideIndex) => {
    const slideId = `slide-${slideIndex + 1}`;
    const elements = (slide.elements ?? []).map((el, elIndex) => ({
      ...el,
      id: `${slideId}-el-${elIndex + 1}`,
    }));
    return {
      id: slideId,
      layout: slide.layout ?? "blank",
      background: slide.background ?? "background",
      elements,
    };
  });

  return {
    id: `gen-${Date.now()}`,
    title: raw.title ?? "Untitled presentation",
    theme: raw.theme ?? "academic",
    slides,
  };
}
