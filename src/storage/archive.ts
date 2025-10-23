import AsyncStorage from "@react-native-async-storage/async-storage";

export type ArchiveStatus = "Подадена" | "Неподадена";

export type ArchiveEntry = {
  id: string;
  year: number;
  incomesTotal: number;
  deductionsTotal: number;
  taxableBase: number;
  taxDue: number;
  taxRatePct: number;
  createdAt: string; // ISO
  status: ArchiveStatus;
  pdfUri: string;
  pdfName: string;
  notes?: string;
};

const KEY = "@etaxes_archives";

export async function loadArchives(): Promise<ArchiveEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as ArchiveEntry[]; } catch { return []; }
}

export async function saveArchives(all: ArchiveEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function saveArchiveEntry(entry: Omit<ArchiveEntry, "id">): Promise<string> {
  const all = await loadArchives();
  const id = Date.now().toString();
  all.unshift({ id, ...entry });
  await saveArchives(all);
  return id;
}

export async function updateArchiveStatusById(id: string, status: ArchiveStatus): Promise<void> {
  const all = await loadArchives();
  const idx = all.findIndex(e => e.id === id);
  if (idx >= 0) {
    all[idx].status = status;
    await saveArchives(all);
  }
}

export async function deleteArchiveById(id: string): Promise<void> {
  const all = await loadArchives();
  const next = all.filter(e => e.id !== id);
  await saveArchives(next);
}
