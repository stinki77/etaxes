// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#2e7d32" }}>
      <Tabs.Screen
        name="create-tax"
        options={{
          title: t("createTax"),
          tabBarIcon: ({ color, size }) => <Ionicons name="create" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: t("archiveTitle"),
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          title: t("calculators"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calculator" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="income-sources"
        options={{
          title: t("incomeSources"),
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("notifications"),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
