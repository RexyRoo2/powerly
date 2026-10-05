import { createClient } from "@/lib/supabase/server";
import AuthGate from "@/components/AuthGate";
import Dashboard, { type SavedPresentation } from "@/components/Dashboard";
import { examplePresentation } from "@/lib/example-presentation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPresentations: SavedPresentation[] = [];
  if (user) {
    const { data } = await supabase
      .from("presentations")
      .select("id, title, data, updated_at")
      .order("updated_at", { ascending: false });
    initialPresentations = data ?? [];
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-logo text-sm tracking-wide text-sage">powerly.</span>
        <h1 className="font-display text-3xl text-cream">Milestone 7 — accounts &amp; saving</h1>
        <p className="max-w-md text-sm text-cream/70">
          {user
            ? "Pick up a saved deck or start a new one."
            : "Sign in to generate, edit, and save your decks."}
        </p>
      </div>
      {user ? (
        <Dashboard
          userEmail={user.email ?? ""}
          examplePresentation={examplePresentation}
          initialPresentations={initialPresentations}
        />
      ) : (
        <AuthGate />
      )}
    </main>
  );
}
