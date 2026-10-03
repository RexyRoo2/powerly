"use client";

import { useState } from "react";
import type { Presentation, Slide as SlideType, Theme } from "@/lib/schema";
import SlideEditor from "./SlideEditor";
import Slide from "./Slide";
import { THEMES } from "@/lib/themes";

export default function PresentationEditor({
  presentation: initial,
}: {
  presentation: Presentation;
}) {
  const [presentation, setPresentation] = useState(initial);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeSlide = presentation.slides[activeIndex];

  const updateSlide = (index: number, slide: SlideType) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? slide : s)),
    }));
  };

  const setTheme = (theme: Theme) => {
    setPresentation((prev) => ({ ...prev, theme }));
  };

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 md:flex-row md:gap-6">
      <aside className="flex shrink-0 gap-3 overflow-x-auto md:w-44 md:flex-col md:overflow-visible">
        {presentation.slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setActiveIndex(i)}
            className={`w-36 shrink-0 overflow-hidden rounded-lg border-2 text-left transition md:w-full ${
              i === activeIndex ? "border-clay" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <div className="pointer-events-none">
              <Slide slide={slide} theme={presentation.theme} />
            </div>
            <div className="bg-umber px-2 py-1 text-xs text-cream/70">Slide {i + 1}</div>
          </button>
        ))}
      </aside>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs tracking-wide text-cream/50 uppercase">Theme</span>
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                presentation.theme === t.id
                  ? "bg-clay text-espresso"
                  : "bg-umber text-cream/70 hover:text-cream"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <SlideEditor
          key={activeSlide.id}
          slide={activeSlide}
          theme={presentation.theme}
          onChange={(updated) => updateSlide(activeIndex, updated)}
        />
      </div>
    </div>
  );
}
