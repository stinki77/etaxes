// app/(tabs)/income-sources.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Papa from "papaparse";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";
import { loadIncomes, saveIncomes } from "../../src/lib/store";
import { detectAndParse, type BankTxn } from "../../src/lib/bankParsers";

type IncomeItem = {
  id: string;
  description: string;
  amount: number;
  date?: string;
  source?: string; // bank or manual
};

const banks = [
  { key: "obb", label: "ОББ" },
  { key: "dsk", label: "ДСК" },
  { key: "unicredit", label: "UniCredit Bulbank" },
  { key: "rbi", label: "Райфайзен" },
  { key: "postbank", label: "Пощенска банка" },
];

export default function IncomeSourcesScreen() {
  const [lng, setLng] = useState<Locale>("bg");
  useEffect(() => {
    let off = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      off = onLocaleChange(setLng);
    })();
    return () => off();
  }, []);
  const t = useCallback((k: string) => tSync(lng, k), [lng]);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [bank, setBank] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const arr = await loadIncomes(year);
        setItems(arr);
        setDirty(false);
      } catch {
        Alert.alert(t("common.error") || "Error", t("common.loadFailed") || "Load failed.");
      }
    })();
  }, [year, t]);

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const file = res.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: "utf8" });
      const parsed = Papa.parse<string[]>(content, { delimiter: ",", skipEmptyLines: true });
      if (parsed.errors.length) {
        Alert.alert("CSV parse error", parsed.errors[0].message);
        return;
      }
      const rows = parsed.data as string[][];
      const txns: BankTxn[] = detectAndParse(bank, rows);
      if (!txns.length) {
        Alert.alert("Грешка", "Не успях да разпозная формата или банката.");
        return;
      }
      const mapped: IncomeItem[] = txns.map((tx, i) => ({
        id: `${Date.now()}_${i}`,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        source: bank,
      }));
      setItems((arr) => [...arr, ...mapped]);
      setDirty(true);
    } catch (e) {
      Alert.alert("Error", String(e instanceof Error ? e.message : e));
    }
  };

  const onSave = async () => {
    try {
      await saveIncomes(year, items);
      setDirty(false);
      Alert.alert(t("common.ok") || "OK", t("common.saved") || "Saved.");
    } catch {
      Alert.alert(t("common.error") || "Error", t("common.saveFailed") || "Save failed.");
    }
  };

  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  const Row = ({ item }: { item: IncomeItem }) => (
    <View style={styles.row}>
      <Text style={styles.desc}>{item.description}</Text>
      <Text style={styles.meta}>
        {item.date} • {new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN" }).format(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{t("incomes.title") || "Източници на доходи"}</Text>

      <View style={styles.yearRow}>
        <Text style={styles.label}>{t("createTax.year") || "Година"}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(year)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (Number.isFinite(n)) setYear(n);
          }}
        />
      </View>

      <View style={styles.bankRow}>
        {banks.map((b) => (
          <TouchableOpacity
            key={b.key}
            style={[styles.bankBtn, bank === b.key && styles.bankBtnActive]}
            onPress={() => setBank(b.key)}
          >
            <Text style={bank === b.key ? styles.bankTextActive : styles.bankText}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary, !bank && styles.btnDisabled]}
        onPress={importFile}
        disabled={!bank}
      >
        <Text style={styles.btnText}>Импортирай CSV/Excel</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={Row}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("incomes.empty") || "Няма записи."}</Text>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.total}>
          {t("incomes.total") || "Общо"}:{" "}
          {new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN" }).format(total)}
        </Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, (!dirty || !items.length) && styles.btnDisabled]}
          disabled={!dirty || !items.length}
          onPress={onSave}
        >
          <Text style={styles.btnText}>{t("common.save") || "Запази"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  yearRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  bankRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  bankBtn: { borderWidth: 1, borderColor: "#bbb", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  bankBtnActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  bankText: { color: "#333" },
  bankTextActive: { color: "#fff", fontWeight: "700" },
  label: { fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flex: 1,
  },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnPrimary: { backgroundColor: "#2e7d32" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  row: { borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 8 },
  desc: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12, color: "#555" },
  empty: { textAlign: "center", color: "#666", marginTop: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  total: { fontSize: 16, fontWeight: "700" },
});
