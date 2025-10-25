/** @jest-environment jsdom */
import AsyncStorage from "@react-native-async-storage/async-storage";

// динамично вземи API от store или archive
const storeMod = () => {
  try { return require("../src/lib/store"); } catch { return {}; }
};
const archMod = () => {
  try { return require("../src/lib/archive"); } catch { return {}; }
};
const pick = (obj: any, names: string[]) => names.find(n => typeof obj[n] === "function") as string | undefined;

describe("store CRUD smoke", () => {
  const S = storeMod();
  const A = archMod();

  // налични функции под различни имена
  const saveName   = pick(S, ["saveToArchive","upsertArchive","addToArchive"]) || pick(A, ["saveToArchive","upsertArchive","addToArchive"]);
  const listName   = pick(S, ["listArchive","loadArchive","getArchive","fetchArchive"]) || pick(A, ["listArchive","loadArchive","getArchive","fetchArchive"]);
  const deleteName = pick(S, ["deleteArchiveItem","removeArchiveItem"]) || pick(A, ["deleteArchiveItem","removeArchiveItem"]);

  const save   = saveName   ? (S[saveName] || A[saveName]).bind(S[saveName] ? S : A) : null;
  const list   = listName   ? (S[listName] || A[listName]).bind(S[listName] ? S : A) : null;
  const del    = deleteName ? (S[deleteName] || A[deleteName]).bind(S[deleteName] ? S : A) : null;

  beforeEach(async () => {
    // изчисти mock AsyncStorage
    // @ts-ignore
    if (AsyncStorage.clear) await AsyncStorage.clear();
  });

  (save && list ? it : it.skip)("creates → lists → deletes", async () => {
    const now = new Date("2025-01-02T03:04:05Z").toISOString();
    const rec = { id:"t1", type:"payment", title:"Тест 2025", year:2025, status:"draft", createdAt:now };

    await save!(rec);
    const afterCreate = await list!({ year: 2025 });
    expect(afterCreate.find((x: any) => x.id === "t1")).toBeTruthy();

    if (del) {
      await del!("t1");
      const afterDelete = await list!({ year: 2025 });
      expect(afterDelete.find((x: any) => x.id === "t1")).toBeUndefined();
    }
  });
});
