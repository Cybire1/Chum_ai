import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { VibePicker } from "../components/VibePicker";
import { rizzOpener } from "../lib/api";
import { haptic, PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";
import type { Opener, Vibe } from "../lib/types";

export default function Openers() {
  const [bio, setBio] = useState("");
  const [vibe, setVibe] = useState<Vibe>("playful");
  const [loading, setLoading] = useState(false);
  const [openers, setOpeners] = useState<Opener[]>([]);

  const go = async () => {
    if (!bio.trim()) {
      haptic("warning");
      return;
    }
    setLoading(true);
    try {
      const r = await rizzOpener(bio.trim(), vibe);
      setOpeners(r.openers);
      haptic("success");
    } catch {
      haptic("warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.nav}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>
          <Text style={styles.navTitle}>Openers</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Paste their bio.</Text>
            <Text style={styles.sub}>We'll anchor each opener to something real — no random pickup lines.</Text>

            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder={"bouldering • oat milk • will steal your hoodie"}
              placeholderTextColor={colors.faint}
              style={styles.area}
              accessibilityLabel="Their bio"
            />

            <Text style={styles.ctrlLabel}>VIBE</Text>
            <VibePicker value={vibe} onChange={setVibe} />

            <Button label="Get openers →" onPress={go} style={{ marginTop: space.lg }} />

            {loading ? (
              <View style={{ marginTop: space.xl, gap: space.md }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.card}>
                    <Skeleton width="100%" height={18} />
                    <Skeleton width="70%" height={18} />
                  </View>
                ))}
              </View>
            ) : null}

            {!loading && openers.length > 0 ? (
              <View style={{ marginTop: space.xl, gap: space.md }}>
                {openers.map((o) => (
                  <View key={o.id} style={styles.card}>
                    <Text style={styles.anchor}>{o.anchor.toUpperCase()}</Text>
                    <Text style={styles.text}>{o.text}</Text>
                    <View style={styles.actions}>
                      <PressableScale
                        onPress={async () => {
                          await Clipboard.setStringAsync(o.text);
                          haptic("success");
                        }}
                        accessibilityLabel="Copy opener"
                        style={[styles.btn, styles.primary]}
                      >
                        <Text style={styles.primaryLabel}>Copy</Text>
                      </PressableScale>
                      <PressableScale
                        onPress={() => Share.share({ message: o.text }).catch(() => {})}
                        accessibilityLabel="Share opener"
                        style={[styles.btn, styles.ghost]}
                      >
                        <Text style={styles.ghostLabel}>↗</Text>
                      </PressableScale>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
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
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  h1: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.dim, marginTop: space.xs, marginBottom: space.lg },
  area: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    minHeight: 90,
    color: colors.text,
    ...type.body,
    textAlignVertical: "top",
  },
  ctrlLabel: { ...type.label, color: colors.faint, marginTop: space.lg, marginBottom: space.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  anchor: { ...type.meta, color: colors.ember, letterSpacing: 1 },
  text: { ...type.body, color: colors.text, fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: "row", gap: space.sm },
  btn: { height: 42, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  primary: { flex: 1, backgroundColor: colors.ember },
  primaryLabel: { ...type.bodyMed, color: "#1A0E08", fontWeight: "700" },
  ghost: { width: 48, borderWidth: 1, borderColor: colors.border },
  ghostLabel: { ...type.heading, color: colors.dim },
});
