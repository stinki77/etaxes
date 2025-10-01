// src/lib/notifications.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NoticeType = "info" | "warning" | "success" | "error";

export type Notice = {
  id: string;
  type: NoticeType;
  title: string;
  message?: string;
  ts: number;      // unix ms
  read?: boolean;  // default false
};

const STORAGE_KEY = "@etaxes_notifications";

// Минимален емитер без Node 'events'
type Callback<T> = (data: T) => void;
class Emitter<T> {
  private subs = new Set<Callback<T>>();
  on(cb: Callback<T>) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  emit(data: T) {
    for (const cb of Array.from(this.subs)) {
      try { cb(data); } catch {}
    }
  }
}
const changeEmitter = new Emitter<Notice[]>();

async function loadAll(): Promise<Notice[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as Notice[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function saveAll(items: Notice[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  changeEmitter.emit(items);
}

export async function getNotices(): Promise<Notice[]> {
  return loadAll();
}
export function onChange(cb: (items: Notice[]) => void): () => void {
  return changeEmitter.on(cb);
}

// Алиас за съвместимост с таб-лейаута
export function onNotificationsChanged(cb: (items: Notice[]) => void): () => void {
  return onChange(cb);
}
export async function countUnread(): Promise<number> {
  const items = await loadAll();
  return items.filter(n => !n.read).length;
}
export async function getUnread(): Promise<Notice[]> {
  const items = await loadAll();
  return items.filter(n => !n.read);
}

export async function addNotice(n: {
  type: NoticeType;
  title: string;
  message?: string;
  id?: string;
  ts?: number;
  read?: boolean;
}): Promise<Notice> {
  const items = await loadAll();
  const item: Notice = {
    id: n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: n.type,
    title: n.title,
    message: n.message,
    ts: n.ts ?? Date.now(),
    read: n.read ?? false,
  };
  items.unshift(item); // най-новите отпред
  await saveAll(items);
  return item;
}

export async function updateNotice(id: string, patch: Partial<Notice>): Promise<void> {
  const items = await loadAll();
  const i = items.findIndex(x => x.id === id);
  if (i >= 0) {
    items[i] = { ...items[i], ...patch, id: items[i].id };
    await saveAll(items);
  }
}

export async function markRead(id: string, read = true): Promise<void> {
  await updateNotice(id, { read });
}
export async function markAllRead(): Promise<void> {
  const items = await loadAll();
  const next = items.map(n => ({ ...n, read: true }));
  await saveAll(next);
}

export async function removeNotice(id: string): Promise<void> {
  const items = await loadAll();
  const next = items.filter(n => n.id !== id);
  await saveAll(next);
}

export async function clearAll(): Promise<void> {
  await saveAll([]);
}

// Опционално: seed пример при първо стартиране
export async function ensureSeed(): Promise<void> {
  const items = await loadAll();
  if (items.length === 0) {
    await addNotice({
      type: "info",
      title: "Добре дошли",
      message: "Екранът „Notifications“ е активен.",
    });
  }
}
