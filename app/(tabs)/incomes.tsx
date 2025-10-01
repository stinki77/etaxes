// app/(tabs)/incomes.tsx 
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";
import { loadIncomes, saveIncomes } from "../../src/lib/store";

type IncomeItem = {
  id: string;
  description: string;
  amount: number | string; // allow temporary text before validation
  date?: string;           // ISO YYYY-MM-DD

  incomeType?: "employment" | "civil" | "rent" | "other";
  payerName?: string;
  payerEik?: string;
  countryCode?: string;    // ISO-2, e.g., BG
  docType?: string;
  docNo?: string;
  docDate?: string;        // ISO YYYY-MM-DD
  taxWithheld?: number | string;
  expenseNormPct?: number | string; // 0..100
  notes?: string;
};

const isoRe = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNonNeg(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0;
}
function parseMoney(s: string | number) {
  if (s === "" || s == null) return 0;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
function parsePct(s: string | number) {
  if (s === "" || s == null) return 0;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : NaN;
}

// --- Дати: нормализиране и валидация ---
function normalizeDate(input: string): string {
  if (!input) return "";
  const s = String(input).trim().replace(/[./]/g, "-");
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD-MM-YYYY
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s; // остави каквото има; валидаторът ще улови
}
function isValidIsoDate(s: string): boolean {
  if (!isoRe.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // строгa проверка: JS да не е „коригирал“ датата
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// фабрика за нов ред
function makeRow(): IncomeItem {
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: "",
    amount: "",
    date: "",
    incomeType: "other",
    payerName: "",
    payerEik: "",
    countryCode: "",
    docType: "",
    docNo: "",
    docDate: "",
    taxWithheld: "",
    expenseNormPct: "",
    notes: "",
  };
}

export default function IncomesScreen() {
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
  const terr = useCallback((k: string) => tSync(lng, `incomes.errors.${k}`), [lng]);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [dirty, setDirty] = useState(false);

  // зареждане и гарантиране на поне 1 ред
  useEffect(() => {
    (async () => {
      try {
        const arr = await loadIncomes(year);
        const mapped = arr.map((x) => ({
          id: x.id,
          description: x.description,
          amount: x.amount,
          date: x.date,
          incomeType: x.incomeType || "other",
          payerName: x.payerName,
          payerEik: x.payerEik,
          countryCode: x.countryCode,
          docType: x.docType,
          docNo: x.docNo,
          docDate: x.docDate,
          taxWithheld: x.taxWithheld,
          expenseNormPct: x.expenseNormPct,
          notes: x.notes,
        }));
        setItems(mapped.length > 0 ? mapped : [makeRow()]);
        setDirty(false);
      } catch {
        setItems([makeRow()]);
        Alert.alert(t("common.error") || "Error", t("common.loadFailed") || "Load failed.");
      }
    })();
  }, [year, t]);

  const errors = useMemo(() => {
    const list: Record<
      string,
      {
        description?: string;
        amount?: string;
        date?: string;
        taxWithheld?: string;
        expenseNormPct?: string;
        docDate?: string;
      }
    > = {};
    items.forEach((it) => {
      const e: any = {};
      if (!it.description?.trim()) e.description = terr("descRequired") || "Описание е задължително.";
      const amt = parseMoney(it.amount);
      if (!isFiniteNonNeg(amt)) e.amount = terr("amountInvalid") || "Невалидна сума.";

      if (it.date) {
        const nd = normalizeDate(it.date);
        if (!isValidIsoDate(nd)) e.date = terr("dateInvalid") || "Невалидна дата (YYYY-MM-DD).";
      }

      if (it.taxWithheld !== undefined && String(it.taxWithheld).trim() !== "") {
        const tw = parseMoney(it.taxWithheld as any);
        if (!isFiniteNonNeg(tw)) e.taxWithheld = terr("amountInvalid") || "Невалидна сума.";
      }
      if (it.expenseNormPct !== undefined && String(it.expenseNormPct).trim() !== "") {
        const p = parsePct(it.expenseNormPct as any);
        if (!Number.isFinite(p)) e.expenseNormPct = "Невалиден процент.";
      }

      if (it.docDate) {
        const nd = normalizeDate(it.docDate);
        if (!isValidIsoDate(nd)) e.docDate = "Невалидна дата (YYYY-MM-DD).";
      }

      if (Object.keys(e).length) list[it.id] = e;
    });
    return list;
  }, [items, terr]);

  const hasErrors = Object.keys(errors).length > 0;

  const total = useMemo(() => {
    return items.reduce((s, it) => {
      const n = parseMoney(it.amount);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [items]);

  const addRow = () => {
    setItems((arr) => [...arr, makeRow()]);
    setDirty(true);
  };
  const removeRow = (id: string) => {
    setItems((arr) => {
      const left = arr.filter((x) => x.id !== id);
      return left.length > 0 ? left : [makeRow()];
    });
    setDirty(true);
  };
  const updateRow = (id: string, patch: Partial<IncomeItem>) => {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  const onSave = async () => {
    if (hasErrors) {
      Alert.alert(t("common.error") || "Error", terr("fixErrors") || "Поправете грешките.");
      return;
    }
    const clean = items.map((it) => ({
      id: it.id,
      description: String(it.description || ""),
      amount: parseMoney(it.amount),
      date: (() => {
        const nd = normalizeDate(it.date || "");
        return isValidIsoDate(nd) ? nd : undefined;
      })(),

      incomeType: (it.incomeType || "other") as IncomeItem["incomeType"],
      payerName: it.payerName || undefined,
      payerEik: it.payerEik || undefined,
      countryCode: it.countryCode ? String(it.countryCode).toUpperCase() : undefined,
      docType: it.docType || undefined,
      docNo: it.docNo || undefined,
      docDate: (() => {
        const nd = normalizeDate(it.docDate || "");
        return isValidIsoDate(nd) ? nd : undefined;
      })(),
      taxWithheld: (() => {
        const v = parseMoney(it.taxWithheld as any);
        return Number.isFinite(v) ? v : 0;
      })(),
      expenseNormPct: (() => {
        const v = parsePct(it.expenseNormPct as any);
        return Number.isFinite(v) ? v : 0;
      })(),
      notes: it.notes || undefined,
    }));
    try {
      await saveIncomes(year, clean as any);
      setDirty(false);
      Alert.alert(t("common.ok") || "OK", t("common.saved") || "Saved.");
    } catch {
      Alert.alert(t("common.error") || "Error", t("common.saveFailed") || "Save failed.");
    }
  };

  const renderItem = ({ item }: { item: IncomeItem }) => {
    const e = errors[item.id] || {};
    const type = (item.incomeType || "other") as NonNullable<IncomeItem["incomeType"]>;
    return (
      <View style={styles.rowCard}>
        {/* Описание */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>{tSync(lng, "incomes.description") || "Описание"}</Text>
          <TextInput
            style={[styles.input, e.description && styles.inputError]}
            placeholder={tSync(lng, "incomes.placeholders.description") || "Описание"}
            value={item.description}
            onChangeText={(v) => updateRow(item.id, { description: v })}
          />
        </View>
        {e.description ? <Text style={styles.err}>{e.description}</Text> : null}

        {/* Сума */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>{tSync(lng, "incomes.amount") || "Сума"}</Text>
          <TextInput
            style={[styles.input, e.amount && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={String(item.amount ?? "")}
            onChangeText={(v) => updateRow(item.id, { amount: v })}
          />
        </View>
        {e.amount ? <Text style={styles.err}>{e.amount}</Text> : null}

        {/* Дата */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>{tSync(lng, "incomes.date") || "Дата"}</Text>
          <TextInput
            style={[styles.input, e.date && styles.inputError]}
            placeholder="YYYY-MM-DD"
            value={item.date ?? ""}
            onChangeText={(v) => updateRow(item.id, { date: v })}
            onEndEditing={(ev) => {
              const nd = normalizeDate(ev.nativeEvent.text || "");
              updateRow(item.id, { date: nd });
            }}
          />
        </View>
        {e.date ? <Text style={styles.err}>{e.date}</Text> : null}

        {/* Тип доход */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>Тип доход</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["employment", "civil", "rent", "other"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                accessibilityRole="button"
                onPress={() => updateRow(item.id, { incomeType: opt })}
                style={[styles.chip, type === opt && styles.chipActive]}
              >
                <Text style={type === opt ? styles.chipActiveText : styles.chipText}>
                  {opt === "employment"
                    ? "Трудов"
                    : opt === "civil"
                    ? "Граждански"
                    : opt === "rent"
                    ? "Наем"
                    : "Друг"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Платец */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>Платец (име / ЕИК / държава)</Text>
          <TextInput
            style={styles.input}
            placeholder="Име на платеца"
            value={item.payerName || ""}
            onChangeText={(v) => updateRow(item.id, { payerName: v })}
          />
          <View style={{ height: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="ЕИК (по желание)"
            value={item.payerEik || ""}
            onChangeText={(v) => updateRow(item.id, { payerEik: v })}
          />
          <View style={{ height: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Държава (ISO, напр. BG)"
            autoCapitalize="characters"
            value={item.countryCode || ""}
            onChangeText={(v) => updateRow(item.id, { countryCode: v })}
          />
        </View>

        {/* Документ */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>Документ (тип / № / дата)</Text>
          <TextInput
            style={styles.input}
            placeholder="Тип документ"
            value={item.docType || ""}
            onChangeText={(v) => updateRow(item.id, { docType: v })}
          />
          <View style={{ height: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="№"
            value={item.docNo || ""}
            onChangeText={(v) => updateRow(item.id, { docNo: v })}
          />
          <View style={{ height: 8 }} />
          <TextInput
            style={[styles.input, e.docDate && styles.inputError]}
            placeholder="YYYY-MM-DD"
            value={item.docDate || ""}
            onChangeText={(v) => updateRow(item.id, { docDate: v })}
            onEndEditing={(ev) => {
              const nd = normalizeDate(ev.nativeEvent.text || "");
              updateRow(item.id, { docDate: nd });
            }}
          />
          {e.docDate ? <Text style={styles.err}>{e.docDate}</Text> : null}
        </View>

        {/* Удържан данък и НПР % */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>Удържан данък / НПР %</Text>
          <TextInput
            style={[styles.input, e.taxWithheld && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="Удържан данък (0.00)"
            value={String(item.taxWithheld ?? "")}
            onChangeText={(v) => updateRow(item.id, { taxWithheld: v })}
          />
          {e.taxWithheld ? <Text style={styles.err}>{e.taxWithheld}</Text> : null}
          <View style={{ height: 8 }} />
          <TextInput
            style={[styles.input, e.expenseNormPct && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="НПР % (0..100)"
            value={String(item.expenseNormPct ?? "")}
            onChangeText={(v) => updateRow(item.id, { expenseNormPct: v })}
          />
          {e.expenseNormPct ? <Text style={styles.err}>{e.expenseNormPct}</Text> : null}
        </View>

        {/* Бележки */}
        <View style={styles.rowLine}>
          <Text style={styles.label}>Бележки</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            multiline
            placeholder="Допълнителна информация"
            value={item.notes || ""}
            onChangeText={(v) => updateRow(item.id, { notes: v })}
          />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity accessibilityRole="button" style={[styles.btnSm, styles.btnDanger]} onPress={() => removeRow(item.id)}>
            <Text style={styles.btnSmText}>{tSync(lng, "incomes.delete") || "Изтрий"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{tSync(lng, "createTax.income")}</Text>

      <View style={styles.headerRow}>
        <View style={styles.yearBox}>
          <Text style={styles.label}>{tSync(lng, "createTax.year")}</Text>
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

        {items.length > 0 && (
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>{tSync(lng, "incomes.total") || "Общо"}</Text>
            <Text style={styles.totalVal}>
              {new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN" }).format(total)}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{tSync(lng, "incomes.empty") || "Няма записи."}</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity accessibilityRole="button" style={[styles.btn, styles.btnPrimary]} onPress={addRow}>
          <Text style={styles.btnText}>{tSync(lng, "incomes.add") || "Добави"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.btn, styles.btnPrimary, (hasErrors || !dirty) && styles.btnDisabled]}
          disabled={hasErrors || !dirty}
          onPress={onSave}
        >
          <Text style={styles.btnText}>{tSync(lng, "common.save") || "Запази"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  yearBox: { flex: 1 },
  totalBox: { alignItems: "flex-end", justifyContent: "flex-end" },
  totalLabel: { fontSize: 12, color: "#666" },
  totalVal: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  inputError: { borderColor: "#d32f2f", backgroundColor: "#fff5f5" },
  rowCard: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, marginBottom: 12, backgroundColor: "#fafafa",
  },
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
  footer: {
    position: "absolute", left: 16, right: 16, bottom: 16,
    flexDirection: "row", justifyContent: "space-between",
  },
  err: { color: "#c62828", marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: "#bbb", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  chipText: { color: "#333", fontWeight: "600" },
  chipActiveText: { color: "#fff", fontWeight: "700" },
});
