import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, radius as RADII } from "./theme";

// ---- spring presets (premium, snappy feel) ---------------------------------
export const SPRING = {
  press: { damping: 15, stiffness: 240, mass: 0.6 },
  gentle: { damping: 18, stiffness: 150 },
  bouncy: { damping: 9, stiffness: 170, mass: 0.7 },
} as const;

// re-export the layout-animation primitives so screens import from one place
export { Animated, FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition, ZoomIn };

type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "none";

export function haptic(kind: HapticKind = "light") {
  if (kind === "none") return;
  try {
    if (kind === "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === "warning")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else
      Haptics.impactAsync(
        kind === "heavy"
          ? Haptics.ImpactFeedbackStyle.Heavy
          : kind === "medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
      );
  } catch {
    // haptics unavailable (web / simulator)
  }
}

type ScaleProps = PressableProps & {
  hkind?: HapticKind;
  to?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  entering?: React.ComponentProps<typeof Animated.View>["entering"];
  layout?: React.ComponentProps<typeof Animated.View>["layout"];
};

export function PressableScale({
  hkind = "light",
  to = 0.96,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  entering,
  layout,
  ...rest
}: ScaleProps) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPressIn={(e) => {
        s.value = withSpring(to, SPRING.press);
        haptic(hkind);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, SPRING.gentle);
        onPressOut?.(e);
      }}
      onPress={onPress}
      {...rest}
    >
      <Animated.View entering={entering} layout={layout} style={[a, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ---- staggered entrance ----------------------------------------------------
export function Appear({
  children,
  index = 0,
  delay = 0,
  from = "down",
  style,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  from?: "down" | "up";
  style?: StyleProp<ViewStyle>;
}) {
  const base = from === "up" ? FadeInUp : FadeInDown;
  const entering = base
    .delay(delay + index * 60)
    .duration(440)
    .springify()
    .damping(16)
    .stiffness(150);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

// ---- moving sheen / shimmer ------------------------------------------------
export function Shimmer({
  width = "100%",
  height = 16,
  radius = RADII.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [x]);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 100}%` }],
  }));
  return (
    <View
      style={[
        { width, height, borderRadius: radius, overflow: "hidden", backgroundColor: colors.cardHi },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, a]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// one-shot sheen sweep across a card on mount (premium reveal accent)
export function SheenOverlay({ delay = 0 }: { delay?: number }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withDelay(delay, withTiming(1.4, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [x, delay]);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 100}%` }, { rotate: "12deg" }],
    opacity: x.value > 0 && x.value < 1.2 ? 1 : 0,
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: RADII.lg }]}>
      <Animated.View style={[{ position: "absolute", top: -20, bottom: -20, width: 60 }, a]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ---- thinking dots ---------------------------------------------------------
function Dot({ index }: { index: number }) {
  const o = useSharedValue(0.3);
  const y = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(
      index * 160,
      withRepeat(withTiming(1, { duration: 480, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    y.value = withDelay(
      index * 160,
      withRepeat(withTiming(-3, { duration: 480, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [o, y, index]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ember }, a]}
    />
  );
}

export function ThinkingDots() {
  return (
    <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} />
      ))}
    </View>
  );
}

// ---- breathing dot (live indicator) ---------------------------------------
export function LiveDot({ color = colors.good, size = 8 }: { color?: string; size?: number }) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withTiming(1.35, { duration: 950, easing: Easing.inOut(Easing.ease) }), -1, true);
    o.value = withRepeat(withTiming(0.3, { duration: 950, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [s, o]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color }, a]}
      />
      <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

export { withDelay, withRepeat, withSequence, withSpring, withTiming, useSharedValue, useAnimatedStyle };
