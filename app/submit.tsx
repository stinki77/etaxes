import React, { useMemo, useState } from "react";
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
          }}
        />
      </View>

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
