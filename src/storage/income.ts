import AsyncStorage from "@react-native-async-storage/async-storage";

export type IncomeItem = {
  date?: string;
  amount: number;
  description?: string;
  source?: string;
};

const keyFor = (year: string | number) => `@etaxes_income_${year}`;

export async function saveIncomeSources(year: string | number, items: IncomeItem[]) {
  await AsyncStorage.setItem(keyFor(year), JSON.stringify(items));
}

export async function getIncomeSources(year: string | number): Promise<IncomeItem[]> {
  const raw = await AsyncStorage.getItem(keyFor(year));
  return raw ? JSON.parse(raw) : [];
}

