import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCachedMachines, loadInspections } from "@/lib/cache";
import { useNetwork } from "@/lib/network";
import { supabase, type Inspection, type Machine } from "@/lib/supabase";

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  minor_issues: "Défauts mineurs",
  major_issues: "Défauts majeurs",
  out_of_service: "Hors service",
};
const STATUS_COLOR: Record<string, string> = {
  ok: "#16a34a",
  minor_issues: "#ca8a04",
  major_issues: "#ea580c",
  out_of_service: "#dc2626",
};

export default function MachineScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { online } = useNetwork();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || online === null) return;
    (async () => {
      // 1. Trouver la machine: réseau si dispo, sinon cache
      let m: Machine | null = null;
      if (online !== false) {
        const { data } = await supabase.from("machines").select("*").eq("code", code).maybeSingle();
        m = (data as Machine) ?? null;
      }
      if (!m) {
        const cached = await getCachedMachines();
        m = cached.find(x => x.code === code) ?? null;
      }

      if (m) {
        setMachine(m);
        const result = await loadInspections(m.id, online);
        setInspections(result.inspections);
        setFromCache(result.fromCache);
      }
      setLoading(false);
    })();
  }, [code, online]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  if (!machine) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Machine introuvable</Text>
        <Text style={styles.muted}>Code: {code}</Text>
        {online === false && (
          <Text style={[styles.muted, { marginTop: 8 }]}>
            (Hors ligne — la machine n'est peut-être pas dans le cache.)
          </Text>
        )}
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.code}>{machine.code}</Text>
        <Text style={styles.name}>{machine.name}</Text>
        {machine.type && <Text style={styles.muted}>{machine.type}</Text>}
        {machine.site && <Text style={styles.muted}>📍 {machine.site}</Text>}
        {(machine.brand || machine.model) && (
          <Text style={styles.muted}>{[machine.brand, machine.model].filter(Boolean).join(" ")}</Text>
        )}
      </View>

      <Link href={`/inspection/new?machineId=${machine.id}&machineCode=${machine.code}`} asChild>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>+ Nouvelle inspection</Text>
        </Pressable>
      </Link>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Historique ({inspections.length})</Text>
        {fromCache && <Text style={styles.cacheLabel}>cache</Text>}
      </View>

      <FlatList
        data={inspections}
        scrollEnabled={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Link href={`/inspection/${item.id}`} asChild>
            <Pressable style={styles.inspCard}>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.overall_status] ?? "#64748b" }]}>
                <Text style={styles.badgeText}>{STATUS_LABEL[item.overall_status] ?? item.overall_status}</Text>
              </View>
              <Text style={styles.inspector}>{item.inspector_name}</Text>
              <Text style={styles.muted}>{new Date(item.inspected_at).toLocaleString("fr-CA")}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.muted}>Aucune inspection encore.</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 16 },
  code: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  name: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  muted: { color: "#64748b", marginTop: 4 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  primaryBtn: { backgroundColor: "#0ea5e9", padding: 16, borderRadius: 10, alignItems: "center", marginBottom: 24 },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "600" },
  btn: { backgroundColor: "#0f172a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  btnText: { color: "white", fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#334155" },
  cacheLabel: { fontSize: 11, color: "#94a3b8", fontStyle: "italic" },
  inspCard: { backgroundColor: "white", padding: 14, borderRadius: 8, marginBottom: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  badgeText: { color: "white", fontSize: 12, fontWeight: "600" },
  inspector: { fontWeight: "600" },
});
