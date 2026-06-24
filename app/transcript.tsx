import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { TranscriptBubble } from "../components/TranscriptBubble";
import { haptic, PressableScale } from "../lib/motion";
import { setSession, useSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { Speaker, Turn } from "../lib/types";

export default function Transcript() {
  const { conversation } = useSession();

  const lastThemIdx = (() => {
    for (let i = conversation.length - 1; i >= 0; i--)
      if (conversation[i]!.speaker === "them") return i;
    return -1;
  })();

  const update = (i: number, patch: Partial<Turn>) => {
    const next = conversation.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setSession({ conversation: next });
  };
  const flip = (i: number) =>
    update(i, {
      speaker: (conversation[i]!.speaker === "me" ? "them" : "me") as Speaker,
    });
  const del = (i: number) =>
    setSession({ conversation: conversation.filter((_, idx) => idx !== i) });
  const add = () => {
    haptic("light");
    setSession({ conversation: [...conversation, { speaker: "me", text: "" }] });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.nav}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>
          <Text style={styles.navTitle}>Check the chat</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.hint}>
          Read on your device. Tap a tag to fix who said what. Only the text goes out — in a sealed enclave.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {conversation.map((t, i) => (
            <TranscriptBubble
              key={i}
              turn={t}
              highlighted={i === lastThemIdx}
              onChange={(text) => update(i, { text })}
              onFlip={() => flip(i)}
              onDelete={() => del(i)}
            />
          ))}
          <PressableScale onPress={add} accessibilityLabel="Add a line" style={styles.add}>
            <Text style={styles.addLabel}>＋ Add a line</Text>
          </PressableScale>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Looks right →"
            onPress={() => {
              haptic("medium");
              router.push("/reveal");
            }}
            disabled={conversation.length === 0}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, height: 48 },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backGlyph: { fontSize: 28, color: colors.dim },
  navTitle: { ...type.heading, color: colors.text },
  hint: { ...type.meta, color: colors.faint, paddingHorizontal: space.xl, marginBottom: space.md },
  scroll: { padding: space.xl, paddingTop: space.sm },
  add: { paddingVertical: space.md, alignSelf: "flex-start" },
  addLabel: { ...type.bodyMed, color: colors.ember },
  footer: { padding: space.xl, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
