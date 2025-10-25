// __tests__/netCalc.more.test.ts
import { netCalc } from "../src/lib/netCalc";
it("guards invalid input", () => {
  expect(() => netCalc(NaN)).not.toThrow();
  expect(netCalc(-100).net).toBeDefined();
});