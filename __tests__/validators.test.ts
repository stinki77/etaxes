import { validateEGN, isPositiveNumber } from "../src/lib/validators";

describe("validators", () => {
  it("валидира правилно ЕГН", () => {
    expect(validateEGN("7523169263")).toBe(true);   // валидно ЕГН
    expect(validateEGN("7523169264")).toBe(false);  // грешно ЕГН (контролната цифра е подменена)
  });

  it("проверява положителни числа", () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(-3)).toBe(false);
    expect(isPositiveNumber(0)).toBe(false);
  });
});
