"use client";

export default function CreditsBadge({
  credits,
  onBuyClick,
}: {
  credits: number | null;
  onBuyClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cream/60">
        {credits === null ? "…" : `${credits} export credit${credits === 1 ? "" : "s"}`}
      </span>
      <button
        onClick={onBuyClick}
        className="rounded-full border border-sage/50 px-3 py-1 text-xs text-sage transition hover:bg-sage/10"
      >
        Buy credits
      </button>
    </div>
  );
}
