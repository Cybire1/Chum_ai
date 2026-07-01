import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { ZeroGReceipt } from "../components/ZeroGReceipt";
import { getAgenticId, getPrivateMemoryRemote } from "../lib/api";
import { colors, radius, space, type } from "../lib/theme";
import type { AgenticIdRecord, HuruMeta, PrivateMemoryResponse } from "../lib/types";

function short(value?: string | null): string {
  if (!value) return "missing";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function ProofMode() {
  const [memory, setMemory] = useState<PrivateMemoryResponse | null>(null);
  const [agent, setAgent] = useState<AgenticIdRecord | null>(null);
  const [receipt, setReceipt] = useState<HuruMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([getPrivateMemoryRemote(), getAgenticId()]);
      setMemory(m);
      setAgent(a);
      setReceipt(a.huru ?? m.huru ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.root}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Proof Mode</Text>
        <Text style={styles.sub}>The user experience hides this. The stack does not.</Text>

        <Layer
          icon="hardware-chip"
          title="0G Compute"
          status={receipt?.verified ? "TEE verified" : receipt ? "routed" : "pending"}
          detail={`request ${short(receipt?.request_id)} · provider ${short(receipt?.provider)}`}
          active={Boolean(receipt)}
        />
        <Layer
          icon="file-tray-stacked"
          title="Encrypted 0G Storage"
          status={memory?.root_hash ? "active" : "waiting"}
          detail={`memory root ${short(memory?.root_hash)}`}
          active={Boolean(memory?.root_hash)}
        />
        <Layer
          icon="git-branch"
          title="0G KV"
          status={memory?.root_hash ? "latest pointer set" : "waiting"}
          detail="Chum resolves the latest encrypted memory through KV"
          active={Boolean(memory?.root_hash)}
        />
        <Layer
          icon="finger-print"
          title="Agentic ID"
          status={agent?.status === "owned" ? `token #${agent.token_id}` : "setup required"}
          detail={`contract ${short(agent?.contract_address)} · metadata ${short(agent?.metadata_root_hash)}`}
          active={agent?.status === "owned"}
        />

        <Button label={loading ? "Refreshing..." : "Refresh proof"} onPress={load} loading={loading} />
        <ZeroGReceipt receipt={receipt} memoryRootHash={agent?.memory_root_hash ?? memory?.root_hash ?? null} />
      </ScrollView>
    </View>
  );
}

function Layer({
  icon,
  title,
  status,
  detail,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  status: string;
  detail: string;
  active: boolean;
}) {
  return (
    <View style={[styles.layer, active && styles.layerActive]}>
      <View style={styles.layerIcon}>
        <Ionicons name={icon} size={18} color={active ? colors.mint : colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.layerHead}>
          <Text style={styles.layerTitle}>{title}</Text>
          <Text style={[styles.status, active && { color: colors.mint }]}>{status}</Text>
        </View>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl, gap: space.md },
  title: { ...type.largeTitle, color: colors.text },
  sub: { ...type.body, color: colors.dim, marginBottom: space.sm },
  layer: {
    flexDirection: "row",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
  },
  layerActive: { borderColor: "rgba(95,224,174,0.35)" },
  layerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.well,
  },
  layerHead: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  layerTitle: { ...type.heading, color: colors.text },
  status: { ...type.meta, color: colors.muted, textAlign: "right" },
  detail: { ...type.footnote, color: colors.dim, marginTop: 4 },
});
