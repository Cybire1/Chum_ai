import {
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/hanken-grotesk";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { exerciseImage, findExerciseByName } from "../lib/exercises";
import { PressableScale } from "../lib/motion";
import { V } from "../lib/volt";

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

// VOLT tokens (near-black + pink gym sub-brand) are shared from lib/volt.ts so
// every VOLT screen stays on one palette. Fonts stay local below.
const F = {
  d5: "HankenGrotesk_600SemiBold",
  d6: "HankenGrotesk_700Bold",
  d7: "HankenGrotesk_800ExtraBold",
  b5: "HankenGrotesk_500Medium",
  b6: "HankenGrotesk_600SemiBold",
  b7: "HankenGrotesk_700Bold",
  b8: "HankenGrotesk_800ExtraBold",
};

const REST_SECONDS = 60;
const WORK_SECONDS = 40;

type Ex = { name: string; target: string; sets: number; reps: string; tip: string };
type Workout = { name: string; exercises: Ex[] };

const SAMPLE: Workout = {
  name: "Upper Power",
  exercises: [
    { name: "Barbell Bench Press", target: "4 × 6–8", sets: 4, reps: "6–8 reps", tip: "Pin your shoulder blades and drive through your heels." },
    { name: "Pullups", target: "4 × 6", sets: 4, reps: "6 reps", tip: "Lead with your chest; full hang at the bottom." },
    { name: "Standing Military Press", target: "3 × 8", sets: 3, reps: "8 reps", tip: "Squeeze your glutes to protect your lower back." },
    { name: "Bent Over Barbell Row", target: "3 × 10", sets: 3, reps: "10 reps", tip: "Pull to your belt line, not your chest." },
  ],
};

// Convert an AI-plan day ({ day, focus, exercises:[{name,sets,reps,note}] }) into
// a runnable VOLT workout. Falls back to the sample when no plan is passed.
function toWorkout(raw?: string): Workout {
  if (!raw) return SAMPLE;
  try {
    const d = JSON.parse(raw) as {
      day?: string;
      focus?: string;
      exercises?: { name: string; sets?: number; reps?: string; note?: string }[];
    };
    const exercises: Ex[] = (d.exercises ?? [])
      .filter((e) => e?.name)
      .map((e) => {
        const sets = Math.max(1, Math.min(Number(e.sets) || 3, 10));
        const reps = String(e.reps ?? "10");
        return {
          name: String(e.name),
          target: `${sets} × ${reps}`,
          sets,
          reps: `${reps} reps`,
          tip: e.note || "Move with control — full range, steady tempo.",
        };
      });
    if (exercises.length) return { name: d.focus || d.day || "Workout", exercises };
  } catch {
    // fall through to sample
  }
  return SAMPLE;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Session() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const workout = useMemo(() => toWorkout(plan), [plan]);

  const [exIndex, setExIndex] = useState(0);
  const [setsDone, setSetsDone] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(REST_SECONDS);
  const [workLeft, setWorkLeft] = useState(WORK_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  const totalEx = workout.exercises.length;
  const ex = workout.exercises[Math.min(exIndex, totalEx - 1)]!;
  const currentSet = setsDone + 1;
  const exImage = useMemo(() => {
    const m = findExerciseByName(ex.name);
    return m ? exerciseImage(m) : null;
  }, [ex.name]);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [done]);

  const restRef = useRef(restLeft);
  restRef.current = restLeft;
  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => {
      if (restRef.current <= 1) {
        clearInterval(id);
        setResting(false);
        setRestLeft(REST_SECONDS);
      } else {
        setRestLeft((r) => r - 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [resting]);

  // work countdown — a live timer during the active set (guides pace)
  useEffect(() => {
    if (resting || done) return;
    setWorkLeft(WORK_SECONDS);
    const id = setInterval(() => setWorkLeft((w) => (w <= 0 ? 0 : w - 1)), 1000);
    return () => clearInterval(id);
  }, [resting, done, exIndex, setsDone]);

  const insets = useSafeAreaInsets();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/coach");
  };

  if (!fontsLoaded) return <View style={styles.root} />;
  if (done) return <DoneView workout={workout} elapsed={elapsed} onClose={close} />;

  const completeSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextDone = setsDone + 1;
    if (nextDone < ex.sets) {
      setSetsDone(nextDone);
      setRestLeft(REST_SECONDS);
      setResting(true);
    } else if (exIndex < totalEx - 1) {
      setExIndex(exIndex + 1);
      setSetsDone(0);
      setResting(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    }
  };

  const skipRest = () => {
    Haptics.selectionAsync();
    setResting(false);
    setRestLeft(REST_SECONDS);
  };

  const openForm = () => {
    const match = findExerciseByName(ex.name);
    if (match) router.push({ pathname: "/exercise/[id]", params: { id: match.id } });
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* full-bleed exercise hero — extends behind the status bar */}
      <View style={styles.exHero}>
        {exImage ? (
          <Image source={{ uri: exImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={["rgba(10,10,12,0.55)", "rgba(10,10,12,0.12)", "rgba(10,10,12,0.45)", "rgba(10,10,12,0.97)"]}
          locations={[0, 0.28, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable
            onPress={close}
            style={styles.iconBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={V.white} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.wName}>{workout.name}</Text>
            <Text style={styles.wSub}>
              Exercise {exIndex + 1} of {totalEx}
            </Text>
          </View>
          <View style={styles.timerPill}>
            <Ionicons name="time-outline" size={13} color={V.white} />
            <Text style={styles.timerTxt}>{mmss(elapsed)}</Text>
          </View>
        </View>
        <View style={styles.exHeroBody}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.exName}>{ex.name}</Text>
            <Text style={styles.exHeroMeta}>
              Set {currentSet} of {ex.sets} · {ex.reps}
            </Text>
          </View>
          <Pressable onPress={openForm} style={styles.exHeroForm} hitSlop={6}>
            <Ionicons name="information-circle-outline" size={13} color={V.accent} />
            <Text style={styles.formTxt}>Form guide</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 6 }]}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          <BigTimer
            secondsLeft={resting ? restLeft : workLeft}
            total={resting ? REST_SECONDS : WORK_SECONDS}
            runKey={`${resting ? "rest" : "work"}-${exIndex}-${setsDone}`}
            label={resting ? "REST" : "WORK"}
            sub={resting ? "Next set coming up" : ex.reps}
          />

          <SetDots total={ex.sets} done={setsDone} current={resting ? -1 : setsDone} />

          <View style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons name="flash" size={15} color={V.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipLabel}>COACH TIP</Text>
              <Text style={styles.tipTxt}>{ex.tip}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          {resting ? (
            <PressableScale onPress={skipRest} hkind="light" style={styles.skipFull}>
              <Text style={styles.skipFullTxt}>Skip rest</Text>
              <Ionicons name="play-skip-forward" size={16} color={V.tx} />
            </PressableScale>
          ) : (
            <PressableScale onPress={completeSet} hkind="medium" style={styles.completeBtn}>
              <Text style={styles.completeTxt}>Complete set</Text>
              <View style={styles.completeChip}>
                <Ionicons name="checkmark" size={16} color={V.accent} />
              </View>
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
}

function BigTimer({
  secondsLeft,
  total,
  runKey,
  label,
  sub,
}: {
  secondsLeft: number;
  total: number;
  runKey: string;
  label: string;
  sub: string;
}) {
  const size = 212;
  const sw = 10;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const prog = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(prog);
    prog.value = 0;
    prog.value = withTiming(1, { duration: Math.max(total, 1) * 1000, easing: Easing.linear });
  }, [runKey, total, prog]);
  const aProps = useAnimatedProps(() => ({ strokeDashoffset: c * prog.value }));
  return (
    <View style={styles.timerWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={V.line2} strokeWidth={sw} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={V.accent}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={c}
          animatedProps={aProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.timerCenter}>
        <Text style={styles.timerLabel}>{label}</Text>
        <Text style={styles.timerDigits}>{mmss(secondsLeft)}</Text>
        <Text style={styles.timerSub}>{sub}</Text>
      </View>
    </View>
  );
}

function SetDots({ total, done, current }: { total: number; done: number; current: number }) {
  return (
    <View style={styles.setDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.setDot, i < done && styles.setDotDone, i === current && styles.setDotCurrent]}
        />
      ))}
    </View>
  );
}

function DoneView({ workout, onClose, elapsed }: { workout: Workout; onClose: () => void; elapsed: number }) {
  const sets = useMemo(() => workout.exercises.reduce((n, e) => n + e.sets, 0), [workout]);
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <SafeAreaView style={styles.doneWrap}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={44} color={V.ink} />
        </View>
        <Text style={styles.doneTitle}>Session complete</Text>
        <Text style={styles.doneSub}>
          {workout.name} · {sets} sets · {mmss(elapsed)}
        </Text>
        <View style={styles.doneStats}>
          <Stat n={String(workout.exercises.length)} l="exercises" />
          <Stat n={String(sets)} l="sets" />
          <Stat n={mmss(elapsed)} l="time" />
        </View>
        <Pressable onPress={onClose} style={[styles.completeBtn, { marginTop: 28, paddingLeft: 44, paddingRight: 44 }]}>
          <Text style={styles.completeTxt}>Done</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16,16,20,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  wName: { color: V.tx, fontSize: 16, fontFamily: F.d7 },
  wSub: { color: V.dim, fontSize: 11, fontFamily: F.b6, marginTop: 4 },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,16,20,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerTxt: { color: V.tx, fontSize: 13, fontFamily: F.d7, fontVariant: ["tabular-nums"] },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 14 },
  exRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  exName: { color: V.tx, fontSize: 23, fontFamily: F.d7, letterSpacing: -0.3 },
  exMeta: { color: V.dim, fontSize: 13, fontFamily: F.b6, marginTop: 5 },
  formBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: V.surf2,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  formTxt: { color: V.accent, fontSize: 12, fontFamily: F.d6 },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: V.accentSoft,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 15,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: V.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  tipLabel: { color: V.accent, fontSize: 10, fontFamily: F.b8, letterSpacing: 1.3, marginBottom: 6 },
  tipTxt: { color: V.tx, fontSize: 14, lineHeight: 21, fontFamily: F.b5 },
  setList: { gap: 8, marginTop: 4 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  setRowCurrent: { borderColor: V.accent, backgroundColor: V.accentSoft },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: V.dim2,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: V.accent, borderColor: V.accent },
  dotCurrent: { borderColor: V.accent },
  setLabel: { flex: 1, color: V.dim, fontSize: 14, fontFamily: F.d6 },
  setReps: { color: V.dim, fontSize: 12.5, fontFamily: F.b6 },
  bottom: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  completeBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: V.accent,
    borderRadius: 999,
    paddingLeft: 30,
    paddingRight: 8,
    height: 58,
  },
  completeChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: V.white,
    alignItems: "center",
    justifyContent: "center",
  },
  completeTxt: { color: V.white, fontSize: 17, fontFamily: F.d7 },
  restCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line2,
    borderRadius: 20,
    padding: 14,
  },
  restNum: { color: V.tx, fontSize: 14, fontFamily: F.d7, fontVariant: ["tabular-nums"] },
  restTitle: { color: V.tx, fontSize: 15, fontFamily: F.d7 },
  restSub: { color: V.dim, fontSize: 12.5, fontFamily: F.b5, marginTop: 4 },
  skipBtn: {
    backgroundColor: V.surf2,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  skipTxt: { color: V.tx, fontSize: 13, fontFamily: F.d7 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: V.bg },
  doneCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: V.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  doneTitle: { color: V.tx, fontSize: 26, fontFamily: F.d7, letterSpacing: -0.4 },
  doneSub: { color: V.dim, fontSize: 14, fontFamily: F.b6, marginTop: 8 },
  doneStats: { flexDirection: "row", gap: 36, marginTop: 30 },
  statN: { color: V.tx, fontSize: 22, fontFamily: F.d7 },
  statL: { color: V.dim, fontSize: 12, fontFamily: F.b6, marginTop: 3 },
  exHero: {
    height: 408,
    overflow: "hidden",
    justifyContent: "space-between",
    backgroundColor: V.surf2,
  },
  content: { flex: 1 },
  exHeroForm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,16,20,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  exHeroBody: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 20, paddingBottom: 22 },
  exHeroMeta: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: F.b6, marginTop: 5 },
  timerWrap: { alignItems: "center", justifyContent: "center", alignSelf: "center", marginVertical: 8 },
  timerCenter: { position: "absolute", alignItems: "center" },
  timerLabel: { color: V.accent, fontSize: 12, fontFamily: F.b8, letterSpacing: 2.5, marginBottom: 2 },
  timerDigits: { color: V.tx, fontSize: 58, fontFamily: F.d7, fontVariant: ["tabular-nums"], letterSpacing: -1 },
  timerSub: { color: V.dim, fontSize: 13, fontFamily: F.b6, marginTop: 2 },
  setDots: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 4 },
  setDot: { width: 26, height: 6, borderRadius: 3, backgroundColor: V.surf2 },
  setDotDone: { backgroundColor: V.accent },
  setDotCurrent: { backgroundColor: V.tx },
  skipFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line2,
    borderRadius: 18,
    paddingVertical: 18,
  },
  skipFullTxt: { color: V.tx, fontSize: 17, fontFamily: F.d7 },
});
