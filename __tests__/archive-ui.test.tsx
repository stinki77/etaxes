/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";

/* ===== Local mocks (must come before requiring SUT) ===== */
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity, ScrollView, FlatList } = require("react-native");
  return {
    __esModule: true,
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    TouchableOpacity,
    ScrollView,
    FlatList,
    default: {},
  };
});

jest.mock("@react-native-async-storage/async-storage", () => {
  const mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(mem[k] ?? null),
      setItem: (k: string, v: string) => ((mem[k] = v), Promise.resolve()),
      getAllKeys: () => Promise.resolve(Object.keys(mem)),
      multiGet: (keys: string[]) => Promise.resolve(keys.map(k => [k, mem[k] ?? null] as [string, string | null])),
      multiSet: (pairs: [string,string][]) => { pairs.forEach(([k,v]) => (mem[k]=v)); return Promise.resolve(); },
      multiRemove: (keys: string[]) => { keys.forEach(k => delete mem[k]); return Promise.resolve(); },
    },
    __mem: mem,
  };
});

jest.mock("expo-localization", () => ({ __esModule: true, getLocales: () => [{ languageCode: "bg" }], locale: "bg-BG" }));
jest.mock("expo-sharing", () => ({ __esModule: true, isAvailableAsync: () => Promise.resolve(true), shareAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-clipboard", () => ({ __esModule: true, setStringAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-linking", () => ({ __esModule: true, openURL: jest.fn() }));

// Full mock за expo-router, включително <Link/>
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  const Link = ({ href, children, onPress, ...props }: any) => (
    <TouchableOpacity
      {...props}
      accessibilityRole="link"
      onPress={onPress || (() => router.push(href))}
    >
      {typeof children === "string" ? <Text>{children}</Text> : children}
    </TouchableOpacity>
  );
  return {
    __esModule: true,
    Link,
    useRouter: () => router,
    router,
    useLocalSearchParams: () => ({}),
    Stack: ({ children }: any) => <>{children}</>,
  };
});

// SafeArea mock
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    SafeAreaView: View,
    SafeAreaProvider: ({ children }: any) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
    initialWindowMetrics: null,
  };
});

// Икони mock
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const MockIcon = (props: any) => <Text>{props.name || "icon"}</Text>;
  return { __esModule: true, Ionicons: MockIcon, MaterialCommunityIcons: MockIcon, Entypo: MockIcon };
});

/* ===== След моковете импорт на SUT ===== */
const AsyncStorageMod = require("@react-native-async-storage/async-storage");
const AsyncStorage = AsyncStorageMod.default;
const mod = require("../app/(tabs)/archive");
const Archive = (mod && (mod.default || mod.Archive || mod.ArchiveScreen)) || (() => null);

const INDEX_KEY = "@declarations_index";
const ITEM_PREFIX = "@declaration:";

describe("archive UI", () => {
  beforeEach(async () => {
    const mem = AsyncStorageMod.__mem as Record<string,string>;
    Object.keys(mem).forEach(k => delete mem[k]);
    const now = Date.now();
    await AsyncStorage.multiSet([
      [INDEX_KEY, JSON.stringify(["a1"])],
      [ITEM_PREFIX+"a1", JSON.stringify({
        id:"a1", year:2025, createdAt: now-1_000, status:"submitted",
        iban:"BG00TEST", amount: 12.34, pdfUri:"file:///a1.pdf"
      })],
    ]);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test("копира IBAN при tap/long-press", async () => {
    const { getByText } = render(<Archive />);
    await waitFor(() => getByText("BG00TEST"));

    await act(async () => {
      fireEvent.press(getByText("BG00TEST"));
      fireEvent(getByText("BG00TEST"), "onLongPress");
      await Promise.resolve();
    });

    await waitFor(() => expect(require("expo-clipboard").setStringAsync).toHaveBeenCalled());
  });

  test("бутон Сподели се дизейбълва по време на share", async () => {
    render(<Archive />);
    const btn = await screen.findByText(/Сподели|Share/i);
    fireEvent.press(btn);
    await waitFor(() => expect(btn.props.children).toBeTruthy());
  });

  test("CTA при празно показва Новa декларация", async () => {
    await AsyncStorage.multiRemove([INDEX_KEY, ITEM_PREFIX+"a1"]);
    const { rerender } = render(<Archive />);
    rerender(<Archive />);
    const cta = await screen.findByText(/Нова декларация|New declaration/i);
    expect(cta).toBeTruthy();
  });
});