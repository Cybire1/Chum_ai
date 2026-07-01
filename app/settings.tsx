import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { resetIdentity } from "../lib/auth";
import { forgetPrivateMemoryRemote } from "../lib/api";
import { clearFlag } from "../lib/flags";
import { authenticate, canUseLock, isLockEnabled, setLockEnabled } from "../lib/lock";
import {
  forgetPrivateMemory,
  getPrivateMemoryState,
  setPrivateMemoryEnabled,
} from "../lib/memory";
import { haptic, PressableScale } from "../lib/motion";
import { resetSession } from "../lib/store";
import { colors, radius, shadow, space, type } from "../lib/theme";

export default function Settings() {
  const [canLock, setCanLock] = useState(false);
  const [lock, setLock] = useState(false);
  const [memoryEnabled, setMemoryEnabledState] = useState(true);
  const [memoryRoot, setMemoryRoot] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCanLock(await canUseLock());
      setLock(await isLockEnabled());
      const memory = await getPrivateMemoryState();
      setMemoryEnabledState(memory.enabled);
      setMemoryRoot(memory.lastRootHash);
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

  const toggleMemory = async (next: boolean) => {
    await setPrivateMemoryEnabled(next);
    setMemoryEnabledState(next);
    haptic("light");
  };

  const forgetMemory = () => {
    Alert.alert("Forget remembered details?", "Chum will stop using saved voice, preferences, and boundaries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Forget",
        style: "destructive",
        onPress: async () => {
          await Promise.all([forgetPrivateMemory(), forgetPrivateMemoryRemote()]);
          setMemoryRoot(null);
          haptic("success");
        },
      },
    ]);
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
          await Promise.all([forgetPrivateMemory(), forgetPrivateMemoryRemote()]);
          await clearFlag("onboarded");
          router.replace("/onboarding");
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        {/* account header */}
        <View style={styles.account}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>C</Text>
          </View>
          <Text style={styles.accountName}>Chum</Text>
          <Text style={styles.accountSub}>{memoryRoot ? "Private Memory · synced" : "Private · this device"}</Text>
        </View>

        <Section title="Private Memory">
          <Row label="What Chum remembers" hint="View saved voice and boundaries" onPress={() => router.push("/memory")} />
          <Row
            label="Remember my voice"
            hint={memoryEnabled ? (memoryRoot ? "Encrypted memory active" : "Ready") : "Paused"}
            right={
              <Switch
                value={memoryEnabled}
                onValueChange={toggleMemory}
                trackColor={{ true: colors.mint, false: colors.cardHi }}
                ios_backgroundColor={colors.cardHi}
              />
            }
          />
          <Row label="Forget remembered details" onPress={forgetMemory} last />
        </Section>

        <Section title="Ownership">
          <Row label="Own Your Chum" hint="Agentic ID on 0G" onPress={() => router.push("/own")} />
          <Row label="Proof Mode" hint="0G stack receipt" onPress={() => router.push("/proof")} last />
        </Section>

        <Section title="Privacy" footer="Screenshots stay on your device. Saved memory is controlled above.">
          <Row
            label="App Lock"
            hint={canLock ? "Require Face ID to open Chum" : "No biometrics enrolled on this device"}
            right={
              <Switch
                value={lock}
                onValueChange={toggleLock}
                disabled={!canLock}
                trackColor={{ true: colors.lilac, false: colors.cardHi }}
                ios_backgroundColor={colors.cardHi}
              />
            }
          />
          <Row label="Delete all local sessions" onPress={deleteSessions} last />
        </Section>

        <Section title="Account">
          <Row label="Restore purchases" onPress={() => Alert.alert("Restore", "No active purchases found.")} />
          <Row
            label="Contact support"
            onPress={() => Linking.openURL("mailto:support@chumai.xyz?subject=Chum").catch(() => {})}
          />
          <Row label="Start fresh" destructive onPress={startFresh} last />
        </Section>

        <Text style={styles.version}>Chum AI · v0.1.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

function Row({
  label,
  hint,
  right,
  onPress,
  destructive,
  last,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const inner = (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, destructive && { color: colors.bad }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chev}>›</Text> : null)}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <PressableScale onPress={onPress} to={0.99} accessibilityRole="button" accessibilityLabel={label}>
          {inner}
        </PressableScale>
      ) : (
        inner
      )}
      {!last ? <View style={styles.sep} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: space.xxl },
  account: { alignItems: "center", paddingVertical: space.xl, gap: space.xs },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.emberSoft,
    borderWidth: 1,
    borderColor: colors.emberLine,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  avatarLetter: { ...type.largeTitle, color: colors.lilac },
  accountName: { ...type.title3, color: colors.text },
  accountSub: { ...type.footnote, color: colors.muted },
  section: { marginTop: space.xl, paddingHorizontal: space.lg },
  sectionTitle: { ...type.meta, color: colors.muted, marginLeft: space.md, marginBottom: space.sm, letterSpacing: 0.5 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, overflow: "hidden", ...shadow.soft },
  row: { minHeight: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.md },
  rowLabel: { ...type.body, color: colors.text },
  rowHint: { ...type.footnote, color: colors.muted, marginTop: 2 },
  chev: { fontSize: 22, color: colors.faint, fontWeight: "400" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space.lg },
  footer: { ...type.footnote, color: colors.muted, marginTop: space.sm, marginHorizontal: space.md, lineHeight: 17 },
  version: { ...type.footnote, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
