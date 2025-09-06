// app/income-sources.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import AsyncStorage from "@react-native-async-storage/async-storage";

type IncomeItem = {
  id: string;
  date: string;      // ISO или текст
  amount: number;
  description?: string;
  source?: string;
};

const BRAND_BLUE = "#1f6feb";

// винаги български етикети, за да няма смесване
const L = (bg: string) => bg;

function findKey(candidates: string[], row: Record<string, any>) {
  const keys = Object.keys(row);
  const lower = keys.map((k) => k.toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return keys[idx];
  }
  return undefined;
}

export default function IncomeSourcesScreen() {
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const total = useMemo(
    () => items.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [items]
  );

  const pickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      const csv = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = Papa.parse<Record<string, any>>(csv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.errors?.length) {
        Alert.alert(L("Грешка при четене на файла"), parsed.errors[0]?.message || "");
        return;
      }

      const rows = parsed.data || [];
      if (!rows.length) {
        Alert.alert(L("Няма разпознати редове"), L("Провери имената на колоните."));
        return;
      }

      const mapped: IncomeItem[] = rows
        .map((row, idx) => {
          const dateKey = findKey(["date", "дата"], row);
          const amountKey = findKey(["amount", "sum", "value", "сума", "сумa"], row);
          const descKey = findKey(["description", "details", "описание", "note", "notes"], row);
          const sourceKey = findKey(["source", "контрагент", "sender", "from", "iban", "merchant"], row);

          const rawAmount = amountKey ? String(row[amountKey]) : "";
          const normalizedAmount = Number(
            rawAmount.replace?.(/\s/g, "").replace?.(",", ".")
          );

          const dateVal = dateKey ? String(row[dateKey]).trim() : "";
          const desc = descKey ? String(row[descKey]).trim() : "";
          const source = sourceKey ? String(row[sourceKey]).trim() : "";

          if (!amountKey || isNaN(normalizedAmount)) return undefined;

          return {
            id: `${idx}_${Date.now()}`,
            date: dateVal || "",
            amount: normalizedAmount,
            description: desc || undefined,
            source: source || undefined,
          } as IncomeItem;
        })
        .filter(Boolean) as IncomeItem[];

      if (!mapped.length) {
        Alert.alert(L("Няма разпознати редове"), L("Провери имената на колоните."));
        return;
      }

      setItems(mapped);
      Alert.alert(L("Импортът е успешен"), L(`Редове: ${mapped.length}`));
    } catch (e: any) {
      Alert.alert(L("Грешка при четене на файла"), e?.message || "");
    }
  };

  const saveForYear = async () => {
    if (!items.length) {
      Alert.alert(L("Няма данни за запис"));
      return;
    }
    const KEY = `@income_sources_${year}`;
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
    Alert.alert(L("Записано"), L(`Записани приходи за ${year}`));
  };

  const currencyFmt = (n: number) =>
    new Intl.NumberFormat("bg-BG", {
      style: "currency",
      currency: "BGN",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{L("Източници на доход")}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.yearBtn} onPress={() => setYear((y) => y - 1)}>
          <Text style={styles.yearBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.yearLabel}>{year}</Text>
        <TouchableOpacity style={styles.yearBtn} onPress={() => setYear((y) => y + 1)}>
          <Text style={styles.yearBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryBtn} onPress={pickCsv}>
          <Text style={styles.primaryBtnText}>{L("Импортирай CSV")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, !items.length && styles.disabledBtn]}
          onPress={saveForYear}
          disabled={!items.length}
        >
          <Text style={styles.primaryBtnText}>{L("Запази за избраната година")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text style={styles.sumText}>{L("Редове")}: {items.length}</Text>
        <Text style={styles.sumText}>{L("Общо")}: {currencyFmt(total)}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTop}>
                {item.description || item.source || L("Без описание")}
              </Text>
              {!!item.date && <Text style={styles.itemSub}>{item.date}</Text>}
            </View>
            <Text style={styles.amount}>{currencyFmt(item.amount)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#2e7d32" },

  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  yearBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
  },
  yearBtnText: { fontSize: 18, fontWeight: "700" },
  yearLabel: {
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    textAlignVertical: "center",
    textAlign: "center",
    backgroundColor: "white",
    fontWeight: "700",
    fontSize: 16,
    minWidth: 80,
  },

  primaryBtn: {
    backgroundColor: BRAND_BLUE,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  primaryBtnText: { color: "white", fontWeight: "700" },
  disabledBtn: { backgroundColor: "#9aa6b2" },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 6,
  },
  sumText: { fontSize: 14, color: "#223" },

  itemRow: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  itemTop: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  itemSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  amount: { fontWeight: "700", color: "#1f883d" },
});
