import PresentationEditor from "@/components/PresentationEditor";
import { examplePresentation } from "@/lib/example-presentation";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-logo text-sm tracking-wide text-sage">powerly.</span>
        <h1 className="font-display text-3xl text-cream">Milestone 3 — multiple slides + themes</h1>
        <p className="max-w-md text-sm text-cream/70">
          Click a slide on the left to switch to it. Pick a theme to restyle
          the whole deck. Still no AI, no auth, no database.
        </p>
      </div>
      <PresentationEditor presentation={examplePresentation} />
    </main>
  );
}
