import { LinearGradient } from "expo-linear-gradient";

import { colors } from "../lib/theme";

// Top-down accent wash — bleeds from under the status bar into the near-black
// canvas (the app's "lit from above" signature, à la the reference home).
// Place as the FIRST child of a screen's root View (behind content); pair with a
// transparent header so it bleeds full under the status bar. `hue` must be a hex.
function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function TopGlow({
  hue = colors.lilac, // pink by default (the brand accent)
  height = 380,
  strength = 0.42,
}: {
  hue?: string;
  height?: number;
  strength?: number;
}) {
  return (
    <LinearGradient
      colors={[rgba(hue, strength), rgba(hue, strength * 0.28), "rgba(14,14,16,0)"]}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height }}
    />
  );
}
