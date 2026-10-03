import type { CSSProperties } from "react";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "./schema";

/**
 * Converts an element's logical-unit box (x, y, width, height against the
 * SLIDE_WIDTH x SLIDE_HEIGHT canvas) into percentage-based CSS. Percentages
 * mean the slide scales cleanly to any container size while every element
 * stays in exactly the same relative place — the same logical box a future
 * PPTX exporter would read to place the element in inches.
 *
 * Shared by the read-only Slide renderer and the interactive SlideEditor so
 * the two never drift apart.
 */
export function boxStyle(el: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}): CSSProperties {
  return {
    position: "absolute",
    left: `${(el.x / SLIDE_WIDTH) * 100}%`,
    top: `${(el.y / SLIDE_HEIGHT) * 100}%`,
    width: `${(el.width / SLIDE_WIDTH) * 100}%`,
    height: `${(el.height / SLIDE_HEIGHT) * 100}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };
}

/** Converts a pixel delta (measured against the rendered slide) into the same logical units the schema uses. */
export function pixelDeltaToLogical(
  deltaXPx: number,
  deltaYPx: number,
  containerWidthPx: number,
  containerHeightPx: number
) {
  return {
    dx: (deltaXPx / containerWidthPx) * SLIDE_WIDTH,
    dy: (deltaYPx / containerHeightPx) * SLIDE_HEIGHT,
  };
}
