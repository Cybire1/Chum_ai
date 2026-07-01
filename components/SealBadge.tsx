import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import {
  Animated,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "../lib/motion";
import { colors, gradients, shadow } from "../lib/theme";

// Page-2 hero: a custom padlock on the brand gradient, wrapped in radar-style
// rings that pulse outward — "sealed enclave" made tangible (no emoji).
function Ring({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2800 }), -1, false));
  }, [p, delay]);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.9 }],
    opacity: (1 - p.value) * 0.4,
  }));
  return <Animated.View style={[styles.ring, a]} />;
}

export function SealBadge() {
  return (
    <View style={styles.box}>
      <Ring delay={0} />
      <Ring delay={950} />
      <Ring delay={1900} />
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Svg width={46} height={46} viewBox="0 0 46 46">
          <Path
            d="M16 21 V16 a7 7 0 0 1 14 0 V21"
            stroke="#FFFFFF"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Rect x={12} y={20} width={22} height={17} rx={5} fill="#FFFFFF" />
          <Circle cx={23} cy={27} r={2.6} fill={colors.grad1} />
          <Rect x={21.8} y={28} width={2.4} height={5} rx={1.2} fill={colors.grad1} />
        </Svg>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 28,
  },
  ring: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.brand,
  },
});
