"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Presentation } from "@/lib/schema";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_PACKS, formatPrice } from "@/lib/creditPacks";
import { useBuyCredits } from "@/lib/useBuyCredits";
import PresentationWorkspace from "./PresentationWorkspace";
import PresentationEditor from "./PresentationEditor";
import ProjectCard from "./ProjectCard";
import Logo, { LogoMark } from "./Logo";
import { HomeIcon, ProjectsIcon, PlanIcon, SettingsIcon, SearchIcon } from "./NavIcons";

export type SavedPresentation = {
  id: string;
  title: string;
  data: Presentation;
  updated_at: string;
};

type View = "home" | "projects" | "plan" | "settings" | "workspace";

const NAV_ITEMS: { id: View; label: string; Icon: typeof HomeIcon }[] = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "projects", label: "Projects", Icon: ProjectsIcon },
  { id: "plan", label: "Plan", Icon: PlanIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

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
  const [view, setView] = useState<View>(() =>
    searchParams.get("checkout") === "success" ? "plan" : "home"
  );
  const [returnView, setReturnView] = useState<View>("home");
  const [presentations, setPresentations] = useState<SavedPresentation[]>(initialPresentations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePresentation, setActivePresentation] = useState<Presentation | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title">("recent");
  const [editorDirty, setEditorDirty] = useState(false);

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
            setCheckoutNotice(data?.error || "Couldn't confirm that payment. If you were charged, let us know.");
          }
        })
        .catch(() => setCheckoutNotice("Couldn't confirm that payment. If you were charged, let us know."))
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

  function confirmLeaveEditorIfDirty(): boolean {
    if (!editorDirty) return true;
    return window.confirm("You have unsaved changes that will be lost. Leave anyway?");
  }

  function goToView(next: View) {
    if (view === "workspace" && !confirmLeaveEditorIfDirty()) return;
    setView(next);
  }

  function openNew() {
    setReturnView(view === "workspace" ? "home" : view);
    setActiveId(null);
    setActivePresentation(null);
    setEditorDirty(false);
    setView("workspace");
  }

  function openExisting(p: SavedPresentation) {
    setReturnView(view === "workspace" ? "home" : view);
    setActiveId(p.id);
    setActivePresentation(p.data);
    setEditorDirty(false);
    setView("workspace");
  }

  function backFromWorkspace() {
    if (!confirmLeaveEditorIfDirty()) return;
    setView(returnView);
    setActiveId(null);
    setActivePresentation(null);
    setEditorDirty(false);
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

  async function handleDelete(p: SavedPresentation) {
    if (!window.confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/presentations?id=${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't delete that deck.");
      setPresentations((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err) {
      setCheckoutNotice(null);
      window.alert(err instanceof Error ? err.message : "Couldn't delete that deck.");
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return presentations;
    return presentations.filter(
      (p) => p.title.toLowerCase().includes(query) || p.data.subject.toLowerCase().includes(query)
    );
  }, [presentations, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
    else copy.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return copy;
  }, [filtered, sortBy]);

  const recent = sorted.slice(0, 3);
  const avatarLetter = userEmail.trim()[0]?.toUpperCase() || "?";

  const notice = checkoutNotice ? (
    <p className="rounded-lg bg-sage/10 px-3 py-2 text-sm text-sage">
      {checkoutNotice}{" "}
      <button onClick={() => setCheckoutNotice(null)} className="underline-offset-2 hover:underline">
        Dismiss
      </button>
    </p>
  ) : null;

  if (view === "workspace") {
    return (
      <div className="flex w-full flex-col gap-4 px-4 py-6 md:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={backFromWorkspace}
            className="flex items-center gap-1 text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-cream/50">
              {credits === null ? "…" : `${credits} credit${credits === 1 ? "" : "s"}`}
            </span>
            {credits === 0 && (
              <button
                onClick={() => goToView("plan")}
                className="rounded-full border border-sage/50 px-3 py-1 text-xs text-sage hover:bg-sage/10"
              >
                Buy credits
              </button>
            )}
          </div>
        </div>
        {notice}
        <div className="flex w-full justify-center">
          {activePresentation ? (
            <PresentationEditor
              presentation={activePresentation}
              presentationId={activeId}
              onSaved={handleSaved}
              credits={credits}
              onCreditsChange={setCredits}
              onNeedCredits={() => setView("plan")}
              onDirtyChange={setEditorDirty}
            />
          ) : (
            <PresentationWorkspace
              examplePresentation={examplePresentation}
              onPresentationReady={setActivePresentation}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-umber/60 p-5 md:flex">
        <Link href="/" className="mb-6 px-1">
          <Logo />
        </Link>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => goToView(id)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
              view === id
                ? "border-l-2 border-sage bg-umber/40 font-medium text-cream"
                : "border-l-2 border-transparent text-cream/60 hover:text-cream"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-umber/60 px-4 py-3 md:px-8">
          <Link href="/" className="shrink-0 md:hidden">
            <LogoMark className="h-7 w-7" />
          </Link>
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cream/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your presentations"
              className="w-full rounded-full border border-umber bg-umber/30 py-2 pr-4 pl-9 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
            />
          </div>
          <button
            onClick={() => goToView("settings")}
            aria-label="Settings"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/80 text-sm font-medium text-espresso"
          >
            {avatarLetter}
          </button>
        </header>

        {/* Mobile nav pills */}
        <nav className="flex gap-2 overflow-x-auto border-b border-umber/60 px-4 py-2 md:hidden">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => goToView(id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                view === id ? "bg-clay text-espresso" : "bg-umber/40 text-cream/70"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {notice}

          {view === "home" && (
            <div className="flex flex-col gap-8">
              <button
                onClick={openNew}
                className="flex w-full items-center justify-between rounded-2xl bg-forest px-6 py-8 text-left transition hover:brightness-105 md:px-8"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-display text-2xl text-cream md:text-3xl">Create a presentation</span>
                  <span className="text-sm text-cream/80">
                    From your own notes, a photo, or start from the example deck
                  </span>
                </div>
                <span className="hidden text-2xl text-cream/90 md:block">→</span>
              </button>

              {presentations.length === 0 ? (
                <p className="text-sm text-cream/50">
                  No saved presentations yet — make one above, or{" "}
                  <button onClick={openNew} className="text-sage underline-offset-2 hover:underline">
                    try the example deck
                  </button>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium tracking-wide text-cream/50 uppercase">Recent</span>
                    <button
                      onClick={() => goToView("projects")}
                      className="text-xs text-cream/50 underline-offset-2 hover:text-cream hover:underline"
                    >
                      See all in Projects
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {recent.map((p) => (
                      <ProjectCard
                        key={p.id}
                        title={p.title}
                        subject={p.data.subject}
                        theme={p.data.theme}
                        updatedAt={p.updated_at}
                        onOpen={() => openExisting(p)}
                        onDelete={() => handleDelete(p)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "projects" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl text-cream">Projects</h1>
                  <p className="text-sm text-cream/50">Every presentation you&apos;ve made</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNew}
                    className="rounded-full bg-clay px-4 py-1.5 text-xs font-medium text-espresso transition hover:brightness-105"
                  >
                    + New presentation
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "recent" | "title")}
                    className="rounded-full border border-umber bg-umber/30 px-3 py-1.5 text-xs text-cream/80 focus:border-clay focus:outline-none"
                  >
                    <option value="recent">Sort: Recent</option>
                    <option value="title">Sort: Title A-Z</option>
                  </select>
                </div>
              </div>

              {sorted.length === 0 ? (
                <p className="text-sm text-cream/50">
                  {query ? "No presentations match that search." : "No saved presentations yet."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {sorted.map((p) => (
                    <ProjectCard
                      key={p.id}
                      title={p.title}
                      subject={p.data.subject}
                      theme={p.data.theme}
                      updatedAt={p.updated_at}
                      onOpen={() => openExisting(p)}
                      onDelete={() => handleDelete(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "plan" && <PlanView credits={credits} />}

          {view === "settings" && (
            <SettingsView userEmail={userEmail} signingOut={signingOut} onSignOut={handleSignOut} onViewPlan={() => goToView("plan")} />
          )}
        </main>
      </div>
    </div>
  );
}

function PlanView({ credits }: { credits: number | null }) {
  const { buy, loadingPackId, error } = useBuyCredits();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-cream">Your plan</h1>
        <p className="text-sm text-cream/50">
          Generating and editing decks is always free — a credit is only spent when you download a PowerPoint file.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-umber bg-umber/20 p-6">
          <span className="text-2xl">🎓</span>
          <div>
            <h2 className="text-lg font-medium text-cream">Free</h2>
            <p className="text-sm text-cream/50">Every new account starts here</p>
          </div>
          <div className="text-3xl text-cream">
            {credits === null ? "…" : credits}
            <span className="ml-1 text-sm text-cream/50">credit{credits === 1 ? "" : "s"} left</span>
          </div>
          <div className="rounded-full border border-umber px-4 py-1.5 text-center text-sm text-cream/60">
            3 free credits on signup
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-clay bg-umber/20 p-6">
          <span className="text-2xl">🚀</span>
          <div>
            <h2 className="text-lg font-medium text-cream">More credits</h2>
            <p className="text-sm text-cream/50">One-time packs — never expire, no subscription</p>
          </div>
          <div className="flex flex-col gap-2">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => buy(pack.id)}
                disabled={loadingPackId !== null}
                className="flex items-center justify-between rounded-xl border border-umber bg-umber/30 px-4 py-2.5 text-left text-sm transition hover:border-clay disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div>
                  <span className="text-cream">{pack.label}</span>
                  {pack.tagline && <span className="ml-2 text-xs text-sage">{pack.tagline}</span>}
                </div>
                <span className="font-medium text-cream">
                  {loadingPackId === pack.id ? "Redirecting…" : formatPrice(pack.amountCents)}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-clay">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function SettingsView({
  userEmail,
  signingOut,
  onSignOut,
  onViewPlan,
}: {
  userEmail: string;
  signingOut: boolean;
  onSignOut: () => void;
  onViewPlan: () => void;
}) {
  return (
    <div className="flex max-w-lg flex-col gap-8">
      <h1 className="font-display text-2xl text-cream">Settings</h1>

      <div className="flex flex-col gap-2 rounded-2xl border border-umber bg-umber/20 p-5">
        <span className="text-xs tracking-wide text-cream/50 uppercase">Account</span>
        <span className="text-sm text-cream">{userEmail}</span>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          className="mt-2 w-fit text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline disabled:opacity-50"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-umber bg-umber/20 p-5">
        <span className="text-xs tracking-wide text-cream/50 uppercase">Billing</span>
        <button onClick={onViewPlan} className="w-fit text-sm text-sage underline-offset-2 hover:underline">
          View plan &amp; buy credits
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-umber bg-umber/20 p-5">
        <span className="text-xs tracking-wide text-cream/50 uppercase">Legal</span>
        <div className="flex gap-4">
          <Link href="/terms" className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
