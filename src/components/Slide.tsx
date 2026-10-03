import type { CSSProperties } from "react";
import type { Slide as SlideType, SlideElement } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";

/**
 * Converts an element's logical-unit box (x, y, width, height against the
 * SLIDE_WIDTH x SLIDE_HEIGHT canvas) into percentage-based CSS. Percentages
 * mean the slide scales cleanly to any container size while every element
 * stays in exactly the same relative place — the same logical box a future
 * PPTX exporter would read to place the element in inches.
 */
function boxStyle(el: { x: number; y: number; width: number; height: number; rotation?: number }): CSSProperties {
  return {
    position: "absolute",
    left: `${(el.x / SLIDE_WIDTH) * 100}%`,
    top: `${(el.y / SLIDE_HEIGHT) * 100}%`,
    width: `${(el.width / SLIDE_WIDTH) * 100}%`,
    height: `${(el.height / SLIDE_HEIGHT) * 100}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };
}

function ElementRenderer({ element }: { element: SlideElement }) {
  switch (element.type) {
    case "text": {
      const fontFamilyVar =
        element.fontFamily === "display" ? "var(--font-display)" : "var(--font-sans)";
      return (
        <div
          style={{
            ...boxStyle(element),
            fontFamily: fontFamilyVar,
            fontSize: `${(element.fontSize / SLIDE_HEIGHT) * 100}cqh`,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.align,
            lineHeight: element.lineHeight,
            whiteSpace: "pre-wrap",
          }}
        >
          {element.content}
        </div>
      );
    }
    case "shape": {
      if (element.shape === "ellipse") {
        return (
          <div
            style={{
              ...boxStyle(element),
              backgroundColor: element.fill,
              border: element.stroke ? `1px solid ${element.stroke}` : undefined,
              borderRadius: "50%",
            }}
          />
        );
      }
      return (
        <div
          style={{
            ...boxStyle(element),
            backgroundColor: element.fill,
            border: element.stroke ? `1px solid ${element.stroke}` : undefined,
            borderRadius: `${(element.radius / SLIDE_WIDTH) * 100}%`,
          }}
        />
      );
    }
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.src}
          alt={element.alt}
          style={{
            ...boxStyle(element),
            objectFit: element.fit,
            borderRadius: `${(element.radius / SLIDE_WIDTH) * 100}%`,
          }}
        />
      );
    case "line":
      return (
        <div
          style={{
            ...boxStyle(element),
            backgroundColor: element.color,
            height: element.thickness,
          }}
        />
      );
    // Icon, chart, table, and group elements arrive in a later milestone.
    default:
      return null;
  }
}

export default function Slide({ slide }: { slide: SlideType }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      style={{
        aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
        backgroundColor: slide.background,
        containerType: "size",
      }}
    >
      {slide.elements.map((element) => (
        <ElementRenderer key={element.id} element={element} />
      ))}
    </div>
  );
}
