import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { haptic, PressableScale } from "../lib/motion";
import { colors, radius, shadow, space, type } from "../lib/theme";
import type { HuruMeta } from "../lib/types";

type Props = {
  receipt?: HuruMeta | null;
  memoryRootHash?: string | null;
  compact?: boolean;
};

function short(value?: string | null): string {
  if (!value) return "pending";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function ZeroGReceipt({ receipt, memoryRootHash, compact }: Props) {
  const [open, setOpen] = useState(false);
  const verified = Boolean(receipt?.verified && receipt.verification_mode === "tee");
  const label = verified ? "Verified Private" : receipt ? "Private Compute" : "Offline Preview";
  const tone = verified ? colors.mint : colors.lilac;

  const rows = useMemo(
    () => [
      ["Compute", verified ? "TEE verified on 0G" : receipt ? "0G routed" : "local preview"],
      ["Request", short(receipt?.request_id)],
      ["Provider", short(receipt?.provider)],
      ["Credits", String(receipt?.credits_used ?? 0)],
      ["Memory", memoryRootHash ? "Encrypted on 0G Storage" : "Ready when memory syncs"],
      ["Root", short(memoryRootHash ?? receipt?.storage_root_hash)],
    ],
    [memoryRootHash, receipt?.credits_used, receipt?.provider, receipt?.request_id, receipt?.storage_root_hash, verified],
  );

  const copy = async () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    await Clipboard.setStringAsync(text);
    haptic("success");
  };

  return (
    <>
      <PressableScale
        onPress={() => {
          haptic("light");
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="View 0G receipt"
        style={[styles.badge, compact && styles.badgeCompact]}
      >
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <Text style={styles.badgeText}>{label}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.faint} />
      </PressableScale>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close receipt"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <View>
                <Text style={styles.kicker}>0G RECEIPT</Text>
                <Text style={styles.title}>{label}</Text>
              </View>
              <PressableScale
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                style={styles.close}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </PressableScale>
            </View>

            <View style={styles.rows}>
              {rows.map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.rowKey}>{k}</Text>
                  <Text style={styles.rowValue} numberOfLines={2}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.copyRow}>
              <PressableScale
                onPress={copy}
                hkind="medium"
                accessibilityRole="button"
                accessibilityLabel="Copy receipt"
                style={styles.copy}
              >
                <Ionicons name="copy-outline" size={16} color={colors.ink} />
                <Text style={styles.copyText}>Copy receipt</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  badgeCompact: {
    alignSelf: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { ...type.footnote, color: colors.text, fontWeight: "700" },
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  sheet: {
    margin: space.md,
    backgroundColor: colors.sheet,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.lg,
    ...shadow.card,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.md,
  },
  kicker: { ...type.meta, color: colors.mint },
  title: { ...type.title3, color: colors.text, marginTop: 2 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chip,
  },
  rows: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowKey: { ...type.meta, color: colors.muted },
  rowValue: { ...type.footnote, color: colors.text, flex: 1, textAlign: "right" },
  copyRow: { flexDirection: "row" },
  copy: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  copyText: { ...type.bodyMed, color: colors.ink, fontWeight: "800" },
});
