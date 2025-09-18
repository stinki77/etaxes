import { generateNapXml } from "../src/lib/napXml";

describe("generateNapXml", () => {
  it("генерира XML с ЕГН, IBAN и година", () => {
    const payload = {
      meta: { generatedAt: "2025-09-17T00:00:00Z", app: "eTaxes", version: "1.0" },
      taxpayer: { egn: "7523169263" },
      payment: { iban: "BG80BNBG96611020345678", reason: "Test payment" },
      year: 2025,
    };
    const xml = generateNapXml(payload as any);
    expect(xml).toContain("<nap:EGN>7523169263</nap:EGN>");
    expect(xml).toContain("<nap:IBAN>BG80BNBG96611020345678</nap:IBAN>");
    expect(xml).toContain("<nap:Year>2025</nap:Year>");
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  it("включва доходи и форматира сумата с 2 десетични", () => {
    const payload = {
      meta: { generatedAt: "2025-09-17T00:00:00Z" },
      taxpayer: { egn: "7523169263" },
      payment: { iban: "BG80BNBG96611020345678", reason: "Salary" },
      year: 2025,
      income: [{ code: "01", description: "Заплата", amount: 2348.67 }],
    };
    const xml = generateNapXml(payload as any);
    expect(xml).toContain("<nap:Code>01</nap:Code>");
    expect(xml).toContain("<nap:Amount>2348.67</nap:Amount>");
  });
});
