<<<<<<< HEAD
﻿import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams } from "expo-router";

function epcQr({ name, iban, amount, remittance }: { name: string; iban: string; amount: number; remittance: string }) {
  const amt = amount > 0 ? amount.toFixed(2) : "0.00";
  const lines = [
    "BCD", "002", "1", "SCT",
    "",                  // BIC (по избор)
    name || "NAP",       // Получател
    (iban || "").replace(/\s/g, ""),
    "BGN",
    amt,
    "", "",              // due date / purpose (optional)
    remittance || ""
=======
﻿// app/pay.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, router } from "expo-router";
import { getLocale, onLocaleChange, tSync, type Locale } from "../src/localization";
import { loadDeclaration, saveDeclaration, type DeclarationDraftOrSubmitted } from "../src/lib/store";
import { getPerson } from "../src/config/nap";

type EPCArgs = {
  name: string;   // получател
  bic?: string;   // по желание
  iban: string;
  amount: number; // EUR за EPC QR; ако е BGN, QR остава информативен
  remittance: string; // основание
  currency?: "EUR" | "BGN";
};

/** EPC (SEPA) QR формат BCD v2. */
function makeEpcQr({
  name,
  bic = "",
  iban,
  amount,
  remittance,
  currency = "EUR",
}: EPCArgs) {
  const cleanIban = iban.replace(/\s+/g, "").toUpperCase();
  const lines = [
    "BCD",          // Service Tag
    "002",          // Version
    "1",            // Character set: 1 = UTF-8
    "SCT",          // SEPA Credit Transfer
    bic,            // BIC (optional)
    name,           // Creditor Name
    cleanIban,      // IBAN
    `${currency}${(amount || 0).toFixed(2)}`, // Amount
    "",             // Purpose (optional)
    "",             // Creditor Reference (optional)
    remittance,     // Remittance Information
>>>>>>> restore/all
  ];
  return lines.join("\n");
}

<<<<<<< HEAD
export default function Pay() {
  const params = useLocalSearchParams<{ amount?: string; iban?: string; reason?: string }>();
  const [receiver, setReceiver] = useState("НАП");
  const [iban, setIban] = useState(params.iban || "BG00 XXXX 0000 0000 0000 00");
  const [amount, setAmount] = useState(params.amount || "0.00");
  const [reason, setReason] = useState(params.reason || "ГДД " + new Date().getFullYear());

  const amt = Number(String(amount).replace(",", "."));
  const qrData = useMemo(() => epcQr({ name: receiver, iban, amount: Number.isFinite(amt) ? amt : 0, remittance: reason }), [receiver, iban, amt, reason]);

  const copy = async (label: string, text: string) => {
    try { await Clipboard.setStringAsync(text); Alert.alert("Копирано", label); } catch {}
  };

  return (
    <ScrollView contentContainerStyle={s.c}>
      <Text style={s.h1}>Плащане</Text>

      <View style={s.stack}>
        <Text style={s.label}>Получател</Text>
        <TextInput value={receiver} onChangeText={setReceiver} style={s.input} placeholder="НАП" />

        <Text style={s.label}>IBAN</Text>
        <TextInput value={iban} onChangeText={setIban} style={s.input} autoCapitalize="characters" />
        <TouchableOpacity style={s.btn} onPress={() => copy("IBAN", iban)}><Text style={s.btnText}>Копирай IBAN</Text></TouchableOpacity>

        <Text style={s.label}>Сума (BGN)</Text>
        <TextInput value={String(amount)} onChangeText={setAmount} keyboardType="decimal-pad" style={s.input} />

        <Text style={s.label}>Основание</Text>
        <TextInput value={reason} onChangeText={setReason} style={s.input} />
        <TouchableOpacity style={s.btn} onPress={() => copy("Основание", reason)}><Text style={s.btnText}>Копирай основание</Text></TouchableOpacity>
      </View>

      <View style={s.qrBox}>
        <Text style={s.qrTitle}>SEPA/EPC QR</Text>
        <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12 }}>
          <QRCode value={qrData} size={220} />
        </View>
        <Text style={s.qrHint}>Сканирай с мобилното банкиране.</Text>
      </View>

      <View style={{ height: 16 }} />
=======
function fmtBGN(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BGN", maximumFractionDigits: 2 }).format(n || 0);
}

export default function PayScreen() {
  // year from param or from current
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
  const [receiverName, setReceiverName] = useState<string>("НАП (National Revenue Agency)");
  const [receiverBic, setReceiverBic] = useState<string>(""); // по желание
  const [iban, setIban] = useState<string>("BG00BNBG00000000000000"); // заменете с реалния IBAN на НАП по сметка
  const [reason, setReason] = useState<string>("");
  const [currency, setCurrency] = useState<"BGN" | "EUR">("BGN");

  // NB: ползваме any, защото типовете на react-native-qrcode-svg не дефинират toDataURL.
  const qrRef = useRef<any>(null);

  // hydrate declaration and person to prefill reason
  useEffect(() => {
    (async () => {
      try {
        const d = await loadDeclaration(year);
        setDecl(d || undefined);
        const p = await getPerson();
        const egnPart = p?.egn ? ` ЕГН ${p.egn}` : "";
        if (!reason) {
          setReason(`Данък по ЗДДФЛ за ${year}${egnPart}`);
        }
        // restore last used payment data if present
        if (d && (d as any).payment) {
          const pay = (d as any).payment;
          if (pay?.iban) setIban(pay.iban);
          if (pay?.receiverName) setReceiverName(pay.receiverName);
          if (typeof pay?.currency === "string") setCurrency(pay.currency);
          if (pay?.reason) setReason(pay.reason);
        }
      } catch {
        // noop
      }
    })();
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountBGN = useMemo(() => decl?.taxDue ?? 0, [decl]);

  // SEPA QR amount in EUR if needed
  const amountEUR = useMemo(() => {
    if (currency === "EUR") {
      // ако имаш курс, приложи го тук; по подразбиране 1:1 за демо
      return amountBGN;
    }
    return 0; // за BGN ще покажем информативен QR (non-EPC text)
  }, [amountBGN, currency]);

  const epcPayload = useMemo(
    () =>
      makeEpcQr({
        name: receiverName || "",
        bic: receiverBic || "",
        iban,
        amount: amountEUR,
        remittance: reason || "",
        currency: currency,
      }),
    [receiverName, receiverBic, iban, amountEUR, reason, currency]
  );

  const infoPayload = useMemo(
    () =>
      [
        `IBAN: ${iban}`,
        receiverName ? `Получател: ${receiverName}` : "",
        `Сума: ${fmtBGN(amountBGN)}`,
        reason ? `Основание: ${reason}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [iban, receiverName, amountBGN, reason]
  );

  const onCopyIban = async () => {
    try {
      await Clipboard.setStringAsync(iban);
      Alert.alert("OK", "IBAN е копиран.");
    } catch {}
  };
  const onCopyAmount = async () => {
    try {
      await Clipboard.setStringAsync((amountBGN || 0).toFixed(2));
      Alert.alert("OK", "Сумата е копирана.");
    } catch {}
  };
  const onCopyReason = async () => {
    try {
      await Clipboard.setStringAsync(reason || "");
      Alert.alert("OK", "Основанието е копирано.");
    } catch {}
  };

  const onShareQr = async () => {
    try {
      // безопасно извикване на toDataURL ако я има
      const callToDataUrl = (qrRef.current as any)?.toDataURL;
      if (typeof callToDataUrl !== "function") return;
      callToDataUrl(async (data: string) => {
        const path =
          (FileSystem.cacheDirectory || FileSystem.documentDirectory || "") +
          `tax_payment_qr_${year}.png`;
        await FileSystem.writeAsStringAsync(path, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path);
        } else {
          Alert.alert("OK", `QR е записан: ${path}`);
        }
      });
    } catch (e) {
      Alert.alert("Грешка", String(e instanceof Error ? e.message : e));
    }
  };

  const onSavePayment = async () => {
    try {
      if (!decl) {
        Alert.alert("Грешка", "Няма чернова/декларация за тази година.");
        return;
      }
      const payload = {
        ...decl,
        payment: {
          amount: amountBGN,
          currency,
          iban,
          receiverName,
          receiverBic,
          reason,
          savedAt: new Date().toISOString(),
        },
      } as any;
      await saveDeclaration(payload);
      setDecl(payload);
      Alert.alert("OK", "Плащането е записано в Архив.");
      router.push("/(tabs)/archive");
    } catch (e) {
      Alert.alert("Грешка", String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{t("pay.title") || "Плащане на данъка"}</Text>

      {/* Year and amount */}
      <View style={styles.box}>
        <Text style={styles.meta}>
          {t("createTax.year") || "Година"}: <Text style={styles.bold}>{year}</Text>
        </Text>
        <Text style={styles.meta}>
          {t("submit.taxDue") || "Дължим данък"}: <Text style={styles.bold}>{fmtBGN(amountBGN)}</Text>
        </Text>
      </View>

      {/* Receiver */}
      <View style={styles.box}>
        <Text style={styles.label}>{t("pay.receiver") || "Получател"}</Text>
        <TextInput style={styles.input} value={receiverName} onChangeText={setReceiverName} />
        <View style={{ height: 8 }} />
        <Text style={styles.label}>BIC</Text>
        <TextInput style={styles.input} value={receiverBic} onChangeText={setReceiverBic} placeholder="по желание" />
      </View>

      {/* IBAN */}
      <View style={styles.box}>
        <Text style={styles.label}>IBAN</Text>
        <TextInput style={styles.input} value={iban} onChangeText={setIban} autoCapitalize="characters" />
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimaryOutline]} onPress={onCopyIban}>
            <Text style={styles.btnPrimaryOutlineText}>{t("pay.copyIban") || "Копирай IBAN"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reason */}
      <View style={styles.box}>
        <Text style={styles.label}>{t("pay.reason") || "Основание за плащане"}</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={reason}
          onChangeText={setReason}
          placeholder={t("pay.reasonPh") || "Пример: Данък по ЗДДФЛ за 2025 ЕГН 0000000000"}
          multiline
        />
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimaryOutline]} onPress={onCopyReason}>
            <Text style={styles.btnPrimaryOutlineText}>{t("pay.copyReason") || "Копирай основание"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.box}>
        <Text style={styles.label}>{t("pay.amount") || "Сума"}</Text>
        <Text style={styles.meta}>{fmtBGN(amountBGN)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimaryOutline]} onPress={onCopyAmount}>
            <Text style={styles.btnPrimaryOutlineText}>{t("submit.copyAmount") || "Копирай сума"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR */}
      <View style={styles.box}>
        <Text style={styles.h2}>{t("pay.qrTitle") || "EPC/SEPA QR код"}</Text>
        <Text style={styles.noteText}>
          {currency === "EUR"
            ? t("pay.qrNoteEur") || "Сканирай в мобилното банкиране. Валидно за SEPA преводи в EUR."
            : t("pay.qrNoteBgn") || "Информативен QR. За SEPA е нужен EUR."}
        </Text>
        <View style={styles.qrWrap}>
          <QRCode
            value={currency === "EUR" ? epcPayload : infoPayload}
            size={220}
            getRef={(r) => (qrRef.current = r as any)}
          />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onShareQr}>
            <Text style={styles.btnTextDark}>{t("pay.shareQr") || "Сподели QR"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnDark]} onPress={onSavePayment}>
          <Text style={styles.btnText}>{t("pay.saveToArchive") || "Запиши в Архив"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnAccent]} onPress={() => router.push("/(tabs)/archive")}>
          <Text style={styles.btnText}>{t("archive.title") || "Архив"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
>>>>>>> restore/all
    </ScrollView>
  );
}

<<<<<<< HEAD
const s = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  h1: { fontSize: 20, fontWeight: "700", textAlign: "center" },

  label: { fontSize: 12, opacity: 0.8 },
  input: { borderWidth: 1, borderColor: "#d0d0d0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", fontSize: 14 },
  stack: { gap: 8 },

  btn: { paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe" },
  btnText: { fontWeight: "700", color: "#1e3a8a" },

  qrBox: { alignItems: "center", gap: 8, marginTop: 12 },
  qrTitle: { fontWeight: "700" },
  qrHint: { fontSize: 12, opacity: 0.7, textAlign: "center" },
});

=======
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  box: {
    borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa",
    borderRadius: 14, padding: 12, marginTop: 12,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  noteInput: { minHeight: 70, textAlignVertical: "top" },
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
  qrWrap: { alignItems: "center", paddingVertical: 8 },
  meta: { fontSize: 12, color: "#444" },
  noteText: { fontSize: 12, color: "#444" },
  bold: { fontWeight: "700" },
});
>>>>>>> restore/all
