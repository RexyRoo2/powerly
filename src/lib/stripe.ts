import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily constructed so the app can still build/run without
 * STRIPE_SECRET_KEY set (it's only read the first time a checkout route is
 * actually hit, matching how ANTHROPIC_API_KEY is handled elsewhere).
 */
export function getStripeClient(): Stripe {
  if (client) return client;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY isn't configured on the server.");
  }
  client = new Stripe(apiKey);
  return client;
}
