import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Страницата не е намерена</Text>
      <Text>Моля, върни се назад.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
