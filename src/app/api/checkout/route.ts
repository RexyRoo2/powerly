import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { findCreditPack } from "@/lib/creditPacks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pack = findCreditPack(body.packId ?? "");
  if (!pack) {
    return NextResponse.json({ error: "Pick a credit pack first." }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Buying credits isn't configured yet — STRIPE_SECRET_KEY is missing on the server." },
      { status: 500 }
    );
  }

  const origin = new URL(req.url).origin;
  const stripe = getStripeClient();

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: `Powerly — ${pack.label}`,
              description: "PowerPoint export credits",
            },
          },
          quantity: 1,
        },
      ],
      // Read back on confirm rather than trusted from the client — the
      // metadata here is only ever written by this server, never by a
      // browser, so it's safe to treat as source of truth.
      metadata: { user_id: user.id, pack_id: pack.id, credits: String(pack.credits) },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed", err);
    return NextResponse.json({ error: "Couldn't start checkout. Try again in a moment." }, { status: 502 });
  }

  if (!session.url) {
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
