import { createClient } from "@/lib/supabase/server";
import Dashboard, { type SavedPresentation } from "@/components/Dashboard";
import SignedOutLanding from "@/components/SignedOutLanding";
import { examplePresentation } from "@/lib/example-presentation";
import { normalizePalette } from "@/lib/paletteFit";
import { DEFAULT_PALETTE } from "@/lib/themes";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SignedOutLanding examplePresentation={examplePresentation} />;
  }

  const { data } = await supabase
    .from("presentations")
    .select("id, title, data, updated_at")
    .order("updated_at", { ascending: false });
  // A deck saved before palettes replaced the fixed theme presets still has
  // its old literal theme string (e.g. "academic") sitting in the database
  // — nothing migrated existing rows when that schema changed. Repair just
  // the palette field here (same safety net api/generate and api/edit use
  // for AI output) rather than letting the whole deck fail to render.
  const initialPresentations: SavedPresentation[] = (data ?? []).map((p) => ({
    ...p,
    data: { ...p.data, theme: normalizePalette(p.data?.theme, DEFAULT_PALETTE) },
  }));

  return (
    <Dashboard
      userEmail={user.email ?? ""}
      examplePresentation={examplePresentation}
      initialPresentations={initialPresentations}
    />
  );
}
