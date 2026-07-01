import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { ZeroGReceipt } from "../components/ZeroGReceipt";
import { getAgenticId, ownChum } from "../lib/api";
import { haptic, PressableScale } from "../lib/motion";
import { getSession } from "../lib/store";
import { colors, radius, shadow, space, type } from "../lib/theme";
import type { AgenticIdRecord } from "../lib/types";

function short(value?: string | null): string {
  if (!value) return "pending";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function OwnChum() {
  const [agent, setAgent] = useState<AgenticIdRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgent(await getAgenticId());
    } catch {
      setError("Ownership is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setMinting(true);
    setError(null);
    try {
      const persona = getSession().persona ?? "smooth";
      const next = await ownChum({ persona, displayName: "My Chum" });
      setAgent(next);
      haptic(next.status === "owned" ? "success" : "warning");
    } catch {
      setError("Could not create your Chum ID yet.");
      haptic("warning");
    } finally {
      setMinting(false);
    }
  };

  const copy = async (value?: string | null) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    haptic("success");
  };

  const owned = agent?.status === "owned";

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.iconWrap, owned && { backgroundColor: colors.mint }]}>
            <Ionicons name={owned ? "checkmark" : "finger-print"} size={22} color={colors.ink} />
          </View>
          <Text style={styles.title}>Own Your Chum</Text>
          <Text style={styles.sub}>
            Your voice and private memory become a portable agent you control.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statusCard}>
          <Text style={styles.kicker}>{owned ? "OWNED ON 0G" : loading ? "CHECKING" : "READY"}</Text>
          <Text style={styles.statusTitle}>
            {owned ? `Chum #${agent?.token_id}` : agent?.setup_reason ? "Contract setup needed" : "Create your Chum ID"}
          </Text>
          <Text style={styles.statusText}>
            {owned
              ? "Agent metadata is encrypted on 0G Storage and anchored to your Agentic ID."
              : "Chum will mint the identity through the relay wallet assigned to you."}
          </Text>
        </View>

        <View style={styles.rows}>
          <Row label="Token" value={agent?.token_id ? `#${agent.token_id}` : "not minted"} onCopy={() => copy(agent?.token_id)} />
          <Row label="Owner" value={short(agent?.owner_address)} onCopy={() => copy(agent?.owner_address)} />
          <Row label="Contract" value={short(agent?.contract_address)} onCopy={() => copy(agent?.contract_address)} />
          <Row label="Metadata" value={short(agent?.metadata_root_hash)} onCopy={() => copy(agent?.metadata_root_hash)} />
          <Row label="Memory" value={short(agent?.memory_root_hash)} onCopy={() => copy(agent?.memory_root_hash)} last />
        </View>

        <View style={styles.actions}>
          <Button
            label={owned ? "Refresh ownership" : "Create my Chum ID"}
            onPress={owned ? load : create}
            loading={loading || minting}
          />
          {owned ? (
            <Button label="Update from memory" variant="ghost" onPress={create} loading={minting} />
          ) : null}
          {agent?.explorer_url ? (
            <PressableScale
              onPress={() => Linking.openURL(agent.explorer_url!).catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel="Open transaction"
              style={styles.explorer}
            >
              <Ionicons name="open-outline" size={16} color={colors.text} />
              <Text style={styles.explorerText}>Open transaction</Text>
            </PressableScale>
          ) : null}
        </View>

        <ZeroGReceipt receipt={agent?.huru ?? null} memoryRootHash={agent?.memory_root_hash ?? agent?.metadata_root_hash} />
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  onCopy,
  last,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  last?: boolean;
}) {
  return (
    <PressableScale onPress={onCopy} accessibilityRole="button" accessibilityLabel={`Copy ${label}`} to={0.99}>
      <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      </View>
    </PressableScale>
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
    backgroundColor: colors.lilac,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...type.largeTitle, color: colors.text },
  sub: { ...type.body, color: colors.dim, maxWidth: 330 },
  error: { ...type.footnote, color: colors.bad },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.sm,
    ...shadow.soft,
  },
  kicker: { ...type.meta, color: colors.mint },
  statusTitle: { ...type.title3, color: colors.text },
  statusText: { ...type.body, color: colors.dim },
  rows: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowLabel: { ...type.footnote, color: colors.muted },
  rowValue: { ...type.footnote, color: colors.text, flex: 1, textAlign: "right" },
  actions: { gap: space.md },
  explorer: {
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
  },
  explorerText: { ...type.bodyMed, color: colors.text, fontWeight: "700" },
});
