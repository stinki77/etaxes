import React, { useMemo, useState } from "react";
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
  ];
  return lines.join("\n");
}

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
    </ScrollView>
  );
}

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

