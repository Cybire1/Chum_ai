import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { verdictLabel, verdictTone } from "../lib/format";
import { PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";
import type { DecodeResponse } from "../lib/types";

const toneColor = { good: colors.good, warn: colors.warn, bad: colors.bad };

export function DecodeCard({
  data,
  onShare,
  onDraft,
}: {
  data: DecodeResponse;
  onShare?: () => void;
  onDraft?: () => void;
}) {
  const tone = verdictTone[data.verdict];
  const c = toneColor[tone];
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>THE READ</Text>
      <Text style={[styles.verdict, { color: c }]}>{verdictLabel[data.verdict]}</Text>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.max(6, Math.min(100, data.confidence))}%`, backgroundColor: c },
          ]}
        />
      </View>
      <Text style={styles.conf}>{data.confidence}% confidence</Text>

      <View style={styles.section}>
        {data.evidence.map((e, i) => (
          <View key={i} style={styles.evRow}>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.ev}>{e}</Text>
          </View>
        ))}
      </View>

      <View style={styles.move}>
        <Text style={styles.moveLabel}>YOUR MOVE</Text>
        <Text style={styles.moveText}>{data.suggested_move}</Text>
      </View>

      <View style={styles.actions}>
        <PressableScale
          onPress={onDraft}
          hkind="medium"
          accessibilityRole="button"
          accessibilityLabel="Draft a reply"
          style={[styles.btn, styles.primary]}
        >
          <Text style={styles.primaryLabel}>Draft the reply →</Text>
        </PressableScale>
        <PressableScale
          onPress={onShare}
          hkind="light"
          accessibilityRole="button"
          accessibilityLabel="Share this read"
          style={[styles.btn, styles.ghost]}
        >
          <Text style={styles.ghostLabel}>↗</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    gap: space.sm,
  },
  eyebrow: { ...type.meta, color: colors.faint, letterSpacing: 1.5 },
  verdict: { ...type.title, fontSize: 26, marginBottom: space.sm },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cardHi, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  conf: { ...type.meta, color: colors.muted, marginTop: 4 },
  section: { marginTop: space.md, gap: space.xs },
  evRow: { flexDirection: "row", gap: space.sm },
  dot: { color: colors.ember, ...type.body },
  ev: { ...type.body, color: colors.dim, flex: 1, lineHeight: 21 },
  move: {
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 4,
  },
  moveLabel: { ...type.meta, color: colors.ember, letterSpacing: 1 },
  moveText: { ...type.body, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  btn: { height: 48, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  primary: { flex: 1, backgroundColor: colors.ember },
  primaryLabel: { ...type.bodyMed, color: "#1A0E08", fontWeight: "700" },
  ghost: { width: 52, borderWidth: 1, borderColor: colors.border },
  ghostLabel: { ...type.heading, color: colors.dim },
});
