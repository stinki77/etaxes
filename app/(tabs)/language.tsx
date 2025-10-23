// app/(tabs)/language.tsx
import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

type Locale = "bg" | "en";

export default function LanguageScreen() {
  const [current, setCurrent] = useState<Locale>("en");

  const hydrate = useCallback(async () => {
    const saved = await AsyncStorage.getItem("@app_locale");
    if (saved === "bg" || saved === "en") {
      setCurrent(saved);
      return;
    }
    const device: Locale =
      (Localization.locale || "en-US").toLowerCase().startsWith("bg") ? "bg" : "en";
    setCurrent(device);
    await AsyncStorage.setItem("@app_locale", device);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const setLocale = async (lng: Locale) => {
    await AsyncStorage.setItem("@app_locale", lng);
    setCurrent(lng);
    // RootLayout има интервал за опресняване и ще отрази промяната автоматично.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{current === "bg" ? "Смяна на език" : "Language"}</Text>

      <View style={styles.row}>
        <LangButton label="Български" active={current === "bg"} onPress={() => setLocale("bg")} />
        <LangButton label="English" active={current === "en"} onPress={() => setLocale("en")} />
      </View>

      <Text style={styles.hint}>
        {current === "bg"
          ? "Съвет: промяната се отразява на табовете до 1 сек."
          : "Tip: tabs refresh within ~1s after change."}
      </Text>
    </View>
  );
}

function LangButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, active && styles.btnActive]}>
      <Text style={[styles.btnText, active && styles.btnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", gap: 12, justifyContent: "center" },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#999",
    minWidth: 130,
    alignItems: "center",
  },
  btnActive: { borderColor: "#222" },
  btnText: { fontSize: 16 },
  btnTextActive: { fontWeight: "700" },
  hint: { textAlign: "center", opacity: 0.7, marginTop: 8 },
});
