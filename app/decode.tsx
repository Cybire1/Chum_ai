import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DecodeCard } from "../components/DecodeCard";
import { Skeleton } from "../components/Skeleton";
import { rizzDecode } from "../lib/api";
import { verdictLabel } from "../lib/format";
import { haptic, PressableScale } from "../lib/motion";
import { setSession, useSession } from "../lib/store";
import { colors, radius, space, type } from "../lib/theme";
import type { DecodeResponse } from "../lib/types";

export default function Decode() {
  const { conversation, contextNote, decode } = useSession();
  const [loading, setLoading] = useState(!decode);

  useEffect(() => {
    if (decode) return;
    (async () => {
      try {
        const r = await rizzDecode(conversation, contextNote || undefined);
        setSession({ decode: r });
        haptic("success");
      } catch {
        haptic("warning");
      } finally {
        setLoading(false);
      }
    })();
  }, [conversation, contextNote, decode]);

  const share = async (d: DecodeResponse) => {
    try {
      await Share.share({
        message: `The read: ${verdictLabel[d.verdict]} (${d.confidence}%)\n→ ${d.suggested_move}\n\n— Wing`,
      });
    } catch {
      // cancelled
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.nav}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.back}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>
          <Text style={styles.navTitle}>Decode</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {loading || !decode ? (
            <View style={styles.skel}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={28} />
              <Skeleton width="100%" height={6} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="80%" height={16} />
            </View>
          ) : (
            <DecodeCard
              data={decode}
              onShare={() => share(decode)}
              onDraft={() => {
                haptic("medium");
                router.replace("/reveal");
              }}
            />
          )}
          <Text style={styles.trust}>🔒 Sealed enclave · nothing stored</Text>
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
    borderColor: colors.border,
    padding: space.xl,
    gap: space.md,
  },
  trust: { ...type.meta, color: colors.faint, textAlign: "center", marginTop: space.xl },
});
