<<<<<<< HEAD
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
=======
// __tests__/validators.test.ts
/**
 * Jest tests for EGN and IBAN validators.
 * The tests tolerate different export names by resolving functions from the module.
 */
import * as V from "../src/lib/validators";

function getEgnValidator(): (v: string) => boolean {
  const fn = (V as any).validateEGN || (V as any).isValidEGN || (V as any).egnIsValid || (V as any).EGN_isValid;
  if (typeof fn !== "function") {
    throw new Error("EGN validator not found in ../src/lib/validators. Expected one of: validateEGN, isValidEGN, egnIsValid.");
  }
  return fn as (v: string) => boolean;
}

function getIbanValidator(): (v: string) => boolean {
  const fn = (V as any).validateIBAN || (V as any).isValidIBAN || (V as any).ibanIsValid || (V as any).IBAN_isValid;
  if (typeof fn !== "function") {
    throw new Error("IBAN validator not found in ../src/lib/validators. Expected one of: validateIBAN, isValidIBAN, ibanIsValid.");
  }
  return fn as (v: string) => boolean;
}

/** Helpers to synthesize valid test data (canonical algorithms). */
// --- EGN generator ---
// We follow the official checksum with weights [2,4,8,5,10,9,7,3,6].
// Month encoding: 1900-1999 => MM, 2000-2099 => MM+40, 1800-1899 => MM+20.
function pad(n: number, w: number) {
  return n.toString().padStart(w, "0");
}
function egnChecksum(digits: number[]): number {
  const weights = [2,4,8,5,10,9,7,3,6];
  const sum = weights.reduce((s, w, i) => s + w * digits[i], 0);
  const r = sum % 11;
  return r === 10 ? 0 : r;
}
function makeValidEGN(date: Date, region: number, male: boolean): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let mm = m;
  if (y >= 2000 && y <= 2099) mm = m + 40;
  else if (y >= 1800 && y <= 1899) mm = m + 20;
  const yy = y % 100;
  const base = `${pad(yy,2)}${pad(mm,2)}${pad(d,2)}${pad(region,3)}`;
  // gender: last of region+gender block -> even=male, odd=female
  // We'll force parity by replacing last digit accordingly.
  const arr = base.split("").map((ch) => parseInt(ch,10));
  const idx = arr.length - 1;
  arr[idx] = male ? (arr[idx] % 2 === 0 ? arr[idx] : (arr[idx] + 1) % 10) : (arr[idx] % 2 === 1 ? arr[idx] : (arr[idx] + 1) % 10);
  const checksum = egnChecksum(arr);
  return `${arr.join("")}${checksum}`;
}

// --- IBAN (BG) generator ---
// Computes check digits per ISO 13616 / Mod-97. Country BG, BBAN provided.
function ibanToNumericString(iban: string): string {
  const A = "A".charCodeAt(0);
  const Z = "Z".charCodeAt(0);
  return iban
    .toUpperCase()
    .replace(/\s+/g, "")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= A && code <= Z) return String(code - A + 10);
      return ch;
    })
    .join("");
}
function mod97(numStr: string): number {
  let rem = 0;
  for (let i=0; i<numStr.length; i+=7) {
    const block = `${rem}${numStr.slice(i, i+7)}`;
    rem = parseInt(block,10) % 97;
  }
  return rem;
}
function makeBGIban(bban: string): string {
  const cleanBBAN = bban.replace(/\s+/g,"").toUpperCase();
  const base = `BG00${cleanBBAN}`;
  const rearranged = `${cleanBBAN}BG00`;
  const num = ibanToNumericString(rearranged);
  const check = 98 - mod97(num);
  const cd = check < 10 ? `0${check}` : String(check);
  return `BG${cd}${cleanBBAN}`;
}

describe("EGN validator", () => {
  const isEGN = getEgnValidator();

  test("accepts a valid EGN for a 2001 date", () => {
    const egn = makeValidEGN(new Date(2001, 2, 15), 123, true); // 15 Mar 2001
    expect(isEGN(egn)).toBe(true);
  });

  test("rejects wrong length or non-digits", () => {
    expect(isEGN("123")).toBe(false);
    expect(isEGN("abcdefghij")).toBe(false);
    expect(isEGN("1234567890a")).toBe(false as any); // depending on implementation
  });

  test("rejects impossible month/day encodings", () => {
    // month 00, day 00
    const bad = "0100001234";
    expect(isEGN(bad)).toBe(false);
  });

  test("rejects checksum mismatch", () => {
    const egn = makeValidEGN(new Date(1995, 11, 31), 501, false);
    const tampered = egn.slice(0, 9) + ((parseInt(egn[9],10) + 1) % 10);
    expect(isEGN(tampered)).toBe(false);
  });
});

describe("IBAN validator (BG)", () => {
  const isIBAN = getIbanValidator();

  test("accepts a synthetically valid Bulgarian IBAN", () => {
    const iban = makeBGIban("BNBG96611020345678"); // sample BBAN
    expect(isIBAN(iban)).toBe(true);
  });

  test("accepts IBAN with spaces/lowercase", () => {
    const iban = makeBGIban("bnBG96611020345678");
    const spaced = iban.match(/.{1,4}/g)!.join(" ").toLowerCase();
    expect(isIBAN(spaced)).toBe(true);
  });

  test("rejects wrong country or length", () => {
    expect(isIBAN("DE12100100101234567893")).toBe(false); // DE format
    expect(isIBAN("BG12")).toBe(false);
  });

  test("rejects wrong checksum", () => {
    const iban = makeBGIban("BNBG96611020345678");
    const bad = `BG00${iban.slice(4)}`; // force incorrect CD
    expect(isIBAN(bad)).toBe(false);
  });

  test("rejects invalid characters", () => {
    const iban = makeBGIban("BNBG96611020345678");
    const bad = iban.slice(0, 8) + "@" + iban.slice(9);
    expect(isIBAN(bad)).toBe(false);
>>>>>>> restore/all
  });
});
