// Chum design tokens. Dark, premium, warm. One ember accent.
// Result/share cards are the hero UI — keep them feeling expensive.

export const colors = {
  // canvas
  bg: "#0B0A0C",
  surface: "#121013",
  card: "#171419",
  cardHi: "#1F1A21",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.06)",

  // text
  text: "#FAF7F5",
  dim: "#B7AEB4",
  muted: "#8B8389",
  faint: "#6A636A",

  // accent (warm ember)
  ember: "#FF6A3D",
  emberSoft: "rgba(255,106,61,0.16)",
  emberLine: "rgba(255,106,61,0.40)",

  // semantic
  good: "#46D49B",
  warn: "#F0BC4D",
  bad: "#FB6F8E",

  // vibe tints (used by VibePicker + reply cards)
  playful: "#FF6A3D",
  smooth: "#7AA2FF",
  bold: "#FF4D6D",
  funny: "#F5C84B",
  sweet: "#FF8FB1",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// System fonts for v0 (SF on iOS already reads premium). Swap in google fonts later.
export const font = {
  display: undefined as string | undefined, // system, used with weight
  body: undefined as string | undefined,
  mono: "Menlo",
} as const;

export const type = {
  hero: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyMed: { fontSize: 15, fontWeight: "500" as const },
  label: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.6 },
  meta: { fontSize: 11, fontWeight: "500" as const, letterSpacing: 0.4 },
} as const;

export const vibeColor = (v: string): string =>
  (colors as Record<string, string>)[v] ?? colors.ember;
