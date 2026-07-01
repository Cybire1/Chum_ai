import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { markAllRead, markRead, type Notif, useNotifs } from "../lib/notifications";
import { V, VF, VOLT_FONTS } from "../lib/volt";

export default function Notifications() {
  const [loaded] = useFonts(VOLT_FONTS);
  const notifs = useNotifs();
  const hasUnread = notifs.some((n) => !n.read);
  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.circleBtn} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={V.tx} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              markAllRead();
            }}
            disabled={!hasUnread}
            hitSlop={8}
            style={styles.markAll}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <Text style={[styles.markAllTxt, !hasUnread && { color: V.dim2 }]}>Mark all read</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {notifs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={28} color={V.dim2} />
              <Text style={styles.emptyTxt}>You're all caught up.</Text>
            </View>
          ) : (
            notifs.map((n) => <Row key={n.id} n={n} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ n }: { n: Notif }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        markRead(n.id);
      }}
      style={[styles.row, !n.read && styles.rowUnread]}
      accessibilityRole="button"
      accessibilityLabel={`${n.title}. ${n.read ? "" : "Unread. "}${n.body}`}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={n.icon as keyof typeof Ionicons.glyphMap} size={19} color={V.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.rowTime}>{n.time}</Text>
        </View>
        <Text style={styles.rowBody}>{n.body}</Text>
      </View>
      {!n.read ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 52 },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: V.surf2,
    borderWidth: 1,
    borderColor: V.line,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: V.tx, fontFamily: VF.d7, fontSize: 19 },
  markAll: { paddingVertical: 8, paddingLeft: 8 },
  markAllTxt: { color: V.accent, fontFamily: VF.b7, fontSize: 13 },
  scroll: { padding: 20, paddingTop: 8, gap: 10 },
  row: {
    flexDirection: "row",
    gap: 13,
    alignItems: "flex-start",
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 15,
  },
  rowUnread: { borderColor: "rgba(255,111,176,0.3)" },
  rowIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: V.accentSoft, alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { color: V.tx, fontFamily: VF.d6, fontSize: 14.5, flex: 1 },
  rowTime: { color: V.dim2, fontFamily: VF.b6, fontSize: 11 },
  rowBody: { color: V.dim, fontFamily: VF.b5, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: V.accent, marginTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 90, gap: 12 },
  emptyTxt: { color: V.dim, fontFamily: VF.b6, fontSize: 14 },
});
