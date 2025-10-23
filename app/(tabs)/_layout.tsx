<<<<<<< HEAD
﻿import React from 'react';
import { Tabs } from 'expo-router';
export default function TabsLayout(){
  return (
    <Tabs screenOptions={{ headerShadowVisible:false, tabBarLabelStyle:{fontSize:12} }}>
      <Tabs.Screen name='start' options={{ title:'Декларация' }} />
      <Tabs.Screen name='language' options={{ title:'Език' }} />
=======
﻿// app/(tabs)/_layout.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";
import {
  countUnread,
  onNotificationsChanged,
  ensureSeed,
} from "../../src/lib/notifications";

export default function TabsLayout() {
  const [lng, setLng] = useState<Locale>("bg");
  const [unread, setUnread] = useState<number>(0);

  // Seed примерни известия при първо стартиране
  useEffect(() => {
    ensureSeed();
  }, []);

  // Следене на езика
  useEffect(() => {
    let off = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      off = onLocaleChange(setLng);
    })();
    return () => off();
  }, []);

  // Следене на броя непрочетени известия
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const n = await countUnread();
      if (!cancelled) setUnread(n);
    };
    const offBus = onNotificationsChanged(() => {
      // моментален рефреш при промяна
      refresh();
    });
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      offBus();
      clearInterval(id);
    };
  }, []);

  const t = useCallback((k: string) => tSync(lng, k), [lng]);

  const screenOpts = useMemo(
    () => ({
      headerShown: true,
      tabBarActiveTintColor: "#2e7d32",
      tabBarLabelStyle: { fontSize: 12 },
    }),
    []
  );

  return (
    <Tabs key={lng} initialRouteName="declaration" screenOptions={screenOpts}>
      <Tabs.Screen
        name="incomes"
        options={{
          title: t("tabs.incomes"),
          tabBarLabel: t("tabs.incomes"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="income-sources"
        options={{
          title: t("tabs.incomeSources") || "Източници",
          tabBarLabel: t("tabs.incomeSources") || "Източници",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-upload-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="deductions"
        options={{
          title: t("tabs.deductions"),
          tabBarLabel: t("tabs.deductions"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetags-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="declaration"
        options={{
          title: t("tabs.declaration"),
          tabBarLabel: t("tabs.declaration"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: t("tabs.archive"),
          tabBarLabel: t("tabs.archive"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: t("tabs.language"),
          tabBarLabel: t("tabs.language"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("tabs.notifications") || "Известия",
          tabBarLabel: t("tabs.notifications") || "Известия",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
>>>>>>> restore/all
    </Tabs>
  );
}
