import Slide from "@/components/Slide";
import { examplePresentation } from "@/lib/example-presentation";

export default function Home() {
  const slide = examplePresentation.slides[0];

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-logo text-sm tracking-wide text-sage">powerly.</span>
        <h1 className="font-display text-3xl text-cream">Milestone 1 — rendering a real slide</h1>
        <p className="max-w-md text-sm text-cream/70">
          This is one hardcoded slide, typed with Zod, rendered with the
          logical 16:9 coordinate system. No AI, no auth, no database yet.
        </p>
      </div>
      <div className="w-full max-w-4xl">
        <Slide slide={slide} />
      </div>
    </main>
  );
}
