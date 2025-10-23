// src/lib/incomeStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ImportedIncome = {
  id: string;
  description: string;
  amount: number;
  date?: string;    // ISO YYYY-MM-DD
  include?: boolean;
};

const KEY_PREFIX = "etaxes.incomes.";

function key(year: number) {
  return `${KEY_PREFIX}${year}`;
}

/** Чете импортнатите доходи за дадена година от AsyncStorage. */
export async function loadImportedIncomesForYear(year: number): Promise<ImportedIncome[]> {
  const raw = await AsyncStorage.getItem(key(year));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // нормализирай записи
    return arr.map((it: any) => ({
      id: String(it.id ?? Math.random().toString(36).slice(2, 10)),
      description: String(it.description ?? ""),
      amount: Number(it.amount) || 0,
      date: it.date ? String(it.date) : undefined,
      include: Boolean(it.include ?? true),
    })) as ImportedIncome[];
  } catch {
    return [];
  }
}
