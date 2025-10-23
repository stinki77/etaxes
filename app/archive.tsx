
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ArchiveItem = {
  id: string;
  year: number;
  profile: { egn: string; firstName: string; lastName: string };
  tax: number;
  advance: number;
  settlement: number;
  xmlSaved: boolean;
  signedUri?: string | null;
  status: "Подготвена" | "Подадена" | "Приета" | "Отказана";
  createdAt: number;
};
const ARCHIVE_KEY = "@archive_records";

export default function Archive() {
  const [items, setItems] = useState<ArchiveItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ARCHIVE_KEY);
        const arr: ArchiveItem[] = raw ? JSON.parse(raw) : [];
        // най-новите първи
        arr.sort((a, b) => b.createdAt - a.createdAt);
        setItems(arr);
      } catch { setItems([]); }
    })();
  }, []);

  const currency = (n: number) =>
    new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN", minimumFractionDigits: 2 }).format(n);

  const statusColor = (s: ArchiveItem["status"]) => {
    switch (s) {
      case "Приета": return "#16a34a";
      case "Отказана": return "#dc2626";
      case "Подадена": return "#1d4ed8";
      default: return "#6b7280";
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.h1}>Архив</Text>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ textAlign: "center", opacity: 0.7 }}>Няма записи.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.year}>{item.year}</Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.badgeText}>{item.status}</Text>
              </View>
            </View>

            <Text style={s.name}>{item.profile.firstName} {item.profile.lastName} — ЕГН {item.profile.egn}</Text>

            <View style={s.kv}>
              <KV k="Данък" v={currency(item.tax)} />
              <KV k="Авансово" v={currency(item.advance)} />
              <KV k={item.settlement >= 0 ? "За доплащане" : "За възстановяване"} v={currency(Math.abs(item.settlement))} />
            </View>

            <View style={s.tags}>
              <Tag text={item.xmlSaved ? "XML: да" : "XML: не"} />
              <Tag text={item.signedUri ? "Подпис: да" : "Подпис: не"} />
            </View>

            <View style={s.actions}>
              <TouchableOpacity style={s.btnLight}><Text style={s.btnLightText}>Отвори</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnLight}><Text style={s.btnLightText}>Дублирай</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ color: "#374151" }}>{k}</Text>
      <Text style={{ fontWeight: "700", color: "#111827" }}>{v}</Text>
    </View>
  );
}
function Tag({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff", borderWidth: 1, borderColor: "#c7d2fe" }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e3a8a" }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: "#f7f7f7" },
  h1: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  year: { fontWeight: "800", fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  name: { marginTop: 6, fontWeight: "600", color: "#111827" },
  kv: { marginTop: 6 },
  tags: { flexDirection: "row", gap: 8, marginTop: 8 },

  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  btnLight: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  btnLightText: { fontWeight: "700", color: "#111827" },
});
