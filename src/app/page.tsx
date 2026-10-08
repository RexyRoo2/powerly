import { createClient } from "@/lib/supabase/server";
import Dashboard, { type SavedPresentation } from "@/components/Dashboard";
import SignedOutLanding from "@/components/SignedOutLanding";
import { examplePresentation } from "@/lib/example-presentation";

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
  const initialPresentations: SavedPresentation[] = data ?? [];

  return (
    <Dashboard
      userEmail={user.email ?? ""}
      examplePresentation={examplePresentation}
      initialPresentations={initialPresentations}
    />
  );
}
