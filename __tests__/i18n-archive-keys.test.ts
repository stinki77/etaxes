/**
 * @jest-environment jsdom
 */

// Мокове ПРЕДИ require на модула
jest.mock("@react-native-async-storage/async-storage", () => {
  const mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => ((mem[k] = v), Promise.resolve())),
      removeItem: jest.fn((k: string) => (delete mem[k], Promise.resolve())),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mem))),
      multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, mem[k] ?? null]))),
      multiSet: jest.fn((pairs: [string, string][]) => {
        pairs.forEach(([k, v]) => (mem[k] = v));
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((k) => delete mem[k]);
        return Promise.resolve();
      }),
    },
  };
});

jest.mock("expo-localization", () => ({
  __esModule: true,
  getLocales: () => [{ languageCode: "en" }],
  locale: "en-US",
}));

// Защитен импорт, покрива default и именовани експорти
const mod = require("../src/localization");
const api = mod.default ?? mod;

const tSync: (a: any, b?: any) => string =
  typeof mod.tSync === "function" ? mod.tSync : api.tSync;

describe("i18n archive keys", () => {
  const KEYS = [
    "archive.payment_for_year",
    "archive.seed",
    "archive.share_unavailable",
    "archive.no_file_title",
    "archive.no_file_text",
    "archive.copied",
    "archive.filter_year",
    "archive.search",
    "archive.status",
    "archive.empty",
    "archive.no_match",
    "common.error",
    "common.reload",
  ];

  it("returns BG strings", () => {
    for (const k of KEYS) {
      const v = tSync("bg", k);
      expect(typeof v === "string" && v.length > 0).toBe(true);
    }
  });

  it("returns EN strings", () => {
    for (const k of KEYS) {
      const v = tSync("en", k);
      expect(typeof v === "string" && v.length > 0).toBe(true);
    }
  });
});
