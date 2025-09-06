import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

type ArchiveItem = {
  id: string;
  year: number;
  summary: string;
  amount: number; // лв.
  date: string;   // ISO или текст
};

const STORAGE_KEY = "@archive";

export default function ArchiveScreen() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [busy, setBusy] = useState(false);

  const loadArchive = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      setItems(json ? JSON.parse(json) : []);
    } catch {
      Alert.alert(t("error"), t("loadError"));
    }
  };

  useFocusEffect(useCallback(() => { loadArchive(); }, []));

  const saveArchive = async (next: ArchiveItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toCurrency = (n: number) => `${n.toFixed(2)} ${t("currencyShort")}`;

  const buildHtml = (rows: ArchiveItem[]) => {
    const th = `
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">${t("year")}</th>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">${t("summary")}</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">${t("amount")}</th>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">${t("date")}</th>
      </tr>`;
    const trs = rows.map(
      (r) => `<tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${r.year}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${r.summary}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${r.amount.toFixed(2)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${r.date}</td>
      </tr>`
    ).join("");

    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    return `
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, Helvetica, sans-serif; padding: 16px;">
      <h2>${t("archiveTitle")}</h2>
      <table style="width:100%;border-collapse:collapse;">${th}${trs}</table>
      <div style="margin-top:12px;text-align:right;font-weight:bold;">
        ${t("total")}: ${total.toFixed(2)} ${t("currencyShort")}
      </div>
      <div style="margin-top:8px;font-size:12px;color:#555;">
        ${t("generatedBy")} • ${new Date().toLocaleString(i18n.language)}
      </div>
    </body>
    </html>`;
  };

  const writeExcel = async (rows: ArchiveItem[], filename: string) => {
    const data = rows.map((r) => ({
      [t("year")]: r.year,
      [t("summary")]: r.summary,
      [t("amount")]: r.amount,
      [t("date")]: r.date,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("archiveTitle")); // без твърд "Archive"
    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const uri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  };

  const exportPdfAll = async () => {
    if (!items.length) return;
    try {
      setBusy(true);
      const { uri } = await Print.printToFileAsync({ html: buildHtml(items) });
      await Sharing.shareAsync(uri, { dialogTitle: t("sharePdfTitle") });
    } catch {
      Alert.alert(t("error"), t("exportPdfError"));
    } finally { setBusy(false); }
  };

  const exportExcelAll = async () => {
    if (!items.length) return;
    try {
      setBusy(true);
      const uri = await writeExcel(items, `archive_${Date.now()}.xlsx`);
      await Sharing.shareAsync(uri, { dialogTitle: t("shareXlsxTitle") });
    } catch {
      Alert.alert(t("error"), t("exportExcelError"));
    } finally { setBusy(false); }
  };

  const viewPdf = async (row: ArchiveItem) => {
    try {
      setBusy(true);
      const { uri } = await Print.printToFileAsync({ html: buildHtml([row]) });
      await Sharing.shareAsync(uri, { dialogTitle: t("sharePdfTitle") });
    } catch {
      Alert.alert(t("error"), t("exportPdfError"));
    } finally { setBusy(false); }
  };

  const exportRowExcel = async (row: ArchiveItem) => {
    try {
      setBusy(true);
      const uri = await writeExcel([row], `archive_${row.id}.xlsx`);
      await Sharing.shareAsync(uri, { dialogTitle: t("shareXlsxTitle") });
    } catch {
      Alert.alert(t("error"), t("exportExcelError"));
    } finally { setBusy(false); }
  };

  const deleteRow = (row: ArchiveItem) => {
    Alert.alert(t("confirm"), t("deleteConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const next = items.filter((x) => x.id !== row.id);
          await saveArchive(next);
        },
      },
    ]);
  };

  const clearArchive = async () => {
    Alert.alert(t("confirm"), t("clearConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clear"),
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setItems([]);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.year}>{item.year}</Text>
        <Text style={styles.amount}>{toCurrency(item.amount)}</Text>
      </View>
      <Text style={styles.summary}>{item.summary}</Text>
      <Text style={styles.date}>{t("date")}: {item.date}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => viewPdf(item)}>
          <Text style={styles.btnText}>{t("viewPdf")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => exportRowExcel(item)}>
          <Text style={styles.btnText}>{t("exportExcel")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => deleteRow(item)}>
          <Text style={styles.btnText}>{t("delete")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("archiveTitle")}</Text>
        <View style={styles.headerActions}>
          {items.length > 0 && (
            <>
              <TouchableOpacity style={styles.headerBtn} onPress={exportPdfAll}>
                <Text style={styles.headerBtnText}>{t("exportPdfAll")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={exportExcelAll}>
                <Text style={styles.headerBtnText}>{t("exportExcelAll")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnDanger]} onPress={clearArchive}>
                <Text style={styles.headerBtnText}>{t("clear")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator size="small" />
          <Text style={styles.busyText}>{t("working")}</Text>
        </View>
      )}

      {items.length === 0 ? (
        <Text style={styles.empty}>{t("noArchive")}</Text>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#2e7d32" },
  headerActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  headerBtn: { backgroundColor: "#2e7d32", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  headerBtnDanger: { backgroundColor: "#c62828" },
  headerBtnText: { color: "white", fontSize: 12, fontWeight: "600" },

  busy: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  busyText: { fontSize: 12, color: "#555" },

  empty: { marginTop: 30, fontSize: 16, textAlign: "center", color: "#777" },
  list: { paddingBottom: 24 },

  card: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  year: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  summary: { fontSize: 14, marginBottom: 4 },
  amount: { fontSize: 14, color: "#2e7d32", fontWeight: "600" },
  date: { fontSize: 12, color: "#666" },

  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  btn: { backgroundColor: "#eeeeee", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  btnDanger: { backgroundColor: "#ffcdd2" },
  btnText: { fontSize: 12, color: "#222" },
});
