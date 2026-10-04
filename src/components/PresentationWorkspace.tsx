"use client";

import { useState } from "react";
import type { Presentation } from "@/lib/schema";
import { PresentationSchema } from "@/lib/schema";
import PresentationEditor from "./PresentationEditor";

type Status = "input" | "generating" | "error";

export default function PresentationWorkspace({
  examplePresentation,
}: {
  examplePresentation: Presentation;
}) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("input");
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong generating your deck.");
      }
      const parsed = PresentationSchema.parse(data.presentation);
      setPresentation(parsed);
      setStatus("input"); // back to idle, but presentation is now set so the editor shows
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (presentation) {
    return <PresentationEditor presentation={presentation} />;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Paste your notes, an outline, or whatever you've got for this assignment..."
        rows={10}
        disabled={status === "generating"}
        className="w-full rounded-xl border border-umber bg-umber/40 p-4 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
      />

      {error && <p className="text-sm text-clay">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={status === "generating" || notes.trim().length === 0}
          className="rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "generating" ? "Generating…" : "Generate presentation"}
        </button>
        <button
          onClick={() => setPresentation(examplePresentation)}
          disabled={status === "generating"}
          className="text-sm text-cream/50 underline-offset-2 hover:text-cream hover:underline"
        >
          or see the example deck
        </button>
      </div>
    </div>
  );
}
