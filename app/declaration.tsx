import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

type Profile = {
  egn: string;
  firstName: string;
  lastName: string;
  address: string;
  email?: string;
  phone?: string;
  ibanRefund?: string;
};

type ReviewResult = {
  year: number;
  income: number;
  deductions: number;
  base: number;
  tax: number;
  advance: number;
  settlement: number;
};

const PROFILE_KEY = "@tax_profile_v1";
const REVIEW_RESULT_KEY = "@review_result";
const DECL_XML_KEY = (y: number) => `@decl_xml_${y}`;

export default function Declaration() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [p, setP] = useState<Profile>({
    egn: "",
    firstName: "",
    lastName: "",
    address: "",
    email: "",
    phone: "",
    ibanRefund: "",
  });
  const [res, setRes] = useState<ReviewResult | null>(null);
  const [xml, setXml] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const rr = await AsyncStorage.getItem(REVIEW_RESULT_KEY);
        if (rr) {
          const parsed = JSON.parse(rr) as ReviewResult;
          setRes(parsed);
          setYear(parsed.year);
          const existingXml = await AsyncStorage.getItem(DECL_XML_KEY(parsed.year));
          if (existingXml) setXml(existingXml);
        }
      } catch {}
      try {
        const pr = await AsyncStorage.getItem(PROFILE_KEY);
        if (pr) setP(JSON.parse(pr) as Profile);
      } catch {}
    })();
  }, []);

  const currency = (n: number) =>
    new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN", minimumFractionDigits: 2 }).format(n);

  const valid = useMemo(() => {
    const egnOk = /^\d{10}$/.test(p.egn.trim());
    const nameOk = p.firstName.trim().length > 1 && p.lastName.trim().length > 1;
    const addrOk = p.address.trim().length > 3;
    return egnOk && nameOk && addrOk && !!res;
  }, [p, res]);

  const saveProfile = async () => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    Alert.alert("Записано", "Профилът е записан.");
  };

  // placeholder XML; по-късно ще се замени с реалния формат на НАП
  const buildXml = (profile: Profile, r: ReviewResult) => {
    const esc = (s: any) =>
      String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<AnnualReturn year="${r.year}">`,
      `  <Profile>`,
      `    <EGN>${esc(profile.egn)}</EGN>`,
      `    <FirstName>${esc(profile.firstName)}</FirstName>`,
      `    <LastName>${esc(profile.lastName)}</LastName>`,
      `    <Address>${esc(profile.address)}</Address>`,
      `    <Email>${esc(profile.email || "")}</Email>`,
      `    <Phone>${esc(profile.phone || "")}</Phone>`,
      `    <IBANRefund>${esc(profile.ibanRefund || "")}</IBANRefund>`,
      `  </Profile>`,
      `  <Totals>`,
      `    <Income>${r.income.toFixed(2)}</Income>`,
      `    <Deductions>${r.deductions.toFixed(2)}</Deductions>`,
      `    <Base>${r.base.toFixed(2)}</Base>`,
      `    <Tax>${r.tax.toFixed(2)}</Tax>`,
      `    <Advance>${r.advance.toFixed(2)}</Advance>`,
      `    <Settlement>${r.settlement.toFixed(2)}</Settlement>`,
      `  </Totals>`,
      `</AnnualReturn>`,
    ].join("\n");
  };

  const generateXml = async () => {
    if (!res) {
      Alert.alert("Липсват изчисления", "Върни се към Преглед.");
      return;
    }
    if (!valid) {
      Alert.alert("Невалидни данни", "Попълни ЕГН, имена и адрес.");
      return;
    }
    const built = buildXml(p, res);
    setXml(built);
    await AsyncStorage.setItem(DECL_XML_KEY(res.year), built);
    Alert.alert("Готово", "XML е генериран и записан.");
  };

  const proceed = async () => {
    if (!res) {
      Alert.alert("Липсват изчисления", "Върни се към Преглед.");
      return;
    }
    if (!xml) {
      Alert.alert("Без XML", "Генерирай XML преди подаване.");
      return;
    }
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    router.push("/submit");
  };

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  return (
    <ScrollView contentContainerStyle={s.c}>
      <Text style={s.h1}>Декларация</Text>

      {res ? (
        <View style={s.box}>
          <Row k="Година" v={String(res.year)} />
          <Row k="Данъчна основа" v={currency(res.base)} />
          <Row k="Данък" v={currency(res.tax)} />
          <Row k="Авансово удържан" v={currency(res.advance)} />
          <Row k={res.settlement >= 0 ? "За доплащане" : "За възстановяване"} v={currency(Math.abs(res.settlement))} bold />
        </View>
      ) : (
        <Text style={{ textAlign: "center", opacity: 0.7 }}>Няма данни от „Преглед“.</Text>
      )}

      <View style={s.stack}>
        <Text style={s.label}>ЕГН (10 цифри)</Text>
        <TextInput value={p.egn} onChangeText={(v) => set("egn", v.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" style={s.input} />

        <Text style={s.label}>Име</Text>
        <TextInput value={p.firstName} onChangeText={(v) => set("firstName", v)} style={s.input} />

        <Text style={s.label}>Фамилия</Text>
        <TextInput value={p.lastName} onChangeText={(v) => set("lastName", v)} style={s.input} />

        <Text style={s.label}>Адрес</Text>
        <TextInput value={p.address} onChangeText={(v) => set("address", v)} style={[s.input, { height: 72 }]} multiline />

        <Text style={s.label}>Имейл (по избор)</Text>
        <TextInput value={p.email} onChangeText={(v) => set("email", v)} keyboardType="email-address" style={s.input} />

        <Text style={s.label}>Телефон (по избор)</Text>
        <TextInput value={p.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" style={s.input} />

        <Text style={s.label}>IBAN за възстановяване (по избор)</Text>
        <TextInput value={p.ibanRefund} onChangeText={(v) => set("ibanRefund", v)} autoCapitalize="characters" style={s.input} />
      </View>

      <TouchableOpacity style={s.btn} onPress={saveProfile}>
        <Text style={s.btnText}>Запази профил</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnOutline} onPress={generateXml}>
        <Text style={s.btnOutlineText}>Генерирай XML</Text>
      </TouchableOpacity>

      {!!xml && (
        <View style={s.xmlBox}>
          <Text style={s.xmlTitle}>XML (преглед, кратко)</Text>
          <Text numberOfLines={6} style={s.xmlPreview}>{xml}</Text>
        </View>
      )}

      <TouchableOpacity style={s.next} onPress={proceed} disabled={!valid || !xml}>
        <Text style={s.nextText}>{!xml ? "Първо генерирай XML" : "Към подпис и подаване"}</Text>
      </TouchableOpacity>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={s.row2}>
      <Text style={[s.k, bold && { fontWeight: "800" }]}>{k}</Text>
      <Text style={[s.v, bold && { fontWeight: "800" }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  h1: { fontSize: 20, fontWeight: "700", textAlign: "center" },

  label: { fontSize: 12, opacity: 0.8 },
  input: { borderWidth: 1, borderColor: "#d0d0d0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", fontSize: 14 },

  box: { padding: 12, borderRadius: 12, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e5e7eb", marginTop: 6 },
  row2: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  k: { fontSize: 14, color: "#1f2937" },
  v: { fontSize: 14, fontWeight: "700", color: "#111827" },

  stack: { gap: 8, marginTop: 6 },
  btn: { marginTop: 6, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#1f6feb" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#a0c8ff" },
  btnOutlineText: { fontWeight: "700", color: "#0b3d91" },

  xmlBox: { marginTop: 8, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, backgroundColor: "#ffffff" },
  xmlTitle: { fontWeight: "700", marginBottom: 4 },
  xmlPreview: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) as any, fontSize: 12, color: "#111827" },

  next: { marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#e8f3ff", borderWidth: 1, borderColor: "#a0c8ff" },
  nextText: { fontSize: 14, fontWeight: "700" },
});
