import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

import { getTodayHealth, type TodayHealth } from "../../lib/health";
import { V, VF, VOLT_FONTS } from "../../lib/volt";

const DOW = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmt = (n: number) => n.toLocaleString("en-US");
const TIER = { move: 1, exercise: 0.7, steps: 0.46 };

export default function Today() {
  const [loaded] = useFonts(VOLT_FONTS);
  const [h, setH] = useState<TodayHealth | null>(null);
  useEffect(() => {
    getTodayHealth().then(setH);
  }, []);

  if (!loaded || !h) return <View style={styles.root} />;

  const now = new Date();
  const dateStr = `${DOW[now.getDay()]} · ${MON[now.getMonth()]} ${now.getDate()}`;
  const move = h.activeCalories / h.caloriesGoal;
  const exercise = h.exerciseMinutes / h.exerciseGoal;
  const steps = h.steps / h.stepsGoal;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View>
            <Text style={styles.date}>{dateStr}</Text>
            <Text style={styles.title}>Today</Text>
          </View>

          {/* rings */}
          <View style={styles.ringsCard}>
            <Rings move={move} exercise={exercise} steps={steps} />
            <View style={styles.legend}>
              <Legend o={TIER.move} label="Move" value={`${h.activeCalories} / ${h.caloriesGoal} cal`} />
              <Legend o={TIER.exercise} label="Exercise" value={`${h.exerciseMinutes} / ${h.exerciseGoal} min`} />
              <Legend o={TIER.steps} label="Steps" value={`${fmt(h.steps)} / ${fmt(h.stepsGoal)}`} />
            </View>
          </View>

          {h.source === "sample" ? (
            <View style={styles.sample}>
              <Ionicons name="sparkles" size={13} color={V.accent} />
              <Text style={styles.sampleTxt}>Sample data — connect Apple Health in a dev build</Text>
            </View>
          ) : null}

          {/* readiness → coach */}
          <Pressable
            onPress={() => router.push("/coach")}
            style={styles.readyCard}
            accessibilityRole="button"
            accessibilityLabel="Open AI coach for today's training plan"
          >
            <View style={styles.readyIcon}>
              <Ionicons name="flash" size={16} color={V.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.readyTitle}>Ready to train</Text>
              <Text style={styles.readySub}>Your AI coach tuned today's plan to your recovery.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={V.dim2} />
          </Pressable>

          {/* stat grid */}
          <View style={styles.grid}>
            <Tile icon="footsteps" value={fmt(h.steps)} label="Steps" />
            <Tile icon="moon" value={`${h.sleepHours}h`} label="Sleep" />
            <Tile icon="heart" value={`${h.restingHR}`} label="Resting HR" />
            <Tile icon="barbell" value={`${h.workouts}`} label="Workouts" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Rings({ move, exercise, steps }: { move: number; exercise: number; steps: number }) {
  const size = 150;
  const stroke = 14;
  const gap = 6;
  const data = [
    { p: move, o: TIER.move },
    { p: exercise, o: TIER.exercise },
    { p: steps, o: TIER.steps },
  ];
  return (
    <Svg width={size} height={size}>
      {data.map((r, i) => {
        const rad = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * rad;
        const off = c * (1 - Math.min(Math.max(r.p, 0), 1));
        return (
          <G key={i} rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={rad} stroke={V.accent} strokeOpacity={0.13} strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={rad}
              stroke={V.accent}
              strokeOpacity={r.o}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={off}
              strokeLinecap="round"
            />
          </G>
        );
      })}
    </Svg>
  );
}

function Legend({ o, label, value }: { o: number; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { opacity: o }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function Tile({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={20} color={V.accent} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 16 },
  date: { color: V.dim, fontFamily: VF.b7, fontSize: 11, letterSpacing: 0.6 },
  title: { color: V.tx, fontFamily: VF.d7, fontSize: 28, marginTop: 4 },
  ringsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 22,
    padding: 18,
  },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: V.accent },
  legendLabel: { color: V.tx, fontFamily: VF.d7, fontSize: 14, width: 70 },
  legendValue: { color: V.dim, fontFamily: VF.b6, fontSize: 12, flex: 1 },
  sample: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: V.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sampleTxt: { color: V.accent, fontFamily: VF.b7, fontSize: 12 },
  readyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 20,
    padding: 16,
  },
  readyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: V.accent, alignItems: "center", justifyContent: "center" },
  readyTitle: { color: V.tx, fontFamily: VF.d7, fontSize: 15 },
  readySub: { color: V.dim, fontFamily: VF.b5, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 16,
    gap: 5,
  },
  tileValue: { color: V.tx, fontFamily: VF.d7, fontSize: 22, marginTop: 4 },
  tileLabel: { color: V.dim, fontFamily: VF.b6, fontSize: 12 },
});
