// __tests__/tax.test.ts
import { calculateTax } from "../src/lib/tax";

describe("calculateTax - базови и гранични случаи", () => {
  it("стандартен пример: income 1000, normative 20%, social 13.78%, deductions 0", () => {
    const r = calculateTax({ income: 1000, normativePercent: 20, socialPercent: 13.78, deductions: 0 });
    expect(r.normativeAmount).toBeCloseTo(200.0, 2);
    expect(r.socialAmount).toBeCloseTo(137.8, 2);
    expect(r.taxableIncome).toBeCloseTo(662.2, 2);
    expect(r.tax).toBeCloseTo(66.22, 2);
    expect(r.netIncome).toBeCloseTo(795.98, 2);
  });

  it("нулев доход -> всички стойности нулирани", () => {
    const r = calculateTax({ income: 0, normativePercent: 20, socialPercent: 13.78, deductions: 0 });
    expect(r.income).toBeCloseTo(0, 2);
    expect(r.normativeAmount).toBeCloseTo(0, 2);
    expect(r.socialAmount).toBeCloseTo(0, 2);
    expect(r.taxableIncome).toBeCloseTo(0, 2);
    expect(r.tax).toBeCloseTo(0, 2);
    expect(r.netIncome).toBeCloseTo(0, 2);
  });

  it("големи облекчения -> облагаем доход 0, данък 0, net = income - social", () => {
    const r = calculateTax({ income: 500, normativePercent: 0, socialPercent: 10, deductions: 1000 });
    expect(r.normativeAmount).toBeCloseTo(0, 2);
    expect(r.socialAmount).toBeCloseTo(50, 2);
    expect(r.taxableIncome).toBeCloseTo(0, 2);
    expect(r.tax).toBeCloseTo(0, 2);
    expect(r.netIncome).toBeCloseTo(450, 2);
  });

  it("десетични стойности: проверка на закръглявания", () => {
    const r = calculateTax({ income: 1234.56, normativePercent: 15, socialPercent: 12.5, deductions: 100 });
    expect(r.normativeAmount).toBeCloseTo(185.18, 2);
    expect(r.socialAmount).toBeCloseTo(154.32, 2);
    expect(r.taxableIncome).toBeCloseTo(795.06, 2);
    expect(r.tax).toBeCloseTo(79.51, 2);
    expect(r.netIncome).toBeCloseTo(1000.73, 2);
  });

  it("негативен доход се третира като 0", () => {
    const r = calculateTax({ income: -100, normativePercent: 20, socialPercent: 10, deductions: 0 });
    expect(r.income).toBeCloseTo(-100, 2); // функцията запазва входа, но резултатите трябва да са 0/отрицателни логики проверени
    // основните резултати не трябва да доведат до положителен данък
    expect(r.taxableIncome).toBeGreaterThanOrEqual(0);
    expect(r.tax).toBeGreaterThanOrEqual(0);
  });

  it("percent > 100 -> taxable clamped to 0, tax 0", () => {
    const r = calculateTax({ income: 1000, normativePercent: 120, socialPercent: 0, deductions: 0 });
    expect(r.normativeAmount).toBeCloseTo(1200, 2);
    expect(r.taxableIncome).toBeCloseTo(0, 2);
    expect(r.tax).toBeCloseTo(0, 2);
  });

  it("нечислови входни стойности -> безопасен резултат", () => {
    // @ts-ignore - целенасочено подаваме неправилен тип
    const r1 = calculateTax({ income: NaN, normativePercent: 10, socialPercent: 10, deductions: 0 });
    expect(r1.income).toBeCloseTo(0, 2);

    // @ts-ignore
    const r2 = calculateTax({ income: undefined, normativePercent: undefined, socialPercent: undefined, deductions: undefined });
    expect(r2.income).toBeCloseTo(0, 2);
    expect(r2.tax).toBeCloseTo(0, 2);
  });

  it("много голям доход (стрес тест)", () => {
    const r = calculateTax({ income: 1e9, normativePercent: 10, socialPercent: 10, deductions: 0 });
    expect(r.income).toBeCloseTo(1e9, 2);
    expect(r.taxableIncome).toBeGreaterThan(0);
    expect(r.tax).toBeCloseTo(r.taxableIncome * 0.1, 2);
  });
});
