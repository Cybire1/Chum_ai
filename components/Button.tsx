import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { PressableScale } from "../lib/motion";
import { colors, gradients, radius, shadow, space, type } from "../lib/theme";

type Variant = "primary" | "hero" | "ghost" | "subtle";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === "primary";
  const isHero = variant === "hero";
  const isGhost = variant === "ghost";
  const isSubtle = variant === "subtle";

  // label / spinner ink per surface
  const labelColor = isPrimary
    ? colors.ink // near-black on the white pill
    : isHero
      ? "#FFFFFF" // white on the gradient gel
      : colors.text;
  const spinnerColor = isPrimary ? colors.ink : isHero ? "#FFFFFF" : colors.text;

  return (
    <PressableScale
      onPress={disabled || loading ? undefined : onPress}
      hkind={isPrimary || isHero ? "medium" : "light"}
      to={isHero ? 0.96 : isPrimary ? 0.97 : 0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isHero && styles.hero,
        isGhost && styles.ghost,
        isSubtle && styles.subtle,
        disabled && { opacity: 0.45 },
        style as ViewStyle,
      ]}
    >
      {isHero ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  // DEFAULT everyday CTA — flat WHITE PILL on near-black (no gradient, no shadow)
  primary: {
    backgroundColor: colors.white,
  },
  // the rationed gradient GEL-PILL — used exactly once per flow
  hero: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.focus, // ~rgba(255,255,255,0.12) rim
    ...shadow.brand,
  },
  // transparent, hairline-ringed ghost
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.focus,
  },
  subtle: { backgroundColor: colors.chip },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  label: { ...type.bodyMed, fontWeight: "800", fontSize: 16 },
});
