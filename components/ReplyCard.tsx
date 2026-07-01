import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { cancelAnimation, Easing } from "react-native-reanimated";

import {
  Animated,
  FadeInDown,
  LinearTransition,
  PressableScale,
  SheenOverlay,
  SPRING,
  ZoomIn,
  haptic,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "../lib/motion";
import { colors, font, radius, shadow, space, type } from "../lib/theme";
import type { Reply } from "../lib/types";

export function ReplyCard({
  reply,
  index = 0,
  onRegenerate,
  onShare,
  regenerating,
}: {
  reply: Reply;
  index?: number;
  onRegenerate?: () => void;
  onShare?: () => void;
  regenerating?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // card gives a confident little pop on copy
  const pop = useSharedValue(1);
  // pink fill sweeping up over the white primary pill (0 → 1)
  const fill = useSharedValue(0);
  // one-shot sheen that sweeps across the pill on copy
  const sheen = useSharedValue(-1);
  // continuous rotation for the regenerate icon while loading
  const spin = useSharedValue(0);

  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${sheen.value * 150}%` }, { rotate: "16deg" }],
    opacity: sheen.value > -1 && sheen.value < 1.15 ? 1 : 0,
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  // drive the spinner off the `regenerating` flag — unmistakable loading feedback
  useEffect(() => {
    if (regenerating) {
      spin.value = withRepeat(
        withTiming(1, { duration: 820, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
  }, [regenerating, spin]);

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
    },
    [],
  );

  const copy = async () => {
    await Clipboard.setStringAsync(reply.text);
    haptic("success");
    setCopied(true);

    // pill flashes pink + fills, a sheen sweeps, the card gives a satisfying pop
    fill.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
    pop.value = withSequence(
      withTiming(1.025, { duration: 110 }),
      withSpring(1, SPRING.bouncy),
    );
    sheen.value = -1;
    sheen.value = withTiming(1.25, { duration: 620, easing: Easing.out(Easing.cubic) });

    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => {
      setCopied(false);
      fill.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) });
    }, 1600);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 95)
        .duration(460)
        .springify()
        .damping(15)
        .stiffness(170)}
      layout={LinearTransition.springify().damping(18)}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        {/* signature: soft pink left-spine */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.lilacGlow, colors.emberSoft, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.spine}
        />
        <View pointerEvents="none" style={styles.topHighlight} />
        <SheenOverlay delay={index * 95 + 220} />

        <View style={styles.head}>
          <View style={styles.tagPill}>
            <View style={styles.tagDot} />
            <Text style={styles.tag}>{reply.angle.replace(/_/g, " ").toUpperCase()}</Text>
          </View>
          <Text style={styles.idx}>{String(index + 1).padStart(2, "0")}</Text>
        </View>

        <Text style={styles.text}>{reply.text}</Text>

        <View style={styles.actions}>
          <PressableScale
            onPress={copy}
            hkind="none"
            to={0.97}
            containerStyle={styles.primaryContainer}
            accessibilityRole="button"
            accessibilityLabel={copied ? "Copied to clipboard" : "Copy reply"}
            accessibilityState={{ selected: copied }}
            style={[styles.btn, styles.primary]}
          >
            {/* pink fill that sweeps up over the white pill on copy */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.primaryFill, fillStyle]}
            />
            {/* one-shot sheen that streaks across on copy */}
            <Animated.View pointerEvents="none" style={[styles.pillSheen, sheenStyle]}>
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.5)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {copied ? (
              <View style={styles.row}>
                <Animated.View entering={ZoomIn.springify().damping(11).stiffness(220)}>
                  <Ionicons name="checkmark" size={19} color={colors.ink} />
                </Animated.View>
                <Text style={styles.primaryLabel}>Copied</Text>
              </View>
            ) : (
              <View style={styles.row}>
                <Ionicons name="copy-outline" size={17} color={colors.ink} />
                <Text style={styles.primaryLabel}>Copy</Text>
              </View>
            )}
          </PressableScale>

          <PressableScale
            onPress={regenerating ? undefined : onRegenerate}
            disabled={regenerating}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel="Regenerate this reply"
            accessibilityState={{ disabled: !!regenerating, busy: !!regenerating }}
            style={[styles.btn, styles.ghost, regenerating && styles.ghostDim]}
          >
            <Animated.View style={spinStyle}>
              <Ionicons name="reload" size={19} color={regenerating ? colors.muted : colors.dim} />
            </Animated.View>
          </PressableScale>

          <PressableScale
            onPress={onShare}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel="Share as card"
            style={[styles.btn, styles.ghost]}
          >
            <Ionicons name="paper-plane-outline" size={18} color={colors.dim} />
          </PressableScale>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    paddingLeft: space.lg + 3,
    gap: space.md,
    overflow: "hidden",
    ...shadow.card,
  },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.topHi,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.emberSoft,
    borderWidth: 1,
    borderColor: colors.emberLine,
  },
  tagDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lilac },
  tag: { ...type.meta, fontSize: 11, color: colors.lilac, letterSpacing: 1 },
  idx: { ...type.meta, color: colors.faint, fontFamily: font.mono },
  text: { ...type.body, color: colors.text, fontSize: 17, lineHeight: 24 },

  actions: { flexDirection: "row", gap: space.sm, marginTop: space.xs, alignItems: "center" },
  btn: { height: 44, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },

  primaryContainer: { flex: 1 },
  primary: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  primaryFill: { backgroundColor: colors.lilac, borderRadius: radius.pill },
  pillSheen: { position: "absolute", top: -24, bottom: -24, width: 42 },
  primaryLabel: { ...type.bodyMed, color: colors.ink, fontWeight: "700" },

  ghost: {
    width: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  ghostDim: { opacity: 0.45 },
});
