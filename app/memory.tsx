import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { ZeroGReceipt } from "../components/ZeroGReceipt";
import {
  forgetPrivateMemoryRemote,
  getPrivateMemoryRemote,
} from "../lib/api";
import {
  forgetPrivateMemory,
  getPrivateMemoryState,
  rememberPrivateMemoryRoot,
} from "../lib/memory";
import { haptic, PressableScale } from "../lib/motion";
import { colors, radius, shadow, space, type } from "../lib/theme";
import type { HuruMeta, PrivateMemory } from "../lib/types";

export default function MemoryScreen() {
  const [memory, setMemory] = useState<PrivateMemory | null>(null);
  const [rootHash, setRootHash] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<HuruMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [local, remote] = await Promise.all([
        getPrivateMemoryState(),
        getPrivateMemoryRemote(),
      ]);
      setMemory(remote.memory);
      const nextRoot = remote.root_hash ?? local.lastRootHash;
      setRootHash(nextRoot);
      setReceipt(remote.huru ?? null);
      if (remote.root_hash) await rememberPrivateMemoryRoot(remote.root_hash);
    } catch {
      const local = await getPrivateMemoryState();
      setRootHash(local.lastRootHash);
      setError("Memory is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const forget = () => {
    Alert.alert("Forget remembered details?", "Chum will stop using saved voice, preferences, and boundaries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Forget",
        style: "destructive",
        onPress: async () => {
          await Promise.all([forgetPrivateMemory(), forgetPrivateMemoryRemote()]);
          setMemory(null);
          setRootHash(null);
          setReceipt(null);
          haptic("success");
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={22} color={colors.ink} />
          </View>
          <Text style={styles.title}>Private Memory</Text>
          <Text style={styles.sub}>
            Chum remembers distilled details, not full chats.
          </Text>
        </View>

        {error ? (
          <PressableScale onPress={load} accessibilityRole="button" accessibilityLabel="Retry memory" style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
          </PressableScale>
        ) : null}

        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading memory...</Text>
          </View>
        ) : memory ? (
          <View style={styles.stack}>
            <View style={styles.summary}>
              <Text style={styles.kicker}>SUMMARY</Text>
              <Text style={styles.summaryText}>{memory.summary || "No summary yet."}</Text>
            </View>
            <MemoryGroup title="Voice" items={memory.voice} icon="chatbubble-ellipses" />
            <MemoryGroup title="Preferences" items={memory.preferences} icon="heart" />
            <MemoryGroup title="Boundaries" items={memory.boundaries} icon="shield-checkmark" />
            <MemoryGroup title="Facts" items={memory.facts} icon="person-circle" />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No memory yet</Text>
            <Text style={styles.emptyText}>Use Chum once and it will save only the durable details you allow.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button label={loading ? "Refreshing..." : "Refresh"} onPress={load} loading={loading} />
          <Button label="Forget memory" variant="ghost" onPress={forget} disabled={!memory && !rootHash} />
        </View>

        <ZeroGReceipt receipt={receipt} memoryRootHash={rootHash} />
      </ScrollView>
    </View>
  );
}

function MemoryGroup({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Ionicons name={icon} size={16} color={colors.mint} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {items.length ? (
        items.map((item, i) => (
          <View key={`${title}-${i}`} style={styles.item}>
            <View style={styles.bullet} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Nothing saved here yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl, gap: space.lg },
  hero: { gap: space.sm },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...type.largeTitle, color: colors.text },
  sub: { ...type.body, color: colors.dim, maxWidth: 320 },
  stack: { gap: space.md },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.sm,
    ...shadow.soft,
  },
  kicker: { ...type.meta, color: colors.mint },
  summaryText: { ...type.body, color: colors.text, lineHeight: 24 },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.sm,
  },
  groupHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  groupTitle: { ...type.heading, color: colors.text },
  item: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
    marginTop: 8,
  },
  itemText: { ...type.body, color: colors.dim, flex: 1 },
  muted: { ...type.footnote, color: colors.muted },
  empty: {
    minHeight: 150,
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.well,
    padding: space.xl,
  },
  emptyTitle: { ...type.heading, color: colors.text },
  emptyText: { ...type.footnote, color: colors.muted, textAlign: "center" },
  actions: { gap: space.md, marginTop: space.sm },
  errorBox: {
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.roseTint,
    borderWidth: 1,
    borderColor: colors.rose,
  },
  error: { ...type.footnote, color: colors.text, textAlign: "center" },
});
