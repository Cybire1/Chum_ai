import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { seen } from "../lib/flags";
import { FadeInDown, haptic, PressableScale } from "../lib/motion";
import { OCR_AVAILABLE, parseConversation, pickScreenshots } from "../lib/ocr";
import { resetSession, setSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";

const SAMPLE = `them: haha you actually climb? prove it
me: my gym shoes have seen things`;

export default function Home() {
  const [checked, setChecked] = useState(false);
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!(await seen("onboarded"))) {
        router.replace("/onboarding");
        return;
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return <View style={styles.root} />;

  const onPick = async () => {
    const uris = await pickScreenshots();
    if (uris.length) setShots(uris);
    if (uris.length && !OCR_AVAILABLE) haptic("warning");
  };

  const go = () => {
    const conversation = parseConversation(raw);
    if (conversation.length === 0) {
      setErr("Type or paste the messages first — or tap “Try a sample”.");
      haptic("warning");
      return;
    }
    setErr(null);
    resetSession();
    setSession({ conversation, contextNote: note.trim() });
    haptic("medium");
    router.push("/transcript");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.emberSoft, "transparent"]}
        style={styles.glow}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.brand}>Chum</Text>
              <PressableScale
                onPress={() => router.push("/settings")}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.gear}
              >
                <Text style={styles.gearGlyph}>⚙</Text>
              </PressableScale>
            </View>

            <Text style={styles.h1}>Drop the convo.</Text>
            <Text style={styles.sub}>
              Get back three replies that actually land — in your voice.
            </Text>

            <PressableScale
              onPress={onPick}
              hkind="light"
              entering={FadeInDown.delay(40).springify().damping(15).stiffness(160)}
              accessibilityRole="button"
              accessibilityLabel="Pick screenshots"
              style={styles.pick}
            >
              {shots.length === 0 ? (
                <Text style={styles.pickGlyph}>＋</Text>
              ) : (
                <View style={styles.shotRow}>
                  {shots.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.shot} resizeMode="cover" />
                  ))}
                </View>
              )}
              <Text style={styles.pickLabel}>
                {shots.length
                  ? `${shots.length} screenshot${shots.length > 1 ? "s" : ""} selected · tap to change`
                  : "Add screenshots"}
              </Text>
              <Text style={styles.pickHint}>
                {OCR_AVAILABLE
                  ? "Read on your device — they never leave your phone."
                  : "On-device reading coming soon — paste the messages below for now."}
              </Text>
            </PressableScale>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>OR PASTE THE MESSAGES</Text>
              <PressableScale
                onPress={() => {
                  setRaw(SAMPLE);
                  setErr(null);
                  haptic("light");
                }}
                accessibilityRole="button"
                accessibilityLabel="Use a sample conversation"
              >
                <Text style={styles.sampleLink}>Try a sample</Text>
              </PressableScale>
            </View>
            <TextInput
              value={raw}
              onChangeText={(t) => {
                setRaw(t);
                if (err) setErr(null);
              }}
              multiline
              placeholder={"them: haha prove it\nme: i mean my gym shoes have seen things"}
              placeholderTextColor={colors.faint}
              style={styles.area}
              accessibilityLabel="Paste the conversation"
            />

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional: where you met, their vibe, your goal…"
              placeholderTextColor={colors.faint}
              style={styles.note}
              accessibilityLabel="Context note"
            />

            <Button label="Get my replies →" onPress={go} style={{ marginTop: space.lg }} />
            {err ? <Text style={styles.errText}>{err}</Text> : null}

            <View style={styles.altRow}>
              <Alt index={0} label="Decode" hint="what do they mean?" onPress={() => goAlt(raw, note, "/decode")} />
              <Alt index={1} label="Openers" hint="from their bio" onPress={() => router.push("/openers")} />
            </View>

            <Text style={styles.trust}>🔒 Sealed enclave · nothing stored</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function goAlt(raw: string, note: string, path: "/decode") {
  const conversation = parseConversation(raw);
  if (conversation.length === 0) {
    haptic("warning");
    return;
  }
  resetSession();
  setSession({ conversation, contextNote: note.trim() });
  haptic("medium");
  router.push(path);
}

function Alt({
  label,
  hint,
  onPress,
  index = 0,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  index?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      hkind="light"
      entering={FadeInDown.delay(120 + index * 70).springify().damping(15)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.alt}
    >
      <Text style={styles.altLabel}>{label}</Text>
      <Text style={styles.altHint}>{hint}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
  scroll: { padding: space.xl, paddingBottom: space.xxl, gap: space.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { ...type.title, color: colors.text, letterSpacing: -0.5 },
  gear: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  gearGlyph: { fontSize: 18, color: colors.muted },
  h1: { ...type.hero, color: colors.text, marginTop: space.lg },
  sub: { ...type.body, color: colors.dim, fontSize: 16, marginTop: space.xs, marginBottom: space.lg },
  pick: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: space.xl,
    alignItems: "center",
    gap: 6,
  },
  pickGlyph: { fontSize: 28, color: colors.ember },
  shotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.sm,
    marginBottom: space.sm,
  },
  shot: { width: 58, height: 104, borderRadius: radius.sm, backgroundColor: colors.cardHi },
  pickLabel: { ...type.heading, color: colors.text },
  pickHint: { ...type.meta, color: colors.faint, textAlign: "center" },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  fieldLabel: { ...type.label, color: colors.faint },
  sampleLink: { ...type.meta, color: colors.ember },
  errText: { ...type.meta, color: colors.bad, textAlign: "center", marginTop: space.md },
  area: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    minHeight: 110,
    color: colors.text,
    ...type.body,
    textAlignVertical: "top",
  },
  note: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    color: colors.text,
    ...type.body,
    marginTop: space.sm,
  },
  altRow: { flexDirection: "row", gap: space.md, marginTop: space.lg },
  alt: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 2,
  },
  altLabel: { ...type.heading, color: colors.text },
  altHint: { ...type.meta, color: colors.faint },
  trust: { ...type.meta, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
