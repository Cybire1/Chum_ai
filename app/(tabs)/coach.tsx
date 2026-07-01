import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { exerciseImage, findExerciseByName } from "../../lib/exercises";
import { PressableScale } from "../../lib/motion";
import { useUnreadCount } from "../../lib/notifications";
import { initialOf, useName } from "../../lib/profile-store";
import { V, VF, VOLT_FONTS } from "../../lib/volt";

const DOW = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MON = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

const heroEx = findExerciseByName("Barbell Bench Press");
const HERO = heroEx ? exerciseImage(heroEx) : null;

const READINESS = 82;
const WEEK = [true, true, false, true, false, false, false];
const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const QUICK: { icon: keyof typeof Ionicons.glyphMap; label: string; to: string }[] = [
  { icon: "sparkles", label: "Plan with AI", to: "/plan" },
  { icon: "barbell", label: "Quick start", to: "/session" },
  { icon: "search", label: "Exercises", to: "/exercises" },
];

const PRS = [
  { lift: "Bench Press", kg: "102.5", up: "+2.5", hist: [0.5, 0.62, 0.68, 0.8, 0.88, 1] },
  { lift: "Back Squat", kg: "140", up: "+5", hist: [0.55, 0.6, 0.72, 0.82, 0.92, 1] },
  { lift: "Deadlift", kg: "185", up: "+5", hist: [0.6, 0.66, 0.76, 0.84, 0.93, 1] },
  { lift: "Overhead Press", kg: "65", up: "+2.5", hist: [0.48, 0.58, 0.7, 0.8, 0.9, 1] },
];

const MUSCLES: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: "Chest", icon: "body" },
  { name: "Back", icon: "body-outline" },
  { name: "Legs", icon: "walk" },
  { name: "Shoulders", icon: "barbell-outline" },
  { name: "Arms", icon: "barbell" },
  { name: "Core", icon: "ellipse-outline" },
];

export default function VoltHome() {
  const [loaded] = useFonts(VOLT_FONTS);
  const unread = useUnreadCount();
  const name = useName();
  const insets = useSafeAreaInsets();
  if (!loaded) return <View style={styles.root} />;

  const now = new Date();
  const dateStr = `${DOW[now.getDay()]} · ${MON[now.getMonth()]} ${now.getDate()}`;
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  const start = () => {
    router.push("/session");
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* full-bleed hero */}
          <View style={styles.heroWrap}>
            {HERO ? <Image source={{ uri: HERO }} style={styles.hero} resizeMode="cover" /> : null}
            <LinearGradient
              colors={["rgba(10,10,12,0.55)", "rgba(10,10,12,0.04)", "rgba(10,10,12,0.62)", "rgba(10,10,12,0.99)"]}
              locations={[0, 0.3, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* overlaid greeting + actions */}
            <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
              <View>
                <Text style={styles.heroDate}>{dateStr}</Text>
                <Text style={styles.heroHi}>Hi, {firstName}</Text>
              </View>
              <View style={styles.headerBtns}>
                <PressableScale
                  onPress={() => router.push("/notifications")}
                  style={styles.circleBtn}
                  accessibilityRole="button"
                  accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                >
                  <Ionicons name="notifications-outline" size={20} color={V.white} />
                  {unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{unread > 9 ? "9+" : unread}</Text>
                    </View>
                  ) : null}
                </PressableScale>
                <PressableScale
                  onPress={() => router.push("/profile")}
                  style={styles.avatar}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                >
                  <Text style={styles.avatarTxt}>{initialOf(name, "C")}</Text>
                </PressableScale>
              </View>
            </View>
            {/* workout title + start */}
            <View style={styles.heroBody}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>TODAY · PUSH · 45 MIN</Text>
                <Text style={styles.heroTitle}>Upper Power</Text>
                <Text style={styles.heroSub}>8 exercises · Chest & Shoulders</Text>
              </View>
              <PressableScale onPress={start} hkind="medium" style={styles.startBtn}>
                <Ionicons name="play" size={13} color="#fff" style={{ marginLeft: 1 }} />
                <Text style={styles.startTxt}>Start</Text>
              </PressableScale>
            </View>
          </View>

          {/* content sheet */}
          <View style={styles.sheet}>
            {/* daily readiness */}
            <View style={styles.readyCard}>
              <ReadyRing pct={READINESS} />
              <View style={{ flex: 1 }}>
                <Text style={styles.readyEyebrow}>DAILY READINESS</Text>
                <Text style={styles.readyTitle}>Good to train</Text>
                <Text style={styles.readySub}>Lighter shoulder volume + extra warm-up.</Text>
              </View>
            </View>

          {/* quick actions */}
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <PressableScale
                key={q.label}
                onPress={() => router.push(q.to as never)}
                containerStyle={{ flex: 1 }}
                style={styles.quick}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name={q.icon} size={20} color={V.accent} />
                </View>
                <Text style={styles.quickLbl}>{q.label}</Text>
              </PressableScale>
            ))}
          </View>

          {/* this week */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>This week</Text>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={12} color={V.accent} />
              <Text style={styles.streakTxt}>14-day streak</Text>
            </View>
          </View>
          <View style={styles.weekRow}>
            {WEEK.map((done, i) => (
              <View key={i} style={styles.weekDay}>
                <View style={[styles.weekDot, done && styles.weekDotDone]}>
                  {done ? <Ionicons name="checkmark" size={13} color={V.ink} /> : null}
                </View>
                <Text style={styles.weekLbl}>{WEEK_LABELS[i]}</Text>
              </View>
            ))}
          </View>

          {/* personal records */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Personal records</Text>
            <PressableScale onPress={() => router.push("/stats")}>
              <Text style={styles.seeAll}>See all ›</Text>
            </PressableScale>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prRow}>
            {PRS.map((p) => (
              <PressableScale key={p.lift} onPress={() => router.push("/stats")} style={styles.prCard}>
                <View style={styles.prTop}>
                  <View style={styles.prBadge}>
                    <Ionicons name="trophy" size={14} color={V.dim} />
                  </View>
                  <View style={styles.prUp}>
                    <Ionicons name="arrow-up" size={10} color={V.dim} />
                    <Text style={styles.prUpTxt}>{p.up} kg</Text>
                  </View>
                </View>
                <Text style={styles.prKg}>
                  {p.kg}
                  <Text style={styles.prUnit}> kg</Text>
                </Text>
                <Text style={styles.prLift} numberOfLines={1}>
                  {p.lift}
                </Text>
                <View style={styles.spark}>
                  {p.hist.map((h, i) => (
                    <View
                      key={i}
                      style={[styles.sparkBar, { height: 4 + h * 22 }, i === p.hist.length - 1 && styles.sparkBarLast]}
                    />
                  ))}
                </View>
              </PressableScale>
            ))}
          </ScrollView>

          {/* train by muscle */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Train by muscle</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleRow}>
            {MUSCLES.map((m) => (
              <PressableScale key={m.name} onPress={() => router.push("/exercises")} style={styles.muscle}>
                <View style={styles.muscleIcon}>
                  <Ionicons name={m.icon} size={25} color={V.accent} />
                </View>
                <Text style={styles.muscleLbl}>{m.name}</Text>
              </PressableScale>
            ))}
          </ScrollView>

          {/* coach insight */}
          <View style={styles.insight}>
            <View style={styles.insightIcon}>
              <Ionicons name="flash" size={16} color={V.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightLbl}>COACH INSIGHT</Text>
              <Text style={styles.insightTxt}>
                Your push volume is up 12% this week — nice work. Keep your shoulders fresh: prioritise sleep and an
                extra warm-up set tomorrow.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ReadyRing({ pct }: { pct: number }) {
  const size = 60;
  const sw = 5;
  const r = size / 2 - sw / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame: number;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min((ts - startTs) / 900, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(eased * pct);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pct]);
  const off = c * (1 - shown / 100);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={V.line2} strokeWidth={sw} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={V.accent}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringPct}>{Math.round(shown)}%</Text>
      <Text style={styles.ringLbl}>READY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingBottom: 28 },
  sheet: {
    backgroundColor: V.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -26,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 16,
  },
  heroTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroDate: { color: "rgba(255,255,255,0.85)", fontFamily: VF.b7, fontSize: 11, letterSpacing: 0.6 },
  heroHi: { color: "#fff", fontFamily: VF.d7, fontSize: 26, marginTop: 4 },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 10 },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16,16,20,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: V.accent, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: V.ink, fontFamily: VF.d7, fontSize: 16 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: V.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: V.bg,
  },
  badgeTxt: { color: V.ink, fontFamily: VF.b8, fontSize: 10 },
  readyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 20,
    padding: 16,
  },
  ringPct: { color: V.tx, fontFamily: VF.d7, fontSize: 15 },
  ringLbl: { color: V.dim, fontFamily: VF.b7, fontSize: 7, letterSpacing: 0.5, marginTop: -1 },
  readyEyebrow: { color: V.dim2, fontFamily: VF.b8, fontSize: 9.5, letterSpacing: 1.2, marginBottom: 5 },
  readyTitle: { color: V.tx, fontFamily: VF.d7, fontSize: 18 },
  readySub: { color: V.dim, fontFamily: VF.b5, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  heroWrap: { height: 468, justifyContent: "flex-end" },
  hero: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", backgroundColor: V.surf2 },
  adaptPill: {
    alignSelf: "flex-start",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(12,12,14,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,111,176,0.4)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adaptTxt: { color: V.white, fontFamily: VF.b7, fontSize: 11 },
  heroBody: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 20, paddingBottom: 34 },
  heroEyebrow: { color: "rgba(255,255,255,0.8)", fontFamily: VF.b8, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  heroTitle: { color: "#fff", fontFamily: VF.d7, fontSize: 28, letterSpacing: -0.4 },
  heroSub: { color: "rgba(255,255,255,0.78)", fontFamily: VF.b6, fontSize: 13, marginTop: 6 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#BC3F82",
    borderRadius: 999,
    paddingLeft: 13,
    paddingRight: 17,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  startTxt: { color: "#fff", fontFamily: VF.d7, fontSize: 14 },
  // quick actions
  quickRow: { flexDirection: "row", gap: 10 },
  quick: {
    alignItems: "center",
    gap: 9,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    paddingVertical: 16,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: V.surf2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLbl: { color: V.tx, fontFamily: VF.d6, fontSize: 13 },
  // sections
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: V.tx, fontFamily: VF.d7, fontSize: 18 },
  seeAll: { color: V.accent, fontFamily: VF.b7, fontSize: 13 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: V.surf2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakTxt: { color: V.dim, fontFamily: VF.b7, fontSize: 11.5 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 8 },
  weekDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotDone: { backgroundColor: V.accent, borderColor: V.accent },
  weekLbl: { color: V.dim, fontFamily: VF.b6, fontSize: 11 },
  // personal records
  prRow: { gap: 12, paddingVertical: 2, paddingRight: 4 },
  prCard: {
    width: 152,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 14,
  },
  prBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: V.surf2,
    alignItems: "center",
    justifyContent: "center",
  },
  prTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  prUp: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: V.surf2, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  prUpTxt: { color: V.tx, fontFamily: VF.b8, fontSize: 10 },
  prKg: { color: V.tx, fontFamily: VF.d7, fontSize: 26 },
  prUnit: { color: V.dim, fontFamily: VF.b6, fontSize: 13 },
  prLift: { color: V.dim, fontFamily: VF.b6, fontSize: 12.5, marginTop: 4 },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 26, marginTop: 14 },
  sparkBar: { flex: 1, borderRadius: 2, backgroundColor: V.accentSoft },
  sparkBarLast: { backgroundColor: V.accent },
  // muscles
  muscleRow: { gap: 10, paddingVertical: 2 },
  muscle: { alignItems: "center", gap: 8, width: 72 },
  muscleIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: V.surf2,
    borderWidth: 1,
    borderColor: V.line,
    alignItems: "center",
    justifyContent: "center",
  },
  muscleLbl: { color: V.dim, fontFamily: VF.b6, fontSize: 12 },
  // coach insight
  insight: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 16,
  },
  insightIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: V.accent, alignItems: "center", justifyContent: "center" },
  insightLbl: { color: V.dim2, fontFamily: VF.b8, fontSize: 10, letterSpacing: 1.2, marginBottom: 6 },
  insightTxt: { color: V.tx, fontFamily: VF.b5, fontSize: 13.5, lineHeight: 20 },
});
