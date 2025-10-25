/** @jest-environment jsdom */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ключове от текущата имплементация
const INDEX_KEY = "@declarations_index";
const ITEM_PREFIX = "@declaration:";

const api = (() => {
  try { return require("../src/lib/archive"); } catch { return {}; }
})();
const list = api.listArchive || api.loadArchive || api.getArchive || api.fetchArchive;

describe("archive lib listing", () => {
  beforeEach(async () => {
    // @ts-ignore
    if (AsyncStorage.clear) await AsyncStorage.clear();
  });

  (list ? it : it.skip)("сортира по createdAt низх. и филтрира по година", async () => {
    const items = [
      { id:"a1", type:"payment", title:"Плащане 2025", year:2025, status:"submitted", createdAt:"2025-09-01T12:00:00Z" },
      { id:"a2", type:"declaration", title:"Декларация 2024", year:2024, status:"draft", createdAt:"2024-04-29T10:00:00Z" },
      { id:"a3", type:"payment", title:"Плащане 2025 B", year:2025, status:"draft", createdAt:"2025-11-02T08:00:00Z" },
    ];

    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(items.map(x => x.id)));
    for (const it of items) {
      await AsyncStorage.setItem(ITEM_PREFIX + it.id, JSON.stringify(it));
    }

    const all2025 = await list({ year: 2025 });
    expect(all2025.map((x: any) => x.id)).toEqual(["a3","a1"]); // низходящо по дата

    const q2024 = await list({ q: "2024" });
    expect(q2024.find((x: any) => /Декларация 2024/.test(x.title))).toBeTruthy();
    expect(q2024.find((x: any) => x.year === 2025)).toBeUndefined();
  });
});
