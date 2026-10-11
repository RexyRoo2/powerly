import type { Slide as SlideType, SlideElement, Palette } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";
import { boxStyle } from "@/lib/coordinates";
import { resolveColor, fontFaceVar, slideBackgroundColor, effectivePalette } from "@/lib/themes";
import ChartGraphic from "./ChartGraphic";
import TableGraphic from "./TableGraphic";

function ElementRenderer({ element, theme }: { element: SlideElement; theme: Palette }) {
  switch (element.type) {
    case "text": {
      const fontFamilyVar = fontFaceVar(element.fontFamily === "display" ? theme.fontDisplay : theme.fontBody);
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

export default function Slide({ slide, theme }: { slide: SlideType; theme: Palette }) {
  // Elements never know which background mode their slide is in — they
  // always just resolve "text"/"accent"/"muted" against whatever palette
  // they're handed. effectivePalette is where that mode gets decided, once
  // per slide, so a slide using the deck's dark "contrastBackground" gets
  // correctly-legible text/accent/muted instead of colors tuned for the
  // other mood.
  const elementTheme = effectivePalette(theme, slide.background);
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      style={{
        aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
        backgroundColor: slideBackgroundColor(slide.background, theme),
        containerType: "size",
      }}
    >
      {slide.elements.map((element) => (
        <ElementRenderer key={element.id} element={element} theme={elementTheme} />
      ))}
    </div>
  );
}
