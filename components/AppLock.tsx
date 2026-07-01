import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Blob } from "./Blob";
import { Button } from "./Button";
import { colors, space, type } from "../lib/theme";

// Full-screen lock overlay. Rendered by the root layout when app-lock is on.
export function AppLock({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Blob face="privacy" hue="lilac" size={120} />
      </View>
      <Text style={styles.title}>Chum is locked</Text>
      <Text style={styles.sub}>Your conversations stay on your device.</Text>
      <Button label="Unlock" onPress={onUnlock} style={{ marginTop: space.xl, minWidth: 200 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
  },
  hero: { marginBottom: space.lg },
  title: { ...type.title, color: colors.text, textAlign: "center" },
  sub: { ...type.body, color: colors.muted, marginTop: space.xs, textAlign: "center" },
});
