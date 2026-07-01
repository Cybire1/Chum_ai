import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ZeroGReceipt } from "../components/ZeroGReceipt";
import { describeApiError, generateWorkoutPlan, type PlanExercise, type WorkoutPlan } from "../lib/api";
import { findExerciseByName } from "../lib/exercises";
import {
  Animated,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "../lib/motion";
import { clearPlan, loadPlan, savePlan } from "../lib/plan-store";
import { V, VF, VOLT_FONTS } from "../lib/volt";

const GOALS = ["Build muscle", "Lose fat", "Get stronger", "Stay healthy"];
const EQUIP = ["Bodyweight", "Dumbbells", "Full gym", "Bands"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const DAYS = ["3", "4", "5"];
const BUILD_STEPS = [
  "Reading your goals…",
  "Selecting the right exercises…",
  "Balancing volume & recovery…",
  "Finalizing your weekly split…",
];

export default function Plan() {
  const [loaded] = useFonts(VOLT_FONTS);
  const [goal, setGoal] = useState(GOALS[0]!);
  const [equipment, setEquipment] = useState(EQUIP[0]!);
  const [level, setLevel] = useState(LEVELS[0]!);
  const [days, setDays] = useState("3");
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // restore a previously-built plan so users don't have to regenerate
  useEffect(() => {
    loadPlan().then((s) => {
      if (s) setPlan(s.plan);
    });
  }, []);

  const generate = async () => {
    setLoading(true);
    setErr(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const minWait = new Promise((r) => setTimeout(r, 2600));
    try {
      const [p] = await Promise.all([
        generateWorkoutPlan({ goal, equipment, level, days: Number(days) }),
        minWait,
      ]);
      setPlan(p);
      await savePlan(p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setErr(describeApiError(error, "Couldn't reach the coach right now. Try again."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Plan with AI",
          headerStyle: { backgroundColor: V.bg },
          headerTitleStyle: { color: V.tx, fontFamily: VF.d7 },
          headerTintColor: V.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: V.bg },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>Tell me about you — I'll build a plan, privately on 0G.</Text>

        <Group label="GOAL" options={GOALS} value={goal} onSelect={setGoal} />
        <Group label="EQUIPMENT" options={EQUIP} value={equipment} onSelect={setEquipment} />
        <Group label="EXPERIENCE" options={LEVELS} value={level} onSelect={setLevel} />
        <Group label="DAYS / WEEK" options={DAYS} value={days} onSelect={setDays} />

        <Pressable onPress={generate} disabled={loading} style={styles.cta}>
          {loading ? (
            <ActivityIndicator color={V.ink} />
          ) : (
            <Text style={styles.ctaTxt}>{plan ? "Regenerate" : "Build my plan"}</Text>
          )}
        </Pressable>
        {err && !loading ? <Text style={styles.err}>{err}</Text> : null}

        {loading ? <BuildingPlan /> : null}

        {plan && !loading ? (
          <>
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle" size={15} color={V.accent} />
              <Text style={styles.savedTxt}>Saved — start it anytime, no need to rebuild</Text>
              <Pressable
                onPress={() => {
                  clearPlan();
                  setPlan(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.clearTxt}>Clear</Text>
              </Pressable>
            </View>
            <PlanView plan={plan} />
            <ZeroGReceipt receipt={plan.huru} compact />
          </>
        ) : null}

        <Text style={styles.trust}>Private by default · memory only when you allow it</Text>
      </ScrollView>
    </View>
  );
}

function Group({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(o);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlanView({ plan }: { plan: WorkoutPlan }) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.plan}>
      <Text style={styles.planTitle}>{plan.title}</Text>
      {plan.summary ? <Text style={styles.planSummary}>{plan.summary}</Text> : null}
      <Text style={styles.planHint}>Tap an exercise for its form guide</Text>
      {plan.days.map((d, i) => (
        <View key={i} style={styles.dayCard}>
          <View style={styles.dayHead}>
            <Text style={styles.dayName}>{d.day}</Text>
            {d.focus ? (
              <View style={styles.focusPill}>
                <Text style={styles.focusText}>{d.focus}</Text>
              </View>
            ) : null}
          </View>
          {d.exercises.map((e, j) => (
            <ExRow key={j} e={e} last={j === d.exercises.length - 1} />
          ))}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: "/session", params: { plan: JSON.stringify(d) } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Start ${d.focus || d.day}`}
            style={styles.dayStart}
          >
            <Ionicons name="flash" size={15} color={V.accent} />
            <Text style={styles.dayStartTxt}>Start workout</Text>
          </Pressable>
        </View>
      ))}
    </Animated.View>
  );
}

function ExRow({ e, last }: { e: PlanExercise; last: boolean }) {
  const match = useMemo(() => findExerciseByName(e.name), [e.name]);
  const inner = (
    <View style={[styles.exRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.exNameRow}>
          <Text style={styles.exName}>{e.name}</Text>
          {match ? <Ionicons name="chevron-forward-circle" size={15} color={V.accent} /> : null}
        </View>
        {e.note ? <Text style={styles.exNote}>{e.note}</Text> : null}
      </View>
      <Text style={styles.exMeta}>
        {e.sets} × {e.reps}
      </Text>
    </View>
  );
  if (!match) return inner;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: "/exercise/[id]", params: { id: match.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${e.name} — view form`}
    >
      {inner}
    </Pressable>
  );
}

function BuildingPlan() {
  const [step, setStep] = useState(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    const id = setInterval(() => setStep((s) => (s + 1) % BUILD_STEPS.length), 1300);
    return () => clearInterval(id);
  }, [pulse]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.12 }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + pulse.value * 0.4,
    transform: [{ scale: 1.3 + pulse.value * 0.35 }],
  }));
  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.building}>
      <View style={styles.orbWrap}>
        <Animated.View style={[styles.orbGlow, glowStyle]} />
        <Animated.View style={[styles.orb, orbStyle]}>
          <Ionicons name="sparkles" size={26} color={V.white} />
        </Animated.View>
      </View>
      <Text style={styles.buildTitle}>Crafting your plan</Text>
      <Animated.Text key={step} entering={FadeIn.duration(300)} style={styles.buildStep}>
        {BUILD_STEPS[step]}
      </Animated.Text>
      <View style={styles.buildDots}>
        {BUILD_STEPS.map((_, i) => (
          <View key={i} style={[styles.buildDot, i <= step && styles.buildDotOn]} />
        ))}
      </View>
      <Text style={styles.buildNote}>Generating privately in a sealed enclave on 0G</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  building: { alignItems: "center", paddingVertical: 32, gap: 4 },
  orbWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  orbGlow: { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: V.accent },
  orb: { width: 62, height: 62, borderRadius: 31, backgroundColor: V.accent, alignItems: "center", justifyContent: "center" },
  buildTitle: { color: V.tx, fontFamily: VF.d7, fontSize: 19 },
  buildStep: { color: V.dim, fontFamily: VF.b6, fontSize: 13.5, marginTop: 5, minHeight: 18 },
  buildDots: { flexDirection: "row", gap: 7, marginTop: 14 },
  buildDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: V.surf2 },
  buildDotOn: { backgroundColor: V.accent },
  buildNote: { color: V.dim2, fontFamily: VF.b5, fontSize: 11.5, marginTop: 16, textAlign: "center" },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18, marginBottom: 2 },
  savedTxt: { flex: 1, color: V.dim, fontFamily: VF.b6, fontSize: 12.5 },
  clearTxt: { color: V.dim2, fontFamily: VF.b7, fontSize: 12.5 },
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 36 },
  intro: { color: V.dim, fontFamily: VF.b5, fontSize: 15, lineHeight: 21, marginTop: 4, marginBottom: 22 },
  group: { marginBottom: 20, gap: 10 },
  groupLabel: { color: V.accent, fontFamily: VF.b8, fontSize: 11, letterSpacing: 1.2, marginLeft: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: {
    paddingHorizontal: 18,
    height: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: V.surf,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: V.line,
  },
  chipActive: { backgroundColor: V.accent, borderColor: V.accent },
  chipText: { color: V.dim, fontFamily: VF.d6, fontSize: 15 },
  chipTextActive: { color: V.ink, fontFamily: VF.d7 },
  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: V.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  ctaTxt: { color: V.ink, fontFamily: VF.d7, fontSize: 17 },
  err: { color: V.accent, fontFamily: VF.b6, fontSize: 13, textAlign: "center", marginTop: 12 },
  plan: { marginTop: 26, gap: 12 },
  planTitle: { color: V.tx, fontFamily: VF.d7, fontSize: 24 },
  planSummary: { color: V.dim, fontFamily: VF.b5, fontSize: 14, lineHeight: 20, marginTop: -2 },
  planHint: { color: V.dim2, fontFamily: VF.b6, fontSize: 12.5, marginTop: -2, marginBottom: 4 },
  dayCard: {
    backgroundColor: V.surf,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: V.line,
    padding: 16,
  },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  dayName: { color: V.tx, fontFamily: VF.d7, fontSize: 18 },
  focusPill: { backgroundColor: V.accentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  focusText: { color: V.accent, fontFamily: VF.b7, fontSize: 11, letterSpacing: 0.3 },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V.line,
  },
  exNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exName: { color: V.tx, fontFamily: VF.d6, fontSize: 15 },
  exNote: { color: V.dim2, fontFamily: VF.b5, fontSize: 12, marginTop: 2 },
  exMeta: { color: V.accent, fontFamily: VF.d7, fontSize: 13.5 },
  dayStart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: V.accentSoft,
    borderRadius: 14,
    paddingVertical: 13,
  },
  dayStartTxt: { color: V.accent, fontFamily: VF.d7, fontSize: 14.5 },
  trust: { color: V.dim2, fontFamily: VF.b5, fontSize: 12.5, textAlign: "center", marginTop: 26 },
});
