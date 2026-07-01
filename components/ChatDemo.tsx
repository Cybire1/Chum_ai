import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Animated,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "../lib/motion";
import { colors, gradients, radius, shadow, space, type } from "../lib/theme";

// Page-1 hero: a tiny live preview of the actual product — a "them" bubble,
// then three brand-tagged reply cards fanning in. Shows the magic, doesn't tell.
const REPLIES = [
  { tag: "PLAYFUL", text: "my gym shoes have seen things 🧗" },
  { tag: "SMOOTH", text: "prove it? dinner first — climbing second." },
  { tag: "BOLD", text: "careful, I send harder than I flirt." },
];

export function ChatDemo() {
  // gentle float so the stack feels alive after it settles
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600 }), -1, true);
  }, [float]);
  const floatA = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * -6 }] }));

  return (
    <Animated.View
      style={[styles.wrap, floatA]}
      accessibilityLabel="Example: three suggested replies to a message"
    >
      <Animated.View
        entering={FadeInDown.delay(200).duration(420).springify().damping(15)}
        style={styles.them}
      >
        <Text style={styles.themText}>haha you actually climb? prove it</Text>
      </Animated.View>

      {REPLIES.map((r, i) => (
        <Animated.View
          key={r.text}
          entering={FadeInDown.delay(660 + i * 170).duration(440).springify().damping(14).stiffness(150)}
          style={styles.reply}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tag}
          >
            <Text style={styles.tagText}>{r.tag}</Text>
          </LinearGradient>
          <Text style={styles.replyText} numberOfLines={1}>
            {r.text}
          </Text>
          <Text style={styles.copy}>⧉</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginBottom: space.xl },
  them: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: colors.cardHi,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 6,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md + 2,
    marginBottom: space.xs,
  },
  themText: { ...type.subhead, color: colors.dim },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    ...shadow.soft,
  },
  tag: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  replyText: { ...type.subhead, color: colors.text, flex: 1 },
  copy: { fontSize: 14, color: colors.faint },
});
