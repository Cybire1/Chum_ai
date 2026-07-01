import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { V, VF, VOLT_FONTS } from "../lib/volt";

const RANGES = ["This week", "This month"] as const;

// Sample data — wire to real session history later.
const VOLUME = [12.4, 0, 18.1, 0, 15.2, 22.0, 0]; // tonnes lifted per day (M→S)
const VMAX = Math.max(...VOLUME);
const KPIS = [
  { icon: "barbell", n: "4", l: "Workouts" },
  { icon: "trending-up", n: "48.2k", l: "Volume kg" },
  { icon: "flame", n: "14", l: "Day streak" },
  { icon: "time", n: "47m", l: "Avg session" },
];
const PRS = [
  { lift: "Bench Press", kg: "102.5", up: "+2.5" },
  { lift: "Back Squat", kg: "140", up: "+5" },
  { lift: "Deadlift", kg: "185", up: "+5" },
];
const SPLIT = [
  { m: "Chest", pct: 28 },
  { m: "Back", pct: 23 },
  { m: "Legs", pct: 20 },
  { m: "Shoulders", pct: 16 },
  { m: "Arms", pct: 13 },
];

export default function Stats() {
  const [loaded] = useFonts(VOLT_FONTS);
  const [range, setRange] = useState<(typeof RANGES)[number]>("This week");
  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Stats",
          headerStyle: { backgroundColor: V.bg },
          headerTitleStyle: { color: V.tx, fontFamily: VF.d7 },
          headerTintColor: V.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: V.bg },
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* range toggle */}
        <View style={styles.seg}>
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.segBtn, range === r && styles.segOn]}>
              <Text style={[styles.segTxt, range === r && { color: V.ink }]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        {/* volume hero + chart */}
        <View style={styles.volCard}>
          <Text style={styles.volLabel}>TOTAL VOLUME</Text>
          <View style={styles.volRow}>
            <Text style={styles.volNum}>
              48,250<Text style={styles.volUnit}> kg</Text>
            </Text>
            <View style={styles.delta}>
              <Ionicons name="arrow-up" size={11} color={V.ink} />
              <Text style={styles.deltaTxt}>12%</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {VOLUME.map((v, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max((v / VMAX) * 100, 3)}%`, opacity: v ? 1 : 0.25 }]} />
                </View>
                <Text style={styles.barLbl}>{["M", "T", "W", "T", "F", "S", "S"][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpis}>
          {KPIS.map((k) => (
            <View key={k.l} style={styles.kpi}>
              <Ionicons name={k.icon as keyof typeof Ionicons.glyphMap} size={18} color={V.accent} />
              <Text style={styles.kpiN}>{k.n}</Text>
              <Text style={styles.kpiL}>{k.l}</Text>
            </View>
          ))}
        </View>

        {/* personal records */}
        <Text style={styles.section}>Personal records</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prRow}>
          {PRS.map((p) => (
            <View key={p.lift} style={styles.prCard}>
              <View style={styles.prTop}>
                <Ionicons name="trophy" size={14} color={V.accent} />
                <View style={styles.prUp}>
                  <Ionicons name="arrow-up" size={10} color={V.ink} />
                  <Text style={styles.prUpTxt}>{p.up}</Text>
                </View>
              </View>
              <Text style={styles.prKg}>
                {p.kg}
                <Text style={styles.prUnit}> kg</Text>
              </Text>
              <Text style={styles.prLift}>{p.lift}</Text>
            </View>
          ))}
        </ScrollView>

        {/* training split */}
        <Text style={styles.section}>Training split</Text>
        <View style={styles.splitCard}>
          {SPLIT.map((s, i) => (
            <View key={s.m} style={[styles.splitRow, i === SPLIT.length - 1 && { marginBottom: 0 }]}>
              <Text style={styles.splitM}>{s.m}</Text>
              <View style={styles.splitTrack}>
                <View style={[styles.splitFill, { width: `${s.pct * 3.2}%` }]} />
              </View>
              <Text style={styles.splitPct}>{s.pct}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 18 },
  seg: { flexDirection: "row", backgroundColor: V.surf, borderRadius: 14, borderWidth: 1, borderColor: V.line, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  segOn: { backgroundColor: V.accent },
  segTxt: { color: V.dim, fontFamily: VF.d6, fontSize: 13.5 },
  volCard: { backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 22, padding: 18 },
  volLabel: { color: V.dim2, fontFamily: VF.b8, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  volRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  volNum: { color: V.tx, fontFamily: VF.d7, fontSize: 30 },
  volUnit: { color: V.dim, fontFamily: VF.b6, fontSize: 15 },
  delta: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: V.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  deltaTxt: { color: V.ink, fontFamily: VF.b8, fontSize: 11 },
  chart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 120, marginTop: 20 },
  barCol: { flex: 1, alignItems: "center", gap: 8 },
  barTrack: { width: 16, height: 90, justifyContent: "flex-end", backgroundColor: V.surf2, borderRadius: 8, overflow: "hidden" },
  bar: { width: "100%", backgroundColor: V.accent, borderRadius: 8 },
  barLbl: { color: V.dim, fontFamily: VF.b6, fontSize: 11 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: { width: "47.5%", flexGrow: 1, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 18, padding: 16, gap: 5 },
  kpiN: { color: V.tx, fontFamily: VF.d7, fontSize: 22, marginTop: 4 },
  kpiL: { color: V.dim, fontFamily: VF.b6, fontSize: 12 },
  section: { color: V.tx, fontFamily: VF.d7, fontSize: 18 },
  prRow: { gap: 12, paddingVertical: 2 },
  prCard: { width: 132, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 18, padding: 14 },
  prTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  prUp: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: V.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  prUpTxt: { color: V.ink, fontFamily: VF.b8, fontSize: 10 },
  prKg: { color: V.tx, fontFamily: VF.d7, fontSize: 26 },
  prUnit: { color: V.dim, fontFamily: VF.b6, fontSize: 13 },
  prLift: { color: V.dim, fontFamily: VF.b6, fontSize: 12.5, marginTop: 4 },
  splitCard: { backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 20, padding: 18 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  splitM: { color: V.tx, fontFamily: VF.d6, fontSize: 13.5, width: 78 },
  splitTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: V.surf2, overflow: "hidden" },
  splitFill: { height: "100%", backgroundColor: V.accent, borderRadius: 4 },
  splitPct: { color: V.dim, fontFamily: VF.b7, fontSize: 12, width: 36, textAlign: "right" },
});
