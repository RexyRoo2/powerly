"use client";

import { CREDIT_PACKS, formatPrice } from "@/lib/creditPacks";
import { useBuyCredits } from "@/lib/useBuyCredits";

/**
 * Checkout is Stripe's own hosted page — buying redirects the whole tab
 * away and back, so there's nothing to "finish" inside this modal itself,
 * just handing off to Stripe once a pack is picked.
 */
export default function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const { buy, loadingPackId, error } = useBuyCredits();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-umber bg-espresso p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-cream">Buy export credits</h2>
          <button onClick={onClose} className="text-cream/50 hover:text-cream" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="text-sm text-cream/60">
          Generating and editing decks is always free — a credit is only spent when you download a
          PowerPoint file.
        </p>
        <div className="flex flex-col gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => buy(pack.id)}
              disabled={loadingPackId !== null}
              className="flex items-center justify-between rounded-xl border border-umber bg-umber/30 px-4 py-3 text-left transition hover:border-clay disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div>
                <div className="text-sm text-cream">{pack.label}</div>
                {pack.tagline && <div className="text-xs text-sage">{pack.tagline}</div>}
              </div>
              <div className="text-sm font-medium text-cream">
                {loadingPackId === pack.id ? "Redirecting…" : formatPrice(pack.amountCents)}
              </div>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-clay">{error}</p>}
      </div>
    </div>
  );
}
