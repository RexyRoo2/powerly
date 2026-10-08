/**
 * Powerly's mark: two overlapping slide cards, suggesting a deck. Kept
 * simple on purpose — it has to still read at 16x16 (browser tab favicon)
 * as well as at wordmark size in the sidebar.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="7" width="21" height="15" rx="3.5" fill="#D97A52" />
      <rect x="9" y="12" width="19" height="13" rx="3" fill="#F2E9DA" />
      <rect x="12.5" y="16" width="9" height="2" rx="1" fill="#1C1712" fillOpacity="0.55" />
      <rect x="12.5" y="19.5" width="6" height="2" rx="1" fill="#1C1712" fillOpacity="0.35" />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="font-logo text-lg text-cream">powerly.</span>
    </span>
  );
}
