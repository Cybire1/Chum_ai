import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLock } from "../components/AppLock";
import { ensureAuth } from "../lib/api";
import { authenticate, isLockEnabled } from "../lib/lock";
import { colors } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockEnabled = useRef(false);

  useEffect(() => {
    (async () => {
      // Provision the anonymous consumer in the background (no-op in mock mode).
      ensureAuth().catch(() => {});
      lockEnabled.current = await isLockEnabled();
      if (lockEnabled.current) setLocked(true);
      setReady(true);
      await SplashScreen.hideAsync().catch(() => {});
    })();
  }, []);

  // Re-lock when returning from background.
  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      if (s === "active" && lockEnabled.current) {
        // leave current lock state as-is
      } else if (s === "background" && lockEnabled.current) {
        setLocked(true);
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  const unlock = async () => {
    const ok = await authenticate("Unlock Chum");
    if (ok) setLocked(false);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          <Stack.Screen name="transcript" />
          <Stack.Screen name="reveal" />
          <Stack.Screen name="decode" />
          <Stack.Screen name="openers" />
          <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
          <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        </Stack>
        {ready && locked ? <AppLock onUnlock={unlock} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
