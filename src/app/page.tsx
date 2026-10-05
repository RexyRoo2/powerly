import PresentationWorkspace from "@/components/PresentationWorkspace";
import { examplePresentation } from "@/lib/example-presentation";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-logo text-sm tracking-wide text-sage">powerly.</span>
        <h1 className="font-display text-3xl text-cream">Milestone 6 — PowerPoint export</h1>
        <p className="max-w-md text-sm text-cream/70">
          Paste your notes, get a first draft deck back, ask the AI to change
          it, then download a real, editable PowerPoint file. Still no auth,
          no database — this resets on reload for now.
        </p>
      </div>
      <PresentationWorkspace examplePresentation={examplePresentation} />
    </main>
  );
}
