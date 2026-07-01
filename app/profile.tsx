import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { initialOf, useName } from "../lib/profile-store";
import { V, VF, VOLT_FONTS } from "../lib/volt";

const STATS = [
  { n: "52", l: "Workouts" },
  { n: "14", l: "Streak" },
  { n: "5", l: "Badges" },
  { n: "18", l: "Friends" },
];

export default function Profile() {
  const [loaded] = useFonts(VOLT_FONTS);
  const name = useName();
  const [notif, setNotif] = useState(true);
  const [autoAdapt, setAutoAdapt] = useState(true);
  const [haptics, setHaptics] = useState(true);
  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: V.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: V.bg },
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <View style={styles.idBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initialOf(name, "C")}</Text>
            <View style={styles.avatarBadge}>
              <Ionicons name="checkmark" size={11} color={V.ink} />
            </View>
          </View>
          <Text style={styles.name}>{name || "Athlete"}</Text>
          <Text style={styles.level}>Level 6 · Rookie+</Text>
          <View style={styles.xpRow}>
            <View style={styles.xpTrack}>
              <View style={styles.xpFill} />
            </View>
            <Text style={styles.xpTxt}>Level 7 · 3,800</Text>
          </View>
        </View>

        {/* stats */}
        <View style={styles.statsCard}>
          {STATS.map((s, i) => (
            <React.Fragment key={s.l}>
              {i > 0 ? <View style={styles.statDiv} /> : null}
              <View style={styles.stat}>
                <Text style={styles.statN}>{s.n}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* coach note */}
        <View style={styles.note}>
          <Ionicons name="chatbubble-ellipses" size={16} color={V.accent} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteQuote}>Small reps. Big wins.</Text>
            <Text style={styles.noteSub}>Your coach's note for today</Text>
          </View>
        </View>

        {/* preferences */}
        <Text style={styles.section}>PREFERENCES</Text>
        <View style={styles.prefCard}>
          <Pref icon="notifications-outline" label="Notifications" value={notif} onChange={setNotif} />
          <Div />
          <Pref icon="flash-outline" label="AI auto-adapts plan" value={autoAdapt} onChange={setAutoAdapt} />
          <Div />
          <Pref icon="phone-portrait-outline" label="Haptics" value={haptics} onChange={setHaptics} />
        </View>

        <Text style={styles.section}>ACCOUNT</Text>
        <View style={styles.prefCard}>
          <RowLink icon="watch-outline" label="Connected devices" value="Apple Watch" />
          <Div />
          <RowLink icon="language-outline" label="Language" value="English" />
          <Div />
          <RowLink icon="help-circle-outline" label="Help & FAQ" />
        </View>

        <Text style={styles.version}>VOLT · v0.1.0</Text>
      </ScrollView>
    </View>
  );
}

function Pref({
  icon,
  label,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={V.dim} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: V.accent, false: V.surf2 }}
        ios_backgroundColor={V.surf2}
        accessibilityRole="switch"
        accessibilityLabel={label}
      />
    </View>
  );
}

function RowLink({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={V.dim} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </View>
  );
}

const Div = () => <View style={styles.div} />;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 32 },
  idBlock: { alignItems: "center", gap: 4 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: V.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarTxt: { color: V.ink, fontFamily: VF.d7, fontSize: 34 },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: V.white,
    borderWidth: 3,
    borderColor: V.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: V.tx, fontFamily: VF.d7, fontSize: 24 },
  level: { color: V.dim, fontFamily: VF.b6, fontSize: 13 },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, width: "100%" },
  xpTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: V.surf2, overflow: "hidden" },
  xpFill: { width: "62%", height: "100%", backgroundColor: V.accent, borderRadius: 4 },
  xpTxt: { color: V.dim, fontFamily: VF.b6, fontSize: 11 },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: V.surf,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 20,
    paddingVertical: 18,
    marginTop: 24,
  },
  stat: { flex: 1, alignItems: "center" },
  statN: { color: V.tx, fontFamily: VF.d7, fontSize: 20 },
  statL: { color: V.dim, fontFamily: VF.b6, fontSize: 11, marginTop: 4 },
  statDiv: { width: 1, height: 30, backgroundColor: V.line },
  note: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: V.accentSoft,
    borderWidth: 1,
    borderColor: V.line,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },
  noteQuote: { color: V.tx, fontFamily: VF.d7, fontSize: 16 },
  noteSub: { color: V.dim, fontFamily: VF.b5, fontSize: 12.5, marginTop: 3 },
  section: { color: V.dim2, fontFamily: VF.b8, fontSize: 10.5, letterSpacing: 1.2, marginTop: 26, marginBottom: 10, marginLeft: 4 },
  prefCard: { backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, minHeight: 54 },
  rowIcon: { width: 28, alignItems: "center" },
  rowLabel: { flex: 1, color: V.tx, fontFamily: VF.d6, fontSize: 15 },
  rowValue: { color: V.dim, fontFamily: VF.b6, fontSize: 13.5 },
  div: { height: 1, backgroundColor: V.line, marginLeft: 57 },
  version: { color: V.dim2, fontFamily: VF.b6, fontSize: 12, textAlign: "center", marginTop: 26 },
});
