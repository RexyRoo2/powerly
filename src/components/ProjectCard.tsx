"use client";

import type { Presentation } from "@/lib/schema";
import { cardTint } from "@/lib/cardTints";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export default function ProjectCard({
  title,
  subject,
  theme,
  updatedAt,
  onOpen,
  onDelete,
}: {
  title: string;
  subject: string;
  theme: Presentation["theme"];
  updatedAt: string;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const tint = cardTint(theme);

  return (
    <div className="group flex flex-col gap-2">
      <button
        onClick={onOpen}
        className="relative flex aspect-[4/3] w-full flex-col justify-end rounded-2xl p-4 text-left shadow-sm transition hover:brightness-105"
        style={{ backgroundColor: tint.bg }}
      >
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: tint.fgMuted }}
        >
          {subject}
        </span>
        <span className="font-display text-xl leading-tight" style={{ color: tint.fg }}>
          {title}
        </span>
        {onDelete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onDelete();
              }
            }}
            aria-label="Delete presentation"
            title="Delete presentation"
            className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-espresso/30 text-xs opacity-0 transition hover:bg-espresso/60 group-hover:opacity-100"
            style={{ color: tint.fg }}
          >
            ×
          </span>
        )}
      </button>
      <div className="flex flex-col px-0.5">
        <span className="truncate text-sm font-medium text-cream">{title}</span>
        <span className="text-xs text-cream/40">
          {theme.name} · {formatRelativeTime(updatedAt)}
        </span>
      </div>
    </div>
  );
}
