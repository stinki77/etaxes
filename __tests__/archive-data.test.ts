/** @jest-environment jsdom */

// In-memory AsyncStorage мок
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
      multiSet: (pairs: [string, string][]) => {
        pairs.forEach(([k, v]) => (mem[k] = v));
        return Promise.resolve();
      },
      multiRemove: (keys: string[]) => {
        keys.forEach((k) => delete mem[k]);
        return Promise.resolve();
      },
    },
    __mem: mem,
  };
});

jest.mock("expo-localization", () => ({
  __esModule: true,
  getLocales: () => [{ languageCode: "bg" }],
  locale: "bg-BG",
}));

const AsyncStorageMod = require("@react-native-async-storage/async-storage");
const AsyncStorage = AsyncStorageMod.default;

const {
  __readAllDeclarations,
  __deleteDeclarationById,
  __mapLegacyToRecord,
} = require("../app/(tabs)/archive");

const INDEX_KEY = "@declarations_index";
const ITEM_PREFIX = "@declaration:";

describe("archive data helpers", () => {
  beforeEach(() => {
    const mem = AsyncStorageMod.__mem as Record<string, string>;
    Object.keys(mem).forEach((k) => delete mem[k]);
    jest.clearAllMocks();
  });

  test("readAllDeclarations: чете новата схема и сортира по updatedAt/createdAt низходящо", async () => {
    const now = Date.now();
    const a = { id: "a", year: 2025, createdAt: now - 500, status: "submitted" };
    const b = { id: "b", year: 2024, createdAt: now - 100, status: "draft" };
    await AsyncStorage.multiSet([
      [ITEM_PREFIX + "a", JSON.stringify(a)],
      [ITEM_PREFIX + "b", JSON.stringify(b)],
      [INDEX_KEY, JSON.stringify(["a", "b"])],
    ]);

    const list = await __readAllDeclarations();
    expect(list.map((x: any) => x.id)).toEqual(["b", "a"]);
  });

  test("readAllDeclarations: ако няма индекс, мигрира legacy archive:* записи (масив)", async () => {
    const legacy = [
      { id: "x1", year: 2023, createdAt: "2023-02-01T00:00:00Z", status: "draft", reason: "Тест" },
      { id: "x2", year: 2022, dateISO: "2022-01-01T00:00:00Z", type: "submitted" },
    ];
    await AsyncStorage.setItem("archive:old", JSON.stringify(legacy));

    const list = await __readAllDeclarations();
    const ids = list.map((x: any) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["x1", "x2"]));
  });

  test("readAllDeclarations: мигрира legacy единичен запис (object)", async () => {
    await AsyncStorage.setItem("archive:single", JSON.stringify({ id: "s1", year: 2021, status: "draft" }));
    const list = await __readAllDeclarations();
    expect(list.find((x: any) => x.id === "s1")).toBeTruthy();
  });

  test("mapLegacyToRecord: коректно мапва различни полета и типове дати", () => {
    const rec = __mapLegacyToRecord({
      _id: "z1",
      година: "2024",
      updatedAt: "2024-05-05T00:00:00Z",
      IBAN: "BG00TEST",
      основание: "Осн.",
      amount: "12.34",
      type: "submitted",
      xml: "file:///a.xml",
      pdf: "file:///a.pdf",
    });
    expect(rec).toMatchObject({
      id: "z1",
      year: 2024,
      iban: "BG00TEST",
      reason: "Осн.",
      status: "submitted",
      xmlUri: "file:///a.xml",
      pdfUri: "file:///a.pdf",
    });
    expect(typeof rec!.createdAt).toBe("number");
    expect(rec!.updatedAt && typeof rec!.updatedAt === "number").toBe(true);
  });

  test("mapLegacyToRecord: гранични случаи", () => {
    expect(__mapLegacyToRecord(null)).toBeNull();
    expect(__mapLegacyToRecord({})).toBeNull();
    expect(__mapLegacyToRecord({ id: "x", year: "NaN" })).toBeNull();
    const withNumberDates = __mapLegacyToRecord({ id: "ok", year: 2020, createdAt: 1700000000000, status: "draft" });
    expect(withNumberDates && typeof withNumberDates.createdAt).toBe("number");
  });

  test("deleteDeclarationById: трие нов и възможен legacy ключ и обновява индекса", async () => {
    await AsyncStorage.multiSet([
      [INDEX_KEY, JSON.stringify(["a1", "a2"])],
      [ITEM_PREFIX + "a1", JSON.stringify({ id: "a1", year: 2025, createdAt: Date.now(), status: "submitted" })],
      [ITEM_PREFIX + "a2", JSON.stringify({ id: "a2", year: 2024, createdAt: Date.now(), status: "draft" })],
      ["archive:a1", JSON.stringify({ id: "a1", year: 2025 })],
    ]);

    await __deleteDeclarationById("a1");

    const keys = await AsyncStorage.getAllKeys();
    expect(keys).not.toContain(ITEM_PREFIX + "a1");
    expect(keys).not.toContain("archive:a1");

    const index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || "[]");
    expect(index).toEqual(["a2"]);
  });

  test("deleteDeclarationById: не хвърля ако липсва индекс", async () => {
    await AsyncStorage.setItem(ITEM_PREFIX + "solo", JSON.stringify({ id: "solo", year: 2025, createdAt: Date.now(), status: "draft" }));
    await __deleteDeclarationById("solo");
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).not.toContain(ITEM_PREFIX + "solo");
    const index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || "[]");
    expect(Array.isArray(index)).toBe(true);
  });

  test("readAllDeclarations: игнорира невалиден JSON без да хвърля", async () => {
    const mem = AsyncStorageMod.__mem as Record<string, string>;
    mem[INDEX_KEY] = JSON.stringify(["broken"]);
    mem[ITEM_PREFIX + "broken"] = "{not-json";

    const res = await __readAllDeclarations();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  test("readAllDeclarations: дублирани id се пазят последните по време", async () => {
    const now = Date.now();
    await AsyncStorage.multiSet([
      [INDEX_KEY, JSON.stringify(["d1"])],
      [ITEM_PREFIX + "d1", JSON.stringify({ id: "d1", year: 2020, createdAt: now - 100, status: "draft" })],
    ]);
    // legacy със същото id
    await AsyncStorage.setItem("archive:d1", JSON.stringify([{ id: "d1", year: 2020, createdAt: "2020-01-01T00:00:00Z", status: "submitted" }]));
    const list = await __readAllDeclarations();
    expect(list.find((x: any) => x.id === "d1")).toBeTruthy();
  });
});
