import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { PresentationSchema } from "@/lib/schema";
import {
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
  THEME_NAMES,
} from "@/lib/aiToolSchemas";
import { applyEditOperations, type RawEditOperation } from "@/lib/applyEdits";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_INSTRUCTION_LENGTH = 2000;

const ELEMENT_PATCH_JSON_SCHEMA = {
  type: "object",
  description: "Only include the fields that are actually changing.",
  properties: {
    content: { type: "string" },
    role: { type: "string", enum: ["title", "subtitle", "body", "caption", "label"] },
    fontFamily: { type: "string", enum: ["display", "body"] },
    fontSize: { type: "number" },
    fontWeight: { type: "number", enum: [400, 500, 600, 700] },
    color: { type: "string", enum: ["text", "accent", "muted"] },
    align: { type: "string", enum: ["left", "center", "right"] },
    fill: { type: "string", enum: ["surface", "accent", "muted"] },
    thickness: { type: "number", description: "For a line element." },
    chartType: { type: "string", enum: ["bar", "line", "pie"], description: "For a chart element." },
    data: {
      type: "array",
      description: "For a chart element — replaces the whole data set.",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "number" } },
        required: ["label", "value"],
      },
    },
    rows: {
      type: "array",
      description: "For a table element — replaces the whole table, first row is the header.",
      items: { type: "array", items: { type: "string" } },
    },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
  },
} as const;

// Image elements are deliberately left out here — the edit flow has no
// channel for new uploads, so the AI has no valid image id it could use.
const ADDABLE_ELEMENT_SCHEMAS = [
  TEXT_ELEMENT_JSON_SCHEMA,
  SHAPE_ELEMENT_JSON_SCHEMA,
  LINE_ELEMENT_JSON_SCHEMA,
  CHART_ELEMENT_JSON_SCHEMA,
  TABLE_ELEMENT_JSON_SCHEMA,
];

const EDIT_TOOL: Anthropic.Tool = {
  name: "propose_edits",
  description: "Propose a minimal set of edits to the current presentation that satisfies the student's instruction.",
  input_schema: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        minItems: 1,
        items: {
          anyOf: [
            {
              type: "object",
              description: "Change specific fields on an existing element.",
              properties: {
                op: { type: "string", const: "update_element" },
                summary: { type: "string", description: "Short plain-English description of this change." },
                slideId: { type: "string" },
                elementId: { type: "string" },
                patch: ELEMENT_PATCH_JSON_SCHEMA,
              },
              required: ["op", "summary", "slideId", "elementId", "patch"],
            },
            {
              type: "object",
              description: "Add a brand new element to an existing slide.",
              properties: {
                op: { type: "string", const: "add_element" },
                summary: { type: "string" },
                slideId: { type: "string" },
                element: { anyOf: ADDABLE_ELEMENT_SCHEMAS },
              },
              required: ["op", "summary", "slideId", "element"],
            },
            {
              type: "object",
              description: "Remove an element from a slide.",
              properties: {
                op: { type: "string", const: "delete_element" },
                summary: { type: "string" },
                slideId: { type: "string" },
                elementId: { type: "string" },
              },
              required: ["op", "summary", "slideId", "elementId"],
            },
            {
              type: "object",
              description: "Insert a brand new slide.",
              properties: {
                op: { type: "string", const: "add_slide" },
                summary: { type: "string" },
                afterSlideId: { type: "string", description: "Id of the slide this goes after. Omit to append at the end." },
                slide: {
                  type: "object",
                  properties: {
                    layout: { type: "string" },
                    background: { type: "string", enum: ["background", "surface"] },
                    elements: {
                      type: "array",
                      items: { anyOf: ADDABLE_ELEMENT_SCHEMAS },
                    },
                  },
                  required: ["elements"],
                },
              },
              required: ["op", "summary", "slide"],
            },
            {
              type: "object",
              description: "Remove a whole slide.",
              properties: {
                op: { type: "string", const: "delete_slide" },
                summary: { type: "string" },
                slideId: { type: "string" },
              },
              required: ["op", "summary", "slideId"],
            },
            {
              type: "object",
              description: "Switch the whole deck's theme.",
              properties: {
                op: { type: "string", const: "change_theme" },
                summary: { type: "string" },
                theme: { type: "string", enum: THEME_NAMES },
              },
              required: ["op", "summary", "theme"],
            },
          ],
        },
      },
    },
    required: ["operations"],
  },
};

const SYSTEM_PROMPT = `You are Powerly's presentation editor assistant. You're given the CURRENT STATE of a presentation as JSON (with real ids) and an instruction from the student describing a change they want. Call propose_edits with the minimal set of operations that achieves exactly what they asked — don't rewrite or "improve" things they didn't ask about.

Rules:
- Reference slides and elements ONLY by the exact ids present in the current state you were given. Never invent an id.
- For update_element, only include the fields in "patch" that are actually changing — leave everything else out.
- New elements follow the same rules as fresh generation: "text", "shape", "line", "chart" (bar/line/pie, real numeric data only), or "table" (first row is the header) — never "image" (there's no new image to use here, so never add one). Position within the 1280 x 720 canvas, "color"/"fill" are roles ("text", "accent", "muted" for text; "surface", "accent", "muted" for shapes), fontFamily "display" only for a title or one big statement.
- If the instruction only makes sense for one slide ("make the title bigger"), only touch that slide.
- Every operation needs a short, specific "summary" in plain English a student would understand, e.g. "Made the title on Slide 1 bigger" or "Added a new slide about photosynthesis stages" — this is shown to them before they accept the change.
- If the instruction is genuinely ambiguous about which slide/element it means, make your best reasonable guess rather than asking — the student will see a preview and can discard it if it's wrong.`;

// Shared budget across /api/generate AND /api/edit (same underlying
// counter, see that route) — generous for a real editing session, capped
// against runaway Anthropic API cost.
const AI_CALL_LIMIT = 30;
const AI_CALL_WINDOW_SECONDS = 60 * 60; // 1 hour

export async function POST(req: Request) {
  // Calls the paid Anthropic API — must be gated behind a real signed-in
  // user (this route has no other access control in front of it).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to edit a presentation." }, { status: 401 });
  }

  let body: { presentation?: unknown; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const presentationCheck = PresentationSchema.safeParse(body.presentation);
  if (!presentationCheck.success) {
    return NextResponse.json({ error: "The current presentation looks malformed — try reloading." }, { status: 400 });
  }
  const presentation = presentationCheck.data;

  const instruction = (body.instruction ?? "").trim();
  if (!instruction) {
    return NextResponse.json({ error: "Type what you'd like changed first." }, { status: 400 });
  }
  if (instruction.length > MAX_INSTRUCTION_LENGTH) {
    return NextResponse.json(
      { error: `That's a long instruction — trim it to under ${MAX_INSTRUCTION_LENGTH.toLocaleString()} characters.` },
      { status: 400 }
    );
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
      { error: "You've hit the AI-edit limit for now — try again in a little while." },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI editing isn't configured yet — ANTHROPIC_API_KEY is missing on the server." },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [EDIT_TOOL],
      tool_choice: { type: "tool", name: "propose_edits" },
      messages: [
        {
          role: "user",
          content: `Current presentation (JSON):\n${JSON.stringify(presentation)}\n\nInstruction: ${instruction}`,
        },
      ],
    });
  } catch (err) {
    console.error("Anthropic edit request failed", err);
    return NextResponse.json({ error: "The AI request failed. Try again in a moment." }, { status: 502 });
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json({ error: "The AI didn't propose any edits. Try rephrasing." }, { status: 502 });
  }

  const operations = ((toolUse.input as { operations?: RawEditOperation[] }).operations ?? []);
  if (operations.length === 0) {
    return NextResponse.json({ error: "The AI didn't propose any edits. Try rephrasing." }, { status: 502 });
  }

  const updated = applyEditOperations(presentation, operations);

  const parsed = PresentationSchema.safeParse(updated);
  if (!parsed.success) {
    console.error("Edited presentation failed schema validation", parsed.error.flatten());
    return NextResponse.json(
      { error: "That edit produced something malformed. Try rephrasing, or a smaller change." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    presentation: parsed.data,
    summaries: operations.map((op) => op.summary),
  });
}
