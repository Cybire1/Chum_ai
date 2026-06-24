import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { vibeLabel } from "../lib/format";
import { PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";
import { VIBES, type Vibe } from "../lib/types";
import { vibeColor } from "../lib/theme";

export function VibePicker({
  value,
  onChange,
}: {
  value: Vibe;
  onChange: (v: Vibe) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {VIBES.map((v) => {
        const active = v === value;
        const c = vibeColor(v);
        return (
          <PressableScale
            key={v}
            onPress={() => onChange(v)}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel={`Vibe: ${vibeLabel[v]}`}
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              {
                borderColor: active ? c : colors.border,
                backgroundColor: active ? `${c}22` : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.text : colors.dim },
              ]}
            >
              {vibeLabel[v]}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs, paddingRight: space.lg },
  pill: {
    paddingHorizontal: space.lg,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
  },
  label: { ...type.bodyMed },
});
