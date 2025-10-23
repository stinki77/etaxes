// app/(tabs)/notifications.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";

type NoticeType = "info" | "warning" | "success" | "error";

export type Notice = {
  id: string;
  title: string;
  body?: string;
  createdAt: number; // epoch ms
  read: boolean;
  type: NoticeType;
};

const STORAGE_KEY = "@etaxes_notifications_v1";

function tr(key: string, fallback: string): string {
  try {
    const v = tSync(key);
    if (typeof v === "string" && v.trim().length > 0 && v !== key) return v;
  } catch {}
  return fallback;
}

function fmtDate(ts: number, locale: Locale) {
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return new Date(ts).toISOString();
  }
}

async function loadAll(): Promise<Notice[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Notice[];
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

async function saveAll(list: Notice[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function seedIfEmpty(locale: Locale): Notice[] {
  const now = Date.now();
  return [
    {
      id: `seed-1`,
      title:
        locale === "bg"
          ? "Добре дошли в известията"
          : "Welcome to Notifications",
      body:
        locale === "bg"
          ? "Тук ще виждате напомняния за срокове и статуса на подаванията."
          : "Here you will see reminders for deadlines and filing status.",
      createdAt: now - 60 * 60 * 1000,
      read: false,
      type: "info",
    },
    {
      id: `seed-2`,
      title:
        locale === "bg"
          ? "Срок: Данъчна декларация до 30 април"
          : "Deadline: Tax return by April 30",
      body:
        locale === "bg"
          ? "Планирайте подаването и плащането навреме."
          : "Plan your filing and payment on time.",
      createdAt: now - 24 * 60 * 60 * 1000,
      read: false,
      type: "warning",
    },
  ];
}

export default function NotificationsTab() {
  const [locale, setLocale] = useState<Locale>(getLocale());
  const [items, setItems] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const off = onLocaleChange((lng) => setLocale(lng));
    return () => off();
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      let data = await loadAll();
      if (data.length === 0) {
        data = seedIfEmpty(locale);
        await saveAll(data);
      }
      // newest first
      data.sort((a, b) => b.createdAt - a.createdAt);
      setItems(data);
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setRefreshing(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = useCallback(async () => {
    const next = items.map((n) => ({ ...n, read: true }));
    setItems(next);
    await saveAll(next);
  }, [items]);

  const clearAll = useCallback(async () => {
    Alert.alert(
      tr("notifications.clear.confirmTitle", locale === "bg" ? "Изчистване" : "Clear"),
      tr(
        "notifications.clear.confirmBody",
        locale === "bg" ? "Да изчистя ли всички известия?" : "Clear all notifications?"
      ),
      [
        {
          text: tr("common.cancel", locale === "bg" ? "Отказ" : "Cancel"),
          style: "cancel",
        },
        {
          text: tr("common.clear", locale === "bg" ? "Изчисти" : "Clear"),
          style: "destructive" as any,
          onPress: async () => {
            setItems([]);
            await saveAll([]);
          },
        },
      ]
    );
  }, [items, locale]);

  const addDemo = useCallback(async () => {
    const now = Date.now();
    const n: Notice = {
      id: `n-${now}`,
      title:
        locale === "bg"
          ? "Тестово известие"
          : "Demo notification",
      body:
        locale === "bg"
          ? "Това е тест за визуализация."
          : "This is a test item.",
      createdAt: now,
      read: false,
      type: "success",
    };
    const next = [n, ...items];
    setItems(next);
    await saveAll(next);
  }, [items, locale]);

  const toggleRead = useCallback(
    async (id: string) => {
      const next = items.map((n) => (n.id === id ? { ...n, read: !n.read } : n));
      setItems(next);
      await saveAll(next);
    },
    [items]
  );

  const removeOne = useCallback(
    async (id: string) => {
      const next = items.filter((n) => n.id !== id);
      setItems(next);
      await saveAll(next);
    },
    [items]
  );

  const emptyText = useMemo(
    () =>
      tr(
        "notifications.empty",
        locale === "bg" ? "Няма известия" : "No notifications"
      ),
    [locale]
  );

  const headerTitle = useMemo(
    () =>
      tr(
        "tabs.notifications",
        locale === "bg" ? "Известия" : "Notifications"
      ),
    [locale]
  );

  const renderItem = ({ item }: { item: Notice }) => {
    return (
      <View style={[styles.card, item.read && styles.cardRead, typeStyle(item.type)]}>
        <View style={styles.row}>
          <Text style={[styles.title, item.read && styles.titleRead]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.date}>{fmtDate(item.createdAt, locale)}</Text>
        </View>
        {item.body ? (
          <Text style={[styles.body, item.read && styles.bodyRead]} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleRead(item.id)} style={styles.btn}>
            <Text style={styles.btnText}>
              {item.read
                ? tr("notifications.markUnread", locale === "bg" ? "Отбележи като непрочетено" : "Mark as unread")
                : tr("notifications.markRead", locale === "bg" ? "Отбележи като прочетено" : "Mark as read")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeOne(item.id)} style={[styles.btn, styles.btnDanger]}>
            <Text style={[styles.btnText, styles.btnTextDanger]}>
              {tr("common.delete", locale === "bg" ? "Изтрий" : "Delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.header}>{headerTitle}</Text>
        <View style={styles.toolbarBtns}>
          <TouchableOpacity onPress={addDemo} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>
              {tr("notifications.addDemo", locale === "bg" ? "Добави тест" : "Add demo")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllRead} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>
              {tr("notifications.markAllRead", locale === "bg" ? "Всички прочетени" : "Mark all read")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>
              {tr("notifications.clearAll", locale === "bg" ? "Изчисти всички" : "Clear all")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : undefined}
      />
    </View>
  );
}

function typeStyle(t: NoticeType) {
  switch (t) {
    case "success":
      return { borderLeftColor: "#2e7d32" };
    case "warning":
      return { borderLeftColor: "#f9a825" };
    case "error":
      return { borderLeftColor: "#c62828" };
    default:
      return { borderLeftColor: "#1e88e5" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  toolbar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
  header: { fontSize: 20, fontWeight: "700" },
  toolbarBtns: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" as any },
  toolBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#eee", borderRadius: 12 },
  toolBtnText: { fontSize: 14, fontWeight: "600" },

  emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: "#777", fontSize: 16 },

  card: {
    margin: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 6,
  },
  cardRead: { opacity: 0.7 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  titleRead: { textDecorationLine: "line-through", color: "#555" },
  date: { fontSize: 12, color: "#666" },
  body: { fontSize: 14, color: "#333" },
  bodyRead: { color: "#666" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#eef2ff", borderRadius: 10 },
  btnDanger: { backgroundColor: "#ffebee" },
  btnText: { fontSize: 13, fontWeight: "600" },
  btnTextDanger: { color: "#c62828" },
});
