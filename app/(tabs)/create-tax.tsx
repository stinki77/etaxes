// app/(tabs)/create-tax.tsx
import React, { useEffect, useMemo, useState } from "react";
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
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import XLSX from "xlsx";
import { parseAndStoreCsvText, loadImportedIncomesForYear, ImportedIncome } from "../../src/lib/csv";

export default function CreateTax() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [manualIncome, setManualIncome] = useState<string>("");
  const [importedTotal, setImportedTotal] = useState<number>(0);
  const [importedItems, setImportedItems] = useState<ImportedIncome[]>([]);
  const [normativePercent, setNormativePercent] = useState<string>("20");
  const [socialPercent, setSocialPercent] = useState<string>("13.78");
  const [deductions, setDeductions] = useState<string>("0");
  const TAX_RATE = 0.1;
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  useEffect(() => {
    loadImportedIncomes();
  }, [year]);

  async function loadImportedIncomes() {
    try {
      const arr = await loadImportedIncomesForYear(year);
      setImportedItems(arr);
      const sum = arr.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      setImportedTotal(sum);
    } catch (e) {
      console.warn("loadImportedIncomes:", e);
      setImportedItems([]);
      setImportedTotal(0);
    }
  }

  function parseNumber(v: string) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const income = useMemo(() => {
    const m = parseNumber(manualIncome);
    return m > 0 ? m : importedTotal;
  }, [manualIncome, importedTotal]);

  const normativeAmount = useMemo(() => (income * parseNumber(normativePercent)) / 100, [income, normativePercent]);
  const socialAmount = useMemo(() => (income * parseNumber(socialPercent)) / 100, [income, socialPercent]);
  const taxableIncome = useMemo(() => {
    const base = income - normativeAmount - socialAmount - parseNumber(deductions);
    return base > 0 ? Math.round(base * 100) / 100 : 0;
  }, [income, normativeAmount, socialAmount, deductions]);
  const tax = useMemo(() => Math.round(taxableIncome * TAX_RATE * 100) / 100, [taxableIncome]);
  const netIncome = useMemo(() => Math.round((income - tax - socialAmount) * 100) / 100, [income, tax, socialAmount]);

  function validateRequired() {
    if (income <= 0) {
      Alert.alert("Грешка", "Няма доход. Въведете доход или импортирайте записи за избраната година.");
      return false;
    }
    return true;
  }

  async function handleImportCsv() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/*"], copyToCacheDirectory: true });
      if (res.type !== "success" || !res.uri) {
        return;
      }
      const content = await FileSystem.readAsStringAsync(res.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const sum = await parseAndStoreCsvText(content, year);
      await loadImportedIncomes();
      Alert.alert("CSV импорт", `Успешно импортнати записи. Сбор за ${year}: ${sum.toFixed(2)} лв.`);
    } catch (e) {
      console.warn("handleImportCsv:", e);
      Alert.alert("Грешка", "Неуспешен импорт от CSV.");
    }
  }

  async function generatePdf() {
    if (!validateRequired()) return;
    const html = `
      <html>
        <body>
          <h2>Преглед - декларация ${year}</h2>
          <table>
            <tr><td>Общ доход</td><td>${income.toFixed(2)} лв.</td></tr>
            <tr><td>Нормативни разходи (${normativePercent} %)</td><td>${normativeAmount.toFixed(2)} лв.</td></tr>
            <tr><td>Осигуровки (${socialPercent} %)</td><td>${socialAmount.toFixed(2)} лв.</td></tr>
            <tr><td>Облекчения</td><td>${parseNumber(deductions).toFixed(2)} лв.</td></tr>
            <tr><td>Облагаем доход</td><td>${taxableIncome.toFixed(2)} лв.</td></tr>
            <tr><td>Данък (10%)</td><td>${tax.toFixed(2)} лв.</td></tr>
            <tr><td>Нетен доход</td><td>${netIncome.toFixed(2)} лв.</td></tr>
          </table>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      setLastExportPath(uri);
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn("generatePdf:", e);
      Alert.alert("Грешка", "Неуспешен експорт в PDF.");
    }
  }

  async function generateXlsx() {
    if (!validateRequired()) return;
    try {
      const wb = XLSX.utils.book_new();
      const data = [
        ["Поле", "Стойност"],
        ["Година", year],
        ["Общ доход", income],
        [`Нормативни разходи (${normativePercent}%)`, normativeAmount],
        [`Осигуровки (${socialPercent}%)`, socialAmount],
        ["Облекчения", parseNumber(deductions)],
        ["Облагаем доход", taxableIncome],
        ["Данък (10%)", tax],
        ["Нетен доход", netIncome],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Summary");
      const wbout = XLSX.write(wb, { type: "binary", bookType: "xlsx" });

      function s2ab(s: string) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
      }
      const fileUri = `${FileSystem.cacheDirectory}declaration_${year}.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(s2ab(wbout)).toString("base64"), {
        encoding: FileSystem.EncodingType.Base64,
      });
      setLastExportPath(fileUri);
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      console.warn("generateXlsx:", e);
      Alert.alert("Грешка", "Неуспешен експорт в XLSX.");
    }
  }

  async function saveSnapshotToArchive() {
    if (!validateRequired()) return;
    try {
      const record = {
        id: `${Date.now()}`,
        title: `Декларация ${year}`,
        createdAt: new Date().toISOString(),
        payload: {
          year,
          income,
          normativePercent,
          socialPercent,
          deductions,
          tax,
        },
      };
      const raw = (await AsyncStorage.getItem("archive")) || "[]";
      const arr = JSON.parse(raw);
      arr.unshift(record);
      await AsyncStorage.setItem("archive", JSON.stringify(arr));
      Alert.alert("Запазено", "Данните бяха записани в Архива.");
    } catch (e) {
      console.warn("saveSnapshotToArchive:", e);
      Alert.alert("Грешка", "Неуспешно запазване в Архива.");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={s.container}>
      <ScrollView contentContainerStyle={s.inner}>
        <Text style={s.title}>Калкулатор данък (MVP)</Text>

        <Text style={s.label}>Година</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={year} onChangeText={setYear} />

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Ръчен доход (лв.)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              placeholder="1000.00"
              value={manualIncome}
              onChangeText={setManualIncome}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ width: 120, justifyContent: "flex-end" }}>
            <Text style={s.label}>Импорт</Text>
            <TouchableOpacity style={s.btn} onPress={loadImportedIncomes}>
              <Text style={s.btnText}>Обнови</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <TouchableOpacity style={s.csvBtn} onPress={handleImportCsv}>
            <Text style={s.btnText}>Импорт CSV</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.small}>Импортиран сбор: {importedTotal.toFixed(2)} лв.</Text>

        {/* UI preview на импортнатите записи */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>Преглед на импортирани записи ({importedItems.length})</Text>
          <FlatList
            data={importedItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                <Text>{item.description}</Text>
                <Text>{Number(item.amount).toFixed(2)} лв.</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: "#666" }}>Няма импортирани записи</Text>}
            style={{ maxHeight: 220, marginBottom: 8 }}
          />
        </View>

        <Text style={s.label}>Нормативни разходи (%)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={normativePercent} onChangeText={setNormativePercent} />

        <Text style={s.label}>Осигуровки (%)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={socialPercent} onChangeText={setSocialPercent} />

        <Text style={s.label}>Облекчения (лв.)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={deductions} onChangeText={setDeductions} />

        <View style={s.divider} />

        <Text style={s.label}>Резултат</Text>
        <View style={s.rowBlock}>
          <Text>Общ доход: {income.toFixed(2)} лв.</Text>
          <Text>Нормативни: {normativeAmount.toFixed(2)} лв.</Text>
          <Text>Осигуровки: {socialAmount.toFixed(2)} лв.</Text>
          <Text>Облекчения: {parseNumber(deductions).toFixed(2)} лв.</Text>
          <Text>Облагаем доход: {taxableIncome.toFixed(2)} лв.</Text>
          <Text>Данък (10%): {tax.toFixed(2)} лв.</Text>
          <Text>Нетно: {netIncome.toFixed(2)} лв.</Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={generatePdf}>
            <Text style={s.actionText}>Експорт PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={generateXlsx}>
            <Text style={s.actionText}>Експорт XLSX</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtnAlt} onPress={saveSnapshotToArchive}>
            <Text style={s.actionTextAlt}>Запази в Архив</Text>
          </TouchableOpacity>
        </View>

        {lastExportPath ? (
          <Text style={s.small}>Последен експорт: {lastExportPath}</Text>
        ) : (
          <Text style={s.small}>Няма експортиран файл</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  label: { marginTop: 6, marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
  },
  btn: {
    backgroundColor: "#2e7d32",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  csvBtn: {
    backgroundColor: "#4caf50",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  small: { color: "#333", marginTop: 6 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  rowBlock: { gap: 6, padding: 8, backgroundColor: "#fafafa", borderRadius: 6 },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  actionBtn: {
    backgroundColor: "#1e88e5",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "600" },
  actionBtnAlt: {
    borderWidth: 1,
    borderColor: "#666",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  actionTextAlt: { color: "#333", fontWeight: "600" },
});
