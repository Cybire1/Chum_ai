import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { exerciseImage, getExercise, imageUrl, titleCase } from "../../lib/exercises";
import { V, VF, VOLT_FONTS } from "../../lib/volt";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loaded] = useFonts(VOLT_FONTS);
  const ex = getExercise(id);

  if (!loaded) return <View style={styles.root} />;
  if (!ex) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={voltHeader("")} />
        <Text style={styles.notFound}>Exercise not found.</Text>
      </View>
    );
  }

  const hero = exerciseImage(ex);
  const chips = [
    titleCase(ex.level),
    ex.equipment ? titleCase(ex.equipment) : null,
    ex.force ? `${titleCase(ex.force)} force` : null,
    ex.mechanic ? titleCase(ex.mechanic) : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <View style={styles.root}>
      <Stack.Screen options={voltHeader("")} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* hero */}
        <View style={styles.heroWrap}>
          {hero ? (
            <Image
              source={{ uri: hero }}
              style={styles.hero}
              resizeMode="cover"
              accessibilityLabel={ex.name}
            />
          ) : null}
          <LinearGradient
            colors={["rgba(10,10,12,0.05)", "rgba(10,10,12,0.4)", "rgba(10,10,12,0.99)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBody}>
            <View style={styles.musclePill}>
              <Text style={styles.musclePillTxt}>{titleCase(ex.primaryMuscles[0] ?? ex.category)}</Text>
            </View>
            <Text style={styles.heroName}>{ex.name}</Text>
            <Text style={styles.heroTarget}>
              {titleCase(ex.level)} · {titleCase(ex.equipment) || "No equipment"} · {titleCase(ex.category)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* chips */}
          <View style={styles.chips}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipTxt}>{c}</Text>
              </View>
            ))}
          </View>

          {/* how to */}
          {ex.instructions.length ? (
            <>
              <Text style={styles.section}>HOW TO DO IT</Text>
              <View style={{ gap: 14 }}>
                {ex.instructions.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumTxt}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepTxt}>{step}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* target muscles */}
          <Text style={[styles.section, { marginTop: 24 }]}>TARGET MUSCLES</Text>
          <View style={styles.muscleRow}>
            {ex.primaryMuscles.map((m) => (
              <View key={m} style={[styles.muscle, styles.musclePrimary]}>
                <Text style={styles.musclePrimaryTxt}>{titleCase(m)}</Text>
              </View>
            ))}
            {ex.secondaryMuscles.map((m) => (
              <View key={m} style={styles.muscle}>
                <Text style={styles.muscleTxt}>{titleCase(m)}</Text>
              </View>
            ))}
          </View>

          {ex.images?.[1] ? (
            <Image
              source={{ uri: imageUrl(ex.images[1]) }}
              style={styles.secondImg}
              resizeMode="cover"
              accessibilityLabel={ex.name}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/exercises"))}
      style={styles.backBtn}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name="chevron-back" size={22} color={V.white} style={{ marginLeft: -1 }} />
    </Pressable>
  );
}

const voltHeader = (title: string) => ({
  title,
  headerTransparent: true,
  headerStyle: { backgroundColor: "transparent" },
  headerTintColor: V.white,
  headerShadowVisible: false,
  headerLeft: () => <BackButton />,
  contentStyle: { backgroundColor: V.bg },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(16,16,20,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingBottom: 36 },
  notFound: { color: V.dim, fontFamily: VF.b6, fontSize: 15 },
  heroWrap: { height: 320, justifyContent: "flex-end" },
  hero: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", backgroundColor: V.surf2 },
  heroBody: { padding: 20 },
  musclePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,111,176,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,111,176,0.5)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 12,
  },
  musclePillTxt: { color: V.white, fontFamily: VF.b8, fontSize: 10, letterSpacing: 0.6 },
  heroName: { color: V.tx, fontFamily: VF.d7, fontSize: 30, letterSpacing: -0.5, lineHeight: 34 },
  heroTarget: { color: "rgba(255,255,255,0.75)", fontFamily: VF.b6, fontSize: 13, marginTop: 8 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  chip: { backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipTxt: { color: V.dim, fontFamily: VF.d6, fontSize: 12.5 },
  section: { color: V.accent, fontFamily: VF.b8, fontSize: 11, letterSpacing: 1.4, marginBottom: 14 },
  step: { flexDirection: "row", gap: 13, alignItems: "flex-start" },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: V.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumTxt: { color: V.accent, fontFamily: VF.d7, fontSize: 13 },
  stepTxt: { flex: 1, color: V.tx, fontFamily: VF.b5, fontSize: 14.5, lineHeight: 22, paddingTop: 3 },
  muscleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  muscle: { backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8 },
  muscleTxt: { color: V.dim, fontFamily: VF.b6, fontSize: 13 },
  musclePrimary: { backgroundColor: V.accentSoft, borderColor: "rgba(255,111,176,0.4)" },
  musclePrimaryTxt: { color: V.accent, fontFamily: VF.d6, fontSize: 13 },
  secondImg: { width: "100%", height: 200, borderRadius: 18, backgroundColor: V.surf2, marginTop: 24 },
});
