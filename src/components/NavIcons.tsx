type IconProps = { className?: string };

const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function HomeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8v8h10V8" />
    </svg>
  );
}

export function ProjectsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <rect x="3" y="3" width="6" height="6" rx="1.2" />
      <rect x="11" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="11" width="6" height="6" rx="1.2" />
      <rect x="11" y="11" width="6" height="6" rx="1.2" />
    </svg>
  );
}

export function PlanIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M4 16V9" />
      <path d="M10 16V4" />
      <path d="M16 16v-5" />
    </svg>
  );
}

export function SettingsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4M14.6 14.6l-1.4-1.4M6.8 6.8 5.4 5.4" />
    </svg>
  );
}

export function SearchIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m16 16-3.5-3.5" />
    </svg>
  );
}
