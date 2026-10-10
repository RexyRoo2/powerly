import type { Palette } from "./schema";

/**
 * Dashboard card color, derived from the deck's own AI-generated accent
 * hue rather than looked up from a fixed 5-entry preset dict — there is no
 * fixed list anymore, every deck gets its own bespoke palette. A light,
 * airy tint in the same hue as the deck's accent keeps the dashboard
 * "shelf" colorful and on-brand per deck (an oceans deck's blue accent
 * gives it a blue-tinted card), the same spirit as the slides themselves.
 * Deliberately separate from the slide palette's own (always-dark-or-light,
 * high-contrast) colors — a dashboard thumbnail can afford to always read
 * as a light card regardless of whether the deck itself is dark.
 */
export function cardTint(theme: Palette): { bg: string; fg: string; fgMuted: string } {
  const [h] = hexToHsl(theme.colors.accent);
  return {
    bg: hslToHex(h, 42, 90),
    fg: hslToHex(h, 35, 15),
    fgMuted: hslToHex(h, 22, 38),
  };
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
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
