// src/lib/csv.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Papa from "papaparse";

export type ImportedIncome = {
  id: string;
  description?: string;
  amount: number;
  date?: string;
  include?: boolean;
};

/**
 * parseCsvContent - парсва CSV текст и връща масив от ImportedIncome
 * Приема header=true CSV. Търси полета amount/desc/date (case-insensitive).
 */
export function parseCsvContent(csvText: string): ImportedIncome[] {
  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  const rows = (parsed.data as any[]) || [];

  const normalize = (k: string) => String(k || "").toLowerCase().trim();

  return rows
    .map((row, idx) => {
      const keys = Object.keys(row || {});
      if (!keys.length) return null;
      const keyMap: Record<string, string> = {};
      keys.forEach((k) => (keyMap[normalize(k)] = k));

      const amountKey = keyMap["amount"] ?? keyMap["amt"] ?? keyMap["sum"] ?? keys[0];
      const descKey = keyMap["description"] ?? keyMap["desc"] ?? keys[1];
      const dateKey = keyMap["date"] ?? keyMap["datum"] ?? keyMap["дата"];

      const rawAmount = row[amountKey];
      const amount = Number(String(rawAmount || "").replace(",", "."));
      if (!Number.isFinite(amount) || amount === 0) return null;

      return {
        id: `${Date.now()}_${idx}`,
        description: row[descKey] ? String(row[descKey]) : `income_${idx + 1}`,
        amount: amount,
        date: dateKey ? String(row[dateKey]) : undefined,
        include: true,
      } as ImportedIncome;
    })
    .filter(Boolean) as ImportedIncome[];
}

/**
 * parseAndStoreCsvText - парсва CSV текст и добавя записите в AsyncStorage под ключ incomes_<year>
 * Връща сумата на всички записи (включително вече съществуващите).
 */
export async function parseAndStoreCsvText(csvText: string, year: string): Promise<number> {
  const items = parseCsvContent(csvText);
  const key = `incomes_${year}`;
  const existingRaw = (await AsyncStorage.getItem(key)) || "[]";
  const existing = JSON.parse(existingRaw) as ImportedIncome[];
  const merged = [...items, ...existing];
  await AsyncStorage.setItem(key, JSON.stringify(merged));
  const sum = merged.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return sum;
}

/**
 * helper: loadImportedIncomes - връща масива от записи за година
 */
export async function loadImportedIncomesForYear(year: string): Promise<ImportedIncome[]> {
  const key = `incomes_${year}`;
  const raw = (await AsyncStorage.getItem(key)) || "[]";
  try {
    const arr = JSON.parse(raw) as ImportedIncome[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
