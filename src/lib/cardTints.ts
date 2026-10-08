import type { Theme } from "./schema";

/**
 * Dashboard-only card colors, one per deck theme — purely cosmetic, so the
 * list of decks reads as a colorful shelf at a glance. Deliberately separate
 * from THEMES in themes.ts (which styles the actual slides and is always
 * dark by design) — a dashboard thumbnail can afford to be a light card
 * where a slide background can't.
 */
export const CARD_TINTS: Record<Theme, { bg: string; fg: string; fgMuted: string }> = {
  academic: { bg: "#EFE3CF", fg: "#1C1712", fgMuted: "#6B5F4A" },
  minimal: { bg: "#DAD4C5", fg: "#1C1712", fgMuted: "#6E6A5C" },
  editorial: { bg: "#3F4A63", fg: "#F2EFE9", fgMuted: "#AEB8C8" },
  futuristic: { bg: "#241A35", fg: "#E7E2F5", fgMuted: "#9C8FC0" },
  playful: { bg: "#C1603F", fg: "#FBF1E6", fgMuted: "#F0CBB8" },
};
