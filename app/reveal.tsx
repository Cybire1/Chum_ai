import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { ReplyCard } from "../components/ReplyCard";
import { Skeleton } from "../components/Skeleton";
import { SpiceSlider } from "../components/SpiceSlider";
import { VibePicker } from "../components/VibePicker";
import { ZeroGReceipt } from "../components/ZeroGReceipt";
import { ApiError, describeApiError, rizzReply } from "../lib/api";
import { isEntitled, loadEntitlement, subscribeEntitlement } from "../lib/entitlement";
import { getPrivateMemoryState } from "../lib/memory";
import { Animated, FadeIn, haptic, PressableScale, ThinkingDots } from "../lib/motion";
import { getSession, setSession, useSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { Reply, Vibe } from "../lib/types";

export default function Reveal() {
  const { conversation, vibe, spice, replies, lastReceipt } = useSession();
  const [loading, setLoading] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(isEntitled());
  const [memoryRoot, setMemoryRoot] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    loadEntitlement().then(setEntitled);
    getPrivateMemoryState().then((s) => setMemoryRoot(s.lastRootHash)).catch(() => {});
    return subscribeEntitlement(() => setEntitled(isEntitled()));
  }, []);

  // Read the latest session at call time so this stays stable (no stale closure).
  const fetchReplies = useCallback(async (over?: { vibe?: Vibe; spice?: 1 | 2 | 3 }) => {
    if (busy.current) return;
    const s = getSession();
    if (s.conversation.length === 0) {
      setError("Paste a conversation first.");
      return;
    }
    busy.current = true;
    setError(null);
    setLoading(true);
    try {
      const r = await rizzReply({
        conversation: s.conversation,
        context_note: s.contextNote || undefined,
        vibe: over?.vibe ?? s.vibe,
        spice: over?.spice ?? s.spice,
        persona: s.persona,
      });
      setSession({ replies: r.replies, lastReceipt: r.huru });
      haptic("success");
    } catch (e) {
      if (e instanceof ApiError && e.code === "insufficient_credits") {
        router.push("/paywall");
      } else {
        setError(describeApiError(e, "Couldn't reach the wingman. Tap to try again."));
        haptic("warning");
      }
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, []);

  // Auto-generate the moment we land here — and again after an edit clears the set.
  useFocusEffect(
    useCallback(() => {
      const s = getSession();
      if (s.replies.length === 0 && s.conversation.length > 0) fetchReplies();
    }, [fetchReplies]),
  );

  const onVibe = (v: Vibe) => {
    setSession({ vibe: v });
    haptic("light");
    fetchReplies({ vibe: v });
  };
  const onSpice = (s: 1 | 2 | 3) => {
    setSession({ spice: s });
    fetchReplies({ spice: s });
  };

  const regenerate = async (id: string) => {
    setRegenId(id);
    try {
      const s = getSession();
      const r = await rizzReply({
        conversation: s.conversation,
        context_note: s.contextNote || undefined,
        vibe: s.vibe,
        spice: s.spice,
        persona: s.persona,
        exclude_ids: s.replies.map((x) => x.id),
        regenerate: true,
      });
      const fresh = r.replies[0];
      if (fresh) {
        setSession({
          replies: s.replies.map((x) => (x.id === id ? { ...fresh, id } : x)),
          lastReceipt: r.huru,
        });
        haptic("success");
      }
    } catch (e) {
      setError(describeApiError(e, "Couldn't regenerate that reply. Tap to try again."));
      haptic("warning");
    } finally {
      setRegenId(null);
    }
  };

  const share = async (reply: Reply) => {
    try {
      await Share.share({ message: `${reply.text}\n\n— drafted with Chum` });
    } catch {
      // cancelled
    }
  };

  const editMessages = () => {
    haptic("light");
    router.push("/transcript");
  };

  const lastThem = (() => {
    for (let i = conversation.length - 1; i >= 0; i--) {
      if (conversation[i]?.speaker === "them") return conversation[i]!.text;
    }
    return conversation.at(-1)?.text ?? "";
  })();

  const hasReplies = replies.length > 0;
  const locked = !entitled;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* what we're replying to — with the optional edit escape hatch */}
          {lastThem ? (
            <View style={styles.ctx}>
              <View style={styles.ctxHead}>
                <Text style={styles.ctxLabel}>REPLYING TO</Text>
                <PressableScale onPress={editMessages} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit the messages">
                  <View style={styles.editLink}>
                    <Ionicons name="create-outline" size={14} color={colors.rose} />
                    <Text style={styles.editLinkText}>Edit</Text>
                  </View>
                </PressableScale>
              </View>
              <Text style={styles.ctxText} numberOfLines={3}>
                {lastThem}
              </Text>
            </View>
          ) : null}

          {loading && !hasReplies ? (
            <Animated.View entering={FadeIn.duration(280)} style={{ gap: space.md }}>
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

          {error && !hasReplies ? (
            <PressableScale onPress={() => fetchReplies()} style={styles.errBox} accessibilityRole="button" accessibilityLabel="Retry">
              <Text style={styles.error}>{error}</Text>
            </PressableScale>
          ) : null}

          {hasReplies ? (
            <View style={{ gap: space.md }}>
              {replies.map((r, i) => {
                const blurred = locked && i > 0;
                return (
                  <View key={r.id} style={blurred ? styles.lockedWrap : undefined} pointerEvents={blurred ? "none" : "auto"}>
                    <ReplyCard
                      reply={blurred ? { ...r, text: "•••••• •••• ••••• •••••• ••••" } : r}
                      index={i}
                      regenerating={regenId === r.id}
                      onRegenerate={() => regenerate(r.id)}
                      onShare={() => share(r)}
                    />
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
                  <Text style={styles.unlockLabel}>Unlock the sharper options</Text>
                  <Text style={styles.unlockHint}>{replies.length - 1} more, plus bolder + your voice</Text>
                </PressableScale>
              ) : null}

              <Button label="Regenerate the set" variant="ghost" onPress={() => fetchReplies()} loading={loading} style={{ marginTop: space.xs }} />
              <ZeroGReceipt receipt={lastReceipt} memoryRootHash={memoryRoot} />
            </View>
          ) : null}

          {/* inline tuning — tweak and it re-rolls instantly. never gates the first set. */}
          {hasReplies ? (
            <View style={[styles.tune, loading && { opacity: 0.5 }]} pointerEvents={loading ? "none" : "auto"}>
              <Text style={styles.tuneTitle}>Not quite? Tune it.</Text>
              <Text style={styles.ctrlLabel}>VIBE</Text>
              <VibePicker value={vibe} onChange={onVibe} />
              <Text style={[styles.ctrlLabel, { marginTop: space.md }]}>SPICE</Text>
              <SpiceSlider value={spice} onChange={onSpice} />
            </View>
          ) : null}

          <Text style={styles.trust}>Private by default · memory only when you allow it</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  ctx: {
    backgroundColor: colors.well,
    borderRadius: radius.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.rose,
    padding: space.lg,
    marginBottom: space.lg,
  },
  ctxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ctxLabel: { ...type.meta, color: colors.dim, letterSpacing: 0.5 },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  editLinkText: { ...type.footnote, color: colors.rose, fontWeight: "600" },
  ctxText: { ...type.body, color: colors.text },
  thinkingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md, marginBottom: space.xs },
  loadingLine: { ...type.meta, color: colors.dim },
  skelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.sm,
  },
  errBox: { padding: space.lg, alignItems: "center" },
  error: { ...type.body, color: colors.bad, textAlign: "center" },
  lockedWrap: { opacity: 0.35 },
  unlock: {
    backgroundColor: colors.roseTint,
    borderColor: colors.rose,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    gap: 2,
  },
  unlockLabel: { ...type.heading, color: colors.rose },
  unlockHint: { ...type.meta, color: colors.dim },
  tune: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  tuneTitle: { ...type.heading, color: colors.text, marginBottom: space.md },
  ctrlLabel: { ...type.label, color: colors.faint, marginBottom: space.sm },
  trust: { ...type.meta, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
