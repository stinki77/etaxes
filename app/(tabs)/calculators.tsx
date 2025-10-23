// app/(tabs)/calculators.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";

/**
 * Забележка: Ставките са конфигурируеми от екрана.
 * Не предполагаме фиксирани проценти за осигуровки.
 * Данъчната ставка по подразбиране е 10%.
 */

// === Общи помощници ===
function toNumber(val: string | number | undefined, def = 0): number {
  if (val == null) return def;
  const n = Number(String(val).replace(",", "."));
  return Number.isFinite(n) ? n : def;
}
function fmt(n: number, digits = 2) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
function fmtBGN(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 2,
  }).format(n);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pct(n: number) {
  return clamp(n, 0, 100);
}

// === Компонент ===
export default function CalculatorsScreen() {
  const [lng, setLng] = useState<Locale>(getLocale());
  useEffect(() => {
    const off = onLocaleChange((l) => setLng(l));
    return () => off();
  }, []);
  const t = useCallback((k: string) => tSync(k, lng), [lng]);

  // ===== A) Калкулатор нетна заплата =====
  const [gross, setGross] = useState<string>("2000");
  const [empSocPct, setEmpSocPct] = useState<string>("13");   // % осигуровки за служителя (общо), конфигурируемо
  const [healthPct, setHealthPct] = useState<string>("3.2");  // % здравно в рамките на горното или отделно според предпочитания
  const [extraDeductions, setExtraDeductions] = useState<string>("0"); // други удръжки (напр. аванси, съдебни и пр.)
  const [taxPct, setTaxPct] = useState<string>("10");         // данък общ доход %
  const [roundNet, setRoundNet] = useState<boolean>(false);

  const netCalc = useMemo(() => {
    const G = Math.max(0, toNumber(gross));
    // В този модел приемаме, че "empSocPct" е общ % за всички осигуровки на служителя.
    // "healthPct" е информативен/допълнителен. Ако искаш да участва в удръжката отделно, включи го в empSocPct.
    const empPct = pct(toNumber(empSocPct));
    const tax = pct(toNumber(taxPct));
    const extras = Math.max(0, toNumber(extraDeductions));

    const soc = (G * empPct) / 100;
    const taxBase = Math.max(0, G - soc);
    const incomeTax = (taxBase * tax) / 100;
    let net = G - soc - incomeTax - extras;
    if (roundNet) net = Math.round(net);
    return {
      G,
      empPct,
      soc,
      taxBase,
      incomeTax,
      extras,
      net,
    };
  }, [gross, empSocPct, taxPct, extraDeductions, roundNet]);

  // ===== B) Данъчен калкулатор (свободни доходи) =====
  const [income, setIncome] = useState<string>("12000");        // Общ доход за годината
  const [normCostsPct, setNormCostsPct] = useState<string>("25"); // Нормативни разходи %
  const [socContrib, setSocContrib] = useState<string>("0");    // Реално платени осигуровки (сума)
  const [advTaxPaid, setAdvTaxPaid] = useState<string>("0");    // Авансово удържан данък (сума)
  const [annualTaxPct, setAnnualTaxPct] = useState<string>("10"); // Годишен данък %
  const [roundTax, setRoundTax] = useState<boolean>(false);

  const taxCalc = useMemo(() => {
    const inc = Math.max(0, toNumber(income));
    const normPct = pct(toNumber(normCostsPct));
    const soc = Math.max(0, toNumber(socContrib));
    const adv = Math.max(0, toNumber(advTaxPaid));
    const tpct = pct(toNumber(annualTaxPct));

    const normCosts = (inc * normPct) / 100;
    const base = Math.max(0, inc - normCosts - soc);
    const due = (base * tpct) / 100;
    let settlement = due - adv; // <0 — надвнесен данък
    if (roundTax) settlement = Math.round(settlement);

    return { inc, normPct, normCosts, soc, base, tpct, due, adv, settlement };
  }, [income, normCostsPct, socContrib, advTaxPaid, annualTaxPct, roundTax]);

  // ===== UI помощници =====
  function L(labelKey: string, fallback: string) {
    return t(labelKey) || fallback;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* A) Нетна заплата */}
      <View style={styles.card}>
        <Text style={styles.h1}>{L("calc.net_salary.title", "Нетна заплата")}</Text>

        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.gross", "Брутна заплата")}</Text>
          <TextInput
            value={gross}
            onChangeText={setGross}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.col, {marginRight: 6}]}>
            <Text style={styles.k}>{L("calc.emp_contrib", "Осигуровки служител %")}</Text>
            <TextInput
              value={empSocPct}
              onChangeText={setEmpSocPct}
              keyboardType="decimal-pad"
              placeholder="13"
              style={styles.input}
            />
          </View>
          <View style={[styles.col, {marginLeft: 6}]}>
            <Text style={styles.k}>{L("calc.health_pct", "Здравно % (инфо)")}</Text>
            <TextInput
              value={healthPct}
              onChangeText={setHealthPct}
              keyboardType="decimal-pad"
              placeholder="3.2"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.col, {marginRight: 6}]}>
            <Text style={styles.k}>{L("calc.other_deductions", "Други удръжки")}</Text>
            <TextInput
              value={extraDeductions}
              onChangeText={setExtraDeductions}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.input}
            />
          </View>
          <View style={[styles.col, {marginLeft: 6}]}>
            <Text style={styles.k}>{L("calc.tax_pct", "Данък %")}</Text>
            <TextInput
              value={taxPct}
              onChangeText={setTaxPct}
              keyboardType="decimal-pad"
              placeholder="10"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.rowSwitch}>
          <Text style={styles.k}>{L("calc.round_net", "Закръгляне на нетната сума")}</Text>
          <Switch value={roundNet} onValueChange={setRoundNet} />
        </View>

        <View style={styles.divider} />

        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.contrib_total", "Осигуровки")}</Text>
          <Text style={styles.v}>{fmtBGN(netCalc.soc)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.tax_base", "Данъчна основа")}</Text>
          <Text style={styles.v}>{fmtBGN(netCalc.taxBase)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.tax_due", "Дължим данък")}</Text>
          <Text style={styles.v}>{fmtBGN(netCalc.incomeTax)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.other_deductions", "Други удръжки")}</Text>
          <Text style={styles.v}>{fmtBGN(netCalc.extras)}</Text>
        </View>

        <View style={[styles.kv, {marginTop: 8}]}>
          <Text style={[styles.k, styles.total]}>{L("calc.net", "Нетна заплата")}</Text>
          <Text style={[styles.v, styles.total]}>{fmtBGN(netCalc.net)}</Text>
        </View>
      </View>

      {/* B) Данъчен калкулатор */}
      <View style={styles.card}>
        <Text style={styles.h1}>{L("calc.tax.title", "Данъчен калкулатор")}</Text>

        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.income_total", "Общ доход (годишен)")}</Text>
          <TextInput
            value={income}
            onChangeText={setIncome}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.col, {marginRight: 6}]}>
            <Text style={styles.k}>{L("calc.norm_costs_pct", "Нормативни разходи %")}</Text>
            <TextInput
              value={normCostsPct}
              onChangeText={setNormCostsPct}
              keyboardType="decimal-pad"
              placeholder="25"
              style={styles.input}
            />
          </View>
          <View style={[styles.col, {marginLeft: 6}]}>
            <Text style={styles.k}>{L("calc.annual_tax_pct", "Данък %")}</Text>
            <TextInput
              value={annualTaxPct}
              onChangeText={setAnnualTaxPct}
              keyboardType="decimal-pad"
              placeholder="10"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.col, {marginRight: 6}]}>
            <Text style={styles.k}>{L("calc.soc_contrib", "Осигуровки (сума)")}</Text>
            <TextInput
              value={socContrib}
              onChangeText={setSocContrib}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.input}
            />
          </View>
          <View style={[styles.col, {marginLeft: 6}]}>
            <Text style={styles.k}>{L("calc.adv_tax_paid", "Авансов данък (сума)")}</Text>
            <TextInput
              value={advTaxPaid}
              onChangeText={setAdvTaxPaid}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.rowSwitch}>
          <Text style={styles.k}>{L("calc.round_tax", "Закръгляне на сетълмента")}</Text>
          <Switch value={roundTax} onValueChange={setRoundTax} />
        </View>

        <View style={styles.divider} />

        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.norm_costs", "Нормативни разходи")}</Text>
          <Text style={styles.v}>{fmtBGN(taxCalc.normCosts)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.tax_base", "Данъчна основа")}</Text>
          <Text style={styles.v}>{fmtBGN(taxCalc.base)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.tax_due", "Дължим данък")}</Text>
          <Text style={styles.v}>{fmtBGN(taxCalc.due)}</Text>
        </View>
        <View style={styles.kv}>
          <Text style={styles.k}>{L("calc.adv_tax_paid", "Авансово платен")}</Text>
          <Text style={styles.v}>{fmtBGN(taxCalc.adv)}</Text>
        </View>

        <View style={[styles.kv, {marginTop: 8}]}>
          <Text style={[styles.k, styles.total]}>{L("calc.settlement", "Сетълмент (за довнасяне)")}</Text>
          <Text style={[styles.v, styles.total]}>{fmtBGN(taxCalc.settlement)}</Text>
        </View>
        <Text style={styles.note}>
          {L("calc.note", "Положителен резултат = дължиш. Отрицателен = надвнесен.")}
        </Text>
      </View>

      {/* C) Малки визуални подобрения и бързи пресети */}
      <View style={styles.card}>
        <Text style={styles.h1}>{L("calc.presets.title", "Бързи настройки")}</Text>
        <Text style={styles.note}>{L("calc.presets.text", "Избери пресет, стойностите ще се попълнят автоматично. Можеш да ги редактираш.")}</Text>

        <View style={styles.rowWrap}>
          {([
            { name: "Freelance 25% NRC", apply: () => { setNormCostsPct("25"); setAnnualTaxPct("10"); } },
            { name: "Freelance 40% NRC", apply: () => { setNormCostsPct("40"); setAnnualTaxPct("10"); } },
            { name: "Contract net", apply: () => { setEmpSocPct("13"); setTaxPct("10"); } },
            { name: "No extras", apply: () => { setExtraDeductions("0"); setAdvTaxPaid("0"); } },
          ] as { name: string; apply: () => void }[]).map((p) => (
            <TouchableOpacity key={p.name} style={styles.preset} onPress={p.apply}>
              <Text style={styles.presetText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  h1: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  k: { fontSize: 14, opacity: 0.8 },
  v: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 120,
    fontSize: 14,
    textAlign: "right",
  },
  col: { flex: 1 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  total: { fontSize: 16 },
  note: { marginTop: 6, fontSize: 12, opacity: 0.7 },
  rowSwitch: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  preset: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  presetText: { color: "white", fontWeight: "600" },
});
