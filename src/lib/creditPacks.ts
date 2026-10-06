/**
 * Every place money changes hands (the checkout route that creates a
 * Stripe Checkout Session, and the confirm route that reads back what was
 * actually paid) reads from this single list — so the price shown to a
 * student is always the price Stripe actually charges.
 */
export type CreditPack = {
  id: string;
  credits: number;
  amountCents: number;
  /** Short label for the pack itself, e.g. "15 exports". */
  label: string;
  /** One line shown under the label, e.g. "Best value". */
  tagline?: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 5, amountCents: 299, label: "5 exports" },
  { id: "popular", credits: 15, amountCents: 699, label: "15 exports", tagline: "Best value" },
  { id: "pro", credits: 40, amountCents: 1499, label: "40 exports" },
];

export function findCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

export function formatPrice(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}
