import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import React from "react";
import { Pressable, Text } from "react-native";

import { colors } from "../../lib/theme";

function GearButton() {
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={{ paddingHorizontal: 4 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.dim} />
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontSize: 20, fontWeight: "800" },
        headerShadowVisible: false,
        headerRight: () => <GearButton />,
        tabBarActiveTintColor: colors.lilac,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.hairline },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chum",
          headerShown: false,
          tabBarLabel: "Wingman",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          headerShown: false,
          tabBarLabel: "Coach",
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          headerShown: false,
          tabBarLabel: "Today",
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
