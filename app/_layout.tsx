import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {/* другите екрани извън табовете, ако имаш: */}
      {/* <Stack.Screen name="modal" options={{ presentation: "modal" }} /> */}
    </Stack>
  );
}


