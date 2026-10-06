import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
  if (error || !data) {
    console.error("Failed to read credit balance", error);
    return NextResponse.json({ error: "Couldn't load your credit balance." }, { status: 500 });
  }

  return NextResponse.json({ credits: data.credits });
}
