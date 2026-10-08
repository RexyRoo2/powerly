import { useState } from "react";

/**
 * Shared by the quick in-workspace BuyCreditsModal and the full Plan page —
 * both just hand a packId to /api/checkout and redirect to Stripe, so the
 * logic (and its loading/error state) lives in one place.
 */
export function useBuyCredits() {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(packId: string) {
    setLoadingPackId(packId);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error || "Couldn't start checkout.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setLoadingPackId(null);
    }
  }

  return { buy, loadingPackId, error };
}
