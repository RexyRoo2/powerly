"use client";

import { useEffect, useState } from "react";
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
  presentationId = null,
  onSaved,
  credits = null,
  onCreditsChange,
  onNeedCredits,
  onDirtyChange,
}: {
  presentation: Presentation;
  presentationId?: string | null;
  onSaved?: (id: string, presentation: Presentation) => void;
  /** null while the balance hasn't loaded yet. */
  credits?: number | null;
  onCreditsChange?: (credits: number) => void;
  onNeedCredits?: () => void;
  /** Lets a parent confirm before navigating away in-app (no real page unload to warn on). */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [presentation, setPresentation] = useState(initial);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [instruction, setInstruction] = useState("");
  const [editStatus, setEditStatus] = useState<"idle" | "loading" | "error">("idle");
  const [editError, setEditError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(presentationId);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Warn before closing/navigating away with edits that were never saved —
  // there's no autosave, so this is the only safety net against losing work.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

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
      setSaveStatus("idle"); // the committed deck just changed — "Saved" no longer applies
      setDirty(true);
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
    setSaveStatus("idle"); // the committed deck just changed — "Saved" no longer applies
    setDirty(true);
    setPendingEdit(null);
    setInstruction("");
  }

  function discardPendingEdit() {
    setPendingEdit(null);
  }

  async function handleSave() {
    // Saves the committed presentation, never a pending AI-edit preview —
    // the Save button is disabled while one is open (see below) so this
    // never has to guess which the student meant.
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId, presentation }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Couldn't save your presentation.");
      }
      setSavedId(data.id);
      setSaveStatus("saved");
      setDirty(false);
      onSaved?.(data.id, presentation);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your presentation.");
      setSaveStatus("error");
    }
  }

  async function handleExport() {
    if (credits === 0) {
      onNeedCredits?.();
      return;
    }
    setExportStatus("loading");
    setExportError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation: displayed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.code === "OUT_OF_CREDITS") {
          onCreditsChange?.(0);
          onNeedCredits?.();
          setExportStatus("idle");
          return;
        }
        throw new Error(data?.error || "Export failed.");
      }
      const blob = await res.blob();
      const slug = displayed.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "presentation";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      // The export route already decremented server-side — mirror that
      // here so the badge doesn't need a round-trip to stay accurate.
      if (credits !== null) onCreditsChange?.(Math.max(0, credits - 1));
      setExportStatus("idle");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
      setExportStatus("error");
    }
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || Boolean(pendingEdit)}
              title={pendingEdit ? "Apply or discard the AI preview first" : undefined}
              className="rounded-full bg-clay/90 px-3 py-1 text-xs font-medium text-espresso transition hover:bg-clay disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Saving…" : savedId ? "Save" : "Save presentation"}
            </button>
            <button
              onClick={handleExport}
              disabled={exportStatus === "loading"}
              className="rounded-full border border-sage/50 px-3 py-1 text-xs text-sage transition hover:bg-sage/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportStatus === "loading"
                ? "Preparing file…"
                : credits === 0
                  ? "Buy credits to export"
                  : "Download PowerPoint"}
            </button>
          </div>
        </div>
        {saveStatus === "saved" && !saveError && (
          <p className="text-sm text-sage">Saved.</p>
        )}
        {saveError && <p className="text-sm text-clay">{saveError}</p>}
        {exportError && <p className="text-sm text-clay">{exportError}</p>}

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
                placeholder="Ask AI to change something…"
                title='e.g. "make the title on slide 1 bigger"'
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
