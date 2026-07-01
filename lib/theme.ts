// Chum design tokens — DARK, editorial, award-winning. A near-black gallery lit
// by ONE living candy accent per screen: PINK · MINT · BLUE (no purple, no
// orange). Accents are pastel blobs/spotlights on near-black; the pink→blue
// brand gradient is rationed to hero CTAs/moments only.
//
// SYSTEM ("The Spotlight Tell"): one saturated pastel blob = the only loud color
// on a near-black page; it warms lilac → rose → peach with Spice and flips
// mint/amber/rose by Decode verdict. White-pill primary CTA; gradient reserved
// for one moment per flow. Hairline geometry, generous negative space.
//
// Export surface is UNCHANGED (colors/gradients/shadow/space/radius/font/type/
// vibeColor) so the app keeps compiling while it goes dark; values are dark-tuned
// and NEW dark tokens are appended.

export const colors = {
  // canvas — near-black gallery
  bg: "#0E0E10",
  surface: "#161418", // raised control (ghost-btn fill, tab bar, recessed inset)
  card: "#1C1A20", // elevated card
  cardHi: "#232027", // higher elevation: skeleton base, segment track, "them" bubble

  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",

  // text — off-white ink, never pure #FFF
  text: "#F5F3F7",
  dim: "#A8A4B0",
  muted: "#76727E",
  faint: "#4A474F",

  // lead accent — lilac (the brand purple, pastel-ized for black). Used for
  // single-color moments, carets, eyebrows, active hairlines.
  ember: "#FF6FA5",
  emberSoft: "rgba(255,111,165,0.12)",
  emberLine: "rgba(255,111,165,0.32)",

  // brand gradient stops (logo: purple → pink → orange) — UNCHANGED, the soul
  grad1: "#FF6FA5",
  grad2: "#FF8FB8",
  grad3: "#5FB0FF",

  // candy-pastel secondaries (saturated-but-soft on black)
  purple: "#FF6FA5",
  purpleSoft: "rgba(255,111,165,0.12)",
  pink: "#FF6FA5",
  pinkSoft: "rgba(255,111,165,0.12)",
  blue: "#5FB0FF",
  mint: "#5FE0AE",
  yellow: "#FFDD7A",

  // semantic — pastel so they read luxe, not alarmy
  good: "#5FE0AE",
  warn: "#FFDD7A",
  bad: "#FF6F8F",

  // vibe tints (candy-pastel; keys must match Vibe names for vibeColor())
  playful: "#FF6FA5", // pink
  smooth: "#5FB0FF", // blue
  bold: "#FF4D8D", // hot pink
  funny: "#5FE0AE", // mint
  sweet: "#FF9CC2", // soft pink

  // ── NEW DARK TOKENS ──────────────────────────────────────────────────────
  // near-black ink for text ON bright pastel (blob line-art, white-pill CTA,
  // active candy pill labels, gradient badge text)
  ink: "#0E0E10",
  onInk: "#0E0E10",
  scrim: "#09090B", // OLED edge / modal scrim

  // surface ladder
  well: "#121116", // recessed input/well (darker than card)
  chip: "#1A181E", // dark raised pill, UNSELECTED
  chipHi: "#26242A", // selected-inactive / segmented active base
  elevated: "#1C1A20", // = card (semantic alias)
  sheet: "#232027", // modal / stacked tier

  // edges
  hairline: "rgba(255,255,255,0.07)", // the workhorse 1px
  hairlineSoft: "rgba(255,255,255,0.05)",
  focus: "rgba(255,255,255,0.12)", // focus-lift border
  topHi: "rgba(255,255,255,0.05)", // inner top-highlight (machined edge)

  // white-pill CTA fill
  white: "#F5F3F7",

  // the three living spotlight accents + their radial "light" + active tint
  // names kept for the import contract; values are now PINK · MINT (no purple/orange)
  lilac: "#FF6FA5",
  lilacTint: "rgba(255,111,165,0.12)",
  lilacGlow: "rgba(255,111,165,0.22)",
  rose: "#FF6FA5",
  roseTint: "rgba(255,111,165,0.12)",
  roseGlow: "rgba(255,111,165,0.22)",
  peach: "#5FE0AE",
  peachTint: "rgba(95,224,174,0.12)",
  peachGlow: "rgba(95,224,174,0.20)",
} as const;

export const gradients = {
  brand: ["#FF6FA5", "#5FB0FF"] as const,
  // dark candy wash (chips/badges that want a hint of the gradient)
  brandSoft: ["rgba(255,111,165,0.16)", "rgba(95,224,174,0.16)", "rgba(95,176,255,0.16)"] as const,
  // spotlight glow → transparent on canvas
  glow: ["rgba(255,111,165,0.22)", "rgba(14,14,16,0)"] as const,
};

// On near-black, color shadows vanish — depth comes from black ambient + a 1px
// top-highlight on cards. The brand glow survives for the rationed gradient hero.
export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  soft: {
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  brand: {
    shadowColor: "#FF6FA5",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
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
  sm: 10,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  display: undefined as string | undefined,
  body: undefined as string | undefined,
  mono: "Menlo",
} as const;

// Hanken Grotesk type scale — clean modern grotesk across the whole app.
// fontFamily encodes the weight; fontWeight kept as a graceful fallback.
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontFamily: "HankenGrotesk_800ExtraBold", fontWeight: "800" as const, letterSpacing: 0.2 },
  hero: { fontSize: 28, lineHeight: 34, fontFamily: "HankenGrotesk_800ExtraBold", fontWeight: "800" as const, letterSpacing: 0.2 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: "HankenGrotesk_700Bold", fontWeight: "700" as const, letterSpacing: 0.2 },
  title3: { fontSize: 20, lineHeight: 25, fontFamily: "HankenGrotesk_700Bold", fontWeight: "700" as const, letterSpacing: 0.2 },
  heading: { fontSize: 17, lineHeight: 22, fontFamily: "HankenGrotesk_600SemiBold", fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 23, fontFamily: "HankenGrotesk_400Regular", fontWeight: "400" as const, letterSpacing: -0.2 },
  bodyMed: { fontSize: 17, lineHeight: 23, fontFamily: "HankenGrotesk_500Medium", fontWeight: "500" as const, letterSpacing: -0.2 },
  callout: { fontSize: 16, lineHeight: 21, fontFamily: "HankenGrotesk_400Regular", fontWeight: "400" as const, letterSpacing: -0.1 },
  subhead: { fontSize: 15, lineHeight: 20, fontFamily: "HankenGrotesk_400Regular", fontWeight: "400" as const, letterSpacing: -0.1 },
  label: { fontSize: 13, lineHeight: 18, fontFamily: "HankenGrotesk_700Bold", fontWeight: "700" as const, letterSpacing: 0.5 }, // uppercase eyebrows
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: "HankenGrotesk_400Regular", fontWeight: "400" as const },
  meta: { fontSize: 12, lineHeight: 16, fontFamily: "HankenGrotesk_600SemiBold", fontWeight: "600" as const, letterSpacing: 0.2 }, // caption
} as const;

export const vibeColor = (v: string): string =>
  (colors as Record<string, string>)[v] ?? colors.ember;
