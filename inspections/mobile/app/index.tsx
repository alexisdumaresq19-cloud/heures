import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { loadMachines } from "@/lib/cache";
import { useNetwork } from "@/lib/network";
import { getOutboxCount, syncOutbox } from "@/lib/outbox";
import { type Machine } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { online } = useNetwork();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Charger les machines (réseau si dispo, cache sinon)
  useEffect(() => {
    if (online === null) return;
    setLoading(true);
    loadMachines(online).then(({ machines, fromCache }) => {
      setMachines(machines);
      setFromCache(fromCache);
      setLoading(false);
    });
  }, [online]);

  // Compter les éléments en attente, refresh à chaque retour sur l'écran
  useFocusEffect(useCallback(() => {
    getOutboxCount().then(setPendingCount);
  }, []));

  async function manualSync() {
    setSyncing(true);
    const result = await syncOutbox();
    setSyncing(false);
    setPendingCount(await getOutboxCount());
    // Refresh machines après sync
    if (online !== false) {
      const { machines } = await loadMachines(online);
      setMachines(machines);
    }
    return result;
  }

  const filtered = machines.filter(m =>
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.userBar}>
        <Text style={styles.userBarText}>
          Connecté: <Text style={{ fontWeight: "700" }}>{profile?.full_name ?? "—"}</Text>
          {profile?.role === "admin" && <Text style={styles.adminBadge}>  ADMIN</Text>}
        </Text>
        <Pressable onPress={signOut}><Text style={styles.signOut}>Déconnexion</Text></Pressable>
      </View>

      {online === false && (
        <View style={[styles.banner, { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }]}>
          <Text style={[styles.bannerText, { color: "#92400e" }]}>
            ⚠️ Hors ligne — vos inspections seront envoyées au retour du réseau.
          </Text>
        </View>
      )}

      {pendingCount > 0 && (
        <Pressable onPress={() => router.push("/pending")}>
          <View style={[styles.banner, { backgroundColor: "#dbeafe", borderColor: "#3b82f6" }]}>
            <Text style={[styles.bannerText, { color: "#1e40af", fontWeight: "600" }]}>
              📤 {pendingCount} inspection{pendingCount > 1 ? "s" : ""} en attente d'envoi — toucher pour voir
            </Text>
            {online && (
              <Pressable onPress={manualSync} style={styles.syncBtn} disabled={syncing}>
                {syncing
                  ? <ActivityIndicator size="small" color="#1e40af" />
                  : <Text style={{ color: "#1e40af", fontWeight: "700" }}>Synchroniser</Text>}
              </Pressable>
            )}
          </View>
        </Pressable>
      )}

      <Pressable style={styles.scanBtn} onPress={() => router.push("/scan")}>
        <Text style={styles.scanBtnText}>Scanner un QR code</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ou choisir une machine</Text>
        {fromCache && <Text style={styles.cacheLabel}>cache</Text>}
      </View>
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
  scanBtn: { backgroundColor: "#0f172a", padding: 20, borderRadius: 12, alignItems: "center" },
  scanBtnText: { color: "white", fontSize: 18, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#334155" },
  cacheLabel: { fontSize: 11, color: "#94a3b8", fontStyle: "italic" },
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
  userBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  userBarText: { color: "#334155", flex: 1 },
  adminBadge: { color: "#0ea5e9", fontWeight: "700", fontSize: 12 },
  signOut: { color: "#dc2626", fontWeight: "600" },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: { flex: 1 },
  syncBtn: { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
});
