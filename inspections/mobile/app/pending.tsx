import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNetwork } from "@/lib/network";
import { getOutbox, removeFromOutbox, syncOutbox, type OutboxItem } from "@/lib/outbox";

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  minor_issues: "Défauts mineurs",
  major_issues: "Défauts majeurs",
  out_of_service: "Hors service",
};

export default function PendingScreen() {
  const { online } = useNetwork();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await getOutbox());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  async function sync() {
    setSyncing(true);
    const r = await syncOutbox();
    setSyncing(false);
    await refresh();
    Alert.alert(
      "Synchronisation",
      `${r.sent} envoyée${r.sent > 1 ? "s" : ""}, ${r.failed} en échec.`,
    );
  }

  function confirmDelete(id: string) {
    Alert.alert(
      "Supprimer cette inspection?",
      "Cette inspection ne sera pas envoyée. Action irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await removeFromOutbox(id);
            await refresh();
          },
        },
      ],
    );
  }

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune inspection en attente</Text>
          <Text style={styles.emptySub}>Tout est envoyé au bureau.</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerCount}>
              {items.length} en attente
            </Text>
            <Pressable
              style={[styles.syncBtn, (online === false || syncing) && { opacity: 0.5 }]}
              onPress={sync}
              disabled={online === false || syncing}
            >
              {syncing ? <ActivityIndicator color="white" /> : <Text style={styles.syncBtnText}>Synchroniser</Text>}
            </Pressable>
          </View>

          {online === false && (
            <Text style={styles.offline}>Pas de réseau — la sync n'est pas possible maintenant.</Text>
          )}

          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.machineCode}>{item.machineCode}</Text>
                  <Text style={styles.status}>{STATUS_LABEL[item.overallStatus] ?? item.overallStatus}</Text>
                  <Text style={styles.muted}>
                    {new Date(item.createdAt).toLocaleString("fr-CA")}
                  </Text>
                  <Text style={styles.muted}>
                    Inspecteur: {item.inspectorName}
                    {item.defects.length > 0 && ` · ${item.defects.length} défaut(s)`}
                  </Text>
                  {item.attempts > 0 && (
                    <Text style={styles.error}>
                      Échec ×{item.attempts}{item.lastError ? `: ${item.lastError}` : ""}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => confirmDelete(item.id)}>
                  <Text style={styles.delete}>✕</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#334155" },
  emptySub: { color: "#94a3b8", marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerCount: { flex: 1, fontSize: 16, fontWeight: "600" },
  syncBtn: { backgroundColor: "#0ea5e9", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  syncBtnText: { color: "white", fontWeight: "600" },
  offline: { color: "#92400e", marginBottom: 12 },
  card: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  machineCode: { fontWeight: "700", fontSize: 16 },
  status: { color: "#0f172a", marginTop: 2 },
  muted: { color: "#64748b", fontSize: 13, marginTop: 2 },
  error: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  delete: { color: "#dc2626", fontSize: 22, paddingHorizontal: 12 },
});
