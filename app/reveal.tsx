import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { ReplyCard } from "../components/ReplyCard";
import { Skeleton } from "../components/Skeleton";
import { SpiceSlider } from "../components/SpiceSlider";
import { VibePicker } from "../components/VibePicker";
import { ApiError, rizzReply } from "../lib/api";
import {
  isEntitled,
  loadEntitlement,
  subscribeEntitlement,
} from "../lib/entitlement";
import { Animated, FadeIn, haptic, PressableScale, ThinkingDots } from "../lib/motion";
import { setSession, useSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { Reply } from "../lib/types";

export default function Reveal() {
  const session = useSession();
  const { conversation, contextNote, vibe, spice, persona, replies } = session;
  const [loading, setLoading] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(isEntitled());

  useEffect(() => {
    loadEntitlement().then(setEntitled);
    return subscribeEntitlement(() => setEntitled(isEntitled()));
  }, []);

  const fetchReplies = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await rizzReply({
        conversation,
        context_note: contextNote || undefined,
        vibe,
        spice,
        persona,
      });
      setSession({ replies: r.replies });
      haptic("success");
    } catch (e) {
      if (e instanceof ApiError && e.code === "insufficient_credits") {
        router.push("/paywall");
      } else {
        setError("Couldn't reach the wingman. Try again.");
        haptic("warning");
      }
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async (id: string) => {
    setRegenId(id);
    try {
      const r = await rizzReply({
        conversation,
        context_note: contextNote || undefined,
        vibe,
        spice,
        persona,
        exclude_ids: replies.map((x) => x.id),
        regenerate: true,
      });
      const fresh = r.replies[0];
      if (fresh) {
        setSession({
          replies: replies.map((x) => (x.id === id ? { ...fresh, id } : x)),
        });
        haptic("success");
      }
    } catch {
      haptic("warning");
    } finally {
      setRegenId(null);
    }
  };

  const share = async (reply: Reply) => {
    // TODO: render a branded, auto-anonymized share CARD (view-shot) — v0 shares text.
    try {
      await Share.share({ message: `${reply.text}\n\n— drafted with Wing` });
    } catch {
      // cancelled
    }
  };

  const hasReplies = replies.length > 0;
  const locked = !entitled;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.nav}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>
          <Text style={styles.navTitle}>Your replies</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.ctrlLabel}>VIBE</Text>
          <VibePicker value={vibe} onChange={(v) => setSession({ vibe: v })} />

          <Text style={[styles.ctrlLabel, { marginTop: space.lg }]}>SPICE</Text>
          <SpiceSlider value={spice} onChange={(s) => setSession({ spice: s })} />

          {!hasReplies && !loading ? (
            <Button
              label="Get my replies →"
              onPress={fetchReplies}
              style={{ marginTop: space.xl }}
            />
          ) : null}

          {loading ? (
            <Animated.View entering={FadeIn.duration(280)} style={{ marginTop: space.xl, gap: space.md }}>
              <View style={styles.thinkingRow}>
                <ThinkingDots />
                <Text style={styles.loadingLine}>reading the vibe…</Text>
              </View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skelCard}>
                  <Skeleton width="35%" height={10} />
                  <Skeleton width="100%" height={16} />
                  <Skeleton width="72%" height={16} />
                  <View style={{ height: 2 }} />
                  <Skeleton width="100%" height={40} rounded={radius.md} />
                </View>
              ))}
            </Animated.View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {hasReplies && !loading ? (
            <View style={{ marginTop: space.xl, gap: space.md }}>
              {replies.map((r, i) => {
                const blurred = locked && i > 0;
                return (
                  <View key={r.id}>
                    <View
                      style={blurred ? styles.lockedWrap : undefined}
                      pointerEvents={blurred ? "none" : "auto"}
                    >
                      <ReplyCard
                        reply={blurred ? { ...r, text: "•••••• •••• ••••• •••••• ••••" } : r}
                        index={i}
                        regenerating={regenId === r.id}
                        onRegenerate={() => regenerate(r.id)}
                        onShare={() => share(r)}
                      />
                    </View>
                  </View>
                );
              })}

              {locked && replies.length > 1 ? (
                <PressableScale
                  onPress={() => router.push("/paywall")}
                  hkind="medium"
                  accessibilityRole="button"
                  accessibilityLabel="Unlock all replies"
                  style={styles.unlock}
                >
                  <Text style={styles.unlockLabel}>Unlock the sharper options →</Text>
                  <Text style={styles.unlockHint}>{replies.length - 1} more, plus bolder + your voice</Text>
                </PressableScale>
              ) : null}

              <Button
                label="Regenerate the set"
                variant="ghost"
                onPress={fetchReplies}
                style={{ marginTop: space.sm }}
              />
            </View>
          ) : null}

          <Text style={styles.trust}>🔒 Processed in a sealed enclave · never stored</Text>
        </ScrollView>
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
  ctrlLabel: { ...type.label, color: colors.faint, marginBottom: space.sm },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    marginBottom: space.xs,
  },
  loadingLine: { ...type.meta, color: colors.dim },
  skelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  error: { ...type.body, color: colors.bad, marginTop: space.lg, textAlign: "center" },
  lockedWrap: { opacity: 0.35 },
  unlock: {
    backgroundColor: colors.emberSoft,
    borderColor: colors.emberLine,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    gap: 2,
  },
  unlockLabel: { ...type.heading, color: colors.ember },
  unlockHint: { ...type.meta, color: colors.dim },
  trust: { ...type.meta, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
