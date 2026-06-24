import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { setEntitled } from "../lib/entitlement";
import { haptic, PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";

type Plan = "annual" | "weekly";

const PLANS: Record<
  Plan,
  { label: string; price: string; sub: string; badge?: string }
> = {
  annual: { label: "Annual", price: "$44.99 / yr", sub: "less than 2 months of the other guys", badge: "SAVE ~80%" },
  weekly: { label: "Weekly", price: "$4.99 / wk", sub: "3-day free trial, cancel anytime" },
};

const PERKS = [
  "Unlimited replies, every vibe",
  "Bold tier + your-voice persona",
  "Decode + openers, unlimited",
  "Sealed enclave — chats never stored",
];

export default function Paywall() {
  const [plan, setPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    // TODO: real StoreKit/RevenueCat purchase -> POST /v1/consumers/{id}/iap.
    // v0 flips entitlement locally to demo the unlocked flow.
    setBusy(true);
    haptic("success");
    await setEntitled(true);
    setBusy(false);
    router.back();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.nav}>
          <View style={{ width: 36 }} />
          <Text style={styles.navTitle}>Wing Unlimited</Text>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeGlyph}>✕</Text>
          </PressableScale>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>Send the one that lands.</Text>
          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p} style={styles.perkRow}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.perk}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            {(["annual", "weekly"] as Plan[]).map((k) => {
              const active = plan === k;
              const p = PLANS[k];
              return (
                <PressableScale
                  key={k}
                  onPress={() => setPlan(k)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.planTop}>
                      <Text style={styles.planLabel}>{p.label}</Text>
                      {p.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{p.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.planSub}>{p.sub}</Text>
                  </View>
                  <Text style={styles.planPrice}>{p.price}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={plan === "weekly" ? "Start free trial" : "Continue"}
            onPress={start}
            loading={busy}
          />
          <Text style={styles.fine}>
            Auto-renews until cancelled. One tap to cancel in Settings. No surprise charges.
          </Text>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Restore purchases" style={styles.restore}>
            <Text style={styles.restoreText}>Restore purchases</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, height: 52 },
  navTitle: { ...type.heading, color: colors.text },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeGlyph: { fontSize: 18, color: colors.muted },
  body: { flex: 1, padding: space.xl, justifyContent: "center" },
  h1: { ...type.hero, color: colors.text, marginBottom: space.xl },
  perks: { gap: space.md, marginBottom: space.xxl },
  perkRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  check: { color: colors.ember, ...type.heading },
  perk: { ...type.body, color: colors.dim, fontSize: 16 },
  plans: { gap: space.md },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: space.lg,
  },
  planActive: { borderColor: colors.ember, backgroundColor: colors.emberSoft },
  planTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  planLabel: { ...type.heading, color: colors.text },
  planSub: { ...type.meta, color: colors.muted, marginTop: 2 },
  planPrice: { ...type.heading, color: colors.text },
  badge: { backgroundColor: colors.ember, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { ...type.meta, color: "#1A0E08", fontWeight: "800", letterSpacing: 0.5 },
  footer: { padding: space.xl, gap: space.md },
  fine: { ...type.meta, color: colors.faint, textAlign: "center", lineHeight: 16 },
  restore: { alignSelf: "center", padding: space.sm },
  restoreText: { ...type.meta, color: colors.muted },
});
