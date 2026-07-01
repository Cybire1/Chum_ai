import { useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CATEGORIES,
  categoryVisual,
  EXERCISES,
  type Exercise,
  searchExercises,
  titleCase,
} from "../lib/exercises";
import { V, VF, VOLT_FONTS } from "../lib/volt";

export default function Exercises() {
  const [loaded] = useFonts(VOLT_FONTS);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const results = useMemo(
    () => searchExercises({ query, category: cat ?? undefined }),
    [query, cat],
  );
  const keyExtractor = useCallback((e: Exercise) => e.id, []);
  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => <Row ex={item} />,
    [],
  );
  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Exercises",
          headerStyle: { backgroundColor: V.bg },
          headerTitleStyle: { color: V.tx, fontFamily: VF.d7 },
          headerTintColor: V.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: V.bg },
        }}
      />
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${EXERCISES.length} exercises…`}
              placeholderTextColor={V.dim2}
              selectionColor={V.accent}
              style={styles.search}
              autoCorrect={false}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {["All", ...CATEGORIES].map((o) => {
                const active = o === "All" ? cat === null : cat === o;
                return (
                  <Pressable
                    key={o}
                    onPress={() => setCat(o === "All" ? null : o)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${titleCase(o)}`}
                    accessibilityState={{ selected: active }}
                    style={[styles.chip, active && styles.chipOn]}
                  >
                    <Text style={[styles.chipTxt, active && { color: V.ink }]}>{titleCase(o)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.count}>{results.length} exercises</Text>
          </View>
        }
      />
    </View>
  );
}

const Row = React.memo(function Row({ ex }: { ex: Exercise }) {
  const v = categoryVisual(ex.category);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: ex.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${ex.name}, ${titleCase(ex.level)}`}
      style={styles.card}
    >
      <View style={styles.tile}>
        <Ionicons name={v.icon as keyof typeof Ionicons.glyphMap} size={26} color={V.accent} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.name} numberOfLines={2}>
          {ex.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {titleCase(ex.level)} · {titleCase(ex.equipment) || "No equipment"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={V.dim2} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  search: {
    backgroundColor: V.surf,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V.line,
    paddingHorizontal: 16,
    height: 46,
    color: V.tx,
    fontFamily: VF.b6,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: "center",
    backgroundColor: V.surf,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: V.line,
  },
  chipOn: { backgroundColor: V.accent, borderColor: V.accent },
  chipTxt: { color: V.dim, fontFamily: VF.d6, fontSize: 14 },
  count: { color: V.dim, fontFamily: VF.b6, fontSize: 13, marginLeft: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: V.surf,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: V.line,
    padding: 12,
  },
  tile: { width: 56, height: 56, borderRadius: 14, backgroundColor: V.accentSoft, alignItems: "center", justifyContent: "center" },
  name: { color: V.tx, fontFamily: VF.d6, fontSize: 16 },
  meta: { color: V.dim, fontFamily: VF.b6, fontSize: 12.5 },
});
