// src/utils/validators.ts
// Универсални валидатори и хелпъри за числа/дати/години/суми.

export function isFiniteNonNeg(n: unknown): n is number {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0;
}

/** Парсира парични стойности. При празно => 0. При неуспех => NaN. */
export function parseMoney(v: string | number | null | undefined): number {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Валидира ISO дата YYYY-MM-DD без таймзона. */
export const isoDateRe = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function isIsoDate(s: string | undefined | null): boolean {
  if (!s) return true; // празна е позволена при някои форми
  return isoDateRe.test(s);
}

/** Валидира година в интервал [minY, maxY]. */
export function isYearInRange(
  y: unknown,
  minY = 2000,
  maxY = new Date().getFullYear() + 1
): boolean {
  const n = Number(y);
  return Number.isInteger(n) && n >= minY && n <= maxY;
}

/** Сумира масив от стойности чрез parseMoney, игнорира невалидни. */
export function sumMoney(values: Array<number | string>): number {
  return values
    .map((v) => {
      const n = parseMoney(v);
      return Number.isFinite(n) ? n : 0;
    })
    .reduce((s: number, n: number) => s + n, 0);
}

/** Ограничение на сума до лимит. Връща {sum, overLimit}. */
export function capSummary(values: Array<number | string>, limit: number) {
  const sum = sumMoney(values);
  return { sum, overLimit: sum > limit };
}

/** Композитор: връща първата грешка от списък валидатори. */
export type Validator<T> = (val: T) => string | null | undefined;
export function firstError<T>(val: T, validators: Validator<T>[]): string | null {
  for (const v of validators) {
    const m = v(val);
    if (m) return m;
  }
  return null;
}

// Готови валидатори за често ползване:
export const vRequired =
  (msg = "Required") =>
  (s: string) =>
    s?.trim() ? null : msg;

export const vNonNegMoney =
  (msg = "Invalid amount") =>
  (s: string | number) =>
    isFiniteNonNeg(parseMoney(s)) ? null : msg;

export const vIsoDate =
  (msg = "Invalid date YYYY-MM-DD") =>
  (s?: string) =>
    isIsoDate(s) ? null : msg;

export const vYearRange =
  (minY = 2000, maxY = new Date().getFullYear() + 1, msg = "Year out of range") =>
  (y: unknown) =>
    isYearInRange(y, minY, maxY) ? null : msg;
