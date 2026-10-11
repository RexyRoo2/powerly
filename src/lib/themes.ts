import type { ColorRole, Palette, FontChoice, SlideBackgroundRole } from "./schema";

/**
 * Decks no longer pick from a fixed set of preset themes — the AI designs
 * a bespoke palette (background/surface/text/accent/muted hex colors + two
 * font choices) for every deck, grounded in its own subject, instead of
 * every deck reusing one of five canned looks. This file just resolves a
 * palette's own data (a color role, a font choice) plus a single fallback
 * palette for the few spots that need a safe default with no AI output in
 * hand yet (the bundled example deck, and a last-resort if generation ever
 * produces something unusable).
 */

const FONT_FACE_VAR: Record<FontChoice, string> = {
  inter: "var(--font-sans)",
  "instrument-serif": "var(--font-display)",
  outfit: "var(--font-logo)",
};

/** CSS custom property for a font choice, for the in-app (web) renderer. */
export function fontFaceVar(choice: FontChoice): string {
  return FONT_FACE_VAR[choice];
}

export function resolveColor(role: ColorRole, theme: Palette): string {
  return theme.colors[role];
}

/** The actual color a slide's own backdrop shows — any of the deck's three background tones. */
export function slideBackgroundColor(slideBackground: SlideBackgroundRole, theme: Palette): string {
  return theme.colors[slideBackground];
}

/**
 * The palette CHILD ELEMENTS on a slide should resolve their roles
 * (text/accent/muted/background/surface) against. For an ordinary
 * "background" or "surface" slide this is just the theme unchanged — same
 * behavior as before "contrastBackground" existed. For a "contrastBackground"
 * slide, text/accent/muted need to flip to the pre-derived contrast variants
 * (normalizePalette already guaranteed their legibility against
 * contrastBackground), or a title on the deck's one dark hero slide would
 * render in text meant for the OTHER mood and vanish. Every renderer
 * (Slide.tsx, SlideEditor.tsx, exportPptx.ts) computes this once per slide
 * and passes it down — individual element renderers never need to know
 * which mode they're in.
 */
export function effectivePalette(theme: Palette, slideBackground: SlideBackgroundRole): Palette {
  if (slideBackground !== "contrastBackground") return theme;
  return {
    ...theme,
    colors: {
      ...theme.colors,
      background: theme.colors.contrastBackground,
      surface: theme.colors.contrastBackground,
      text: theme.colors.contrastText,
      accent: theme.colors.contrastAccent,
      muted: theme.colors.contrastMuted,
    },
  };
}

/** Used only as a last-resort fallback and for the bundled example deck — never shown to a student as "the" theme, since there isn't one anymore. */
export const DEFAULT_PALETTE: Palette = {
  name: "Warm Academic",
  colors: {
    background: "#1C1712",
    surface: "#2A231B",
    text: "#F2E9DA",
    accent: "#D97A52",
    muted: "#8FA389",
    contrastBackground: "#F2E9DA",
    contrastText: "#1C1712",
    contrastAccent: "#A8471F",
    contrastMuted: "#5C6B52",
  },
  fontDisplay: "instrument-serif",
  fontBody: "inter",
};
