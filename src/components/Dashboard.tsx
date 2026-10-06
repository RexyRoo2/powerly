"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Presentation } from "@/lib/schema";
import { createClient } from "@/lib/supabase/client";
import PresentationWorkspace from "./PresentationWorkspace";
import PresentationEditor from "./PresentationEditor";
import CreditsBadge from "./CreditsBadge";
import BuyCreditsModal from "./BuyCreditsModal";

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
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "workspace">("list");
  const [presentations, setPresentations] = useState<SavedPresentation[]>(initialPresentations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePresentation, setActivePresentation] = useState<Presentation | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.credits === "number") setCredits(data.credits);
      })
      .catch(() => {});
  }, []);

  // Stripe redirects back here after checkout — confirm the payment
  // server-side (it's verified against Stripe directly, never trusted from
  // the URL) and clean the query string either way so a refresh doesn't
  // re-trigger it. confirm is idempotent, so even a double-fire is harmless.
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout === "success" && sessionId) {
      fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (ok && typeof data.credits === "number") {
            setCredits(data.credits);
            setCheckoutNotice(
              data.alreadyCredited ? "You're all set — those credits are already on your account." : "Credits added — thanks!"
            );
          } else {
            setCheckoutNotice(data?.error || "Couldn't confirm that payment. If you were charged, let me know.");
          }
        })
        .catch(() => setCheckoutNotice("Couldn't confirm that payment. If you were charged, let me know."))
        .finally(() => router.replace("/"));
    } else if (checkout === "cancelled") {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const buyModal = showBuyModal ? <BuyCreditsModal onClose={() => setShowBuyModal(false)} /> : null;
  const notice = checkoutNotice ? (
    <p className="text-sm text-sage">
      {checkoutNotice}{" "}
      <button onClick={() => setCheckoutNotice(null)} className="underline-offset-2 hover:underline">
        Dismiss
      </button>
    </p>
  ) : null;

  if (view === "workspace") {
    return (
      <div className="flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            onClick={backToList}
            className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
          >
            ← Back to my presentations
          </button>
          <CreditsBadge credits={credits} onBuyClick={() => setShowBuyModal(true)} />
        </div>
        {notice}
        {activePresentation ? (
          <PresentationEditor
            presentation={activePresentation}
            presentationId={activeId}
            onSaved={handleSaved}
            credits={credits}
            onCreditsChange={setCredits}
            onNeedCredits={() => setShowBuyModal(true)}
          />
        ) : (
          <PresentationWorkspace
            examplePresentation={examplePresentation}
            onPresentationReady={setActivePresentation}
          />
        )}
        {buyModal}
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

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={openNew}
          className="rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition"
        >
          + New presentation
        </button>
        <CreditsBadge credits={credits} onBuyClick={() => setShowBuyModal(true)} />
      </div>

      {notice}
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
      {buyModal}
    </div>
  );
}
