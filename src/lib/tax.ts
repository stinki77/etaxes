<<<<<<< HEAD
// src/lib/tax.ts
=======
// src/lib/tax.ts 
>>>>>>> restore/all
export type TaxInputs = {
  income: number;
  normativePercent?: number; // в проценти, напр. 20
  socialPercent?: number; // в проценти, напр. 13.78
  deductions?: number; // лв.
  taxRate?: number; // десетична, напр. 0.10
};

export type TaxResult = {
  income: number;
  normativePercent: number;
  socialPercent: number;
  deductions: number;
  normativeAmount: number;
  socialAmount: number;
  taxableIncome: number;
  taxRate: number;
  tax: number;
  netIncome: number;
};

/** Закръгляване до 2 десетични */
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

<<<<<<< HEAD
=======
/** Безопасно число (NaN/undefined -> default) */
function toNum(v: unknown, def = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
/** Неотрицателно число */
function nonNeg(n: number): number {
  return n >= 0 ? n : 0;
}

>>>>>>> restore/all
/**
 * calculateTax - чиста функция за данъчни калкулации
 *
 * Правила:
<<<<<<< HEAD
 * - нормативPercent и socialPercent са проценти (0..)
 * - ако резултатът за облагане е < 0 -> клmp до 0
 * - всички изходни полета са закръглени до 2 десетични
 */
export function calculateTax(inputs: TaxInputs): TaxResult {
  const income = Number.isFinite(inputs.income) ? Number(inputs.income) : 0;
  const normativePercent = Number.isFinite(inputs.normativePercent) ? Math.max(0, inputs.normativePercent) : 0;
  const socialPercent = Number.isFinite(inputs.socialPercent) ? Math.max(0, inputs.socialPercent) : 0;
  const deductions = Number.isFinite(inputs.deductions) ? Number(inputs.deductions) : 0;
  const taxRate = Number.isFinite(inputs.taxRate) ? inputs.taxRate : 0.1;

  const normativeAmountRaw = (income * normativePercent) / 100;
  const socialAmountRaw = (income * socialPercent) / 100;
=======
 * - normativePercent и socialPercent са проценти (0..)
 * - ако резултатът за облагане е < 0 -> clamp до 0
 * - всички изходни полета са закръглени до 2 десетични
 * - за проценти и удръжки не използваме отрицателна база
 */
export function calculateTax(inputs: TaxInputs): TaxResult {
  const income = toNum(inputs.income, 0);
  const normativePercent = nonNeg(toNum(inputs.normativePercent, 0));
  const socialPercent = nonNeg(toNum(inputs.socialPercent, 0));
  const deductions = nonNeg(toNum(inputs.deductions, 0));
  const taxRate = nonNeg(toNum(inputs.taxRate, 0.1));

  // Процентите се прилагат върху неотрицателна база
  const baseForPerc = Math.max(0, income);
  const normativeAmountRaw = (baseForPerc * normativePercent) / 100;
  const socialAmountRaw = (baseForPerc * socialPercent) / 100;

>>>>>>> restore/all
  const taxableRaw = income - normativeAmountRaw - socialAmountRaw - deductions;
  const taxable = taxableRaw > 0 ? taxableRaw : 0;

  const taxRaw = taxable * taxRate;
  const netRaw = income - taxRaw - socialAmountRaw;

  const res: TaxResult = {
    income: round2(income),
    normativePercent: round2(normativePercent),
    socialPercent: round2(socialPercent),
    deductions: round2(deductions),
    normativeAmount: round2(normativeAmountRaw),
    socialAmount: round2(socialAmountRaw),
    taxableIncome: round2(taxable),
    taxRate: round2(taxRate),
    tax: round2(taxRaw),
    netIncome: round2(netRaw),
  };

  return res;
}
