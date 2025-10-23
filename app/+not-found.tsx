<<<<<<< HEAD
import React from "react";
=======
﻿import React from "react";
>>>>>>> restore/all
import { View, Text, StyleSheet } from "react-native";

export default function NotFound() {
  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <Text style={styles.title}>Страницата не е намерена</Text>
      <Text>Моля, върни се назад.</Text>
=======
      <Text style={styles.title}>РЎС‚СЂР°РЅРёС†Р°С‚Р° РЅРµ Рµ РЅР°РјРµСЂРµРЅР°</Text>
      <Text>РњРѕР»СЏ, РІСЉСЂРЅРё СЃРµ РЅР°Р·Р°Рґ.</Text>
>>>>>>> restore/all
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
