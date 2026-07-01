import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { markSeen } from "../lib/flags";
import { Animated, FadeIn, haptic } from "../lib/motion";
import { setName } from "../lib/profile-store";
import { setSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { Persona } from "../lib/types";

const FOCUS = ["Dating", "Gym", "Notes", "Money"];

const PERSONAS: { key: Exclude<Persona, null>; label: string }[] = [
  { key: "dry", label: "Dry" },
  { key: "goofy", label: "Goofy" },
  { key: "smooth", label: "Smooth" },
  { key: "nerdy", label: "Nerdy" },
];

const PREVIEW: Record<Exclude<Persona, null>, string> = {
  dry: "cool. I'll allow it.",
  goofy: "say less — I'm already chalking up.",
  smooth: "prove it? dinner first. then I'll show you.",
  nerdy: "V4 on a good day. bring a belay, I'll bring proof.",
};

export default function Onboarding() {
  const [name, setNameInput] = useState("");
  const [focus, setFocus] = useState("Dating");
  const [persona, setPersona] = useState<Exclude<Persona, null>>("smooth");

  const finish = async () => {
    setName(name);
    setSession({ persona });
    await markSeen("onboarded");
    haptic("success");
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Meet your{"\n"}wingman</Text>
          <Text style={styles.intro}>
            A private AI that texts like you — and helps with the rest. Tune it now, change it anytime.
          </Text>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>YOUR NAME</Text>
            <TextInput
              value={name}
              onChangeText={setNameInput}
              placeholder="What should we call you?"
              placeholderTextColor={colors.muted}
              style={styles.nameInput}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={24}
            />
          </View>

          <Group label="WHAT BRINGS YOU HERE?">
            {FOCUS.map((f) => (
              <Chip key={f} label={f} active={f === focus} onPress={() => { haptic("light"); setFocus(f); }} />
            ))}
          </Group>

          <Group label="HOW DO YOU TEXT?">
            {PERSONAS.map((p) => (
              <Chip key={p.key} label={p.label} active={p.key === persona} onPress={() => { haptic("light"); setPersona(p.key); }} />
            ))}
          </Group>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>IN YOUR VOICE</Text>
            <Animated.Text key={persona} entering={FadeIn.duration(240)} style={styles.previewText}>
              “{PREVIEW[persona]}”
            </Animated.Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={finish} style={styles.cta} accessibilityRole="button" accessibilityLabel="Get started">
            <Text style={styles.ctaTxt}>Get started</Text>
          </Pressable>
          <Text style={styles.trust}>Private by default · memory only when you allow it</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xl },
  title: { ...type.largeTitle, color: colors.text, lineHeight: 40, marginBottom: space.sm },
  intro: { ...type.body, color: colors.dim, lineHeight: 23, marginBottom: space.xl, maxWidth: 330 },
  group: { marginBottom: space.xl, gap: space.md },
  groupLabel: { ...type.label, color: colors.mint, marginLeft: space.xs },
  nameInput: {
    backgroundColor: colors.chip,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 18,
    height: 52,
    color: colors.text,
    fontSize: 16,
    fontFamily: "HankenGrotesk_500Medium",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    height: 46,
    minWidth: 46,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipActive: { backgroundColor: colors.mint, borderColor: colors.mint },
  chipText: { ...type.heading, color: colors.dim },
  chipTextActive: { color: colors.ink },
  preview: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: 6,
  },
  previewLabel: { ...type.meta, color: colors.mint, letterSpacing: 0.5 },
  previewText: { ...type.body, color: colors.text, fontStyle: "italic" },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm, gap: space.md },
  cta: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTxt: { ...type.heading, color: colors.ink, fontWeight: "800" },
  trust: { ...type.footnote, color: colors.faint, textAlign: "center" },
});
