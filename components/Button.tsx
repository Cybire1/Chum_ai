import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { PressableScale } from "../lib/motion";
import { colors, radius, space, type } from "../lib/theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "subtle";
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
  const isGhost = variant === "ghost";
  return (
    <PressableScale
      onPress={disabled || loading ? undefined : onPress}
      hkind={isPrimary ? "medium" : "light"}
      to={isPrimary ? 0.97 : 0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[
        styles.base,
        isPrimary && styles.primaryShadow,
        isGhost && styles.ghost,
        variant === "subtle" && styles.subtle,
        disabled && { opacity: 0.45 },
        style as ViewStyle,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={["#FF7E52", "#F2592A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? "#1A0E08" : colors.text} />
        ) : (
          <Text style={[styles.label, { color: isPrimary ? "#1A0E08" : colors.text }]}>
            {label}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  primaryShadow: {
    backgroundColor: colors.ember,
    shadowColor: colors.ember,
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ghost: { borderWidth: 1, borderColor: colors.border, backgroundColor: "transparent" },
  subtle: { backgroundColor: colors.cardHi },
  label: { ...type.bodyMed, fontWeight: "700", fontSize: 16 },
});
