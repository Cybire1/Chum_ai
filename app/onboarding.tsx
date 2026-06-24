import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { markSeen } from "../lib/flags";
import { FadeInDown, haptic, PressableScale } from "../lib/motion";
import { setSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { Persona } from "../lib/types";

const CARDS = [
  {
    eyebrow: "WING",
    title: "Never send a dry text again.",
    body: "Drop in the conversation. Get back the one reply that actually lands — in your voice.",
  },
  {
    eyebrow: "PRIVATE BY DESIGN",
    title: "Read on your phone.\nProcessed in a sealed enclave.",
    body: "Your screenshots never leave your device. The chat is processed in a sealed enclave and is never stored — not even by us.",
  },
];

const PERSONAS: { key: Exclude<Persona, null>; label: string; hint: string }[] = [
  { key: "dry", label: "Dry", hint: "deadpan, understated" },
  { key: "goofy", label: "Goofy", hint: "silly, fun" },
  { key: "smooth", label: "Smooth", hint: "confident, warm" },
  { key: "nerdy", label: "Nerdy", hint: "clever, specific" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Exclude<Persona, null>>("dry");
  const { width } = useWindowDimensions();
  // explicit two-column width: screen − safe-area padding (both sides) − one gap, halved.
  const cardW = Math.floor((width - space.xl * 2 - space.md) / 2);

  const finish = async () => {
    setSession({ persona });
    await markSeen("onboarded");
    haptic("success");
    router.replace("/");
  };

  const isPersona = step === CARDS.length;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.emberSoft, "transparent"]}
        style={styles.glow}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          {!isPersona ? (
            <>
              <Text style={styles.eyebrow}>{CARDS[step]!.eyebrow}</Text>
              <Text style={styles.title}>{CARDS[step]!.title}</Text>
              <Text style={styles.sub}>{CARDS[step]!.body}</Text>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>YOUR VOICE</Text>
              <Text style={styles.title}>How do you text?</Text>
              <Text style={styles.sub}>We'll write replies that sound like you. Change it anytime.</Text>
              <View style={styles.personaGrid}>
                {PERSONAS.map((p, i) => {
                  const active = p.key === persona;
                  return (
                    <PressableScale
                      key={p.key}
                      onPress={() => setPersona(p.key)}
                      entering={FadeInDown.delay(200 + i * 70).springify().damping(15).stiffness(170)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.personaCard, { width: cardW }, active && styles.personaActive]}
                    >
                      <Text
                        style={[styles.personaLabel, active && { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {p.label}
                      </Text>
                      <Text style={styles.personaHint} numberOfLines={1}>
                        {p.hint}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {[...CARDS, 0].map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <Button
            label={isPersona ? "Get started" : "Next"}
            onPress={() => (isPersona ? finish() : setStep((s) => s + 1))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
  safe: { flex: 1, padding: space.xl, justifyContent: "space-between" },
  body: { flex: 1, justifyContent: "center", gap: space.md },
  eyebrow: { ...type.label, color: colors.ember, letterSpacing: 1.5 },
  title: { ...type.hero, color: colors.text, lineHeight: 38 },
  sub: { ...type.body, color: colors.dim, fontSize: 16, lineHeight: 24, marginTop: space.sm },
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
    marginTop: space.xl,
  },
  personaCard: {
    minHeight: 88,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 4,
    justifyContent: "center",
  },
  personaActive: { borderColor: colors.emberLine, backgroundColor: colors.emberSoft },
  personaLabel: { ...type.heading, color: colors.dim },
  personaHint: { ...type.meta, color: colors.faint },
  footer: { gap: space.lg },
  dots: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cardHi },
  dotActive: { backgroundColor: colors.ember, width: 20 },
});
