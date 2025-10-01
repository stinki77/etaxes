// app/submit.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { getLocale, onLocaleChange, tSync, type Locale } from "../src/localization";
import { generateNapXml } from "../src/lib/napXml";
import { getPerson } from "../src/config/nap";
import {
  loadIncomes,
  loadDeductions,
  loadDeclaration,
  markDeclarationSubmitted,
  saveDeclaration,
  type DeclarationDraftOrSubmitted,
} from "../src/lib/store";

type Attached = { name: string; uri: string; size?: number };

function fmtBGN(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export default function SubmitScreen() {
  // year can arrive as param ?year=2025; fallback to current year
  const params = useLocalSearchParams<{ year?: string }>();
  const curYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(() => {
    const y = parseInt(String(params.year ?? ""), 10);
    return Number.isFinite(y) ? y : curYear;
  });

  // i18n
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

  const [decl, setDecl] = useState<DeclarationDraftOrSubmitted | undefined>(undefined);
  const [xmlUri, setXmlUri] = useState<string | undefined>(undefined);
  const [attachments, setAttachments] = useState<Attached[]>([]);
  const [note, setNote] = useState<string>("");

  // hydrate saved declaration
  const hydrate = useCallback(async (y: number) => {
    try {
      const d = await loadDeclaration(y);
      setDecl(d || undefined);
    } catch {
      setDecl(undefined);
    }
  }, []);

  useEffect(() => {
    hydrate(year);
  }, [year, hydrate]);

  const taxDue = useMemo(() => decl?.taxDue ?? 0, [decl]);
  const status = decl?.status ?? "draft";

  // Step 1: generate XML again (optional)
  const onGenerateXml = async () => {
    try {
      const [incomes, deductions, person] = await Promise.all([
        loadIncomes(year),
        loadDeductions(year),
        getPerson(),
      ]);
      const xml = generateNapXml({ year, incomes, deductions, person });
      const uri = `${FileSystem.documentDirectory || ""}GDD_${year}.xml`;
      await FileSystem.writeAsStringAsync(uri, xml, { encoding: FileSystem.EncodingType.UTF8 });
      setXmlUri(uri);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("OK", `XML е генериран: ${uri}`);
      }
    } catch (e) {
      Alert.alert("Грешка", String(e instanceof Error ? e.message : e));
    }
  };

  // Step 2: open NAP portal
  const NAP_URL = "https://portal.nra.bg/";
  const onOpenNap = async () => {
    try {
      await Linking.openURL(NAP_URL);
    } catch {
      Alert.alert("Грешка", "Неуспешно отваряне на портала на НАП.");
    }
  };

  // Step 3: pick signed file and mark submitted
  const onPickSigned = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;
      // move to app documents for persistence
      const dest = `${FileSystem.documentDirectory || ""}${f.name}`;
      try {
        await FileSystem.copyAsync({ from: f.uri, to: dest });
      } catch {
        // fallback to the original cached uri
      }
      const attach: Attached = { name: f.name, uri: dest || f.uri, size: f.size };
      setAttachments((arr) => [...arr, attach]);
      Alert.alert("OK", "Файлът е добавен.");
    } catch (e) {
      Alert.alert("Грешка", String(e instanceof Error ? e.message : e));
    }
  };

  const onCopyAmount = async () => {
    try {
      await Clipboard.setStringAsync((taxDue || 0).toFixed(2));
      Alert.alert("OK", "Сумата е копирана.");
    } catch {}
  };

  const onMarkSubmitted = async () => {
    try {
      const updated = await markDeclarationSubmitted(year);
      if (!updated) {
        Alert.alert("Грешка", "Няма чернова за тази година.");
        return;
      }
      // persist note and attachments metadata alongside submission
      const payload = {
        ...updated,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        note,
        attachments,
      } as any;
      await saveDeclaration(payload);
      setDecl(payload);
      Alert.alert("OK", "Маркирано като подадена.");
      router.push("/(tabs)/archive");
    } catch (e) {
      Alert.alert("Грешка", String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{t("submit.title") || "Подпис и подаване"}</Text>

      {/* Year */}
      <View style={styles.row}>
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

      {/* Summary box */}
      <View style={styles.box}>
        <Text style={styles.meta}>
          {t("submit.status") || "Статус"}: <Text style={{ fontWeight: "700" }}>{status}</Text>
        </Text>
        <Text style={styles.meta}>
          {t("submit.taxDue") || "Дължим данък"}: <Text style={{ fontWeight: "700" }}>{fmtBGN(taxDue)}</Text>
        </Text>
        {decl?.createdAt ? (
          <Text style={styles.meta}>
            {t("submit.createdAt") || "Създадена"}: {new Date(decl.createdAt).toLocaleString()}
          </Text>
        ) : null}
        {decl?.submittedAt ? (
          <Text style={styles.meta}>
            {t("submit.submittedAt") || "Подадена"}: {new Date(decl.submittedAt).toLocaleString()}
          </Text>
        ) : null}
      </View>

      {/* Step 1 */}
      <View style={styles.box}>
        <Text style={styles.h2}>1) {t("submit.step1") || "Генерирай XML"}</Text>
        <Text style={styles.noteText}>
          {t("submit.step1Desc") ||
            "Създай XML за декларацията. Можеш да го свалиш и подпишеш с КЕП."}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onGenerateXml}>
            <Text style={styles.btnText}>{t("submit.generateXml") || "Генерирай XML"}</Text>
          </TouchableOpacity>
          {xmlUri ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimaryOutline]}
              onPress={() => Sharing.shareAsync(xmlUri!)}
            >
              <Text style={styles.btnPrimaryOutlineText}>
                {t("submit.shareXml") || "Сподели XML"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Step 2 */}
      <View style={styles.box}>
        <Text style={styles.h2}>2) {t("submit.step2") || "Подпиши и подай в портала на НАП"}</Text>
        <Text style={styles.noteText}>
          {t("submit.step2Desc") ||
            "Отвори портала на НАП, подпиши XML с КЕП и подай. След подаване запази входящия номер."}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnAccent]} onPress={onOpenNap}>
            <Text style={styles.btnText}>{t("submit.openNap") || "Отвори портал на НАП"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 3 */}
      <View style={styles.box}>
        <Text style={styles.h2}>3) {t("submit.step3") || "Качи подписан файл и маркирай подаване"}</Text>
        <Text style={styles.noteText}>
          {t("submit.step3Desc") ||
            "Добави подписания файл или потвърждение за подаване. След това маркирай като подадена."}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onPickSigned}>
            <Text style={styles.btnTextDark}>{t("submit.attachFile") || "Добави файл"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDark]} onPress={onMarkSubmitted}>
            <Text style={styles.btnText}>{t("submit.markSubmitted") || "Маркирай като подадена"}</Text>
          </TouchableOpacity>
        </View>

        {attachments.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            {attachments.map((a, i) => (
              <View key={i} style={styles.miniRow}>
                <Text style={styles.miniTitle} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.miniAmount}>
                  {(a.size ?? 0) / 1024 < 1
                    ? `${a.size ?? 0} B`
                    : `${Math.round((a.size ?? 0) / 1024)} KB`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Payment */}
      <View style={styles.box}>
        <Text style={styles.h2}>{t("submit.payment") || "Плащане на данъка"}</Text>
        <Text style={styles.noteText}>
          {t("submit.paymentDesc") || "Можеш да платиш веднага. Сумата ще бъде поставена в клипборда."}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimaryOutline]} onPress={onCopyAmount}>
            <Text style={styles.btnPrimaryOutlineText}>{t("submit.copyAmount") || "Копирай сума"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => router.push("/pay")}>
            <Text style={styles.btnText}>{t("submit.goToPay") || "Към плащане"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Note */}
      <View style={styles.box}>
        <Text style={styles.subLabel}>{t("submit.note") || "Бележка"}</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder={t("submit.notePh") || "Описание..."}
          multiline
          value={note}
          onChangeText={setNote}
        />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  row: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  box: {
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnPrimary: { backgroundColor: "#2e7d32" },
  btnPrimaryOutline: { borderWidth: 1, borderColor: "#2e7d32", backgroundColor: "#fff" },
  btnPrimaryOutlineText: { color: "#2e7d32", fontWeight: "700" },
  btnSecondary: { backgroundColor: "#e0f2f1" },
  btnAccent: { backgroundColor: "#1976d2" },
  btnDark: { backgroundColor: "#333333" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextDark: { color: "#0a0a0a", fontWeight: "700" },
  miniRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  miniTitle: { fontSize: 12, color: "#333", flex: 1, paddingRight: 8 },
  miniAmount: { fontSize: 12, fontWeight: "700" },
  noteText: { fontSize: 12, color: "#444" },
  subLabel: { fontSize: 12, opacity: 0.8, marginTop: 4 },
  noteInput: { minHeight: 80, textAlignVertical: "top" },
  meta: { fontSize: 12, color: "#444" },
});
