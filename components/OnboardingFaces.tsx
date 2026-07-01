import Svg, { Circle, Path } from "react-native-svg";

// Minimal black line-art faces for the onboarding "bold world" — drawn straight
// onto the Blob's saturated pastel CIRCLE (the blob IS the head; the outer ring
// is gone). Uniform strokeWidth 7, single ink (#0E0E10), the 160 viewBox scales
// to whatever `size` the Blob passes. Authored + judged via the
// chum-onboarding-faces workflow.

const INK = "#0E0E10";

type FaceProps = { size?: number };

// Page 1 — confident wink + smirk, raised brow = "the flirt, by one notch".
export function FaceFlirty({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* cocky raised brow over the open eye */}
      <Path d="M48 56 Q60 49 72 55" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* open eye */}
      <Circle cx={60} cy={71} r={5.5} fill={INK} />
      {/* the wink */}
      <Path d="M89 71 Q99 79 109 71" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* the smirk — flat left, pulls up right */}
      <Path d="M54 104 C72 116 96 112 110 95" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Page 2 — a calm "shhh": gentle closed eyes + a finger held DIAGONALLY to the
// lips. Diagonal finger + the lip peeking left are the two anti-"nose" signals.
export function FacePrivacy({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* content closed eyes */}
      <Path d="M50 70 Q60 77 70 70" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M90 70 Q100 77 110 70" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* pursed lip peeking left of the finger — anchors the mouth */}
      <Path d="M60 107 Q68 111 76 108" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* shhh — finger diagonal, base at chin, tip at lips */}
      <Path d="M97 121 C91 109 86 101 80 95" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Page 3 — delighted heart-eyes + a big open grin + sparkles ("replies land").
export function FaceSpark({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* heart eyes */}
      <Path d="M60 68 C58 60 47 60 47 68 C47 75 56 79 60 82 C64 79 73 75 73 68 C73 60 62 60 60 68 Z" fill={INK} />
      <Path d="M100 68 C98 60 87 60 87 68 C87 75 96 79 100 82 C104 79 113 75 113 68 C113 60 102 60 100 68 Z" fill={INK} />
      {/* big delighted grin */}
      <Path d="M50 99 Q80 129 110 99" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* sparkles */}
      <Path d="M132 24 Q134 31 141 33 Q134 35 132 42 Q130 35 123 33 Q130 31 132 24 Z" fill={INK} />
      <Path d="M30 110 Q31.5 114.5 36 116 Q31.5 117.5 30 122 Q28.5 117.5 24 116 Q28.5 114.5 30 110 Z" fill={INK} />
    </Svg>
  );
}

// ── Persona faces (react to the voice you pick on page 3) ──────────────────

// dry — deadpan, understated: open dot eyes, a dead-flat mouth.
export function FaceDry({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx={60} cy={71} r={5.5} fill={INK} />
      <Circle cx={100} cy={71} r={5.5} fill={INK} />
      <Path d="M58 105 Q80 109 102 105" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// goofy — silly, fun: big round eyes, huge open grin, tongue.
export function FaceGoofy({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx={60} cy={69} r={7} fill={INK} />
      <Circle cx={100} cy={69} r={7} fill={INK} />
      <Path d="M46 96 Q80 138 114 96" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M72 119 Q80 127 88 119" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// smooth — confident, warm: chill brow, a wink, a full warm smile.
export function FaceSmooth({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M48 58 Q60 53 72 57" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={60} cy={71} r={5.5} fill={INK} />
      <Path d="M89 71 Q99 79 109 71" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M52 100 Q80 124 108 100" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// nerdy — clever, specific: round glasses, eyes behind them, a small smart smile.
export function FaceNerdy({ size = 188 }: FaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx={58} cy={71} r={13} stroke={INK} strokeWidth={6} fill="none" />
      <Circle cx={102} cy={71} r={13} stroke={INK} strokeWidth={6} fill="none" />
      <Path d="M71 71 L89 71" stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={58} cy={71} r={4} fill={INK} />
      <Circle cx={102} cy={71} r={4} fill={INK} />
      <Path d="M62 103 Q80 113 98 103" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
