<<<<<<< HEAD
import * as XLSX from "xlsx";
=======
﻿import * as XLSX from "xlsx";
>>>>>>> restore/all
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
<<<<<<< HEAD
  taxRatePct: number;
  taxDue: number;
  createdAt?: string; // ISO (по избор)
};

=======
  taxRatePct: number; // e.g., 10 means 10%
  taxDue: number;
  createdAt?: string; // ISO
};

type ReliefRow = { name?: string; amount?: number };

>>>>>>> restore/all
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fileStamp(d = new Date()) {
<<<<<<< HEAD
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`;
=======
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

function getWritableDir(): string {
  const FS: any = FileSystem as any;
  return (FS?.documentDirectory as string) || (FS?.cacheDirectory as string) || "";
}

function toCurrency(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function sum(vals: Array<number | undefined>) {
  return vals.reduce((s, v) => s + (Number.isFinite(v as number) ? (v as number) : 0), 0);
>>>>>>> restore/all
}

export async function makeExcel(
  preview: ExcelPreview,
  incomes?: ExcelIncomeRow[]
): Promise<{ uri: string; name: string }> {
  const wb = XLSX.utils.book_new();

  // Лист 1: Обобщение
  const summaryAoA: (string | number)[][] = [
    ["Година", preview.year],
<<<<<<< HEAD
    ["Общо доходи", Number(preview.incomesTotal.toFixed(2))],
    ["Облекчения", Number(preview.deductionsTotal.toFixed(2))],
    ["Облагаема сума", Number(preview.taxableBase.toFixed(2))],
    ["Ставка %", Number(preview.taxRatePct.toFixed(2))],
    ["Дължим данък", Number(preview.taxDue.toFixed(2))],
=======
    ["Общо доходи", toCurrency(preview.incomesTotal)],
    ["Облекчения", toCurrency(preview.deductionsTotal)],
    ["Облагаема сума", toCurrency(preview.taxableBase)],
    ["Ставка %", toCurrency(preview.taxRatePct)],
    ["Дължим данък", toCurrency(preview.taxDue)],
>>>>>>> restore/all
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
<<<<<<< HEAD
        Number((r.amount || 0).toFixed(2)),
=======
        toCurrency(r.amount || 0),
>>>>>>> restore/all
        r.date || "",
        r.include !== false,
      ]),
    ];
    const wsIncomes = XLSX.utils.aoa_to_sheet(incomesAoA);
    XLSX.utils.book_append_sheet(wb, wsIncomes, "Доходи");
  }

  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const name = `eTaxes-${preview.year}-${fileStamp()}.xlsx`;
<<<<<<< HEAD
  const uri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || "") + name;

  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, name };
}
=======
  const dir = getWritableDir();
  const uri = dir + name;

  const FS: any = FileSystem as any;
  await FileSystem.writeAsStringAsync(uri, b64, {
    encoding: (FS?.EncodingType?.Base64 ?? "base64") as any,
  });
  return { uri, name };
}

// Съвместим алиас + по-„всеяден“ вход за стари и нови извиквания.
// Вариант A: exportToXlsx(preview: ExcelPreview, incomes?: ExcelIncomeRow[]) -> Promise<string>
// Вариант B: exportToXlsx({ year, importedItems, manualIncome, reliefs, totals, note, locale }) -> Promise<string>
export async function exportToXlsx(preview: ExcelPreview, incomes?: ExcelIncomeRow[]): Promise<string>;
export async function exportToXlsx(input: {
  year: number;
  importedItems?: Array<Partial<ExcelIncomeRow>>;
  manualIncome?: number;
  reliefs?: ReliefRow[];
  totals?: Partial<{
    incomesTotal: number;
    deductionsTotal: number;
    taxableBase: number;
    taxBase: number; // алтернативно име
    taxRatePct: number;
    taxRate: number; // като 0.10
    taxDue: number;
  }>;
  note?: string;
  locale?: string;
}): Promise<string>;
export async function exportToXlsx(a: any, b?: any): Promise<string> {
  // Входът може да е двупараметърна форма или един обект
  let preview: ExcelPreview;
  let incomes: ExcelIncomeRow[] | undefined;

  if (typeof a === "object" && "year" in a && !("incomesTotal" in a)) {
    // Новата форма (payload от declaration.tsx)
    const payload = a as {
      year: number;
      importedItems?: Array<Partial<ExcelIncomeRow>>;
      manualIncome?: number;
      reliefs?: ReliefRow[];
      totals?: any;
      note?: string;
      locale?: string;
    };

    const imported = (payload.importedItems || []).map((r, i) => ({
      description: r.description ?? `Доход ${i + 1}`,
      amount: Number(r.amount ?? 0),
      date: r.date,
      include: r.include !== false,
    })) as ExcelIncomeRow[];

    const manual = Number(payload.manualIncome ?? 0);
    if (manual > 0) {
      imported.unshift({
        description: "Ръчно въведен доход",
        amount: manual,
        date: "",
        include: true,
      });
    }

    const incomesTotal =
      Number(payload.totals?.incomesTotal) || toCurrency(sum(imported.map((x) => x.amount)));

    const deductionsTotal =
      Number(payload.totals?.deductionsTotal) ||
      toCurrency(sum((payload.reliefs || []).map((r) => Number(r.amount || 0))));

    const taxableBase =
      Number(payload.totals?.taxableBase ?? payload.totals?.taxBase) ||
      toCurrency(Math.max(0, incomesTotal - deductionsTotal));

    const taxRatePct =
      Number(payload.totals?.taxRatePct) ||
      (Number.isFinite(payload.totals?.taxRate) ? Number(payload.totals.taxRate) * 100 : 10);

    const taxDue =
      Number(payload.totals?.taxDue) ||
      toCurrency((taxableBase * taxRatePct) / 100);

    preview = {
      year: payload.year,
      incomesTotal,
      deductionsTotal,
      taxableBase,
      taxRatePct,
      taxDue,
      createdAt: new Date().toISOString(),
    };
    incomes = imported;
  } else {
    // Старият API: (preview, incomes?)
    preview = a as ExcelPreview;
    incomes = b as ExcelIncomeRow[] | undefined;
  }

  const { uri } = await makeExcel(preview, incomes);
  return uri;
}
>>>>>>> restore/all
