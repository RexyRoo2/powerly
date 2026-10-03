import type { ColorRole, Theme } from "./schema";

export type ThemeTokens = {
  id: Theme;
  label: string;
  colors: Record<ColorRole, string>;
  fontDisplay: string;
  fontBody: string;
};

/**
 * Five selectable presentation themes. Every slide element stores a color
 * ROLE (see ColorRoleSchema), never a literal hex value, so switching a
 * deck's theme here restyles every slide at once — nothing on the slides
 * themselves has to change.
 *
 * All five stay dark-background by design, matching Powerly's own brand
 * stance: they differ in accent color, surface treatment, and typography,
 * not in going light vs. dark.
 */
export const THEMES: Record<Theme, ThemeTokens> = {
  academic: {
    id: "academic",
    label: "Academic",
    colors: {
      background: "#1C1712",
      surface: "#2A231B",
      text: "#F2E9DA",
      accent: "#D97A52",
      muted: "#8FA389",
    },
    fontDisplay: "var(--font-display)",
    fontBody: "var(--font-sans)",
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    colors: {
      background: "#141414",
      surface: "#1F1F1F",
      text: "#F5F5F0",
      accent: "#C9C9C0",
      muted: "#7A7A74",
    },
    fontDisplay: "var(--font-sans)",
    fontBody: "var(--font-sans)",
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    colors: {
      background: "#14181C",
      surface: "#1E252B",
      text: "#F2EFE9",
      accent: "#C65B43",
      muted: "#7D8A93",
    },
    fontDisplay: "var(--font-display)",
    fontBody: "var(--font-sans)",
  },
  futuristic: {
    id: "futuristic",
    label: "Futuristic",
    colors: {
      background: "#0B0F14",
      surface: "#121826",
      text: "#E7F0FF",
      accent: "#39E6D0",
      muted: "#4C5A70",
    },
    fontDisplay: "var(--font-logo)",
    fontBody: "var(--font-sans)",
  },
  playful: {
    id: "playful",
    label: "Playful",
    colors: {
      background: "#1B1620",
      surface: "#241D29",
      text: "#F5EDE3",
      accent: "#F2B263",
      muted: "#A68FB0",
    },
    fontDisplay: "var(--font-logo)",
    fontBody: "var(--font-sans)",
  },
};

export function resolveColor(role: ColorRole, theme: Theme): string {
  return THEMES[theme].colors[role];
}
