// src/lib/archive.ts

export type ArchiveRecord = {
  id: string;
  title: string;
  createdAt: string;
  payload?: unknown;
};

/**
 * Записва запис в Архив.
 * В реалното приложение ще използваме AsyncStorage или файлова система.
 * Засега е само mock, за да не чупи тестовете.
 */
export async function saveToArchive(record: ArchiveRecord): Promise<void> {
  // тук можеш по-късно да добавиш реална логика
  return;
}
