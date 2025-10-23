// jest.setup.ts

import { TextEncoder, TextDecoder } from "util";

// === Polyfills ===
// @ts-ignore
global.TextEncoder = global.TextEncoder || TextEncoder;
// @ts-ignore
global.TextDecoder = global.TextDecoder || (TextDecoder as any);
// @ts-ignore
global.atob = global.atob || ((b: string) => Buffer.from(b, "base64").toString("binary"));
// @ts-ignore
global.btoa = global.btoa || ((s: string) => Buffer.from(s, "binary").toString("base64"));

// === Expo / RN mocks ===
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  cacheDirectory: "/tmp/",
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: async () => false,
  shareAsync: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// === react-native-reanimated (virtual mock; пакетът може да липсва) ===
jest.mock(
  "react-native-reanimated",
  () => {
    const Reanimated: any = new Proxy({}, { get: () => jest.fn() });
    Reanimated.default = Reanimated;
    Reanimated.Easing = {};
    Reanimated.useSharedValue = (init: any) => ({ value: init });
    Reanimated.useAnimatedStyle = (fn?: any) => (typeof fn === "function" ? fn() : {});
    Reanimated.withTiming = (v: any) => v;
    Reanimated.withSpring = (v: any) => v;
    Reanimated.cancelAnimation = jest.fn();
    return Reanimated;
  },
  { virtual: true }
);

// === Потискане на useNativeDriver предупреждения (virtual mock) ===
jest.mock(
  "react-native/Libraries/Animated/NativeAnimatedHelper",
  () => ({}),
  { virtual: true }
);
