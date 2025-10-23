// Адаптер към твоето calculateTax от src/lib/tax.ts
import { calculateTax as calc, type TaxResult } from "./tax";

export type Input = {
  year: number;            // игнорираме го тук, но пазим сигнатурата
  incomeTotal: number;     // общ доход
  reliefsTotal: number;    // общи облекчения -> deductions
  normativePercent?: number;
  socialPercent?: number;
  taxRate?: number;        // десетична, напр. 0.10
};

export type Output = {
  taxBase: number;         // taxableIncome от твоя резултат
  taxRate: number;         // taxRate от твоя резултат
  taxDue: number;          // tax от твоя резултат
};

export function calculateTax({
  incomeTotal,
  reliefsTotal,
  normativePercent = 0,
  socialPercent = 0,
  taxRate = 0.10,
}: Input): Output {
  const r: TaxResult = calc({
    income: Number(incomeTotal) || 0,
    deductions: Number(reliefsTotal) || 0,
    normativePercent,
    socialPercent,
    taxRate,
  });

  return {
    taxBase: Number(r.taxableIncome) || 0,
    taxRate: Number(r.taxRate) || 0,
    taxDue: Number(r.tax) || 0,
  };
}
