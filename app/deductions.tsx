import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

type DeductState = {
  year: number;
  normPct: string;       // нормативни разходи %
  insurances: string;    // лични осигуровки (сума)
  kids: string;          // облекчение за деца (сума)
  donations: string;     // дарения (сума)
  mortgage: string;      // ипотечни лихви (сума)
  voluntary: string;     // доброволни фондове (сума)
  other: string;         // други (сума)
  totalIncome: number;   // от „Доходи“
};
const KEY = (y: number) => `@deductions_${y}`;
const INCOME_KEY = (y: number) => `@income_sources_${y}`;

export default function Deductions() {
  const [st, setSt] = useState<DeductState>({
    year: new Date().getFullYear(),
    normPct: "0",
    insurances: "0.00",
    kids: "0.00",
    donations: "0.00",
    mortgage: "0.00",
    voluntary: "0.00",
    other: "0.00",
    totalIncome: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(INCOME_KEY(st.year));
        const arr: Array<{ amount: number }> = raw ? JSON.parse(raw) : [];
        const sum = arr.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        setSt((p) => ({ ...p, totalIncome: +sum.toFixed(2) }));
      } catch {}
    })();
  }, [st.year]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(KEY(st.year));
      if (saved) setSt((p) => ({ ...p, ...(JSON.parse(saved) as DeductState) }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(KEY(st.year), JSON.stringify(st)).catch(() => {});
  }, [st]);

  const num = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const normAmount = useMemo(() => {
    const pct = Math.max(0, Math.min(100, num(st.normPct)));
    return +(st.totalIncome * (pct / 100)).toFixed(2);
  }, [st.totalIncome, st.normPct]);

  const totalDeductions = useMemo(() => {
    const parts = [
      normAmount,
      num(st.insurances),
      num(st.kids),
      num(st.donations),
      num(st.mortgage),
      num(st.voluntary),
      num(st.other),
    ];
    return +parts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0).toFixed(2);
  }, [st, normAmount]);

  const taxBase = useMemo(() => {
    const base = st.totalIncome - totalDeductions;
    return +Math.max(0, base).toFixed(2);
  }, [st.totalIncome, totalDeductions]);

  const proceed = async () => {
    if (num(st.normPct) < 0 || num(st.normPct) > 100) {
      Alert.alert("Грешка", "Нормативни разходи % трябва да е между 0 и 100.");
      return;
    }
    await AsyncStorage.setItem(KEY(st.year), JSON.stringify(st));
    await AsyncStorage.setItem(
      "@calc_preview",
      JSON.stringify({ year: st.year, income: st.totalIncome, deductions: totalDeductions, base: taxBase })
    );
    router.push("/review");
  };

  const set = <K extends keyof DeductState>(k: K, v: DeductState[K]) => setSt((p) => ({ ...p, [k]: v }));

  return (
    <ScrollView contentContainerStyle={s.c}>
      <Text style={s.h1}>Облекчения и осигуровки</Text>

      {/* година вертикално */}
      <View style={s.stack}>
        <Text style={s.yearText}>{st.year}</Text>
        <View style={s.yearBtnsRow}>
          <TouchableOpacity style={s.yearBtn} onPress={() => set("year", st.year - 1)}><Text style={s.yearBtnText}>-</Text></TouchableOpacity>
          <TouchableOpacity style={s.yearBtn} onPress={() => set("year", st.year + 1)}><Text style={s.yearBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>

      <Text style={s.label}>Общ доход (от „Доходи“, само за четене)</Text>
      <TextInput editable={false} value={st.totalIncome.toFixed(2)} style={[s.input, { backgroundColor: "#f3f4f6" }]} />

      <Text style={s.label}>Нормативни разходи %</Text>
      <TextInput keyboardType="decimal-pad" value={st.normPct} onChangeText={(v) => set("normPct", v)} style={s.input} />

      <Text style={s.label}>Лични осигуровки (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.insurances} onChangeText={(v) => set("insurances", v)} style={s.input} />

      <Text style={s.label}>Облекчение за деца (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.kids} onChangeText={(v) => set("kids", v)} style={s.input} />

      <Text style={s.label}>Дарения (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.donations} onChangeText={(v) => set("donations", v)} style={s.input} />

      <Text style={s.label}>Ипотечни лихви (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.mortgage} onChangeText={(v) => set("mortgage", v)} style={s.input} />

      <Text style={s.label}>Доброволни фондове (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.voluntary} onChangeText={(v) => set("voluntary", v)} style={s.input} />

      <Text style={s.label}>Други (сума)</Text>
      <TextInput keyboardType="decimal-pad" value={st.other} onChangeText={(v) => set("other", v)} style={s.input} />

      <View style={s.box}>
        <Row k="Нормативни разходи" v={normAmount.toFixed(2)} />
        <Row k="Общо облекчения/осигуровки" v={totalDeductions.toFixed(2)} />
        <Row k="Данъчна основа" v={taxBase.toFixed(2)} bold />
      </View>

      <TouchableOpacity style={s.next} onPress={proceed}>
        <Text style={s.nextText}>Продължи към преглед</Text>
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

  stack:{ gap:8, alignItems:"center", marginBottom:6 },
  yearText:{ fontWeight:"700", fontSize:16 },
  yearBtnsRow:{ flexDirection:"row", gap:8, justifyContent:"center" },

  label: { fontSize: 12, opacity: 0.8 },
  input: { borderWidth: 1, borderColor: "#d0d0d0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", fontSize: 14 },

  box: { padding: 12, borderRadius: 12, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e5e7eb", marginTop: 6 },
  row2: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  k: { fontSize: 14, color: "#1f2937" },
  v: { fontSize: 14, fontWeight: "700", color: "#111827" },

  yearBtn: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "white" },
  yearBtnText: { fontSize: 18, fontWeight: "700" },

  next: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#e8f3ff", borderWidth: 1, borderColor: "#a0c8ff" },
  nextText: { fontSize: 14, fontWeight: "700" },
});
