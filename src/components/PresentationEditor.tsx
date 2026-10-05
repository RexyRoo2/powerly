"use client";

import { useState } from "react";
import type { Presentation, Slide as SlideType, Theme } from "@/lib/schema";
import { PresentationSchema } from "@/lib/schema";
import SlideEditor from "./SlideEditor";
import Slide from "./Slide";
import { THEMES } from "@/lib/themes";

type PendingEdit = {
  presentation: Presentation;
  summaries: string[];
};

export default function PresentationEditor({
  presentation: initial,
}: {
  presentation: Presentation;
}) {
  const [presentation, setPresentation] = useState(initial);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [instruction, setInstruction] = useState("");
  const [editStatus, setEditStatus] = useState<"idle" | "loading" | "error">("idle");
  const [editError, setEditError] = useState<string | null>(null);

  // While a pending edit is being previewed, every read/write goes through
  // it instead of the committed presentation — Apply promotes it, Discard
  // throws it away, including any manual tweaks made during the preview.
  const displayed = pendingEdit ? pendingEdit.presentation : presentation;
  const clampedIndex = Math.min(activeIndex, displayed.slides.length - 1);
  const activeSlide = displayed.slides[clampedIndex];

  const mutateDisplayed = (updater: (p: Presentation) => Presentation) => {
    if (pendingEdit) {
      setPendingEdit({ ...pendingEdit, presentation: updater(pendingEdit.presentation) });
    } else {
      setPresentation(updater);
    }
  };

  const updateSlide = (index: number, slide: SlideType) => {
    mutateDisplayed((p) => ({ ...p, slides: p.slides.map((s, i) => (i === index ? slide : s)) }));
  };

  const setTheme = (theme: Theme) => {
    mutateDisplayed((p) => ({ ...p, theme }));
  };

  async function handleAskAI() {
    setEditStatus("loading");
    setEditError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation, instruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }
      const parsedPresentation = PresentationSchema.parse(data.presentation);
      setPendingEdit({ presentation: parsedPresentation, summaries: data.summaries ?? [] });
      setActiveIndex(0);
      setEditStatus("idle");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong.");
      setEditStatus("error");
    }
  }

  function applyPendingEdit() {
    if (!pendingEdit) return;
    setPresentation(pendingEdit.presentation);
    setPendingEdit(null);
    setInstruction("");
  }

  function discardPendingEdit() {
    setPendingEdit(null);
  }

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 md:flex-row md:gap-6">
      <aside className="flex shrink-0 gap-3 overflow-x-auto md:w-44 md:flex-col md:overflow-visible">
        {displayed.slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setActiveIndex(i)}
            className={`w-36 shrink-0 overflow-hidden rounded-lg border-2 text-left transition md:w-full ${
              i === clampedIndex ? "border-clay" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <div className="pointer-events-none">
              <Slide slide={slide} theme={displayed.theme} />
            </div>
            <div className="bg-umber px-2 py-1 text-xs text-cream/70">Slide {i + 1}</div>
          </button>
        ))}
      </aside>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs tracking-wide text-cream/50 uppercase">Theme</span>
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                displayed.theme === t.id
                  ? "bg-clay text-espresso"
                  : "bg-umber text-cream/70 hover:text-cream"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <SlideEditor
          key={activeSlide.id}
          slide={activeSlide}
          theme={displayed.theme}
          onChange={(updated) => updateSlide(clampedIndex, updated)}
        />

        {pendingEdit ? (
          <div className="flex flex-col gap-3 rounded-xl border border-clay bg-umber/40 p-4">
            <p className="text-xs tracking-wide text-clay uppercase">AI proposed changes — previewing above</p>
            <ul className="flex flex-col gap-1 text-sm text-cream/80">
              {pendingEdit.summaries.map((summary, i) => (
                <li key={i}>• {summary}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={applyPendingEdit}
                className="rounded-full bg-clay px-4 py-1.5 text-sm font-medium text-espresso"
              >
                Apply
              </button>
              <button
                onClick={discardPendingEdit}
                className="rounded-full bg-umber px-4 py-1.5 text-sm text-cream/70 hover:text-cream"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && instruction.trim() && editStatus !== "loading") handleAskAI();
                }}
                placeholder="Ask AI to change something — e.g. &quot;make the title on slide 1 bigger&quot;"
                disabled={editStatus === "loading"}
                className="flex-1 rounded-full border border-umber bg-umber/40 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
              />
              <button
                onClick={handleAskAI}
                disabled={editStatus === "loading" || instruction.trim().length === 0}
                className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-medium text-espresso disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editStatus === "loading" ? "Thinking…" : "Ask AI"}
              </button>
            </div>
            {editError && <p className="text-sm text-clay">{editError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
