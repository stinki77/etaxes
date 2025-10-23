export const TAX = {
  PERSONAL_INCOME_RATE: 0.10, // ЗДДФЛ
  CORPORATE_RATE: 0.10,       // ЗКПО
  VAT_STANDARD: 0.20,         // ЗДДС
  EXPENSE_TAX_RATE: 0.10,     // Данък върху разходите
  DEADLINES: {
    PERSONAL_ANNUAL_RETURN: { month: 4, day: 30 }, // 30 април
    PERIOD: { startMonth: 1, startDay: 10, endMonth: 4, endDay: 30 }, // 10 ян – 30 апр
  },
} as const;

export function formatDeadline(locale: string = "bg-BG") {
  const now = new Date();
  const y = now.getFullYear();
  const d = TAX.DEADLINES.PERSONAL_ANNUAL_RETURN;
  const deadlineDate = new Date(Date.UTC(y, d.month - 1, d.day));
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long" }).format(deadlineDate);
}

