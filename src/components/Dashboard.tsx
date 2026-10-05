"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Presentation } from "@/lib/schema";
import { createClient } from "@/lib/supabase/client";
import PresentationWorkspace from "./PresentationWorkspace";
import PresentationEditor from "./PresentationEditor";

export type SavedPresentation = {
  id: string;
  title: string;
  data: Presentation;
  updated_at: string;
};

export default function Dashboard({
  userEmail,
  examplePresentation,
  initialPresentations,
}: {
  userEmail: string;
  examplePresentation: Presentation;
  initialPresentations: SavedPresentation[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "workspace">("list");
  const [presentations, setPresentations] = useState<SavedPresentation[]>(initialPresentations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePresentation, setActivePresentation] = useState<Presentation | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function openNew() {
    setActiveId(null);
    setActivePresentation(null);
    setView("workspace");
  }

  function openExisting(p: SavedPresentation) {
    setActiveId(p.id);
    setActivePresentation(p.data);
    setView("workspace");
  }

  function backToList() {
    setView("list");
    setActiveId(null);
    setActivePresentation(null);
  }

  function handleSaved(id: string, presentation: Presentation) {
    setActiveId(id);
    setPresentations((prev) => {
      const nowIso = new Date().toISOString();
      const existingIndex = prev.findIndex((p) => p.id === id);
      const updated: SavedPresentation = { id, title: presentation.title, data: presentation, updated_at: nowIso };
      const next = existingIndex === -1 ? [updated, ...prev] : prev.map((p, i) => (i === existingIndex ? updated : p));
      return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/presentations?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't delete that deck.");
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      setConfirmingDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete that deck.");
    }
  }

  if (view === "workspace") {
    return (
      <div className="flex w-full max-w-6xl flex-col gap-4">
        <button
          onClick={backToList}
          className="self-start text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
        >
          ← Back to my presentations
        </button>
        {activePresentation ? (
          <PresentationEditor
            presentation={activePresentation}
            presentationId={activeId}
            onSaved={handleSaved}
          />
        ) : (
          <PresentationWorkspace
            examplePresentation={examplePresentation}
            onPresentationReady={setActivePresentation}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-cream/60">Signed in as {userEmail}</span>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline disabled:opacity-50"
        >
          Sign out
        </button>
      </div>

      <button
        onClick={openNew}
        className="self-start rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition"
      >
        + New presentation
      </button>

      {deleteError && <p className="text-sm text-clay">{deleteError}</p>}

      {presentations.length === 0 ? (
        <p className="text-sm text-cream/50">No saved presentations yet — make one above.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {presentations.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-umber bg-umber/30 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-cream">{p.title}</span>
                <span className="text-xs text-cream/40">
                  Updated {new Date(p.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => openExisting(p)}
                  className="text-sm text-sage underline-offset-2 hover:underline"
                >
                  Open
                </button>
                {confirmingDeleteId === p.id ? (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-sm text-clay underline-offset-2 hover:underline"
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingDeleteId(p.id)}
                    className="text-sm text-cream/40 underline-offset-2 hover:text-cream/70 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
