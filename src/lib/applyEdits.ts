import type { Presentation, Slide, SlideElement } from "./schema";
import { normalizePalette } from "./paletteFit";

/**
 * Loosely-typed shape of one operation as it comes back from the AI tool
 * call — ids for anything NEW are assigned when applying, never trusted
 * from the model (same principle as api/generate's shapeIntoPresentation).
 */
export type RawEditOperation =
  | { op: "update_element"; summary: string; slideId: string; elementId: string; patch: Record<string, unknown> }
  | { op: "add_element"; summary: string; slideId: string; element: Record<string, unknown> }
  | { op: "delete_element"; summary: string; slideId: string; elementId: string }
  | {
      op: "add_slide";
      summary: string;
      afterSlideId?: string | null;
      slide: { layout?: string; background?: string; elements?: Array<Record<string, unknown>> };
    }
  | { op: "delete_slide"; summary: string; slideId: string }
  | { op: "change_palette"; summary: string; palette: Record<string, unknown> };

/**
 * Applies a list of AI-proposed operations to a presentation, returning a
 * new object (the input is never mutated). Unknown slide/element ids are
 * skipped rather than thrown — a single bad reference shouldn't blow up an
 * otherwise-good set of edits. The result still gets validated against
 * PresentationSchema by the caller before it's trusted.
 */
export function applyEditOperations(
  presentation: Presentation,
  operations: RawEditOperation[]
): Presentation {
  const next: Presentation = JSON.parse(JSON.stringify(presentation));
  let newSlideCounter = 0;
  let newElementCounter = 0;

  for (const op of operations) {
    switch (op.op) {
      case "update_element": {
        const slide = next.slides.find((s) => s.id === op.slideId);
        if (!slide) break;
        const index = slide.elements.findIndex((e) => e.id === op.elementId);
        if (index === -1) break;
        slide.elements[index] = { ...slide.elements[index], ...op.patch } as SlideElement;
        break;
      }
      case "add_element": {
        const slide = next.slides.find((s) => s.id === op.slideId);
        if (!slide) break;
        newElementCounter += 1;
        const elementId = `${slide.id}-edit-el-${newElementCounter}`;
        slide.elements.push({ ...op.element, id: elementId } as SlideElement);
        break;
      }
      case "delete_element": {
        const slide = next.slides.find((s) => s.id === op.slideId);
        if (!slide) break;
        slide.elements = slide.elements.filter((e) => e.id !== op.elementId);
        break;
      }
      case "add_slide": {
        newSlideCounter += 1;
        const slideId = `slide-edit-${newSlideCounter}-${Date.now().toString(36)}`;
        const elements = (op.slide.elements ?? []).map((el, i) => ({
          ...el,
          id: `${slideId}-el-${i + 1}`,
        }));
        const newSlide: Slide = {
          id: slideId,
          layout: op.slide.layout ?? "blank",
          background: (op.slide.background as Slide["background"]) ?? "background",
          elements: elements as SlideElement[],
        };
        const afterIndex = op.afterSlideId ? next.slides.findIndex((s) => s.id === op.afterSlideId) : -1;
        const insertAt = afterIndex === -1 ? next.slides.length : afterIndex + 1;
        next.slides.splice(insertAt, 0, newSlide);
        break;
      }
      case "delete_slide": {
        if (next.slides.length <= 1) break; // always keep at least one slide
        next.slides = next.slides.filter((s) => s.id !== op.slideId);
        break;
      }
      case "change_palette": {
        // Same safety net as a freshly generated deck — an AI-proposed
        // palette (e.g. "make it more autumn-colored") gets validated and
        // contrast-corrected here too, never trusted as-is.
        next.theme = normalizePalette(op.palette, next.theme);
        break;
      }
    }
  }

  return next;
}
