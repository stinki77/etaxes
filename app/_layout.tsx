// app/_layout.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Tabs } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Locale = "bg" | "en";
const LOCALE_KEYS = ["@app_locale", "@locale", "locale"] as const;

const TITLES: Record<Locale, Record<string, string>> = {
  bg: {
    "create-tax": "Създай данък",
    archive: "Архив",
    calculators: "Калкулатори",
    notifications: "Известия",
    language: "Смяна на език",
  },
  en: {
    "create-tax": "Create tax",
    archive: "Archive",
    calculators: "Calculators",
    notifications: "Notifications",
    language: "Language",
  },
};

function tabIcon(name: string, focused: boolean, color: string, size: number) {
  switch (name) {
    case "(tabs)/create-tax":
      return (
        <MaterialCommunityIcons
          name={focused ? "file-document" : "file-document-outline"}
          size={size}
          color={color}
        />
      );
    case "(tabs)/archive":
      return <Ionicons name={focused ? "archive" : "archive-outline"} size={size} color={color} />;
    case "(tabs)/calculators":
      return (
        <MaterialCommunityIcons
          name={focused ? "calculator-variant" : "calculator-variant-outline"}
          size={size}
          color={color}
        />
      );
    case "(tabs)/notifications":
      return (
        <Ionicons
          name={focused ? "notifications" : "notifications-outline"}
          size={size}
          color={color}
        />
      );
    case "(tabs)/language":
      return <Ionicons name={focused ? "language" : "language-outline"} size={size} color={color} />;
    default:
      return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
}

function getDeviceLocale(): Locale {
  const tag = Localization.locale || Localization.getLocales?.()[0]?.languageTag || "en-US";
  return tag.toLowerCase().startsWith("bg") ? "bg" : "en";
}

async function loadSavedLocale(): Promise<Locale | null> {
  for (const key of LOCALE_KEYS) {
    const v = await AsyncStorage.getItem(key);
    if (v === "bg" || v === "en") return v;
  }
  return null;
}

export default function RootLayout() {
  const [locale, setLocale] = useState<Locale | null>(null);

  // 1) Хидратиране
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadSavedLocale();
        const effective = saved ?? getDeviceLocale();
        if (mounted) setLocale(effective);
        await AsyncStorage.setItem("@app_locale", effective);
      } catch {
        if (mounted) setLocale("en");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Живо опресняване
  useEffect(() => {
    let canceled = false;
    const id = setInterval(async () => {
      try {
        const saved = await AsyncStorage.getItem("@app_locale");
        if (!canceled && (saved === "bg" || saved === "en") && saved !== locale) {
          setLocale(saved as Locale);
        }
      } catch {}
    }, 700);
    return () => {
      canceled = true;
      clearInterval(id);
    };
  }, [locale]);

  // 3) ВИНАГИ извикваме тези hooks, без значение дали ще покажем loader
  const safeLocale = (locale ?? "en") as Locale;
  const titles = useMemo(() => TITLES[safeLocale], [safeLocale]);
  const screen = useCallback(
    (name: keyof typeof titles) => ({
      title: titles[name],
      headerTitle: titles[name],
      headerShadowVisible: false,
    }),
    [titles]
  );

  // 4) Loader след всички hooks
  if (!locale) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ focused, color, size }) => tabIcon(route.name, focused, color, size),
        tabBarStyle: Platform.select({
          ios: { height: 84 },
          android: { height: 64 },
          default: undefined,
        }),
      })}
    >
      <Tabs.Screen name="(tabs)/create-tax" options={screen("create-tax")} />
      <Tabs.Screen name="(tabs)/archive" options={screen("archive")} />
      <Tabs.Screen name="(tabs)/calculators" options={screen("calculators")} />
      <Tabs.Screen name="(tabs)/notifications" options={screen("notifications")} />
      <Tabs.Screen name="(tabs)/language" options={screen("language")} />
    </Tabs>
  );
}
