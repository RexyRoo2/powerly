import PptxGenJS from "pptxgenjs";
import type { Presentation, SlideElement, Theme } from "./schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "./schema";
import { THEMES, resolveColor } from "./themes";

/**
 * Converts a Presentation into a real, editable .pptx file — text boxes and
 * shapes a student can still click into and move in PowerPoint/Keynote, not
 * a flattened image.
 *
 * Mirrors Slide.tsx element-for-element (same logical-unit canvas, same
 * color-role resolution, same element types supported) so what exports
 * matches what's on screen in the editor. Icon/chart/table/group elements
 * are skipped here exactly like the in-app renderer skips them — they
 * arrive together in a later milestone.
 */

// PowerPoint's built-in 16:9 widescreen layout is 13.333in x 7.5in, which is
// exactly our 1280 x 720 canvas's aspect ratio — so one scale factor
// converts logical units to inches on both axes.
const LAYOUT_WIDTH_IN = 13.333;
const LAYOUT_HEIGHT_IN = 7.5;
const UNITS_TO_INCHES = LAYOUT_WIDTH_IN / SLIDE_WIDTH; // === LAYOUT_HEIGHT_IN / SLIDE_HEIGHT
const POINTS_PER_INCH = 72;

function toIn(unitsValue: number): number {
  return unitsValue * UNITS_TO_INCHES;
}

function toPt(unitsValue: number): number {
  return toIn(unitsValue) * POINTS_PER_INCH;
}

function hex(role: Parameters<typeof resolveColor>[0], theme: Theme): string {
  return resolveColor(role, theme).replace("#", "");
}

// Same CSS variables themes.ts points fontDisplay/fontBody at, resolved to
// the real font names self-hosted in the app (globals.css). PowerPoint will
// substitute a system font for a viewer who doesn't have these installed —
// a known limitation of exporting a styled web canvas to a static format.
const CSS_VAR_TO_FONT_NAME: Record<string, string> = {
  "var(--font-sans)": "Inter",
  "var(--font-display)": "Instrument Serif",
  "var(--font-logo)": "Outfit",
};

function fontFaceFor(fontFamily: "display" | "body", theme: Theme): string {
  const tokens = THEMES[theme];
  const cssVar = fontFamily === "display" ? tokens.fontDisplay : tokens.fontBody;
  return CSS_VAR_TO_FONT_NAME[cssVar] ?? "Inter";
}

function addElement(pptxSlide: PptxGenJS.Slide, element: SlideElement, theme: Theme) {
  switch (element.type) {
    case "text": {
      pptxSlide.addText(element.content, {
        x: toIn(element.x),
        y: toIn(element.y),
        w: toIn(element.width),
        h: toIn(element.height),
        fontFace: fontFaceFor(element.fontFamily, theme),
        fontSize: toPt(element.fontSize),
        bold: element.fontWeight >= 600,
        color: hex(element.color, theme),
        align: element.align,
        valign: "top",
        lineSpacingMultiple: element.lineHeight,
        margin: 0,
        wrap: true,
      });
      break;
    }
    case "shape": {
      pptxSlide.addShape(
        element.shape === "ellipse" ? "ellipse" : "rect",
        {
          x: toIn(element.x),
          y: toIn(element.y),
          w: toIn(element.width),
          h: toIn(element.height),
          fill: { color: hex(element.fill, theme) },
          line: element.stroke ? { color: hex(element.stroke, theme), width: 1 } : { type: "none" },
          rectRadius: element.shape === "rectangle" && element.radius > 0 ? toIn(element.radius) : undefined,
        }
      );
      break;
    }
    case "line": {
      pptxSlide.addShape("line", {
        x: toIn(element.x),
        y: toIn(element.y),
        w: toIn(element.width),
        h: toIn(element.thickness),
        line: { color: hex(element.color, theme), width: toPt(element.thickness) },
      });
      break;
    }
    case "image": {
      // Only usable when `src` is a real reachable URL or a data: URI —
      // not yet reachable from the in-app editor, which has no image
      // upload UI, but future-proofed here since the schema allows it.
      pptxSlide.addImage({
        path: element.src,
        x: toIn(element.x),
        y: toIn(element.y),
        w: toIn(element.width),
        h: toIn(element.height),
      });
      break;
    }
    // Icon, chart, table, and group elements arrive in a later milestone —
    // same as Slide.tsx, silently skipped rather than breaking the export.
    default:
      break;
  }
}

export async function exportPresentationToPptx(presentation: Presentation): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = presentation.title;

  for (const slide of presentation.slides) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.background = { color: hex(slide.background, presentation.theme) };
    for (const element of slide.elements) {
      addElement(pptxSlide, element, presentation.theme);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}
