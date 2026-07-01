import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/hanken-grotesk";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLock } from "../components/AppLock";
import { ensureAuth } from "../lib/api";
import { authenticate, isLockEnabled } from "../lib/lock";
import { colors } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function DoneButton() {
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Done">
      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.ember }}>Done</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockEnabled = useRef(false);

  useEffect(() => {
    (async () => {
      ensureAuth().catch(() => {});
      lockEnabled.current = await isLockEnabled();
      if (lockEnabled.current) setLocked(true);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);

  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      if (s === "background" && lockEnabled.current) setLocked(true);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  const unlock = async () => {
    const ok = await authenticate("Unlock Chum");
    if (ok) setLocked(false);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerLargeTitleStyle: { color: colors.text },
            headerTitleStyle: { color: colors.text },
            headerTintColor: colors.ember,
            headerShadowVisible: false,
            headerLargeTitleShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="transcript" options={{ title: "Check the chat" }} />
          <Stack.Screen name="reveal" options={{ title: "Your replies" }} />
          <Stack.Screen name="decode" options={{ title: "Decode" }} />
          <Stack.Screen name="openers" options={{ title: "Openers" }} />
          <Stack.Screen name="memory" options={{ title: "Private Memory" }} />
          <Stack.Screen name="own" options={{ title: "Own Your Chum" }} />
          <Stack.Screen name="proof" options={{ title: "Proof Mode" }} />
          <Stack.Screen name="exercise/[id]" options={{ title: "Exercise" }} />
          <Stack.Screen name="plan" options={{ title: "Plan with AI" }} />
          <Stack.Screen name="session" options={{ headerShown: false, animation: "slide_from_bottom" }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "modal",
              title: "Settings",
              headerLargeTitle: true,
              headerRight: () => <DoneButton />,
            }}
          />
          <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
        </Stack>
        {ready && locked ? <AppLock onUnlock={unlock} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
