// app/(tabs)/create-tax.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
// @ts-ignore – декларация при нужда: declare module "xlsx";
import * as XLSX from "xlsx";
import { router } from "expo-router";

import {
  Locale,
  getLocale,
  onLocaleChange,
  tSync,
} from "../../src/localization";

// ────────────────────────────────────────────────────────────────────────────────
// Типове и ключове
type FormState = {
  year: string;               // 2025
  totalIncome: number;        // общ доход
  normExpensePct: number;     // нормативни разходи %
  insurances: number;         // лични осигуровки (сума)
  otherReliefs: number;       // други облекчения (сума)
  taxRatePct: number;         // ставка %, по подразбиране 10
  withheldAdvance: number;    // авансово удържан
  note: string;               // бележка (незадължителна)
};

const STORAGE_KEY = "@create_tax_calc_v1";

// ────────────────────────────────────────────────────────────────────────────────
// Помощни
function num(v: string) {
  const n = Number(v.replace?.(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
function clampMin0(n: number) {
  return n < 0 ? 0 : n;
}

// Зарежда сумата от @income_sources_<year> ако има записи от екрана "Източници на доход"
async function loadIncomeForYear(year: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(`@income_sources_${year}`);
    if (!raw) return 0;
    const items: Array<{ amount: number }> = JSON.parse(raw);
    return items.reduce((s, it) => s + (Number(it?.amount) || 0), 0);
  } catch {
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
export default function CreateTaxScreen() {
  const [lng, setLng] = useState<Locale>("bg");
  const [state, setState] = useState<FormState>({
    year: String(new Date().getFullYear()),
    totalIncome: 0,
    normExpensePct: 0,
    insurances: 0,
    otherReliefs: 0,
    taxRatePct: 10,
    withheldAdvance: 0,
    note: "",
  });

  // Локализация: еднократно + live
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      unsub = onLocaleChange(setLng);
    })();
    return () => unsub();
  }, []);

  // Хидратиране от локално състояние
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState((s) => ({ ...s, ...(JSON.parse(raw) as FormState) }));
      } catch {}
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  // Етикети
  const L = useMemo(() => {
    return {
      title: lng === "bg" ? "Данъчен калкулатор" : "Tax calculator",
      year: lng === "bg" ? "Година" : "Year",
      totalIncome: lng === "bg" ? "Общ доход" : "Total income",
      getFromCsv: lng === "bg" ? "Вземи доходи (CSV)" : "Fetch incomes (CSV)",
      normPct: lng === "bg" ? "Нормативни разходи (%)" : "Normative expenses (%)",
      insurances: lng === "bg" ? "Осигуровки (сума)" : "Insurances (sum)",
      reliefs: lng === "bg" ? "Други облекчения (сума)" : "Other reliefs (sum)",
      taxRate: lng === "bg" ? "Ставка (%)" : "Rate (%)",
      withheld: lng === "bg" ? "Авансово удържан" : "Withheld advance",
      note: lng === "bg" ? "Бележка" : "Note",

      base: lng === "bg" ? "Данъчна основа" : "Tax base",
      tax: lng === "bg" ? "Данък" : "Tax",
      payback: lng === "bg" ? "За доплащане / възстановяване" : "To pay / refund",

      preview: lng === "bg" ? "Преглед" : "Preview",
      generatePdf: lng === "bg" ? "Генерирай PDF" : "Generate PDF",
      exportXlsx: lng === "bg" ? "Експорт в Excel" : "Export to Excel",
      saved: lng === "bg" ? "Записано" : "Saved",
      pdfDone: lng === "bg" ? "PDF е готов" : "PDF is ready",
      shareUnsupported: lng === "bg" ? "Споделянето не се поддържа." : "Sharing is not supported.",
      fetched: lng === "bg" ? "Импорт" : "Import",
      fetchedMsg: (sum: number) =>
        lng === "bg" ? `Намерен общ доход за ${state.year}: ${money(sum)} лв.` : `Total income for ${state.year}: ${money(sum)}`,
      invalidNumber: lng === "bg" ? "Невалидно число" : "Invalid number",
    };
  }, [lng, state.year]);

  // Изчисления
  const calc = useMemo(() => {
    const income = state.totalIncome;
    const norm = clampMin0((state.normExpensePct / 100) * income);
    const baseBefore = income - norm - state.insurances - state.otherReliefs;
    const base = clampMin0(baseBefore);
    const tax = clampMin0((state.taxRatePct / 100) * base);
    const payback = tax - state.withheldAdvance; // >0 доплащане, <0 възстановяване
    return { income, norm, base, tax, payback };
  }, [state]);

  // Обработчици
  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const fetchIncomeFromCsv = useCallback(async () => {
    const sum = await loadIncomeForYear(state.year);
    setField("totalIncome", sum);
    Alert.alert(L.fetched, L.fetchedMsg(sum));
  }, [state.year, setField, L]);

  const goIncomeScreen = useCallback(() => {
    router.push("/income-sources");
  }, []);

  // PDF
  const onGeneratePdf = useCallback(async () => {
    const html = renderPdfHtml(L, state, calc, lng);
    const { uri } = await Print.printToFileAsync({ html });
    const target = FileSystem.documentDirectory + `etaxes-${state.year}-${Date.now()}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: target }).catch(() => {});
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(L.pdfDone, L.shareUnsupported);
      return;
    }
    await Sharing.shareAsync(target);
  }, [L, state, calc, lng]);

  // XLSX
  const onExportXlsx = useCallback(async () => {
    const rows = [
      { Field: L.year, Value: state.year },
      { Field: L.totalIncome, Value: money(calc.income) },
      { Field: L.normPct, Value: `${money(state.normExpensePct)} %` },
      { Field: "Нормативни разходи / Norm", Value: money(calc.norm) },
      { Field: L.insurances, Value: money(state.insurances) },
      { Field: L.reliefs, Value: money(state.otherReliefs) },
      { Field: L.taxRate, Value: `${money(state.taxRatePct)} %` },
      { Field: L.base, Value: money(calc.base) },
      { Field: L.tax, Value: money(calc.tax) },
      { Field: L.withheld, Value: money(state.withheldAdvance) },
      { Field: L.payback, Value: money(calc.payback) },
      { Field: L.note, Value: state.note || "" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tax");
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

    const path = FileSystem.documentDirectory + `etaxes-${state.year}-${Date.now()}.xlsx`;
    await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(L.saved, path);
      return;
    }
    await Sharing.shareAsync(path);
  }, [L, state, calc]);

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{L.title}</Text>

        {/* Година */}
        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.label}>{L.year}</Text>
            <TextInput
              value={state.year}
              onChangeText={(v) => setField("year", v.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="2025"
            />
          </View>
          <View style={styles.col} />
        </View>

        {/* Общ доход + бутони */}
        <Text style={styles.section}>{L.totalIncome}</Text>
        <View style={styles.row2}>
          <View style={styles.col}>
            <TextInput
              value={String(state.totalIncome || "")}
              onChangeText={(v) => setField("totalIncome", num(v))}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0.00"
            />
          </View>
        </View>
        <View style={styles.row2}>
          <TouchableOpacity style={styles.linkBtn} onPress={goIncomeScreen}>
            <Text style={styles.linkBtnText}>↗ {L.getFromCsv}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={fetchIncomeFromCsv}>
            <Text style={styles.linkBtnText}>⟳ {L.getFromCsv}</Text>
          </TouchableOpacity>
        </View>

        {/* Параметри */}
        <Text style={styles.section}>{L.normPct}</Text>
        <TextInput
          value={String(state.normExpensePct)}
          onChangeText={(v) => {
            const n = num(v);
            if (n < 0 || n > 100) return Alert.alert(L.invalidNumber);
            setField("normExpensePct", n);
          }}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0, 25, 40…"
        />

        <Text style={styles.section}>{L.insurances}</Text>
        <TextInput
          value={String(state.insurances)}
          onChangeText={(v) => setField("insurances", num(v))}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.00"
        />

        <Text style={styles.section}>{L.reliefs}</Text>
        <TextInput
          value={String(state.otherReliefs)}
          onChangeText={(v) => setField("otherReliefs", num(v))}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.00"
        />

        <Text style={styles.section}>{L.taxRate}</Text>
        <TextInput
          value={String(state.taxRatePct)}
          onChangeText={(v) => {
            const n = num(v);
            if (n < 0 || n > 100) return Alert.alert(L.invalidNumber);
            setField("taxRatePct", n);
          }}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="10"
        />

        <Text style={styles.section}>{L.withheld}</Text>
        <TextInput
          value={String(state.withheldAdvance)}
          onChangeText={(v) => setField("withheldAdvance", num(v))}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.00"
        />

        <Text style={styles.section}>{L.note}</Text>
        <TextInput
          value={state.note}
          onChangeText={(v) => setField("note", v)}
          style={styles.input}
          placeholder={L.note}
        />

        {/* Преглед */}
        <Text style={[styles.section, { marginTop: 16 }]}>{L.preview}</Text>
        <View style={styles.summary}>
          <Row label={L.totalIncome} value={money(calc.income)} />
          <Row label={`${L.normPct}`} value={`${money(state.normExpensePct)} %`} />
          <Row label={"Нормативни разходи / Norm"} value={money(calc.norm)} />
          <Row label={L.insurances} value={money(state.insurances)} />
          <Row label={L.reliefs} value={money(state.otherReliefs)} />
          <Row label={L.base} value={money(calc.base)} />
          <Row label={`${L.tax} (${money(state.taxRatePct)}%)`} value={money(calc.tax)} />
          <Row label={L.withheld} value={money(state.withheldAdvance)} />
          <Row label={L.payback} value={money(calc.payback)} bold />
        </View>

        {/* Действия */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onGeneratePdf}>
            <Text style={styles.btnText}>{L.generatePdf}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn]} onPress={onExportXlsx}>
            <Text style={styles.btnText}>{L.exportXlsx}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Ред за преглед
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

// PDF HTML
function renderPdfHtml(
  L: Record<string, any>,
  s: FormState,
  c: { income: number; norm: number; base: number; tax: number; payback: number },
  lng: Locale
) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${L.title}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;}
h1{font-size:20px;margin:0 0 12px;}
table{width:100%;border-collapse:collapse;margin-top:12px;}
th,td{border:1px solid #ddd;padding:8px;font-size:12px;}
th{background:#f7f7f7;text-align:left;}
.row{display:flex;justify-content:space-between;margin:4px 0}
.bold{font-weight:700}
.small{opacity:.7;font-size:12px}
</style>
</head>
<body>
  <h1>${L.title}</h1>
  <div class="small">${L.year}: ${s.year}</div>
  <div class="small">${L.note}: ${escapeHtml(s.note || "")}</div>

  <table>
    <tbody>
      <tr><th>${L.totalIncome}</th><td>${money(c.income)}</td></tr>
      <tr><th>${L.normPct}</th><td>${money(s.normExpensePct)} %</td></tr>
      <tr><th>Нормативни разходи / Norm</th><td>${money(c.norm)}</td></tr>
      <tr><th>${L.insurances}</th><td>${money(s.insurances)}</td></tr>
      <tr><th>${L.reliefs}</th><td>${money(s.otherReliefs)}</td></tr>
      <tr><th>${L.base}</th><td>${money(c.base)}</td></tr>
      <tr><th>${L.tax} (${money(s.taxRatePct)}%)</th><td>${money(c.tax)}</td></tr>
      <tr><th>${L.withheld}</th><td>${money(s.withheldAdvance)}</td></tr>
      <tr><th>${L.payback}</th><td>${money(c.payback)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
}
function escapeHtml(x: string) {
  return x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ────────────────────────────────────────────────────────────────────────────────
// Стилове
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },

  section: { marginTop: 14, marginBottom: 6, fontSize: 15, fontWeight: "700" },
  label: { fontSize: 12, opacity: 0.8, marginBottom: 4 },

  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  bold: { fontWeight: "700" },

  row2: { flexDirection: "row", gap: 12, alignItems: "flex-end" },

  col: { flex: 1 },

  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  summary: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },

  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8c8c8",
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#e8f3ff", borderColor: "#a0c8ff" },
  btnText: { fontSize: 14, fontWeight: "700" },

  linkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8c8c8",
    alignItems: "center",
    backgroundColor: "#f7faff",
    marginTop: 6,
  },
  linkBtnText: { fontSize: 13, fontWeight: "700" },
});
