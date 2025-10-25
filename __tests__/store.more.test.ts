// __tests__/store.more.test.ts
const AsyncStorage = require("@react-native-async-storage/async-storage");
const mod = require("../src/lib/store");
const { listArchive, deleteArchiveItem } = mod;

beforeEach(() => {
  jest.clearAllMocks();
});

it("listArchive returns array with one declaration", async () => {
  const year = 2025;
  const key = `etaxes.declarations.${year}`;
  const payload = {
    year,
    incomesTotal: 100,
    deductionsTotal: 0,
    taxBase: 100,
    taxDue: 10,
    createdAt: "2025-01-01T00:00:00.000Z",
    status: "draft",
  };

  jest.spyOn(AsyncStorage, "getAllKeys").mockResolvedValue([key]);
  jest.spyOn(AsyncStorage, "multiGet").mockResolvedValue([[key, JSON.stringify(payload)]]);
  jest.spyOn(AsyncStorage, "getItem").mockResolvedValue(JSON.stringify(payload)); // за loadDeclaration

  const rows = await listArchive();
  expect(Array.isArray(rows)).toBe(true);
  expect(rows).toHaveLength(1);
  expect(rows[0].year).toBe(year);
});

it("deleteArchiveItem removes by year and returns true", async () => {
  const year = 2025;
  const key = `etaxes.declarations.${year}`;
  jest.spyOn(AsyncStorage, "removeItem").mockResolvedValue(undefined as any);

  const ok = await deleteArchiveItem(String(year)); // или year
  expect(ok).toBe(true);
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
});