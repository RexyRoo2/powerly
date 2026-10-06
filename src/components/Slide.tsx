import type { Slide as SlideType, SlideElement, Theme } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";
import { boxStyle } from "@/lib/coordinates";
import { THEMES, resolveColor } from "@/lib/themes";
import ChartGraphic from "./ChartGraphic";
import TableGraphic from "./TableGraphic";

function ElementRenderer({ element, theme }: { element: SlideElement; theme: Theme }) {
  const tokens = THEMES[theme];

  switch (element.type) {
    case "text": {
      const fontFamilyVar = element.fontFamily === "display" ? tokens.fontDisplay : tokens.fontBody;
      return (
        <div
          style={{
            ...boxStyle(element),
            fontFamily: fontFamilyVar,
            fontSize: `${(element.fontSize / SLIDE_HEIGHT) * 100}cqh`,
            fontWeight: element.fontWeight,
            color: resolveColor(element.color, theme),
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
      const fill = resolveColor(element.fill, theme);
      const stroke = element.stroke ? resolveColor(element.stroke, theme) : undefined;
      return (
        <div
          style={{
            ...boxStyle(element),
            backgroundColor: fill,
            border: stroke ? `1px solid ${stroke}` : undefined,
            borderRadius:
              element.shape === "ellipse" ? "50%" : `${(element.radius / SLIDE_WIDTH) * 100}%`,
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
            backgroundColor: resolveColor(element.color, theme),
            height: element.thickness,
          }}
        />
      );
    case "chart":
      return (
        <div style={boxStyle(element)}>
          <ChartGraphic element={element} theme={theme} />
        </div>
      );
    case "table":
      return (
        <div style={boxStyle(element)}>
          <TableGraphic element={element} theme={theme} />
        </div>
      );
    // Icon and group elements arrive in a later milestone.
    default:
      return null;
  }
}

export default function Slide({ slide, theme }: { slide: SlideType; theme: Theme }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      style={{
        aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
        backgroundColor: resolveColor(slide.background, theme),
        containerType: "size",
      }}
    >
      {slide.elements.map((element) => (
        <ElementRenderer key={element.id} element={element} theme={theme} />
      ))}
    </div>
  );
}
