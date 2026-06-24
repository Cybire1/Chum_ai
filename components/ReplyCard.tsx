import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Animated,
  FadeInDown,
  LinearTransition,
  PressableScale,
  SheenOverlay,
  ZoomIn,
  haptic,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";
import { SPRING } from "../lib/motion";
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
  const pop = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const copy = async () => {
    await Clipboard.setStringAsync(reply.text);
    haptic("success");
    setCopied(true);
    pop.value = withSequence(
      withTiming(1.025, { duration: 110 }),
      withSpring(1, SPRING.bouncy),
    );
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 95).duration(460).springify().damping(15).stiffness(170)}
      layout={LinearTransition.springify().damping(18)}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <SheenOverlay delay={index * 95 + 220} />
        <View style={styles.head}>
          <Text style={styles.tag}>{reply.angle.replace(/_/g, " ").toUpperCase()}</Text>
          <Text style={styles.idx}>{String(index + 1).padStart(2, "0")}</Text>
        </View>

        <Text style={styles.text}>{reply.text}</Text>

        <View style={styles.actions}>
          <PressableScale
            onPress={copy}
            hkind="medium"
            accessibilityRole="button"
            accessibilityLabel="Copy reply"
            style={[styles.btn, styles.primary]}
          >
            {copied ? (
              <View style={styles.copiedRow}>
                <Animated.Text entering={ZoomIn.springify().damping(11)} style={styles.check}>
                  ✓
                </Animated.Text>
                <Text style={styles.primaryLabel}>Copied</Text>
              </View>
            ) : (
              <Text style={styles.primaryLabel}>Copy</Text>
            )}
          </PressableScale>

          <PressableScale
            onPress={regenerating ? undefined : onRegenerate}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel="Regenerate this reply"
            style={[styles.btn, styles.ghost, regenerating && { opacity: 0.5 }]}
          >
            <Text style={styles.ghostLabel}>{regenerating ? "…" : "↻"}</Text>
          </PressableScale>

          <PressableScale
            onPress={onShare}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel="Share as card"
            style={[styles.btn, styles.ghost]}
          >
            <Text style={styles.ghostLabel}>↗</Text>
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
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    overflow: "hidden",
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tag: { ...type.meta, color: colors.ember, letterSpacing: 1 },
  idx: { ...type.meta, color: colors.faint, fontFamily: "Menlo" },
  text: { ...type.body, color: colors.text, fontSize: 17, lineHeight: 24 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.xs },
  btn: { height: 44, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  primary: { flex: 1, backgroundColor: colors.ember },
  copiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  check: { color: "#1A0E08", fontSize: 15, fontWeight: "900" },
  primaryLabel: { ...type.bodyMed, color: "#1A0E08", fontWeight: "700" },
  ghost: { width: 48, borderWidth: 1, borderColor: colors.border },
  ghostLabel: { ...type.heading, color: colors.dim },
});
