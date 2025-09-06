import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Notifications() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Известия</Text>
      <Text>Срокове и напомняния — скоро тук.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
