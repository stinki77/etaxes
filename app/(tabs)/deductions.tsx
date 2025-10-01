// app/(tabs)/deductions.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";
import { loadDeductions, saveDeductions } from "../../src/lib/store";

type DeductionItem = {
  id: string;
  name: string;
  amount: number | string; // allow text before validation
};

// Максимален общ лимит за облекченията (може да се подаде като проп)
const DEFAULT_TOTAL_LIMIT = 10000;

// ===== Helpers =====
function isFiniteNonNeg(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0;
}
function parseMoney(s: string | number) {
  if (s === "" || s == null) return 0;
  const n = Number(String(s).replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
function fmtBGN(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN" }).format(n);
  } catch {
    return `${n.toFixed(2)} лв.`;
  }
}
function sanitizeMoneyInput(s: string) {
  // оставя само цифри, , . и интервал; заменя , с . когато са множествени
  const cleaned = s.replace(/[^\d,.\s]/g, "");
  // предотвратява повече от една десетична точка/запетая
  const parts = cleaned.replace(",", ".").split(".");
  if (parts.length > 2) {
    const head = parts.slice(0, 2).join(".");
    const tail = parts.slice(2).join("");
    return head + tail.replace(/\./g, "");
  }
  return cleaned;
}
function genId() {
  // опит за crypto.randomUUID, иначе fallback
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function DeductionsScreen({ totalLimit = DEFAULT_TOTAL_LIMIT }: { totalLimit?: number }) {
  // ===== i18n =====
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
  const t = useCallback((k: string, vars?: Record<string, any>) => tSync(lng, k, vars), [lng]);
  const terr = useCallback(
    (k: string, vars?: Record<string, any>) => tSync(lng, `deductions.errors.${k}`, vars),
    [lng]
  );

  // ===== State =====
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<DeductionItem[]>([]);
  const [dirty, setDirty] = useState(false);

  // ===== Load =====
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadDeductions(year);
        setItems(stored.map((x: any) => ({ id: x.id || genId(), name: x.name, amount: x.amount })));
        setDirty(false);
      } catch {
        Alert.alert(t("common.error") || "Грешка", t("common.loadFailed") || "Неуспешно зареждане.");
        setItems([]);
        setDirty(false);
      }
    })();
  }, [year, t]);

  // ===== Derived =====
  const totals = useMemo(() => {
    const sum = items.reduce((s, it) => {
      const n = parseMoney(it.amount);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { sum };
  }, [items]);

  const rowErrors = useMemo(() => {
    const list: Record<string, { name?: string; amount?: string }> = {};
    items.forEach((it) => {
      const e: { name?: string; amount?: string } = {};
      const amt = parseMoney(it.amount);
      if (!isFiniteNonNeg(amt)) e.amount = terr("amountInvalid") || "Невалидна сума.";
      if (Number.isFinite(amt) && amt > 0 && !String(it.name || "").trim()) {
        e.name = terr("nameRequired") || "Името е задължително при сума > 0.";
      }
      if (e.name || e.amount) list[it.id] = e;
    });
    return list;
  }, [items, terr]);

  const overLimit = totals.sum > totalLimit;
  const hasErrors = overLimit || Object.keys(rowErrors).length > 0;

  // ===== CRUD =====
  const addRow = () => {
    const id = genId();
    setItems((arr) => [...arr, { id, name: "", amount: "" }]);
    setDirty(true);
  };
  const removeRow = (id: string) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    setDirty(true);
  };
  const updateRow = (id: string, patch: Partial<DeductionItem>) => {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  // ===== Save =====
  const onSave = async () => {
    if (hasErrors) {
      const msg = overLimit
        ? (terr("overLimit", { limit: totalLimit }) || `Надвишен лимит ${totalLimit}.`)
        : (terr("fixErrors") || "Поправете грешките и опитайте пак.");
      Alert.alert(t("common.error") || "Грешка", msg);
      return;
    }
    const clean = items.map((it) => ({
      id: it.id,
      name: String(it.name || "").trim(),
      amount: parseMoney(it.amount) || 0,
    }));
    try {
      await saveDeductions(year, clean as any);
      setDirty(false);
      Alert.alert(t("common.ok") || "Ок", t("common.saved") || "Записано.");
    } catch {
      Alert.alert(t("common.error") || "Грешка", t("common.saveFailed") || "Неуспешно записване.");
    }
  };

  // ===== UI =====
  const renderItem = ({ item }: { item: DeductionItem }) => {
    const e = rowErrors[item.id] || {};
    return (
      <View style={styles.rowCard}>
        <View style={styles.rowLine}>
          <Text style={styles.label}>{t("deductions.name") || "Име"}</Text>
          <TextInput
            style={[styles.input, e.name && styles.inputError]}
            placeholder={t("deductions.placeholders.name") || "Име на облекчение"}
            value={String(item.name ?? "")}
            onChangeText={(v) => updateRow(item.id, { name: v })}
            returnKeyType="next"
          />
        </View>
        {e.name ? <Text style={styles.err}>{e.name}</Text> : null}

        <View style={styles.rowLine}>
          <Text style={styles.label}>{t("deductions.amount") || "Сума"}</Text>
          <TextInput
            style={[styles.input, e.amount && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={String(item.amount ?? "")}
            onChangeText={(v) => updateRow(item.id, { amount: sanitizeMoneyInput(v) })}
            onBlur={() => {
              const n = parseMoney(item.amount);
              if (Number.isFinite(n)) updateRow(item.id, { amount: Number(n.toFixed(2)) });
            }}
          />
        </View>
        {e.amount ? <Text style={styles.err}>{e.amount}</Text> : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" style={[styles.btnSm, styles.btnDanger]} onPress={() => removeRow(item.id)}>
            <Text style={styles.btnSmText}>{t("deductions.delete") || "Изтрий"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.h1}>{t("deductions.title") || "Облекчения"}</Text>

        <View style={styles.headerRow}>
          <View style={styles.yearBox}>
            <Text style={styles.label}>{t("createTax.year") || "Година"}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(year)}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (Number.isFinite(n) && n.toString().length <= 4) setYear(n);
              }}
              maxLength={4}
            />
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>{t("deductions.total") || "Общо"}</Text>
            <Text style={styles.totalVal}>{fmtBGN(totals.sum)}</Text>
            <Text style={styles.limitText}>
              {t("deductions.limit", { limit: totalLimit }) || `Лимит: ${totalLimit.toFixed(2)} лв.`}
            </Text>
          </View>
        </View>

        {overLimit ? (
          <Text style={styles.err}>
            {(terr("overLimit") || "Надвишен лимит {{limit}}.").replace("{{limit}}", String(totalLimit))}
          </Text>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>{t("deductions.empty") || "Няма облекчения."}</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.footer}>
          <TouchableOpacity accessibilityRole="button" style={[styles.btn, styles.btnPrimary]} onPress={addRow}>
            <Text style={styles.btnText}>{t("deductions.add") || "Добави"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.btn, styles.btnPrimary, (hasErrors || !dirty) && styles.btnDisabled]}
            disabled={hasErrors || !dirty}
            onPress={onSave}
          >
            <Text style={styles.btnText}>{t("common.save") || "Запази"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  yearBox: { flex: 1 },
  totalBox: { alignItems: "flex-end", justifyContent: "flex-end", minWidth: 140 },
  totalLabel: { fontSize: 12, color: "#666" },
  totalVal: { fontSize: 18, fontWeight: "700" },
  limitText: { fontSize: 12, color: "#555", marginTop: 2 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  inputError: { borderColor: "#d32f2f", backgroundColor: "#fff5f5" },
  rowCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, marginBottom: 12, backgroundColor: "#fafafa" },
  rowLine: { marginBottom: 8 },
  actionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnPrimary: { backgroundColor: "#2e7d32" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  btnSm: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnDanger: { backgroundColor: "#c62828" },
  btnSmText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: "#666", paddingVertical: 24 },
  footer: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", justifyContent: "space-between" },
  err: { color: "#c62828", marginBottom: 8 },
});
