import SlideEditor from "@/components/SlideEditor";
import { examplePresentation } from "@/lib/example-presentation";

export default function Home() {
  const slide = examplePresentation.slides[0];

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-logo text-sm tracking-wide text-sage">powerly.</span>
        <h1 className="font-display text-3xl text-cream">Milestone 2 — basic editing</h1>
        <p className="max-w-md text-sm text-cream/70">
          Drag any element to move it. Double-click a text box to edit it.
          Still no AI, no auth, no database.
        </p>
      </div>
      <div className="w-full max-w-4xl">
        <SlideEditor slide={slide} />
      </div>
    </main>
  );
}
