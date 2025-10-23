<<<<<<< HEAD
﻿import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import { useRouter, useSearchParams } from "expo-router";
import { generateNapXml } from "../src/lib/napXml";
import { saveToArchive as saveToLocalArchive } from "../src/lib/archive"; // implement in project
import { t } from "../src/localization/i18n"; // project i18n function
import { validateIBAN, validateEGN, isPositiveNumber } from "../src/lib/validators";

type Attachment = {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

export default function SubmitScreen() {
  const router = useRouter();
  const params = useSearchParams(); // expecting payload params if any
  const incomingPayload = (params.payload && JSON.parse(String(params.payload))) || null;

  const [iban, setIban] = useState<string>(incomingPayload?.payment?.iban || "");
  const [reason, setReason] = useState<string>(incomingPayload?.payment?.reason || "");
  const [egn, setEgn] = useState<string>(incomingPayload?.taxpayer?.egn || "");
  const [year, setYear] = useState<number>(incomingPayload?.year || new Date().getFullYear());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const napPortalUrl = useMemo(() => {
    // Deep-link template to НАП (example). Replace with real URL if needed.
    return "https://inetdec.services.nap.bg/submit"; 
  }, []);

  function showError(msg: string) {
    Alert.alert(t("error") || "Error", msg);
  }

  async function pickAttachment() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.type === "success") {
        const info: Attachment = {
          name: res.name,
          uri: res.uri,
          size: res.size,
          mimeType: res.mimeType,
        };
        setAttachments(prev => [...prev, info]);
      }
    } catch (e) {
      console.warn("pickAttachment", e);
      showError(t("attachment_pick_failed") || "Неуспешно прикачване на файл");
    }
  }

  async function copyToClipboard(text: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert(t("copied") || "Копирано", t("copied_to_clipboard") || "Копирано в клипборд");
  }

  function validateAll(): boolean {
    if (!iban) {
      showError(t("iban_required") || "IBAN е задължителен");
      return false;
    }
    if (!validateIBAN(iban)) {
      showError(t("iban_invalid") || "Невалиден IBAN");
      return false;
    }
    if (!reason) {
      showError(t("reason_required") || "Основание е задължително");
      return false;
    }
    if (!egn) {
      showError(t("egn_required") || "ЕГН е задължително");
      return false;
    }
    if (!validateEGN(egn)) {
      showError(t("egn_invalid") || "Невалидно ЕГН");
      return false;
    }
    if (!isPositiveNumber(Number(year))) {
      showError(t("year_invalid") || "Невалидна година");
      return false;
    }
    return true;
  }

  function buildDeclarationPayload() {
    // Build a structured payload expected by napXml generator
    return {
      meta: {
        generatedAt: new Date().toISOString(),
        app: "eTaxes",
        version: "1.0",
      },
      taxpayer: {
        egn,
      },
      payment: {
        iban,
        reason,
      },
      year,
      attachments: attachments.map(a => ({ name: a.name, uri: a.uri })),
      income: incomingPayload?.income || [],
      deductions: incomingPayload?.deductions || [],
      totals: incomingPayload?.totals || {},
    };
  }

  async function onGenerateXml() {
    if (!validateAll()) return;
    const payload = buildDeclarationPayload();
    try {
      const xml = generateNapXml(payload);
      setXmlPreview(xml);
      // save a temp file for sharing/downloading
      const path = `${FileSystem.cacheDirectory}declaration-${Date.now()}.xml`;
      await FileSystem.writeAsStringAsync(path, xml, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert(t("xml_generated") || "XML генериран", t("xml_saved_cache") || "XML записан във временни файлове");
    } catch (e) {
      console.error("XML generation error", e);
      showError(t("xml_generation_failed") || "Грешка при генериране на XML");
    }
  }

  async function onDownloadXml() {
    if (!xmlPreview) {
      showError(t("no_xml") || "Няма генериран XML. Натиснете 'Генерирай' първо.");
      return;
    }
    const filename = `declaration-${year}-${egn || "unknown"}.xml`;
    const path = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(path, xmlPreview, { encoding: FileSystem.EncodingType.UTF8 });
    Alert.alert(t("xml_saved") || "XML запазен", `${t("file_saved_to") || "Файлът е записан в"}: ${path}`);
    // On iOS/Android user can pick file via sharing if needed - leaving to platform to handle
  }

  async function onOpenNapPortal() {
    if (!validateAll()) return;
    const payload = buildDeclarationPayload();
    const xml = generateNapXml(payload);
    // Some portals accept prefilled params. We'll open portal and let user attach XML.
    const url = napPortalUrl;
    Linking.openURL(url).catch(() => {
      showError(t("cannot_open_portal") || "Не мога да отворя портала на НАП");
    });
  }

  async function onSaveToArchive() {
    if (!validateAll()) return;
    setSaving(true);
    try {
      const payload = buildDeclarationPayload();
      const xml = generateNapXml(payload);
      // archive entry: xml + metadata + attachments
      const entry = {
        id: `entry-${Date.now()}`,
        createdAt: new Date().toISOString(),
        egn,
        year,
        iban,
        reason,
        xml,
        attachments,
        status: "saved",
      };
      await saveToLocalArchive(entry); // implement persistence in project (AsyncStorage/SQLite)
      Alert.alert(t("saved") || "Запазено", t("saved_to_archive") || "Декларацията е запазена в Архив");
      router.back();
    } catch (e) {
      console.error("saveToArchive", e);
      showError(t("archive_save_failed") || "Неуспешно запазване в Архив");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>{t("submit_title") || "Подпис и подаване"}</Text>

      <Text>{t("egn") || "ЕГН"}</Text>
      <TextInput
        placeholder={t("egn_placeholder") || "ЕГН"}
        value={egn}
        onChangeText={setEgn}
        keyboardType="number-pad"
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />

      <Text>{t("iban") || "IBAN"}</Text>
      <TextInput
        placeholder={t("iban_placeholder") || "BG00XXXX..."}
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Button title={t("copy_iban") || "Копирай IBAN"} onPress={() => copyToClipboard(iban)} />
        <Button
          title={t("check_iban") || "Провери IBAN"}
          onPress={() => {
            if (validateIBAN(iban)) Alert.alert(t("valid") || "Валиден");
            else showError(t("iban_invalid") || "Невалиден IBAN");
=======
﻿// app/submit.tsx
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
>>>>>>> restore/all
          }}
        />
      </View>

<<<<<<< HEAD
      <Text>{t("reason") || "Основание (reason)"}</Text>
      <TextInput
        placeholder={t("reason_placeholder") || "Основание"}
        value={reason}
        onChangeText={setReason}
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />

      <Text>{t("attachments") || "Прикачени файлове"}</Text>
      {attachments.map((a, i) => (
        <View key={a.uri} style={{ paddingVertical: 4 }}>
          <Text>{a.name} ({a.size ?? "—"} bytes)</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Button title={t("attach_file") || "Прикачи файл"} onPress={pickAttachment} />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Button title={t("generate_xml") || "Генерирай XML"} onPress={onGenerateXml} />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Button title={t("download_xml") || "Изтегли XML"} onPress={onDownloadXml} />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Button title={t("open_nap") || "Отиди към портала на НАП"} onPress={onOpenNapPortal} />
      </View>

      <View style={{ marginVertical: 12 }}>
        <Button title={t("save_to_archive") || "Запази в Архив"} onPress={onSaveToArchive} disabled={saving} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "600" }}>{t("preview") || "Преглед на декларацията (XML)"}</Text>
        <Text selectable style={{ fontSize: 12, marginTop: 8 }}>
          {xmlPreview || t("no_xml_preview") || "Няма генериран XML. Натиснете 'Генерирай XML'."}
        </Text>
      </View>
    </ScrollView>
  );
}
=======
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
>>>>>>> restore/all
