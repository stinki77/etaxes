<<<<<<< HEAD
﻿import React from 'react';
import { View, Text } from 'react-native';
export default function Language(){
  return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
      <Text style={{fontSize:20,fontWeight:'700'}}>Език</Text>
    </View>
  );
}
=======
﻿// app/(tabs)/language.tsx
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLocale, onLocaleChange, setLocale, tSync, type Locale } from "../../src/localization";

export default function LanguageScreen() {
  const [lng, setLng] = useState<Locale>("bg");

  useEffect(() => {
    let off = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      off = onLocaleChange(setLng);
    })();
    return () => off();
  }, []);

  const t = useCallback((k: string) => tSync(lng, k), [lng]);

  const switchTo = async (target: Locale) => {
    await setLocale(target);
    // setLocale ще емитира и ще дойде през onLocaleChange
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{t("language.title") || "Language"}</Text>
      <Text style={styles.hint}>{t("language.hint") || "Choose a language. Changes apply immediately."}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, lng === "bg" ? styles.btnActive : styles.btnPassive]}
          onPress={() => switchTo("bg")}
        >
          <Text style={lng === "bg" ? styles.btnTextActive : styles.btnTextPassive}>{t("language.bg") || "Български"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, lng === "en" ? styles.btnActive : styles.btnPassive]}
          onPress={() => switchTo("en")}
        >
          <Text style={lng === "en" ? styles.btnTextActive : styles.btnTextPassive}>{t("language.en") || "English"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.currentBox}>
        <Text style={styles.currentLabel}>{t("language.current") || "Current language"}</Text>
        <Text style={styles.currentValue}>{lng === "bg" ? "Български" : "English"}</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  hint: { fontSize: 12, color: "#444", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  btnActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  btnPassive: { backgroundColor: "#fff", borderColor: "#ccc" },
  btnTextActive: { color: "#fff", fontWeight: "700" },
  btnTextPassive: { color: "#111", fontWeight: "700" },
  currentBox: { marginTop: 16, borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, backgroundColor: "#fafafa" },
  currentLabel: { fontSize: 12, color: "#444" },
  currentValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
});
>>>>>>> restore/all
