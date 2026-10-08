"use client";

import { useState } from "react";
import type { Presentation } from "@/lib/schema";
import Slide from "./Slide";

/**
 * Lets a visitor see what Powerly actually produces WITHOUT creating an
 * account first — previously the only way to see a real deck was to sign
 * up, generate, or dig through the example-deck button inside the
 * (logged-in-only) workspace.
 */
export default function ExamplePreviewModal({
  presentation,
  onClose,
}: {
  presentation: Presentation;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const slide = presentation.slides[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/90 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-cream/60">
            {presentation.title} — Slide {index + 1} of {presentation.slides.length}
          </span>
          <button onClick={onClose} aria-label="Close" className="text-cream/50 hover:text-cream">
            ✕
          </button>
        </div>
        <Slide slide={slide} theme={presentation.theme} />
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-umber px-4 py-1.5 text-sm text-cream/70 transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(presentation.slides.length - 1, i + 1))}
            disabled={index === presentation.slides.length - 1}
            className="rounded-full border border-umber px-4 py-1.5 text-sm text-cream/70 transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
