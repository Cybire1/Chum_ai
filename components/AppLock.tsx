import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";
import { colors, radius, space, type } from "../lib/theme";

// Full-screen lock overlay. Rendered by the root layout when app-lock is on.
export function AppLock({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.glyph}>􀎡</Text>
      </View>
      <Text style={styles.title}>Wing is locked</Text>
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
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.emberSoft,
    borderWidth: 1,
    borderColor: colors.emberLine,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  glyph: { fontSize: 30, color: colors.ember },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.muted, marginTop: space.xs },
});
