// src/lib/store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Income = {
  id: string;
  description: string;
  amount: number;
  date?: string; // YYYY-MM-DD

  incomeType?: "employment" | "civil" | "rent" | "other";
  payerName?: string;
  payerEik?: string;
  countryCode?: string;    // ISO 3166-1 alpha-2
  docType?: string;        // инв./разписка/др
  docNo?: string;
  docDate?: string;        // YYYY-MM-DD
  taxWithheld?: number;    // удържан данък
  expenseNormPct?: number; // НПР %
  notes?: string;
};

export type Deduction = {
  id: string;
  name: string;
  amount: number;
};

export type DeclarationDraftOrSubmitted = {
  year: number;
  incomesTotal: number;
  deductionsTotal: number;
  taxBase: number;
  taxDue: number;
  createdAt: string; // ISO
  status: "draft" | "submitted";
  submittedAt?: string; // ISO
};

const K_INCOMES = "etaxes.incomes.";
const K_DEDUCTIONS = "etaxes.deductions.";
const K_DECLARATIONS = "etaxes.declarations.";

const incomesKey = (year: number) => `${K_INCOMES}${year}`;
const deductionsKey = (year: number) => `${K_DEDUCTIONS}${year}`;
const declarationKey = (year: number) => `${K_DECLARATIONS}${year}`;

export async function getJSON<T>(key: string): Promise<T | undefined> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) as T : undefined; }
  catch { return undefined; }
}
export async function setJSON(key: string, value: any): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadIncomes(year: number): Promise<Income[]> {
  const arr = await getJSON<any[]>(incomesKey(year));
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: String(x?.id ?? ""),
    description: String(x?.description ?? ""),
    amount: Number(x?.amount) || 0,
    date: x?.date ? String(x.date) : undefined,

    incomeType: ((): Income["incomeType"] => {
      const v = String(x?.incomeType ?? "other");
      return v === "employment" || v === "civil" || v === "rent" ? v : "other";
    })(),
    payerName: x?.payerName ? String(x.payerName) : undefined,
    payerEik: x?.payerEik ? String(x.payerEik) : undefined,
    countryCode: x?.countryCode ? String(x.countryCode).toUpperCase() : undefined,
    docType: x?.docType ? String(x.docType) : undefined,
    docNo: x?.docNo ? String(x.docNo) : undefined,
    docDate: x?.docDate ? String(x.docDate) : undefined,
    taxWithheld: Number.isFinite(Number(x?.taxWithheld)) ? Number(x.taxWithheld) : 0,
    expenseNormPct: Number.isFinite(Number(x?.expenseNormPct)) ? Number(x.expenseNormPct) : 0,
    notes: x?.notes ? String(x.notes) : undefined,
  }));
}

export async function saveIncomes(year: number, items: Income[]): Promise<void> {
  const clean = items.map((x) => ({
    id: String(x.id),
    description: String(x.description || ""),
    amount: Number(x.amount) || 0,
    date: x.date ? String(x.date) : undefined,

    incomeType: x.incomeType ?? "other",
    payerName: x.payerName ? String(x.payerName) : undefined,
    payerEik: x.payerEik ? String(x.payerEik) : undefined,
    countryCode: x.countryCode ? String(x.countryCode).toUpperCase() : undefined,
    docType: x.docType ? String(x.docType) : undefined,
    docNo: x.docNo ? String(x.docNo) : undefined,
    docDate: x.docDate ? String(x.docDate) : undefined,
    taxWithheld: Number(x.taxWithheld) || 0,
    expenseNormPct: Number(x.expenseNormPct) || 0,
    notes: x.notes ? String(x.notes) : undefined,
  }));
  await setJSON(incomesKey(year), clean);
}

export async function loadDeductions(year: number): Promise<Deduction[]> {
  const arr = await getJSON<any[]>(deductionsKey(year));
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: String(x?.id ?? ""),
    name: String(x?.name ?? ""),
    amount: Number(x?.amount) || 0,
  }));
}
export async function saveDeductions(year: number, items: Deduction[]): Promise<void> {
  const clean = items.map((x) => ({ id: String(x.id), name: String(x.name || ""), amount: Number(x.amount) || 0 }));
  await setJSON(deductionsKey(year), clean);
}

export async function loadDeclaration(year: number): Promise<DeclarationDraftOrSubmitted | undefined> {
  const d = await getJSON<DeclarationDraftOrSubmitted>(declarationKey(year));
  if (!d) return undefined;
  return {
    year: Number(d.year),
    incomesTotal: Number(d.incomesTotal) || 0,
    deductionsTotal: Number(d.deductionsTotal) || 0,
    taxBase: Number(d.taxBase) || 0,
    taxDue: Number(d.taxDue) || 0,
    createdAt: String(d.createdAt || new Date().toISOString()),
    status: d.status === "submitted" ? "submitted" : "draft",
    submittedAt: d.submittedAt ? String(d.submittedAt) : undefined,
  };
}
export async function saveDeclaration(d: DeclarationDraftOrSubmitted): Promise<void> {
  const clean: DeclarationDraftOrSubmitted = {
    year: Number(d.year),
    incomesTotal: Number(d.incomesTotal) || 0,
    deductionsTotal: Number(d.deductionsTotal) || 0,
    taxBase: Number(d.taxBase) || 0,
    taxDue: Number(d.taxDue) || 0,
    createdAt: d.createdAt || new Date().toISOString(),
    status: d.status === "submitted" ? "submitted" : "draft",
    submittedAt: d.status === "submitted" ? (d.submittedAt || new Date().toISOString()) : d.submittedAt,
  };
  await setJSON(declarationKey(clean.year), clean);
}
export async function markDeclarationSubmitted(year: number) {
  const cur = await loadDeclaration(year); if (!cur) return;
  const updated = { ...cur, status: "submitted", submittedAt: new Date().toISOString() } as const;
  await setJSON(declarationKey(year), updated);
  return updated;
}
export async function deleteDeclaration(year: number): Promise<void> {
  await AsyncStorage.removeItem(declarationKey(year));
}
export async function listDeclarations(): Promise<DeclarationDraftOrSubmitted[]> {
  const keys = await AsyncStorage.getAllKeys();
  const declKeys = keys.filter((k) => k.startsWith(K_DECLARATIONS));
  if (declKeys.length === 0) return [];
  const pairs = await AsyncStorage.multiGet(declKeys);
  const list: DeclarationDraftOrSubmitted[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try { const d = JSON.parse(raw); if (d && typeof d.year === "number") list.push(await loadDeclaration(d.year) as any); }
    catch {}
  }
  return list.filter(Boolean).sort((a, b) => (b!.year - a!.year) || (a!.status === "submitted" ? -1 : 1)) as any;
}
