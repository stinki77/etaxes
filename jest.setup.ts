import "@testing-library/jest-native/extend-expect";

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

// setImmediate for jsdom
// @ts-ignore
global.setImmediate = global.setImmediate || ((cb: any, ...args: any[]) => setTimeout(cb, 0, ...args));

// optional fetch mock to avoid unexpected network calls
// @ts-ignore
global.fetch = global.fetch || (async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "" }));

// === Expo / RN mocks ===
jest.mock("expo-linking", () => ({ __esModule: true, openURL: jest.fn() }));
jest.mock("expo-clipboard", () => ({ __esModule: true, setStringAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-document-picker", () => ({ __esModule: true, getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  __esModule: true,
  cacheDirectory: "/tmp/",
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));
jest.mock("expo-file-system/legacy", () => ({
  __esModule: true,
  ...jest.requireMock("expo-file-system"),
}));
jest.mock("expo-print", () => ({ __esModule: true, printAsync: jest.fn(), selectPrinterAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({
  __esModule: true,
  isAvailableAsync: async () => true,
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// react-native-reanimated
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// gesture-handler (virtual mock, без зависимост към пакета)
jest.mock(
  "react-native-gesture-handler",
  () => {
    const React = require("react");
    const Null = () => null;
    return {
      __esModule: true,
      GestureHandlerRootView: Null,
      Swipeable: Null,
      DrawerLayout: Null,
      State: {},
      PanGestureHandler: Null,
      TapGestureHandler: Null,
      LongPressGestureHandler: Null,
      default: {},
    };
  },
  { virtual: true }
);

// safe-area-context (без JSX)
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    SafeAreaView: View,
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
    initialWindowMetrics: null,
  };
});

// expo-router with <Link/> (без JSX)
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  const Link = ({ href, children, onPress, ...props }: any) =>
    React.createElement(
      TouchableOpacity,
      { ...props, accessibilityRole: "link", onPress: onPress || (() => router.push(href)) },
      typeof children === "string" ? React.createElement(Text, null, children) : children
    );
  const Stack = ({ children }: any) => React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    Link,
    useRouter: () => router,
    router,
    useLocalSearchParams: () => ({}),
    Stack,
  };
});

// vector-icons (без JSX)
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = (p: any) => React.createElement(Text, null, p.name || "icon");
  return { __esModule: true, Ionicons: Icon, MaterialCommunityIcons: Icon, Entypo: Icon };
});

// react-native-svg and qrcode
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Svg = (p: any) => React.createElement(View, p);
  return { __esModule: true, default: Svg };
});
jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const QR = (p: any) => React.createElement(View, p);
  return { __esModule: true, default: QR };
});

// AsyncStorage default mock; tests can override
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// expo-localization
jest.mock("expo-localization", () => ({
  __esModule: true,
  getLocales: () => [{ languageCode: "bg", regionCode: "BG" }],
  locale: "bg-BG",
}));

// Silence native driver warnings
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", () => ({}), { virtual: true });

// Consistent timers
afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

// Silence "not wrapped in act(...)" warnings to keep logs clean
const __origError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const msg = String(args[0] ?? "");
    if (/not wrapped in act/.test(msg)) return;
    return (__origError as any)(...args);
  };
});
afterAll(() => {
  console.error = __origError;
});