import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";

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
const SEVERITY_LABEL: Record<string, string> = {
  minor: "Mineur",
  major: "Majeur",
  critical: "Critique",
};

type Detail = {
  id: string;
  inspector_name: string;
  hours_meter: number | null;
  odometer_km: number | null;
  overall_status: string;
  checklist: Record<string, string>;
  general_comments: string | null;
  inspected_at: string;
  machines: { code: string; name: string; site: string | null };
  defects: { id: string; category: string; severity: string; description: string }[];
  inspection_photos: { id: string; storage_path: string; defect_id: string | null }[];
};

export default function InspectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [insp, setInsp] = useState<Detail | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("inspections")
        .select("*, machines(code,name,site), defects(*), inspection_photos(*)")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setInsp(data as Detail);
        const urls: Record<string, string> = {};
        for (const p of data.inspection_photos ?? []) {
          const { data: u } = await supabase.storage
            .from("inspection-photos")
            .createSignedUrl(p.storage_path, 60 * 60);
          if (u?.signedUrl) urls[p.id] = u.signedUrl;
        }
        setPhotoUrls(urls);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (!insp) return <Text style={{ padding: 24 }}>Inspection introuvable.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[insp.overall_status] ?? "#64748b" }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[insp.overall_status] ?? insp.overall_status}</Text>
        </View>
        <Text style={styles.code}>{insp.machines.code}</Text>
        <Text style={styles.name}>{insp.machines.name}</Text>
        {insp.machines.site && <Text style={styles.muted}>📍 {insp.machines.site}</Text>}
        <Text style={styles.muted}>Inspecteur: {insp.inspector_name}</Text>
        <Text style={styles.muted}>{new Date(insp.inspected_at).toLocaleString("fr-CA")}</Text>
        {insp.hours_meter != null && <Text style={styles.muted}>Heures moteur: {insp.hours_meter}</Text>}
        {insp.odometer_km != null && <Text style={styles.muted}>Kilométrage: {insp.odometer_km} km</Text>}
      </View>

      <Text style={styles.sectionTitle}>Vérifications</Text>
      <View style={styles.card}>
        {Object.entries(insp.checklist ?? {}).map(([k, v]) => (
          <View key={k} style={styles.checkRow}>
            <Text style={styles.checkLabel}>{k}</Text>
            <Text style={[styles.checkValue, v === "defaut" && { color: "#dc2626" }]}>{String(v)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Défauts ({insp.defects?.length ?? 0})</Text>
      {insp.defects?.map(d => {
        const photo = insp.inspection_photos.find(p => p.defect_id === d.id);
        return (
          <View key={d.id} style={styles.card}>
            <Text style={styles.defectSev}>[{SEVERITY_LABEL[d.severity] ?? d.severity}] {d.category}</Text>
            <Text style={{ marginTop: 4 }}>{d.description}</Text>
            {photo && photoUrls[photo.id] && (
              <Image source={{ uri: photoUrls[photo.id] }} style={styles.photo} />
            )}
          </View>
        );
      })}

      {insp.general_comments && (
        <>
          <Text style={styles.sectionTitle}>Commentaires</Text>
          <View style={styles.card}>
            <Text>{insp.general_comments}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 16 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  badgeText: { color: "white", fontWeight: "600" },
  code: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  name: { fontSize: 20, fontWeight: "700", marginTop: 2 },
  muted: { color: "#64748b", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: "white", padding: 12, borderRadius: 8, marginBottom: 8 },
  checkRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  checkLabel: { flex: 1 },
  checkValue: { fontWeight: "600", color: "#16a34a" },
  defectSev: { fontWeight: "700", color: "#dc2626" },
  photo: { width: "100%", height: 200, borderRadius: 6, marginTop: 8 },
});
