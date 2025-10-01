// __tests__/netCalc.test.ts
/**
 * Tries to load a netCalc-like function from several plausible modules.
 * Expected semantics: compute net income from gross given contribution rates and PIT.
 * Supported signatures (any one is fine):
 *  - netCalc(gross: number, opts?: { social?: number; health?: number; taxRate?: number; deductions?: number }): number
 *  - netCalc({ gross, social, health, taxRate, deductions }): number
 */
function loadNetCalc(): (gross: number, opts?: { social?: number; health?: number; taxRate?: number; deductions?: number }) => number {
  const candidates = [
    ["../../src/lib/calculators", "netCalc"],
    ["../../src/lib/tax", "netCalc"],
    ["../../src/lib/taxAdapter", "netCalc"],
    ["../../src/utils/calculators", "netCalc"],
  ] as const;

  for (const [mod, key] of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const m = require(mod);
      const fn = m?.[key] ?? m?.default?.[key] ?? m?.default;
      if (typeof fn === "function") {
        return (gross: number, opts: any = {}) => {
          const { social = 0, health = 0, taxRate = 0.10, deductions = 0 } = opts || {};
          try {
            if (fn.length >= 2) return Number(fn(gross, { social, health, taxRate, deductions }));
            if (fn.length === 1) return Number(fn({ gross, social, health, taxRate, deductions }));
            return Number(fn(gross)); // best effort
          } catch {
            return Number(fn({ gross, social, health, taxRate, deductions }));
          }
        };
      }
    } catch {}
  }
  throw new Error("Cannot find a netCalc function in known locations.");
}

describe("netCalc sanity and a canonical BG-like case", () => {
  const netCalc = loadNetCalc();

  test("net is not greater than gross", () => {
    const net = netCalc(1500, { social: 0.138, health: 0.08, taxRate: 0.10, deductions: 0 });
    expect(net).toBeLessThanOrEqual(1500);
  });

  test("monotonicity: higher gross → higher net (holding rates fixed)", () => {
    const net1 = netCalc(1000, { social: 0.138, health: 0.08, taxRate: 0.10 });
    const net2 = netCalc(2000, { social: 0.138, health: 0.08, taxRate: 0.10 });
    expect(net2).toBeGreaterThan(net1);
  });

  test("BG-style example with flat 10% PIT on base after social+health", () => {
    const gross = 2000;
    const social = 0.138; // 13.8%
    const health = 0.08;  // 8%
    const taxRate = 0.10; // 10% PIT
    const contributions = gross * (social + health);
    const taxableBase = gross - contributions;
    const tax = taxableBase * taxRate;
    const expectedNet = gross - contributions - tax;

    const net = netCalc(gross, { social, health, taxRate });
    // Allow small rounding differences
    expect(net).toBeCloseTo(expectedNet, 2);
  });

  test("handles fixed deductions before PIT if supported", () => {
    const gross = 1200;
    const social = 0.10;
    const health = 0.05;
    const deductions = 100; // fixed amount deducted from taxable base
    const taxRate = 0.10;

    const contributions = gross * (social + health);
    const taxableBase = Math.max(0, gross - contributions - deductions);
    const tax = taxableBase * taxRate;
    const expectedNet = gross - contributions - tax;

    const net = netCalc(gross, { social, health, taxRate, deductions });
    expect(net).toBeCloseTo(expectedNet, 2);
  });
});
