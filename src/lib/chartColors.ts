import type { Palette } from "./schema";
import { resolveColor } from "./themes";

/**
 * A palette only defines a handful of color roles, not a full categorical
 * palette, so a multi-slice/multi-bar chart cycles a small set of tones at
 * decreasing opacity rather than injecting arbitrary rainbow colors that
 * would clash with the deck's own palette. Shared by ChartGraphic.tsx
 * (in-app) and exportPptx.ts (download) so a chart's colors never drift
 * between the two.
 */
export function seriesColors(theme: Palette, count: number): string[] {
  const base = [resolveColor("accent", theme), resolveColor("muted", theme), resolveColor("text", theme)];
  const opacities = [1, 1, 1, 0.65, 0.65, 0.65, 0.4, 0.4];
  return Array.from({ length: count }, (_, i) => {
    const color = base[i % base.length];
    const opacity = opacities[i] ?? 0.4;
    return opacity === 1 ? color : hexWithOpacity(color, opacity);
  });
}

export function hexWithOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}
