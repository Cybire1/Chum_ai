import type { DecodeVerdict, Vibe } from "./types";

export const verdictLabel: Record<DecodeVerdict, string> = {
  interested: "She's into it",
  testing: "She's testing you",
  polite: "Being polite",
  losing_interest: "Losing interest",
};

export const verdictTone: Record<DecodeVerdict, "good" | "warn" | "bad"> = {
  interested: "good",
  testing: "warn",
  polite: "warn",
  losing_interest: "bad",
};

export const vibeLabel: Record<Vibe, string> = {
  playful: "Playful",
  smooth: "Smooth",
  bold: "Bold",
  funny: "Funny",
  sweet: "Sweet",
};

export const spiceLabel = (s: 1 | 2 | 3): string =>
  s === 1 ? "Easy" : s === 2 ? "Medium" : "Bold";

// Lightweight id without Math.random dependence concerns in app code.
let _n = 0;
export const uid = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}_${(_n++).toString(36)}`;
