import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Papa from "papaparse";

type IncomeItem = {
  id: string;
  date: string;
  description?: string;
  source?: string;
  amount: number;
};

const keyForYear = (y: number) => `@income_sources_${y}`;

function findKey(candidates: string[], row: Record<string, any>) {
  const keys = Object.keys(row);
  const lower = keys.map((k) => k.toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return keys[i];
  }
  return undefined;
}
function parseAmount(v: any): number {
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export default function IncomesScreen() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(keyForYear(year));
        setItems(raw ? (JSON.parse(raw) as IncomeItem[]) : []);
      } catch {
        setItems([]);
      }
    })();
  }, [year]);

  const save = async () => {
    await AsyncStorage.setItem(keyForYear(year), JSON.stringify(items));
    Alert.alert("Записано", `Редове: ${items.length} за ${year}`);
  };

  const total = useMemo(
    () => items.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [items]
  );

  const addItem = () => {
    const n = parseAmount(amt);
    if (!Number.isFinite(n)) {
      Alert.alert("Грешна сума", "Въведи валидна сума.");
      return;
    }
    const it: IncomeItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: date.trim(),
      description: desc.trim() || undefined,
      amount: Number((Math.round(n * 100) / 100).toFixed(2)),
    };
    setItems((p) => [it, ...p]);
    setDate("");
    setDesc("");
    setAmt("");
  };

  const removeItem = (id: string) =>
    setItems((p) => p.filter((x) => x.id !== id));

  const importCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const csv = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = Papa.parse<Record<string, any>>(csv, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors?.length) {
        Alert.alert("Грешка при четене", parsed.errors[0]?.message || "");
        return;
      }
      const rows = parsed.data || [];
      const mapped: IncomeItem[] = rows
        .map((row, idx) => {
          const kDate = findKey(["date", "дата"], row);
          const kAmt = findKey(
            ["amount", "sum", "value", "сума", "сумa"],
            row
          );
          const kDesc = findKey(
            ["description", "details", "описание", "note", "notes"],
            row
          );
          if (!kAmt) return undefined;
          const n = parseAmount(row[kAmt]);
          if (!Number.isFinite(n)) return undefined;

          return {
            id: `${Date.now()}_${idx}`,
            date: (kDate ? String(row[kDate]) : "").trim(),
            description: (kDesc ? String(row[kDesc]) : "").trim() || undefined,
            amount: Number((Math.round(n * 100) / 100).toFixed(2)),
          } as IncomeItem;
        })
        .filter(Boolean) as IncomeItem[];

      if (!mapped.length) {
        Alert.alert("Няма разпознати редове", "Провери имената на колоните.");
        return;
      }
      setItems(mapped);
      Alert.alert("Импортът е успешен", `Редове: ${mapped.length}`);
    } catch (e: any) {
      Alert.alert("Грешка", e?.message || "Невалиден файл");
    }
  };

  const currency = (n: number) =>
    new Intl.NumberFormat("bg-BG", {
      style: "currency",
      currency: "BGN",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <View style={s.container}>
      <Text style={s.title}>Доходи</Text>

      {/* вертикални контроли */}
      <View style={s.stack}>
        <View style={s.yearBox}>
          <Text style={s.yearLabelText}>{year}</Text>
          <View style={s.yearBtnsRow}>
            <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={s.yearBtn}>
              <Text style={s.yearBtnText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={s.yearBtn}>
              <Text style={s.yearBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={importCsv} style={s.primaryBtn}>
          <Text style={s.primaryBtnText}>Импорт CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={save} style={s.secondaryBtn}>
          <Text style={s.secondaryBtnText}>Запази</Text>
        </TouchableOpacity>
      </View>

      {/* добавяне ред */}
      <View style={s.stack}>
        <TextInput value={date} onChangeText={setDate} placeholder="Дата" style={s.input} />
        <TextInput value={desc} onChangeText={setDesc} placeholder="Описание" style={s.input} />
        <TextInput value={amt} onChangeText={setAmt} placeholder="Сума" keyboardType="decimal-pad" style={s.input} />
        <TouchableOpacity onPress={addItem} style={s.addBtn}>
          <Text style={s.addBtnText}>Добави</Text>
        </TouchableOpacity>
      </View>

      {/* обобщение */}
      <View style={s.summary}>
        <Text style={s.sumText}>Редове: {items.length}</Text>
        <Text style={s.sumText}>Общо: {currency(total)}</Text>
      </View>

      {/* списък */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={s.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTop}>
                {item.description || item.source || "Без описание"}
              </Text>
              <Text style={s.itemSub}>{item.date}</Text>
            </View>
            <Text style={s.amount}>{currency(item.amount)}</Text>
            <TouchableOpacity onPress={() => removeItem(item.id)} style={s.delBtn}>
              <Text style={s.delBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const BRAND = "#1f6feb";
const s = StyleSheet.create({
  container:{ flex:1, padding:16, backgroundColor:"#f7f7f7" },
  title:{ fontSize:20, fontWeight:"700", marginBottom:10, textAlign:"center" },

  stack:{ gap:8, marginBottom:10 },
  yearBox:{ gap:8, alignItems:"center" },
  yearBtnsRow:{ flexDirection:"row", gap:8, justifyContent:"center" },

  yearBtn:{ width:40, height:40, borderRadius:8, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#cbd5e1", backgroundColor:"white" },
  yearBtnText:{ fontSize:18, fontWeight:"700" },
  yearLabelText:{
    paddingHorizontal:14, borderRadius:8, borderWidth:1, borderColor:"#cbd5e1",
    textAlignVertical:"center", textAlign:"center", backgroundColor:"white",
    fontWeight:"700", fontSize:16, minWidth:80
  },

  primaryBtn:{ backgroundColor:BRAND, paddingHorizontal:12, paddingVertical:10, borderRadius:10, alignItems:"center" },
  primaryBtnText:{ color:"white", fontWeight:"700" },
  secondaryBtn:{ backgroundColor:"white", paddingHorizontal:12, paddingVertical:10, borderRadius:10, alignItems:"center", borderWidth:1, borderColor:"#cbd5e1" },
  secondaryBtnText:{ fontWeight:"700" },

  input:{ borderWidth:1, borderColor:"#d0d0d0", borderRadius:10, paddingHorizontal:12, paddingVertical:10, backgroundColor:"#fff" },

  summary:{ flexDirection:"row", justifyContent:"space-between", marginVertical:8 },
  sumText:{ fontSize:14, color:"#223" },

  itemRow:{ backgroundColor:"white", padding:12, borderRadius:12, marginTop:8, flexDirection:"row", alignItems:"center", gap:8, shadowColor:"#000", shadowOpacity:0.06, shadowOffset:{width:0,height:1}, shadowRadius:3, elevation:2 },
  itemTop:{ fontSize:14, fontWeight:"600", color:"#1f2937" },
  itemSub:{ fontSize:12, color:"#6b7280", marginTop:2 },
  amount:{ fontWeight:"700", color:"#1f883d" },
  delBtn:{ width:32, height:32, borderRadius:8, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#e5e7eb", backgroundColor:"#fff" },
  delBtnText:{ fontWeight:"900" },
});
