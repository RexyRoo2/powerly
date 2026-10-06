import { NextResponse } from "next/server";
import { PresentationSchema } from "@/lib/schema";
import { exportPresentationToPptx } from "@/lib/exportPptx";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "presentation";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { presentation?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PresentationSchema.safeParse(body.presentation);
  if (!parsed.success) {
    return NextResponse.json({ error: "This presentation looks malformed — try reloading." }, { status: 400 });
  }

  // Atomic, race-safe decrement scoped to the caller (consume_export_credit
  // reads auth.uid() itself server-side — never a client-supplied id).
  const { data: consumed, error: creditError } = await supabase.rpc("consume_export_credit");
  if (creditError) {
    console.error("Failed to consume export credit", creditError);
    return NextResponse.json({ error: "Couldn't check your credit balance. Try again." }, { status: 500 });
  }
  if (!consumed) {
    return NextResponse.json(
      { error: "You're out of export credits.", code: "OUT_OF_CREDITS" },
      { status: 402 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = await exportPresentationToPptx(parsed.data);
  } catch (err) {
    console.error("PPTX export failed", err);
    // A server-side build failure shouldn't cost a credit — give it back.
    // refund_export_credit is server-only (unlike consume, it unconditionally
    // adds a credit, so it must not be reachable via the user's own session) —
    // called here with the service-role client instead.
    try {
      const serviceClient = createServiceClient();
      const { error: refundError } = await serviceClient.rpc("refund_export_credit", { p_user_id: user.id });
      if (refundError) console.error("Failed to refund export credit after a failed build", refundError);
    } catch (refundErr) {
      console.error("Failed to refund export credit after a failed build", refundErr);
    }
    return NextResponse.json({ error: "Couldn't build the PowerPoint file. Try again." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${slugify(parsed.data.title)}.pptx"`,
    },
  });
}
