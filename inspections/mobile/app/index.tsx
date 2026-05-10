import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase, type Machine } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (!error && data) setMachines(data as Machine[]);
      setLoading(false);
    })();
  }, []);

  const filtered = machines.filter(m =>
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.scanBtn} onPress={() => router.push("/scan")}>
        <Text style={styles.scanBtnText}>Scanner un QR code</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Ou choisir une machine</Text>
      <TextInput
        style={styles.search}
        placeholder="Rechercher par code ou nom..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Link href={`/machine/${item.code}`} asChild>
              <Pressable style={styles.machineCard}>
                <Text style={styles.machineCode}>{item.code}</Text>
                <Text style={styles.machineName}>{item.name}</Text>
                {item.site && <Text style={styles.machineSite}>📍 {item.site}</Text>}
              </Pressable>
            </Link>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucune machine.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  scanBtn: {
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  scanBtnText: { color: "white", fontSize: 18, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8, color: "#334155" },
  search: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  machineCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  machineCode: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  machineName: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  machineSite: { fontSize: 13, color: "#64748b", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 40, color: "#94a3b8" },
});
