/** @jest-environment jsdom */

// Мокове преди импорти
jest.mock("@react-native-async-storage/async-storage", () => {
  const mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(mem[k] ?? null),
      setItem: (k: string, v: string) => ((mem[k] = v), Promise.resolve()),
      removeItem: (k: string) => ((delete mem[k]), Promise.resolve()),
      getAllKeys: () => Promise.resolve(Object.keys(mem)),
      multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, mem[k] ?? null])),
    },
    __mem: mem,
  };
});
jest.mock("expo-localization", () => ({
  __esModule: true,
  getLocales: () => [{ languageCode: "bg" }],
  locale: "bg-BG",
}));

describe("migrateLegacy", () => {
  it("migrates archive:* → @declaration:* и обновява индекса", async () => {
    const AsyncStorageMod = require("@react-native-async-storage/async-storage");
    const AsyncStorage = AsyncStorageMod.default;
    const mem = AsyncStorageMod.__mem as Record<string, string>;

    // seed legacy
    mem["archive:old"] = JSON.stringify([
      { id: "x1", year: 2024, createdAt: "2024-01-01T00:00:00Z", status: "draft" },
    ]);

    const { migrateLegacy } = require("../src/lib/migrateLegacy");
    const res = await migrateLegacy();
    expect(res.migrated).toBe(1);

    const index = JSON.parse((await AsyncStorage.getItem("@declarations_index")) || "[]");
    expect(index).toContain("x1");

    const rec = await AsyncStorage.getItem("@declaration:x1");
    expect(rec).toBeTruthy();
    expect(mem["archive:old"]).toBeUndefined(); // legacy ключът е изтрит
  });
});
