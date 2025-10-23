// app/(tabs)/declaration.tsx
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
import { unstable_batchedUpdates } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { getLocale, onLocaleChange, tSync, type Locale } from "../../src/localization";

import { loadImportedIncomesForYear } from "../../src/lib/incomeStorage";
import { calculateTax } from "../../src/lib/taxAdapter"; // адаптер към твоя src/lib/tax.ts
import { exportToXlsx } from "../../src/utils/excel";
import { generateReviewHtml } from "../../src/utils/reviewHtml";

// NEW: store helpers for drafts/submission
import {
  saveDeclaration,
  markDeclarationSubmitted,
  loadDeclaration,
  type DeclarationDraftOrSubmitted,
  // added:
  loadIncomes,
  loadDeductions,
} from "../../src/lib/store";
// NEW: person config + XML generator
import { getPerson } from "../../src/config/nap";
import { generateNapXml } from "../../src/lib/napXml";

// === Типове ===
type ImportedIncome = {
  id: string;
  description: string;
  amount: number;
  date?: string;
  include?: boolean;
};

type ReliefInput = {
  name: string;
  amount: number;
};

// === Валидация ===
type Errors = {
  year?: string;
  manualIncome?: string;
  reliefs?: Record<number, { name?: string; amount?: string }>;
};

function isFiniteNonNeg(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0;
}

function parseMoney(s: string) {
  if (!s?.trim()) return 0;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export default function DeclarationScreen() {
  // Локализация
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
  const terr = useCallback((k: string) => tSync(lng, `createTax.errors.${k}`), [lng]);

  // Форма
  const curYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(curYear);
  const [manualIncome, setManualIncome] = useState<string>("");
  const [reliefs, setReliefs] = useState<ReliefInput[]>([]);
  const [note, setNote] = useState<string>("");

  // Импортирани доходи
  const [importedItems, setImportedItems] = useState<ImportedIncome[]>([]);
  const [importedTotal, setImportedTotal] = useState<number>(0);

  // NEW: saved declaration meta
  const [savedDecl, setSavedDecl] = useState<DeclarationDraftOrSubmitted | undefined>(undefined);

  // Зареждане на импортнати доходи за година — батчнато
  const loadImportedIncomes = useCallback(async (yr: number) => {
    try {
      const arr = await loadImportedIncomesForYear(yr);
      const sum = arr.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      unstable_batchedUpdates(() => {
        setImportedItems(arr);
        setImportedTotal(sum);
      });
    } catch (e) {
      console.warn("loadImportedIncomes:", e);
      unstable_batchedUpdates(() => {
        setImportedItems([]);
        setImportedTotal(0);
      });
    }
  }, []);

  // NEW: hydrate saved declaration status
  const hydrateSavedDecl = useCallback(async (yr: number) => {
    try {
      const decl = await loadDeclaration(yr);
      setSavedDecl(decl || undefined);
    } catch {
      setSavedDecl(undefined);
    }
  }, []);

  useEffect(() => {
    loadImportedIncomes(year);
    hydrateSavedDecl(year);
  }, [year, loadImportedIncomes, hydrateSavedDecl]);

  // Валидация на полета
  const errors: Errors = useMemo(() => {
    const e: Errors = {};
    // year
    if (!Number.isInteger(year)) {
      e.year = terr("yearRequired") || "Моля, въведете година.";
    } else {
      const minY = 2000;
      const maxY = curYear + 1;
      if (year < minY || year > maxY) {
        e.year =
          terr("yearOutOfRange") ||
          `Годината трябва да е между ${minY} и ${maxY}.`;
      }
    }
    // manualIncome
    if (manualIncome.trim()) {
      const n = parseMoney(manualIncome);
      if (!isFiniteNonNeg(n)) {
        e.manualIncome = terr("amountInvalid") || "Невалидна сума.";
      }
    }
    // reliefs
    if (reliefs.length) {
      e.reliefs = {};
      reliefs.forEach((r, idx) => {
        const entry: { name?: string; amount?: string } = {};
        const amt = Number(r.amount);
        if (!isFiniteNonNeg(amt)) {
          entry.amount = terr("amountInvalid") || "Невалидна сума.";
        }
        // ако е въведена сума, но липсва име
        if ((Number.isFinite(amt) && amt > 0) && !r.name?.trim()) {
          entry.name = terr("nameRequired") || "Моля, въведете име.";
        }
        if (entry.name || entry.amount) e.reliefs![idx] = entry;
      });
      if (Object.keys(e.reliefs).length === 0) delete e.reliefs;
    }
    return e;
  }, [year, manualIncome, reliefs, terr, curYear]);

  const hasErrors = useMemo(() => {
    if (errors.year || errors.manualIncome) return true;
    if (errors.reliefs && Object.keys(errors.reliefs).length) return true;
    return false;
  }, [errors]);

  // Общо
  const totalIncome = useMemo(() => {
    const manual = parseMoney(manualIncome);
    const safeManual = Number.isFinite(manual) ? manual : 0;
    return safeManual + (importedTotal || 0);
  }, [manualIncome, importedTotal]);

  const totalReliefs = useMemo(
    () => reliefs.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [reliefs]
  );

  const totals = useMemo(() => {
    return calculateTax({
      year,
      incomeTotal: totalIncome,
      reliefsTotal: totalReliefs,
    });
  }, [year, totalIncome, totalReliefs]);

  // Действия
  const onAddRelief = () => {
    setReliefs((arr) => [...arr, { name: "", amount: 0 }]);
  };

  const failIfErrors = () => {
    if (!hasErrors) return false;
    Alert.alert(
      t("common.error"),
      terr("fixErrors") || "Моля, коригирайте грешките във формата."
    );
    return true;
  };

  const onGeneratePdf = async () => {
    if (failIfErrors()) return;
    try {
      const html = generateReviewHtml({
        year,
        importedItems,
        importedTotal,
        manualIncome: Number(parseMoney(manualIncome)) || 0,
        reliefs,
        totals,
        note,
        locale: lng,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const dir = (((FileSystem as any).documentDirectory) || "") as string;
      const target = `${dir}etaxes_${year}.pdf`;
      await (FileSystem as any).copyAsync({ from: uri, to: target });
      await Sharing.shareAsync(target);
    } catch (e) {
      Alert.alert(t("common.error"), String(e instanceof Error ? e.message : e));
    }
  };

  const onExportXlsx = async () => {
    if (failIfErrors()) return;
    try {
      // Подготовка на preview обекта според очакванията на excel.ts
      const taxRatePct =
        typeof (totals as any)?.taxRate === "number"
          ? (totals as any).taxRate * 100
          : 10;
      const preview = {
        year,
        incomesTotal: totalIncome,
        deductionsTotal: totalReliefs,
        taxableBase: (totals as any).taxBase ?? 0,
        taxRatePct: +Number(taxRatePct).toFixed(2),
        taxDue: (totals as any).taxDue ?? 0,
        createdAt: new Date().toISOString(),
      };

      // Списък с доходи за втория лист (по желание)
      const manualN = Number(parseMoney(manualIncome)) || 0;
      const incomes = [
        ...importedItems.map((it) => ({
          description: it.description || "Доход",
          amount: Number(Number(it.amount || 0).toFixed(2)),
          date: it.date || "",
          include: it.include !== false,
        })),
        ...(manualN > 0
          ? [
              {
                description: t("createTax.income") || "Ръчно въведен доход",
                amount: Number(manualN.toFixed(2)),
              },
            ]
          : []),
      ];

      const { uri } = await exportToXlsx(preview, incomes);
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert(t("common.error"), String(e instanceof Error ? e.message : e));
    }
  };

  // NEW: save draft
  const onSaveDraft = async () => {
    if (failIfErrors()) return;
    try {
      const payload: DeclarationDraftOrSubmitted = {
        year,
        incomesTotal: totalIncome,
        deductionsTotal: totalReliefs,
        taxBase: totals.taxBase,
        taxDue: totals.taxDue,
        createdAt: new Date().toISOString(),
        status: "draft",
      };
      await saveDeclaration(payload);
      setSavedDecl(payload);
      Alert.alert(t("common.ok") || "OK", t("createTax.draftSaved") || "Черновата е запазена.");
    } catch (e) {
      Alert.alert(t("common.error") || "Error", t("createTax.saveFailed") || "Неуспешно запазване.");
    }
  };

  // NEW: mark submitted
  const onMarkSubmitted = async () => {
    try {
      const updated = await markDeclarationSubmitted(year);
      if (!updated) {
        Alert.alert(t("common.error") || "Error", t("createTax.noDraft") || "Няма запазена декларация.");
        return;
      }
      setSavedDecl(updated);
      Alert.alert(t("common.ok") || "OK", t("createTax.markedSubmitted") || "Маркирано като подадена.");
    } catch (e) {
      Alert.alert(t("common.error") || "Error", t("createTax.submitFailed") || "Грешка при маркиране.");
    }
  };

  // NEW: export XML for НАП
  const onExportNapXml = async () => {
    if (failIfErrors()) return;
    try {
      const [incomes, deductions, person] = await Promise.all([
        loadIncomes(year),
        loadDeductions(year),
        getPerson(),
      ]);
      const xml = generateNapXml({ year, incomes, deductions, person });
      const dir = (((FileSystem as any).documentDirectory) || "") as string;
      const uri = `${dir}GDD_${year}.xml`;
      await (FileSystem as any).writeAsStringAsync(uri, xml, { encoding: (FileSystem as any).EncodingType?.UTF8 || "utf8" });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert(t("common.error") || "Error", String(e instanceof Error ? e.message : e));
    }
  };

  // NEW: open Submit screen from here
  const onOpenSubmit = async () => {
    // по желание: първо запази чернова за да има данни в submit
    try {
      const payload: DeclarationDraftOrSubmitted = {
        year,
        incomesTotal: totalIncome,
        deductionsTotal: totalReliefs,
        taxBase: totals.taxBase,
        taxDue: totals.taxDue,
        createdAt: new Date().toISOString(),
        status: "draft",
      };
      await saveDeclaration(payload);
      setSavedDecl(payload);
    } catch {}
    router.push({ pathname: "/submit", params: { year: String(year) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{t("createTax.title")}</Text>

      {/* Година */}
      <View style={styles.row}>
        <Text style={styles.label}>{t("createTax.year")}</Text>
        <TextInput
          style={[styles.input, errors.year && styles.inputError]}
          keyboardType="number-pad"
          value={String(year)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (Number.isFinite(n)) setYear(n);
            else setYear(curYear);
          }}
        />
        {!!errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
      </View>

      {/* Доходи */}
      <View style={styles.box}>
        <Text style={styles.h2}>{t("createTax.income")}</Text>

        <View style={styles.row}>
          <Text style={styles.subLabel}>{t("createTax.income")}</Text>
          <TextInput
            style={[styles.input, errors.manualIncome && styles.inputError]}
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={manualIncome}
            onChangeText={setManualIncome}
          />
          {!!errors.manualIncome && (
            <Text style={styles.errorText}>{errors.manualIncome}</Text>
          )}
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.meta}>
            Импортирани:{" "}
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "BGN",
              maximumFractionDigits: 2,
            }).format(importedTotal || 0)}
          </Text>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => loadImportedIncomes(year)}
          >
            <Text style={styles.btnText}>Обнови импорт</Text>
          </TouchableOpacity>
        </View>

        {importedItems.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {importedItems.slice(0, 5).map((it) => (
              <View key={it.id} style={styles.miniRow}>
                <Text style={styles.miniTitle} numberOfLines={1}>
                  {it.description || "(без описание)"}
                </Text>
                <Text style={styles.miniAmount}>
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "BGN",
                    maximumFractionDigits: 2,
                  }).format(Number(it.amount) || 0)}
                </Text>
              </View>
            ))}
            {importedItems.length > 5 && (
              <Text style={styles.moreNote}>
                + {importedItems.length - 5} още...
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Облекчения */}
      <View style={styles.box}>
        <Text style={styles.h2}>{t("createTax.reliefs")}</Text>

        {reliefs.map((r, idx) => {
          const re = errors.reliefs?.[idx] || {};
          return (
            <View key={idx} style={styles.reliefRow}>
              <TextInput
                style={[styles.input, styles.reliefName, re.name && styles.inputError]}
                placeholder="Име"
                value={r.name}
                onChangeText={(v) => {
                  setReliefs((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, name: v } : x))
                  );
                }}
              />
              <TextInput
                style={[styles.input, styles.reliefAmount, re.amount && styles.inputError]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={String(r.amount ?? "")}
                onChangeText={(v) => {
                  const n = Number(String(v).replace(",", "."));
                  setReliefs((arr) =>
                    arr.map((x, i) =>
                      i === idx ? { ...x, amount: Number.isFinite(n) ? n : (v ? Number.NaN : 0) } : x
                    )
                  );
                }}
              />
              <TouchableOpacity
                style={[styles.btnSmall, styles.btnDanger]}
                onPress={() => setReliefs((arr) => arr.filter((_, i) => i !== idx))}
              >
                <Text style={styles.btnSmallText}>X</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onAddRelief}>
          <Text style={styles.btnText}>Добави облекчение</Text>
        </TouchableOpacity>
      </View>

      {/* Преглед */}
      <View style={styles.box}>
        <Text style={styles.h2}>{t("createTax.review")}</Text>

        <RowKV k="Общо доходи" v={fmtBGN(totalIncome)} />
        <RowKV k="Общо облекчения" v={fmtBGN(totalReliefs)} />
        <RowKV k="Данъчна основа" v={fmtBGN(totals.taxBase)} />
        <RowKV k="Данък 10%" v={fmtBGN(totals.taxDue)} />
      </View>

      {/* Бележка */}
      <View style={styles.box}>
        <Text style={styles.subLabel}>Бележка</Text>
        <TextInput
          style={[styles.input, styles.note]}
          placeholder="Описание..."
          multiline
          value={note}
          onChangeText={setNote}
        />
      </View>

      {/* Действия */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, hasErrors && styles.btnDisabled]}
          onPress={onGeneratePdf}
          disabled={hasErrors}
        >
          <Text style={styles.btnText}>{t("createTax.generatePdf")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimaryOutline, hasErrors && styles.btnDisabledOutline]}
          onPress={onExportXlsx}
          disabled={hasErrors}
        >
          <Text style={styles.btnPrimaryOutlineText}>{t("createTax.exportXlsx")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimaryOutline, hasErrors && styles.btnDisabledOutline]}
          onPress={onExportNapXml}
          disabled={hasErrors}
        >
          <Text style={styles.btnPrimaryOutlineText}>Експорт за НАП (XML)</Text>
        </TouchableOpacity>
        {/* NEW: button moved from Archive -> here */}
        <TouchableOpacity
          style={[styles.btn, styles.btnAccent]}
          onPress={onOpenSubmit}
        >
          <Text style={styles.btnText}>Подпис и подаване</Text>
        </TouchableOpacity>
      </View>

      {/* NEW: Draft/Submit actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnAccent, hasErrors && styles.btnDisabled]}
          onPress={onSaveDraft}
          disabled={hasErrors}
        >
          <Text style={styles.btnText}>{t("createTax.saveDraft") || "Запази чернова"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDark]}
          onPress={onMarkSubmitted}
        >
          <Text style={styles.btnText}>{t("createTax.markSubmitted") || "Маркирай като подадена"}</Text>
        </TouchableOpacity>
      </View>

      {/* NEW: saved meta */}
      {savedDecl ? (
        <View style={[styles.box, { backgroundColor: "#f7f7f7" }]}>
          <Text style={styles.meta}>
            Статус: <Text style={{ fontWeight: "700" }}>{savedDecl.status}</Text>
          </Text>
          <Text style={styles.meta}>Създадена: {new Date(savedDecl.createdAt).toLocaleString()}</Text>
          {savedDecl.submittedAt ? (
            <Text style={styles.meta}>Подадена: {new Date(savedDecl.submittedAt).toLocaleString()}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// === Помощни ===
function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

function fmtBGN(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

// === Стилове ===
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  row: { marginBottom: 12 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  subLabel: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  inputError: {
    borderColor: "#d32f2f", backgroundColor: "#fff5f5",
  },
  errorText: { color: "#c62828", marginTop: 4 },
  box: {
    borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa",
    borderRadius: 14, padding: 12, marginTop: 12,
  },
  miniRow: {
    flexDirection: "row", justifyContent: "space между", paddingVertical: 4,
  },
  miniTitle: { fontSize: 12, color: "#333", flex: 1, paddingRight: 8 },
  miniAmount: { fontSize: 12, fontWeight: "700" },
  moreNote: { fontSize: 12, color: "#666", marginTop: 2 },
  meta: { fontSize: 12, color: "#444" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16, flexWrap: "wrap" },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnPrimary: { backgroundColor: "#2e7d32" },
  btnDark: { backgroundColor: "#333333" },
  btnAccent: { backgroundColor: "#1976d2" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnPrimaryOutline: { borderWidth: 1, borderColor: "#2e7d32", backgroundColor: "#fff" },
  btnPrimaryOutlineText: { color: "#2e7d32", fontWeight: "700" },
  btnSecondary: { backgroundColor: "#e0f2f1" },
  btnDisabled: { opacity: 0.6 },
  btnDisabledOutline: { opacity: 0.6 },
  reliefRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reliefName: { flex: 1 },
  reliefAmount: { width: 120 },
  btnSmall: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnDanger: { backgroundColor: "#c62828" },
  btnSmallText: { color: "#fff", fontWeight: "700" },
  note: { minHeight: 80, textAlignVertical: "top" },
  k: { fontSize: 14, color: "#333" },
  v: { fontSize: 14, fontWeight: "700" },
});
