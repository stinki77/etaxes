// __tests__/incomeStorage.more.test.ts
import * as AsyncStorage from "@react-native-async-storage/async-storage";
import { loadImportedIncomesForYear } from "../src/lib/incomeStorage";

it("returns empty on missing", async () => {
  jest.spyOn(AsyncStorage, "getItem").mockResolvedValueOnce(null);
  expect(await loadImportedIncomesForYear(2025)).toEqual([]);
});