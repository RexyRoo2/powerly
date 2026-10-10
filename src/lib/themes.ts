import type { ColorRole, Palette, FontChoice } from "./schema";

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

/** Used only as a last-resort fallback and for the bundled example deck — never shown to a student as "the" theme, since there isn't one anymore. */
export const DEFAULT_PALETTE: Palette = {
  name: "Warm Academic",
  colors: {
    background: "#1C1712",
    surface: "#2A231B",
    text: "#F2E9DA",
    accent: "#D97A52",
    muted: "#8FA389",
  },
  fontDisplay: "instrument-serif",
  fontBody: "inter",
};
