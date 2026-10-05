import { NextResponse } from "next/server";
import { PresentationSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Row Level Security on the `presentations` table means every query here is
 * already scoped to the signed-in user by Postgres itself — a stray bug
 * here can't leak or overwrite another student's deck.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("presentations")
    .select("id, title, data, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list presentations", error);
    return NextResponse.json({ error: "Couldn't load your presentations." }, { status: 500 });
  }

  return NextResponse.json({ presentations: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { id?: string | null; presentation?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PresentationSchema.safeParse(body.presentation);
  if (!parsed.success) {
    return NextResponse.json({ error: "This presentation looks malformed." }, { status: 400 });
  }

  const row = { user_id: user.id, title: parsed.data.title, data: parsed.data };

  if (body.id) {
    const { data, error } = await supabase
      .from("presentations")
      .update(row)
      .eq("id", body.id)
      .select("id")
      .single();
    if (error || !data) {
      console.error("Failed to update presentation", error);
      return NextResponse.json(
        { error: "Couldn't save — that deck may no longer exist." },
        { status: 404 }
      );
    }
    return NextResponse.json({ id: data.id });
  }

  const { data, error } = await supabase.from("presentations").insert(row).select("id").single();
  if (error || !data) {
    console.error("Failed to create presentation", error);
    return NextResponse.json({ error: "Couldn't save your presentation." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabase.from("presentations").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete presentation", error);
    return NextResponse.json({ error: "Couldn't delete that deck." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
