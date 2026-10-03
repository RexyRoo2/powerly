import type { Slide as SlideType, SlideElement } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";
import { boxStyle } from "@/lib/coordinates";

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
