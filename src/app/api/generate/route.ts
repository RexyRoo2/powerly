import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { PresentationSchema } from "@/lib/schema";
import { GENERATE_TOOL, SYSTEM_PROMPT, shapeIntoPresentation } from "@/lib/presentationGen";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_NOTES_LENGTH = 12000;
const MAX_IMAGES = 4;
const MAX_IMAGE_DECODED_BYTES = 6 * 1024 * 1024; // 6MB per image, decoded
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type UploadedImage = { id: string; mediaType: string; data: string };

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
