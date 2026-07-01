import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { spiceLabel } from "../lib/format";
import { PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";

// Active segment fill warms by value — lilac → rose → peach — the Spotlight Tell.
const SEG_TINT: Record<1 | 2 | 3, string> = {
  1: colors.lilacTint,
  2: colors.roseTint,
  3: colors.peachTint,
};

// Segmented 1/2/3 control. Hard-capped at 3 (bold-but-SFW) — there is no
// explicit tier (App Store 1.1.4).
export function SpiceSlider({
  value,
  onChange,
}: {
  value: 1 | 2 | 3;
  onChange: (v: 1 | 2 | 3) => void;
}) {
  return (
    <View>
      <View style={styles.track}>
        {([1, 2, 3] as const).map((s) => {
          const active = s === value;
          return (
            <PressableScale
              key={s}
              onPress={() => onChange(s)}
              hkind="light"
              accessibilityRole="button"
              accessibilityLabel={`Spice: ${spiceLabel(s)}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.seg,
                active && { backgroundColor: SEG_TINT[s] },
              ]}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>
                {spiceLabel(s)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>Bold stays classy — never explicit.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  segLabel: { ...type.bodyMed, color: colors.muted },
  segLabelActive: { color: colors.text },
  hint: { ...type.meta, color: colors.faint, marginTop: space.sm },
});
