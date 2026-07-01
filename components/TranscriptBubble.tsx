import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { haptic, PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";
import type { Turn } from "../lib/types";

// Editable ME/THEM bubble. Tap the speaker chip to flip attribution (the safety
// net for OCR errors, per BUILD_BRIEF.md §9).
export function TranscriptBubble({
  turn,
  highlighted,
  onChange,
  onFlip,
  onDelete,
}: {
  turn: Turn;
  highlighted?: boolean;
  onChange: (text: string) => void;
  onFlip: () => void;
  onDelete: () => void;
}) {
  const me = turn.speaker === "me";
  return (
    <View style={[styles.wrap, { alignItems: me ? "flex-end" : "flex-start" }]}>
      <View style={styles.metaRow}>
        <PressableScale
          onPress={() => {
            haptic("light");
            onFlip();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Speaker: ${me ? "you" : "them"}. Tap to flip.`}
          style={[styles.chip, me ? styles.chipMe : styles.chipThem]}
        >
          <Text style={[styles.chipLabel, me && { color: colors.lilac }]}>
            {me ? "YOU" : "THEM"}
          </Text>
        </PressableScale>
        <PressableScale
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete line"
          style={styles.del}
        >
          <Text style={styles.delLabel}>✕</Text>
        </PressableScale>
      </View>

      <View
        style={[
          styles.bubble,
          me ? styles.bubbleMe : styles.bubbleThem,
          highlighted && styles.highlight,
        ]}
      >
        <TextInput
          value={turn.text}
          onChangeText={onChange}
          multiline
          placeholder="…"
          placeholderTextColor={colors.faint}
          selectionColor={colors.lilac}
          style={styles.input}
          accessibilityLabel={`${me ? "Your" : "Their"} message`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, maxWidth: "92%" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: 4 },
  chip: {
    paddingHorizontal: space.sm,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipMe: { borderColor: colors.emberLine, backgroundColor: colors.emberSoft },
  chipThem: { borderColor: colors.hairline, backgroundColor: colors.chip },
  chipLabel: { ...type.meta, color: colors.dim, letterSpacing: 1 },
  del: { width: 22, height: 22, justifyContent: "center", alignItems: "center" },
  delLabel: { color: colors.faint, fontSize: 12 },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 1,
  },
  bubbleMe: { backgroundColor: colors.emberSoft, borderColor: colors.emberLine },
  bubbleThem: { backgroundColor: colors.cardHi, borderColor: colors.hairline },
  highlight: { borderColor: colors.lilac },
  input: { ...type.body, color: colors.text, padding: 0, minWidth: 60 },
});
