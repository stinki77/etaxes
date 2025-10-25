// __tests__/napXml.more.test.ts
import { generateNapXml } from "../src/lib/napXml";
it("handles empty incomes", () => {
  const xml = generateNapXml({ egn:"0101010000", iban:"BG00TEST00000000000001", year:2025, incomes:[] });
  expect(xml).toMatch(/<nap:Year>2025</);
});