import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Called by the client right after Stripe redirects back to the success
 * URL. There's no webhook in this milestone — instead we verify the
 * session directly against Stripe here (the only place that can be
 * trusted) and then credit the account with the service-role client.
 * Idempotent: confirm_credit_purchase's unique constraint on the Stripe
 * session id means calling this twice (a refresh of the success page) is
 * a harmless no-op, not a double credit.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const sessionId = body.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session id." }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Buying credits isn't configured yet — STRIPE_SECRET_KEY is missing on the server." },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("Failed to retrieve Stripe checkout session", err);
    return NextResponse.json({ error: "Couldn't verify that payment. Try again." }, { status: 502 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "That payment hasn't gone through yet." }, { status: 402 });
  }
  // The session's own metadata — written only by our /api/checkout route,
  // never by the browser — is what ties it to a specific account. Refusing
  // a mismatch stops one signed-in user from confirming another's session.
  if (session.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: "This payment belongs to a different account." }, { status: 403 });
  }

  const credits = Number(session.metadata?.credits ?? NaN);
  if (!Number.isFinite(credits) || credits <= 0) {
    console.error("Checkout session missing valid credits metadata", session.id);
    return NextResponse.json({ error: "Something went wrong crediting your account." }, { status: 500 });
  }
  const amountCents = session.amount_total ?? 0;

  const serviceClient = createServiceClient();
  const { data: newBalance, error } = await serviceClient.rpc("confirm_credit_purchase", {
    p_user_id: user.id,
    p_stripe_session_id: sessionId,
    p_credits: credits,
    p_amount_cents: amountCents,
  });

  if (error) {
    console.error("confirm_credit_purchase failed", error);
    return NextResponse.json({ error: "Something went wrong crediting your account." }, { status: 500 });
  }

  if (newBalance !== null) {
    return NextResponse.json({ credits: newBalance, alreadyCredited: false });
  }

  // null means the unique constraint caught a duplicate confirm — already
  // credited earlier, so just report the current balance instead of an error.
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    console.error("Failed to read balance after duplicate confirm", profileError);
    return NextResponse.json({ error: "Something went wrong reading your balance." }, { status: 500 });
  }
  return NextResponse.json({ credits: profile.credits, alreadyCredited: true });
}
