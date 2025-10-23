// __tests__/taxCalc.test.ts
/**
 * Tries to load a taxCalc-like function from several plausible modules.
 * Supports common signatures:
 *  - taxCalc(taxable: number, rate?: number, advance?: number): number
 *  - taxCalc({ taxable, rate, advance }): number
 *  - calculateTax(...) as an alias
 */
function loadTaxCalc(): (taxable: number, rate?: number, advance?: number) => number {
  const candidates = [
    ["../../src/lib/calculators", "taxCalc"],
    ["../../src/lib/calculators", "calculateTax"],
    ["../../src/lib/tax", "taxCalc"],
    ["../../src/lib/tax", "calculateTax"],
    ["../../src/lib/taxAdapter", "taxCalc"],
    ["../../src/lib/taxAdapter", "calculateTax"],
    ["../../src/utils/calculators", "taxCalc"],
    ["../../src/utils/calculators", "calculateTax"],
  ] as const;

  for (const [mod, key] of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const m = require(mod);
      const fn = m?.[key] ?? m?.default?.[key] ?? m?.default;
      if (typeof fn === "function") {
        // Wrap into a normalized (taxable, rate, advance) signature
        return (taxable: number, rate: number = 0.10, advance: number = 0) => {
          try {
            if (fn.length >= 3) return Number(fn(taxable, rate, advance));
            if (fn.length === 2) return Number(fn(taxable, rate));
            if (fn.length === 1) return Number(fn(taxable));
            // Try object call
            return Number(fn({ taxable, rate, advance }));
          } catch {
            // Try alternative object keys
            return Number(fn({ income: taxable, rate, advance }));
          }
        };
      }
    } catch {}
  }
  throw new Error("Cannot find a taxCalc/calculateTax function in known locations.");
}

describe("taxCalc basic correctness", () => {
  const taxCalc = loadTaxCalc();

  test("10% tax on 1000 = 100", () => {
    const result = taxCalc(1000, 0.10, 0);
    expect(result).toBeCloseTo(100, 2);
  });

  test("applies advance payment correctly", () => {
    const grossTax = taxCalc(2000, 0.10, 0); // expect ≈ 200
    const afterAdvance = taxCalc(2000, 0.10, 50); // expect ≈ 150
    expect(afterAdvance).toBeCloseTo(grossTax - 50, 2);
    expect(afterAdvance).toBeGreaterThanOrEqual(0);
  });

  test("zero taxable yields zero tax", () => {
    expect(taxCalc(0, 0.10, 0)).toBeCloseTo(0, 2);
  });
});
