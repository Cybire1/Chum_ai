import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import {
  Animated,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "../lib/motion";
import { colors, radius } from "../lib/theme";
import {
  FaceDry,
  FaceFlirty,
  FaceGoofy,
  FaceNerdy,
  FacePrivacy,
  FaceSmooth,
  FaceSpark,
} from "./OnboardingFaces";

// THE signature mascot. One saturated pastel CIRCLE that IS the head, with the
// OnboardingFaces line-art drawn straight onto it (no outline ring), floating on
// near-black behind a single soft radial glow. The blob warms lilac → rose →
// peach to carry the screen's "one light".

type Face = "flirty" | "privacy" | "spark" | "dry" | "goofy" | "smooth" | "nerdy";
type Hue = "lilac" | "rose" | "peach";

type Props = {
  face: Face;
  hue?: Hue;
  size?: number;
  glow?: boolean;
  breathing?: boolean;
};

const DEFAULT_HUE: Record<Face, Hue> = {
  flirty: "lilac",
  privacy: "peach",
  spark: "rose",
  dry: "lilac",
  goofy: "peach",
  smooth: "rose",
  nerdy: "peach",
};

const FACES: Record<Face, React.ComponentType<{ size?: number }>> = {
  flirty: FaceFlirty,
  privacy: FacePrivacy,
  spark: FaceSpark,
  dry: FaceDry,
  goofy: FaceGoofy,
  smooth: FaceSmooth,
  nerdy: FaceNerdy,
};

export function Blob({
  face,
  hue,
  size = 188,
  glow = true,
  breathing = true,
}: Props) {
  const h = hue ?? DEFAULT_HUE[face];
  const fill = colors[h]; // lilac / rose / peach
  const glowColor = colors[`${h}Glow` as const];
  const Face = FACES[face];

  const circle = size * 0.7;
  const glowSize = size * 1.6;
  const faceSize = circle; // line-art baked at 188 viewBox scales to the circle

  // Lively idle: a spring pop-in, then a gentle bob + breathe + subtle tilt-wobble.
  const intro = useSharedValue(0);
  const breath = useSharedValue(0);
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  useEffect(() => {
    intro.value = withDelay(60, withSpring(1, { damping: 10, stiffness: 140, mass: 0.7 }));
    if (!breathing) return;
    breath.value = withRepeat(withTiming(1, { duration: 2400 }), -1, true);
    bob.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
    tilt.value = withRepeat(withTiming(1, { duration: 3200 }), -1, true);
  }, [intro, breath, bob, tilt, breathing]);
  const a = useAnimatedStyle(() => {
    const introScale = 0.84 + intro.value * 0.16;
    const breatheScale = 1 + breath.value * 0.05;
    return {
      opacity: intro.value,
      transform: [
        { translateY: bob.value * -8 },
        { rotate: `${(tilt.value - 0.5) * 6}deg` },
        { scale: introScale * breatheScale },
      ],
    };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {glow ? (
        <Svg
          width={glowSize}
          height={glowSize}
          style={[styles.glow, { width: glowSize, height: glowSize }]}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id={`blobGlow-${face}-${h}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={glowColor} stopOpacity={1} />
              <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={glowSize}
            height={glowSize}
            fill={`url(#blobGlow-${face}-${h})`}
          />
        </Svg>
      ) : null}

      <Animated.View
        style={[
          a,
          styles.head,
          { width: circle, height: circle, borderRadius: radius.pill, backgroundColor: fill },
        ]}
      >
        <Face size={faceSize} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  head: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
