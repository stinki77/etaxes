import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

type Preview = { year: number; income: number; deductions: number; base: number };
type ReviewState = {
  year: number;
  income: number;
  deductions: number;
  base: number;
  taxRatePct: string;       // по подразбиране 10%
  advanceWithheld: string;  // авансово удържан
  note?: string;
};

const PREVIEW_KEY = "@calc_preview";
const RKEY = (y: number) => `@review_${y}`;

export default function Review() {
  const [st, setSt] = useState<ReviewState>({
    year: new Date().getFullYear(),
    income: 0,
    deductions: 0,
    base: 0,
    taxRatePct: "10",
    advanceWithheld: "0.00",
    note: "",
  });

  // зареждане от предишната стъпка и/или предходно ревю
  useEffect(() => {
    (async () => {
      try {
        const prevRaw = await AsyncStorage.getItem(PREVIEW_KEY);
        const prev = prevRaw ? (JSON.parse(prevRaw) as Preview) : null;
        if (prev) {
          const savedRaw = await AsyncStorage.getItem(RKEY(prev.year));
          const saved = savedRaw ? (JSON.parse(savedRaw) as ReviewState) : null;
          setSt(
            saved ?? {
              year: prev.year,
              income: prev.income,
              deductions: prev.deductions,
              base: prev.base,
              taxRatePct: "10",
              advanceWithheld: "0.00",
              note: "",
            }
          );
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // авто-запис
  useEffect(() => {
    AsyncStorage.setItem(RKEY(st.year), JSON.stringify(st)).catch(() => {});
  }, [st]);

  const num = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const tax = useMemo(() => +(Math.max(0, st.base) * (Math.max(0, num(st.taxRatePct)) / 100)).toFixed(2), [st.base, st.taxRatePct]);
  const advance = useMemo(() => +num(st.advanceWithheld).toFixed(2), [st.advanceWithheld]);
  const settlement = useMemo(() => +(tax - advance).toFixed(2), [tax, advance]);

  const currency = (n: number) =>
    new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN", minimumFractionDigits: 2 }).format(n);

  const proceed = async () => {
    if (num(st.taxRatePct) < 0 || num(st.taxRatePct) > 100) {
      Alert.alert("Грешка", "Ставката трябва да е между 0 и 100.");
      return;
    }
    await AsyncStorage.setItem(RKEY(st.year), JSON.stringify(st));
    await AsyncStorage.setItem("@review_result", JSON.stringify({ year: st.year, income: st.income, deductions: st.deductions, base: st.base, tax, advance, settlement }));
    router.push("/declaration");
  };

  const set = <K extends keyof ReviewState>(k: K, v: ReviewState[K]) => setSt((p) => ({ ...p, [k]: v }));

  return (
    <ScrollView contentContainerStyle={s.c}>
      <Text style={s.h1}>Преглед</Text>

      <View style={s.box}>
        <Row k="Година" v={String(st.year)} />
        <Row k="Общ доход" v={currency(st.income)} />
        <Row k="Общо облекчения/осигуровки" v={currency(st.deductions)} />
        <Row k="Данъчна основа" v={currency(st.base)} bold />
      </View>

      <View style={s.stack}>
        <Text style={s.label}>Данъчна ставка %</Text>
        <TextInput value={st.taxRatePct} onChangeText={(v) => set("taxRatePct", v)} keyboardType="decimal-pad" style={s.input} />

        <Text style={s.label}>Авансово удържан данък (сума)</Text>
        <TextInput value={st.advanceWithheld} onChangeText={(v) => set("advanceWithheld", v)} keyboardType="decimal-pad" style={s.input} />

        <Text style={s.label}>Бележка (по избор)</Text>
        <TextInput value={st.note} onChangeText={(v) => set("note", v)} style={[s.input, { height: 80 }]} multiline />
      </View>

      <View style={s.box}>
        <Row k="Изчислен данък" v={currency(tax)} />
        <Row k="Авансово удържан" v={currency(advance)} />
        <Row k={settlement >= 0 ? "За доплащане" : "За възстановяване"} v={currency(Math.abs(settlement))} bold />
      </View>

      <TouchableOpacity style={s.next} onPress={proceed}>
        <Text style={s.nextText}>Към декларация</Text>
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

  next: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#e8f3ff", borderWidth: 1, borderColor: "#a0c8ff" },
  nextText: { fontSize: 14, fontWeight: "700" },

  // добавен липсващ стил
  stack: { gap: 8 },
});
