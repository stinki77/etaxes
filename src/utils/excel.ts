import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";

export type ExcelIncomeRow = {
  description: string;
  amount: number;
  date?: string;
  include?: boolean;
};

export type ExcelPreview = {
  year: number;
  incomesTotal: number;
  deductionsTotal: number;
  taxableBase: number;
  taxRatePct: number;
  taxDue: number;
  createdAt?: string; // ISO (по избор)
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fileStamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`;
}

export async function makeExcel(
  preview: ExcelPreview,
  incomes?: ExcelIncomeRow[]
): Promise<{ uri: string; name: string }> {
  const wb = XLSX.utils.book_new();

  // Лист 1: Обобщение
  const summaryAoA: (string | number)[][] = [
    ["Година", preview.year],
    ["Общо доходи", Number(preview.incomesTotal.toFixed(2))],
    ["Облекчения", Number(preview.deductionsTotal.toFixed(2))],
    ["Облагаема сума", Number(preview.taxableBase.toFixed(2))],
    ["Ставка %", Number(preview.taxRatePct.toFixed(2))],
    ["Дължим данък", Number(preview.taxDue.toFixed(2))],
    ["Създадено", preview.createdAt ? preview.createdAt : new Date().toISOString()],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet([["Поле", "Стойност"], ...summaryAoA]);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Обобщение");

  // Лист 2: Доходи (ако има)
  if (incomes && incomes.length) {
    const incomesAoA: (string | number | boolean)[][] = [
      ["Описание", "Сума (лв.)", "Дата", "Включен"],
      ...incomes.map((r) => [
        r.description || "Доход",
        Number((r.amount || 0).toFixed(2)),
        r.date || "",
        r.include !== false,
      ]),
    ];
    const wsIncomes = XLSX.utils.aoa_to_sheet(incomesAoA);
    XLSX.utils.book_append_sheet(wb, wsIncomes, "Доходи");
  }

  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const name = `eTaxes-${preview.year}-${fileStamp()}.xlsx`;
  const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || "") + name;

  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, name };
}
