import { FontChoiceSchema, type FontChoice, type Palette } from "./schema";

/**
 * The safety net under AI-generated palettes — the color equivalent of
 * textFit.ts's role for text geometry. The model is free to invent any hex
 * colors it wants for a deck's palette (that's the whole point of a
 * bespoke-per-deck design), but nothing guarantees those colors are
 * actually legible together until this runs. This is where an AI-chosen
 * but illegible pairing (e.g. a mid-gray "text" on a close-to-mid-gray
 * "background") gets nudged into something readable before it ever
 * reaches a real slide, rather than shipping a deck a student can't read.
 *
 * Contrast thresholds mirror the ones the reference Claude "Slides" design
 * system itself states: 4.5:1 for normal text, 3:1 for large text/accents.
 */

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToHsl(hex: string): [number, number, number] {
  const [r0, g0, b0] = hexToRgb(hex);
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance per WCAG. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pushes fgHex's lightness away from bgHex (toward white or black,
 * whichever bgHex is already further from) in small steps until it clears
 * minRatio against bgHex, or hits a safe floor/ceiling. Hue and saturation
 * are preserved — this corrects legibility, it doesn't recolor — so a
 * palette that was only slightly off stays recognizably itself.
 */
export function ensureContrast(fgHex: string, bgHex: string, minRatio: number): string {
  if (!isValidHex(fgHex) || !isValidHex(bgHex)) return fgHex;
  if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex;

  // Which pole (near-white or near-black) actually yields more contrast
  // against THIS background decides the push direction. That is not the
  // same question as "is the background dark or light" — a mid-tone
  // background's two extremes aren't symmetric around luminance 0.5 (WCAG's
  // contrast formula adds a +0.05 offset to both numerator and
  // denominator), so a naive luminance < 0.5 check picks the wrong
  // direction for some genuinely mid-tone backgrounds. Comparing the two
  // real candidates directly is correct for every background.
  const towardLight = contrastRatio("#FFFFFF", bgHex) >= contrastRatio("#000000", bgHex);
  const [h, s, startL] = hexToHsl(fgHex);
  let l = startL;
  for (let i = 0; i < 24; i++) {
    l = towardLight ? Math.min(100, l + 4) : Math.max(0, l - 4);
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, bgHex) >= minRatio) return candidate;
    if (l <= 0 || l >= 100) break;
  }
  // Still short of the target at the lightness floor/ceiling (e.g. a very
  // low-saturation gray) — fall back to a guaranteed-safe near-white/
  // near-black rather than ship text that's actually illegible.
  return towardLight ? "#F5F3EE" : "#1A1714";
}

const FONT_CHOICE_SET = new Set(FontChoiceSchema.options);

function pickFont(v: unknown, fallback: FontChoice): FontChoice {
  return typeof v === "string" && FONT_CHOICE_SET.has(v as FontChoice) ? (v as FontChoice) : fallback;
}

/**
 * Validates/repairs a raw AI-proposed palette into something safe to ship:
 * invalid hex strings fall back to the equivalent field on `fallback`, and
 * every foreground color is run through ensureContrast against the
 * resolved background. Mirrors fitTextToBox's role in textFit.ts — the
 * model is never fully trusted, so this is the one place a palette
 * actually becomes safe-to-render data.
 */
export function normalizePalette(raw: unknown, fallback: Palette): Palette {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawColors = (r.colors && typeof r.colors === "object" ? r.colors : {}) as Record<string, unknown>;

  const background = isValidHex(rawColors.background) ? rawColors.background : fallback.colors.background;
  const surface = isValidHex(rawColors.surface) ? rawColors.surface : fallback.colors.surface;
  let text = isValidHex(rawColors.text) ? rawColors.text : fallback.colors.text;
  let accent = isValidHex(rawColors.accent) ? rawColors.accent : fallback.colors.accent;
  let muted = isValidHex(rawColors.muted) ? rawColors.muted : fallback.colors.muted;

  text = ensureContrast(text, background, 4.5);
  accent = ensureContrast(accent, background, 3);
  muted = ensureContrast(muted, background, 3);

  return {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 40) : fallback.name,
    colors: { background, surface, text, accent, muted },
    fontDisplay: pickFont(r.fontDisplay, fallback.fontDisplay),
    fontBody: pickFont(r.fontBody, fallback.fontBody),
  };
}
