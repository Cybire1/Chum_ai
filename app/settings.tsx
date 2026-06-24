import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resetIdentity } from "../lib/auth";
import { clearFlag } from "../lib/flags";
import { authenticate, canUseLock, isLockEnabled, setLockEnabled } from "../lib/lock";
import { haptic, PressableScale } from "../lib/motion";
import { resetSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";

export default function Settings() {
  const [canLock, setCanLock] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    (async () => {
      setCanLock(await canUseLock());
      setLock(await isLockEnabled());
    })();
  }, []);

  const toggleLock = async (next: boolean) => {
    if (next) {
      const ok = await authenticate("Turn on app lock");
      if (!ok) return;
    }
    await setLockEnabled(next);
    setLock(next);
    haptic("light");
  };

  const deleteSessions = () => {
    resetSession();
    haptic("success");
    Alert.alert("Done", "All local conversations cleared from this device.");
  };

  const startFresh = () => {
    Alert.alert("Start fresh?", "This clears your local identity and onboarding on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start fresh",
        style: "destructive",
        onPress: async () => {
          resetSession();
          await resetIdentity();
          await clearFlag("onboarded");
          router.replace("/onboarding");
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>Settings</Text>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeGlyph}>✕</Text>
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Section title="PRIVACY">
            <Row
              label="App lock"
              hint={canLock ? "Require Face ID to open Chum" : "No biometrics enrolled on this device"}
              right={
                <Switch
                  value={lock}
                  onValueChange={toggleLock}
                  disabled={!canLock}
                  trackColor={{ true: colors.ember, false: colors.cardHi }}
                />
              }
            />
            <Tap label="Delete all local sessions" onPress={deleteSessions} />
            <View style={styles.note}>
              <Text style={styles.noteText}>
                Chum reads your screenshots on your device and processes chats in a sealed enclave.
                Conversations are never stored — not on our servers, not anywhere.
              </Text>
            </View>
          </Section>

          <Section title="ACCOUNT">
            <Tap label="Restore purchases" onPress={() => Alert.alert("Restore", "No active purchases found.")} />
            <Tap
              label="Contact support"
              onPress={() => Linking.openURL("mailto:support@chumai.xyz?subject=Chum").catch(() => {})}
            />
            <Tap label="Start fresh" destructive onPress={startFresh} />
          </Section>

          <Text style={styles.version}>Chum · Chum AI · v0.1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, hint, right }: { label: string; hint?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Tap({ label, hint, onPress, destructive }: { label: string; hint?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, destructive && { color: colors.bad }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, height: 52 },
  navTitle: { ...type.heading, color: colors.text },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeGlyph: { fontSize: 18, color: colors.muted },
  scroll: { padding: space.xl, gap: space.xl },
  section: { gap: space.sm },
  sectionTitle: { ...type.label, color: colors.faint, marginLeft: space.xs },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowLabel: { ...type.body, color: colors.text, fontSize: 16 },
  rowHint: { ...type.meta, color: colors.faint, marginTop: 2 },
  chev: { ...type.title, color: colors.faint },
  note: { padding: space.lg },
  noteText: { ...type.meta, color: colors.muted, lineHeight: 17 },
  version: { ...type.meta, color: colors.faint, textAlign: "center" },
});
