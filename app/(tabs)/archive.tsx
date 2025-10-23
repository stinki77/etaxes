// app/(tabs)/archive.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";

// === Типове ===
type DeclarationStatus = "draft" | "submitted";
type Attachment = { name: string; uri: string; size?: number };
export type DeclarationRecord = {
  id: string;                // уникален ключ
  year: number;              // данъчна година
  createdAt: number;         // epoch ms
  updatedAt?: number;
  amount?: number;           // сума за плащане
  iban?: string;             // IBAN към НАП
  reason?: string;           // основание
  status: DeclarationStatus; // draft | submitted
  xmlUri?: string;           // локален файл за декларация (XML)
  pdfUri?: string;           // PDF преглед
  attachments?: Attachment[];
  // свободно поле за бъдещи версии
  meta?: Record<string, any>;
};

// Съхранение: взимаме директно от AsyncStorage, без да зависим от вътрешни помощници.
const INDEX_KEY = "@declarations_index";       // съдържа JSON масив от id
const ITEM_PREFIX = "@declaration:";           // реалните записи са ITEM_PREFIX + id

async function readAllDeclarations(): Promise<DeclarationRecord[]> {
  try {
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!ids.length) return [];
    const keys = ids.map((id) => ITEM_PREFIX + id);
    const pairs = await AsyncStorage.multiGet(keys);
    const list: DeclarationRecord[] = [];
    for (const [, v] of pairs) {
      if (!v) continue;
      try {
        const rec = JSON.parse(v);
        // базова миграция
        if (rec && rec.id && rec.year) list.push(rec);
      } catch {}
    }
    // резервен план: ако индексът липсва, сканираме всички ключове
    if (!list.length) {
      const allKeys = await AsyncStorage.getAllKeys();
      const dek = allKeys.filter((k) => k.startsWith(ITEM_PREFIX));
      const more = await AsyncStorage.multiGet(dek);
      for (const [, v] of more) {
        if (!v) continue;
        try {
          const rec = JSON.parse(v);
          if (rec && rec.id && rec.year) list.push(rec);
        } catch {}
      }
    }
    // сортиране: по updatedAt/createdAt низходящо
    return list.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
  } catch {
    return [];
  }
}

async function deleteDeclarationById(id: string) {
  try {
    const [indexRaw] = await Promise.all([AsyncStorage.getItem(INDEX_KEY)]);
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const next = ids.filter((x) => x !== id);
    await AsyncStorage.multiRemove([ITEM_PREFIX + id]);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {}
}

// === Помощници ===
function fmtBGN(n: number | undefined) {
  const x = n ?? 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN", maximumFractionDigits: 2 }).format(x);
}
function fmtDateMs(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

// === Компонент ===
export default function ArchiveScreen() {
  const [items, setItems] = useState<DeclarationRecord[]>([]);
  const [filterYear, setFilterYear] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<DeclarationStatus | "all">("all");
  const [lng, setLng] = useState<Locale>("bg");
  const [refreshing, setRefreshing] = useState(false);

  // локализация live
  useEffect(() => {
    let off = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      off = onLocaleChange(setLng);
    })();
    return () => off();
  }, []);

  const t = useCallback((k: string, vars?: Record<string, any>) => tSync(lng, k, vars), [lng]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    const list = await readAllDeclarations();
    setItems(list);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (status !== "all") arr = arr.filter((x) => x.status === status);
    const y = Number(filterYear);
    if (Number.isFinite(y) && String(y).length >= 4) arr = arr.filter((x) => x.year === y);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((x) => {
        const fields = [
          x.id,
          String(x.year),
          x.iban ?? "",
          x.reason ?? "",
          String(x.amount ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        return fields.includes(q);
      });
    }
    return arr;
  }, [items, status, filterYear, query]);

  const onShare = useCallback(async (rec: DeclarationRecord) => {
    try {
      const target = rec.pdfUri || rec.xmlUri;
      if (!target) {
        Alert.alert(t("archive.no_file_title") || "Няма файл", t("archive.no_file_text") || "Записът няма прикачен XML или PDF.");
        return;
      }
      const avail = await Sharing.isAvailableAsync();
      if (!avail) {
        Alert.alert(t("archive.share_unavailable") || "Споделянето не е налично");
        return;
      }
      await Sharing.shareAsync(target);
    } catch (e) {
      Alert.alert(t("common.error") || "Грешка", String(e));
    }
  }, [t]);

  const onOpenFile = useCallback(async (uri?: string) => {
    if (!uri) return;
    try {
      await Linking.openURL(uri);
    } catch (e) {
      Alert.alert(t("common.error") || "Грешка", String(e));
    }
  }, [t]);

  const onCopy = useCallback(async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(t("archive.copied") || "Копирано", label);
    } catch {}
  }, [t]);

  const onDelete = useCallback((rec: DeclarationRecord) => {
    Alert.alert(
      t("archive.delete_title") || "Изтриване",
      t("archive.delete_text") || "Сигурни ли сте, че искате да изтриете записа?",
      [
        { text: t("common.cancel") || "Отказ", style: "cancel" },
        {
          text: t("common.delete") || "Изтрий",
          style: "destructive",
          onPress: async () => {
            await deleteDeclarationById(rec.id);
            await reload();
          },
        },
      ]
    );
  }, [t, reload]);

  const emptyText = useMemo(() => {
    if (!items.length) return t("archive.empty") || "Нямате архивирани декларации.";
    if (!filtered.length) return t("archive.no_match") || "Няма съвпадения с филтрите.";
    return "";
  }, [items, filtered, t]);

  const Header = useMemo(() => (
    <View style={styles.filters}>
      <View style={styles.filterCol}>
        <Text style={styles.label}>{t("archive.filter_year") || "Година"}</Text>
        <TextInput
          value={filterYear}
          onChangeText={setFilterYear}
          placeholder={t("archive.year_placeholder") || "напр. 2025"}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.filterCol}>
        <Text style={styles.label}>{t("archive.search") || "Търсене"}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("archive.search_placeholder") || "IBAN, сума, основание..."}
          style={styles.input}
        />
      </View>
      <View style={styles.filterCol}>
        <Text style={styles.label}>{t("archive.status") || "Статус"}</Text>
        <View style={styles.statusRow}>
          {([ "all", "draft", "submitted" ] as const).map((s) => (
            <TouchableOpacity
              key={s}
              accessibilityRole="button"
              onPress={() => setStatus(s)}
              style={[styles.statusBtn, status === s && styles.statusBtnActive]}
            >
              <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                {s === "all"
                  ? (t("archive.all") || "Всички")
                  : s === "draft"
                  ? (t("archive.draft") || "Чернова")
                  : (t("archive.submitted") || "Подадени")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  ), [filterYear, query, status, t]);

  const renderItem = useCallback(({ item }: { item: DeclarationRecord }) => {
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{t("archive.declaration_for_year") || "Декларация за"} {item.year}</Text>
          <View style={[styles.badge, item.status === "submitted" ? styles.badgeOk : styles.badgeWarn]}>
            <Text style={styles.badgeText}>
              {item.status === "submitted" ? (t("archive.submitted") || "Подадени") : (t("archive.draft") || "Чернова")}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {t("archive.created") || "Създадено"}: {fmtDateMs(item.createdAt)}{item.updatedAt ? ` • ${t("archive.updated") || "Обновено"}: ${fmtDateMs(item.updatedAt)}` : ""}
        </Text>

        <View style={styles.kv}>
          <Text style={styles.k}>{t("archive.amount") || "Сума"}</Text>
          <Text style={styles.v}>{fmtBGN(item.amount)}</Text>
        </View>
        {item.iban ? (
          <View style={styles.kv}>
            <Text style={styles.k}>IBAN</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => onCopy(item.iban!, "IBAN")}>
              <Text style={[styles.v, styles.link]}>{item.iban}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {item.reason ? (
          <View style={styles.kv}>
            <Text style={styles.k}>{t("archive.reason") || "Основание"}</Text>
            <Text style={styles.v}>{item.reason}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.btn}
            onPress={() => router.push({ pathname: "/submit", params: { id: item.id, year: String(item.year) } })}
          >
            <Text style={styles.btnText}>{t("archive.open") || "Отвори"}</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.btn} onPress={() => onShare(item)}>
            <Text style={styles.btnText}>{t("archive.share") || "Сподели"}</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.btn} onPress={() => onOpenFile(item.pdfUri || item.xmlUri)}>
            <Text style={styles.btnText}>{t("archive.view_file") || "Файл"}</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={[styles.btn, styles.btnDanger]} onPress={() => onDelete(item)}>
            <Text style={styles.btnText}>{t("archive.delete") || "Изтрий"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [onDelete, onOpenFile, onShare, t]);

  return (
    <View style={styles.container}>
      {Header}
      {!filtered.length ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyText}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.btn} onPress={reload}>
            <Text style={styles.btnText}>{t("common.reload") || "Обнови"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        />
      )}
    </View>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  filters: {
    gap: 12,
    marginBottom: 8,
  },
  filterCol: {},
  label: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statusBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBtnActive: {
    backgroundColor: "#eef6ff",
    borderColor: "#77aaff",
  },
  statusText: { fontSize: 13 },
  statusTextActive: { fontWeight: "600" },
  listContent: { paddingBottom: 24 },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "600" },
  badge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeOk: { backgroundColor: "#e7f7ec" },
  badgeWarn: { backgroundColor: "#fff4e6" },
  badgeText: { fontSize: 12 },
  meta: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  kv: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  k: { fontSize: 14, opacity: 0.8 },
  v: { fontSize: 14, fontWeight: "500" },
  link: { textDecorationLine: "underline" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  btn: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnDanger: { backgroundColor: "#b00020" },
  btnText: { color: "white", fontWeight: "600" },
  emptyBox: { alignItems: "center", marginTop: 32, gap: 12 },
  emptyText: { fontSize: 14, opacity: 0.8, textAlign: "center" },
});
