import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { DecodeCard } from "../components/DecodeCard";
import { Skeleton } from "../components/Skeleton";
import { ZeroGReceipt } from "../components/ZeroGReceipt";
import { describeApiError, rizzDecode } from "../lib/api";
import { verdictLabel } from "../lib/format";
import { getPrivateMemoryState } from "../lib/memory";
import { haptic } from "../lib/motion";
import { setSession, useSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { DecodeResponse } from "../lib/types";

export default function Decode() {
  const { conversation, contextNote, decode } = useSession();
  const [loading, setLoading] = useState(!decode);
  const [error, setError] = useState<string | null>(null);
  const [memoryRoot, setMemoryRoot] = useState<string | null>(null);

  const runDecode = useCallback(async () => {
    if (conversation.length === 0) {
      setError("Paste a conversation first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await rizzDecode(conversation, contextNote || undefined);
      setSession({ decode: r, lastReceipt: r.huru });
      haptic("success");
    } catch (err) {
      setError(describeApiError(err, "Couldn't read this chat. Tap to try again."));
      haptic("warning");
    } finally {
      setLoading(false);
    }
  }, [conversation, contextNote]);

  useEffect(() => {
    getPrivateMemoryState().then((s) => setMemoryRoot(s.lastRootHash)).catch(() => {});
  }, []);

  useEffect(() => {
    if (decode) return;
    runDecode();
  }, [decode, runDecode]);

  const share = async (d: DecodeResponse) => {
    try {
      await Share.share({
        message: `The read: ${verdictLabel[d.verdict]} (${d.confidence}%)\n→ ${d.suggested_move}\n\n— Chum`,
      });
    } catch {
      // cancelled
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>

        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <View style={styles.skel}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={28} />
              <Skeleton width="100%" height={6} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="80%" height={16} />
            </View>
          ) : decode ? (
            <DecodeCard
              data={decode}
              onShare={() => share(decode)}
              onDraft={() => {
                haptic("medium");
                router.replace("/reveal");
              }}
            />
          ) : (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>AI could not read this yet</Text>
              <Text style={styles.errorBody}>{error ?? "Try again."}</Text>
              <Button label="Try again" onPress={runDecode} style={{ marginTop: space.lg }} />
            </View>
          )}
          {!loading && decode ? <ZeroGReceipt receipt={decode.huru} memoryRootHash={memoryRoot} /> : null}
          <Text style={styles.trust}>Private by default · memory only when you allow it</Text>
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
  scroll: { padding: space.xl },
  skel: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopColor: colors.topHi,
    padding: space.xl,
    gap: space.md,
  },
  errorBox: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopColor: colors.topHi,
    padding: space.xl,
  },
  errorTitle: { ...type.heading, color: colors.text },
  errorBody: { ...type.body, color: colors.dim, marginTop: space.sm, lineHeight: 22 },
  trust: { ...type.meta, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
