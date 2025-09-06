// app/submit.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";

import { Locale, getLocale, onLocaleChange, tSync } from "../src/localization";

type Attach = { name: string; uri: string; size?: number | null; mime?: string | null };
type SubmitState = {
  year: string;
  amount: string;     // сума за плащане (или 0.00 ако се възстановява)
  iban: string;       // IBAN на НАП/ТД по подразбиране
  reason: string;     // основание за плащане
  napUrl: string;     // deep-link към услугата
  note: string;
  attachments: Attach[];
  status: "Prepared" | "Submitted";
};

type ArchiveEntry = {
  id: string;
  createdAt: number;
  year: string;
  amount: string;
  status: "Prepared" | "Submitted";
  iban: string;
  reason: string;
  note?: string;
  attachments: Attach[];
};

const STORAGE_KEY = "@submit_screen_state_v1";
const ARCHIVE_KEY = "@archive_entries_v1";

// разумни BG дефолти (редактирай според твоя ТД на НАП при нужда)
const DEFAULTS_BG = {
  IBAN: "BG18 BNBG 9661 3100 1010 01", // примерен, смени с реалния за ТД по адресна регистрация
  REASON: "ЗДДФЛ {{year}} ЕГН/ЛНЧ: ...",
  NAP_URL: "https://portal.nra.bg/",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function SubmitScreen() {
  const [lng, setLng] = useState<Locale>("bg");
  const [state, setState] = useState<SubmitState>({
    year: String(new Date().getFullYear()),
    amount: "0.00",
    iban: DEFAULTS_BG.IBAN,
    reason: DEFAULTS_BG.REASON.replace("{{year}}", String(new Date().getFullYear())),
    napUrl: DEFAULTS_BG.NAP_URL,
    note: "",
    attachments: [],
    status: "Prepared",
  });

  // локализация
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const cur = await getLocale();
      setLng(cur);
      unsub = onLocaleChange(setLng);
    })();
    return () => unsub();
  }, []);

  // хидратиране на формата
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState((s) => ({ ...s, ...(JSON.parse(raw) as SubmitState) }));
      } catch {}
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  // етикети
  const L = useMemo(() => {
    return {
      title: lng === "bg" ? "Подпис и подаване" : "Sign and submit",
      step1: lng === "bg" ? "1) Преглед и подготовка" : "1) Review and prepare",
      step2: lng === "bg" ? "2) Подпис/Подаване към НАП" : "2) Sign/Submit to NRA",
      step3: lng === "bg" ? "3) Архив и статус" : "3) Archive and status",
      year: lng === "bg" ? "Година" : "Year",
      amount: lng === "bg" ? "Сума за плащане" : "Amount to pay",
      iban: "IBAN",
      reason: lng === "bg" ? "Основание" : "Reason",
      napUrl: lng === "bg" ? "Линк към услуга на НАП" : "NRA service link",
      note: lng === "bg" ? "Бележка" : "Note",
      attach: lng === "bg" ? "Прикачи файл" : "Attach file",
      copy: lng === "bg" ? "Копирай" : "Copy",
      openNap: lng === "bg" ? "Отвори услугата на НАП" : "Open NRA service",
      saveArchive: lng === "bg" ? "Запази в Архив" : "Save to Archive",
      markSubmitted: lng === "bg" ? "Маркирай като Подадено" : "Mark as Submitted",
      saved: lng === "bg" ? "Записано" : "Saved",
      copied: lng === "bg" ? "Копирано" : "Copied",
      attachAdded: lng === "bg" ? "Файл добавен" : "File added",
      amountHint:
        lng === "bg"
          ? "Ако се възстановява, остави 0.00 и опиши в бележката."
          : "If refund is due, leave 0.00 and add a note.",
      status: lng === "bg" ? "Статус" : "Status",
      prepared: lng === "bg" ? "Подготвено" : "Prepared",
      submitted: lng === "bg" ? "Подадено" : "Submitted",
    };
  }, [lng]);

  const setField = useCallback(<K extends keyof SubmitState>(k: K, v: SubmitState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  // действия
  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert(L.copied, label);
    } catch {
      Alert.alert(L.copied, label);
    }
  }, [L]);

  const openNap = useCallback(async () => {
    const ok = await Linking.canOpenURL(state.napUrl);
    if (!ok) {
      Alert.alert("URL", state.napUrl);
      return;
    }
    await Linking.openURL(state.napUrl);
  }, [state.napUrl]);

  const pickAttach = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const item: Attach = {
      name: a.name ?? "file",
      uri: a.uri,
      size: a.size ?? null,
      mime: a.mimeType ?? null,
    };
    setState((s) => ({ ...s, attachments: [...s.attachments, item] }));
    Alert.alert(L.attachAdded, item.name);
  }, [L.attachAdded]);

  const persistArchive = useCallback(
    async (markSubmitted?: boolean) => {
      try {
        const raw = await AsyncStorage.getItem(ARCHIVE_KEY);
        const list: ArchiveEntry[] = raw ? JSON.parse(raw) : [];
        const entry: ArchiveEntry = {
          id: uid(),
          createdAt: Date.now(),
          year: state.year,
          amount: state.amount || "0.00",
          status: markSubmitted ? "Submitted" : state.status,
          iban: state.iban,
          reason: state.reason,
          note: state.note,
          attachments: state.attachments,
        };
        const updated =
          markSubmitted
            ? [...list, { ...entry, status: "Submitted" as const }]
            : [...list, entry];
        await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(updated));
        if (markSubmitted) setState((s) => ({ ...s, status: "Submitted" }));
        Alert.alert(L.saved, `${L.status}: ${markSubmitted ? L.submitted : L.prepared}`);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Archive error");
      }
    },
    [state, L.saved, L.status, L.prepared, L.submitted]
  );

  // UI
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{L.title}</Text>

      {/* Стъпка 1 */}
      <Text style={styles.step}>{L.step1}</Text>

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
        <View style={styles.col}>
          <Text style={styles.label}>{L.amount}</Text>
          <TextInput
            value={state.amount}
            onChangeText={(v) => setField("amount", v.replace(",", "."))}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholder="0.00"
          />
          <Text style={styles.hint}>{L.amountHint}</Text>
        </View>
      </View>

      <Text style={styles.label}>{L.note}</Text>
      <TextInput
        value={state.note}
        onChangeText={(v) => setField("note", v)}
        style={styles.input}
        placeholder={L.note}
      />

      {/* Стъпка 2 */}
      <Text style={styles.step}>{L.step2}</Text>

      <Text style={styles.label}>{L.iban}</Text>
      <View style={styles.rowBtn}>
        <TextInput
          value={state.iban}
          onChangeText={(v) => setField("iban", v)}
          style={[styles.input, { flex: 1 }]}
          placeholder="BG.."
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(state.iban, "IBAN")}>
          <Text style={styles.copyBtnText}>{L.copy}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{L.reason}</Text>
      <View style={styles.rowBtn}>
        <TextInput
          value={state.reason}
          onChangeText={(v) => setField("reason", v)}
          style={[styles.input, { flex: 1 }]}
          placeholder="Основание"
        />
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(state.reason, "Reason")}>
          <Text style={styles.copyBtnText}>{L.copy}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{L.napUrl}</Text>
      <View style={styles.rowBtn}>
        <TextInput
          value={state.napUrl}
          onChangeText={(v) => setField("napUrl", v)}
          style={[styles.input, { flex: 1 }]}
          placeholder="https://portal.nra.bg/"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.openBtn} onPress={openNap}>
          <Text style={styles.openBtnText}>{L.openNap}</Text>
        </TouchableOpacity>
      </View>

      {/* Прикачвания */}
      <View style={styles.attachHeader}>
        <Text style={styles.section}>Прикачвания</Text>
        <TouchableOpacity style={styles.attachBtn} onPress={pickAttach}>
          <Text style={styles.attachBtnText}>{L.attach}</Text>
        </TouchableOpacity>
      </View>
      {state.attachments.map((a, idx) => (
        <View key={idx} style={styles.attachRow}>
          <Text style={styles.attachName}>{a.name}</Text>
          <Text style={styles.attachMeta}>
            {a.size ? `${Math.round(a.size / 1024)} KB` : ""} {a.mime ? ` • ${a.mime}` : ""}
          </Text>
        </View>
      ))}

      {/* Стъпка 3 */}
      <Text style={styles.step}>{L.step3}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => persistArchive(false)}>
          <Text style={styles.btnText}>{L.saveArchive}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => persistArchive(true)}>
          <Text style={styles.btnText}>{L.markSubmitted}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// стилове
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },

  step: { marginTop: 18, marginBottom: 8, fontSize: 16, fontWeight: "700" },
  section: { fontSize: 15, fontWeight: "700" },

  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  label: { fontSize: 12, opacity: 0.8, marginBottom: 4 },
  hint: { fontSize: 11, opacity: 0.7, marginTop: 4 },

  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  rowBtn: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8, marginTop: 2 },
  copyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8c8c8",
    backgroundColor: "#f8fafc",
  },
  copyBtnText: { fontSize: 12, fontWeight: "700" },

  openBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#e8f3ff",
    borderWidth: 1,
    borderColor: "#a0c8ff",
  },
  openBtnText: { fontSize: 12, fontWeight: "700" },

  attachHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  attachBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8c8c8",
    backgroundColor: "#f7faff",
  },
  attachBtnText: { fontSize: 12, fontWeight: "700" },

  attachRow: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  attachName: { fontSize: 14, fontWeight: "600" },
  attachMeta: { fontSize: 12, opacity: 0.7, marginTop: 2 },

  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
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
});
