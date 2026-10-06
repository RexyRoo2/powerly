"use client";

import { useRef, useState } from "react";
import type { Presentation } from "@/lib/schema";
import { PresentationSchema } from "@/lib/schema";
import { compressImageFile } from "@/lib/compressImage";

type Status = "input" | "generating" | "error";

const MAX_IMAGES = 4;

type AttachedImage = {
  id: string;
  previewUrl: string;
  mediaType: string;
  base64: string;
};

export default function PresentationWorkspace({
  examplePresentation,
  onPresentationReady,
}: {
  examplePresentation: Presentation;
  onPresentationReady: (presentation: Presentation) => void;
}) {
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [status, setStatus] = useState<Status>("input");
  const [error, setError] = useState<string | null>(null);
  const [processingImages, setProcessingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
    if (files.length === 0) {
      setError(`You can attach at most ${MAX_IMAGES} images.`);
      return;
    }
    setError(null);
    setProcessingImages(true);
    try {
      const compressed = await Promise.all(
        files.map(async (file, i) => {
          const { mediaType, base64 } = await compressImageFile(file);
          return {
            id: `upload-${Date.now()}-${i}`,
            previewUrl: URL.createObjectURL(file),
            mediaType,
            base64,
          };
        })
      );
      setImages((prev) => [...prev, ...compressed]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process one of those images.");
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  }

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          images: images.map((img) => ({ id: img.id, mediaType: img.mediaType, data: img.base64 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong generating your deck.");
      }
      const parsed = PresentationSchema.parse(data.presentation);
      onPresentationReady(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const canGenerate =
    status !== "generating" && !processingImages && (notes.trim().length > 0 || images.length > 0);

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

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-umber">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(img.id)}
                aria-label="Remove image"
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-espresso/80 text-xs text-cream hover:bg-clay"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "generating" || processingImages || images.length >= MAX_IMAGES}
          className="rounded-full border border-umber px-4 py-1.5 text-xs text-cream/70 transition hover:border-clay hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processingImages ? "Processing…" : "Attach photos (notes, diagrams…)"}
        </button>
        {images.length > 0 && (
          <span className="text-xs text-cream/40">
            {images.length}/{MAX_IMAGES}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "generating" ? "Generating…" : "Generate presentation"}
        </button>
        <button
          onClick={() => onPresentationReady(examplePresentation)}
          disabled={status === "generating"}
          className="text-sm text-cream/50 underline-offset-2 hover:text-cream hover:underline"
        >
          or see the example deck
        </button>
      </div>
    </div>
  );
}
