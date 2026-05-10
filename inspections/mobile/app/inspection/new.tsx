import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { DEFAULT_CHECKLIST, type ChecklistItemValue } from "@/lib/checklist";
import { supabase, type DefectSeverity, type OverallStatus } from "@/lib/supabase";

type DefectDraft = {
  id: string;
  category: string;
  severity: DefectSeverity;
  description: string;
  photoUri?: string;
};

const STATUS_OPTIONS: { value: OverallStatus; label: string; color: string }[] = [
  { value: "ok", label: "OK", color: "#16a34a" },
  { value: "minor_issues", label: "Défauts mineurs", color: "#ca8a04" },
  { value: "major_issues", label: "Défauts majeurs", color: "#ea580c" },
  { value: "out_of_service", label: "Hors service", color: "#dc2626" },
];

const SEVERITY_OPTIONS: { value: DefectSeverity; label: string; color: string }[] = [
  { value: "minor", label: "Mineur", color: "#ca8a04" },
  { value: "major", label: "Majeur", color: "#ea580c" },
  { value: "critical", label: "Critique", color: "#dc2626" },
];

export default function NewInspection() {
  const { machineId, machineCode } = useLocalSearchParams<{ machineId: string; machineCode: string }>();
  const router = useRouter();
  const { session, profile } = useAuth();

  const [inspectorName, setInspectorName] = useState(profile?.full_name ?? "");
  const [hoursMeter, setHoursMeter] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [overallStatus, setOverallStatus] = useState<OverallStatus>("ok");
  const [checklist, setChecklist] = useState<Record<string, ChecklistItemValue>>({});
  const [defects, setDefects] = useState<DefectDraft[]>([]);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function setCheckItem(key: string, value: ChecklistItemValue) {
    setChecklist(prev => ({ ...prev, [key]: value }));
  }

  function addDefect() {
    setDefects(prev => [
      ...prev,
      { id: Math.random().toString(36).slice(2), category: "", severity: "minor", description: "" },
    ]);
  }

  function updateDefect(id: string, patch: Partial<DefectDraft>) {
    setDefects(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDefect(id: string) {
    setDefects(prev => prev.filter(d => d.id !== id));
  }

  async function pickPhotoForDefect(id: string) {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      updateDefect(id, { photoUri: result.assets[0].uri });
    }
  }

  async function uploadPhoto(uri: string, inspectionId: string): Promise<string | null> {
    try {
      const ext = uri.split(".").pop() ?? "jpg";
      const path = `${inspectionId}/${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const { error } = await supabase.storage
        .from("inspection-photos")
        .upload(path, bytes, { contentType: `image/${ext}`, upsert: false });

      if (error) {
        console.warn("Upload photo échoué:", error.message);
        return null;
      }
      return path;
    } catch (e) {
      console.warn("Erreur lecture photo:", e);
      return null;
    }
  }

  async function submit() {
    if (!inspectorName.trim()) {
      Alert.alert("Champ requis", "Entrer votre nom.");
      return;
    }
    setSubmitting(true);

    try {
      // 1. Créer l'inspection
      const { data: inspection, error: insErr } = await supabase
        .from("inspections")
        .insert({
          machine_id: machineId,
          inspector_id: session?.user.id ?? null,
          inspector_name: inspectorName.trim(),
          inspector_email: session?.user.email ?? null,
          hours_meter: hoursMeter ? Number(hoursMeter) : null,
          odometer_km: odometerKm ? Number(odometerKm) : null,
          overall_status: overallStatus,
          checklist,
          general_comments: comments.trim() || null,
        })
        .select()
        .single();

      if (insErr || !inspection) {
        throw new Error(insErr?.message ?? "Création inspection échouée");
      }

      // 2. Créer les défauts
      for (const d of defects) {
        if (!d.category.trim() || !d.description.trim()) continue;

        const { data: defect, error: dErr } = await supabase
          .from("defects")
          .insert({
            inspection_id: inspection.id,
            category: d.category.trim(),
            severity: d.severity,
            description: d.description.trim(),
          })
          .select()
          .single();

        if (dErr || !defect) continue;

        // 3. Uploader photo et lier au défaut
        if (d.photoUri) {
          const path = await uploadPhoto(d.photoUri, inspection.id);
          if (path) {
            await supabase.from("inspection_photos").insert({
              inspection_id: inspection.id,
              defect_id: defect.id,
              storage_path: path,
            });
          }
        }
      }

      Alert.alert("Inspection envoyée", `${machineCode} — envoyée au bureau.`);
      router.replace(`/machine/${machineCode}`);
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.machineLabel}>Machine: {machineCode}</Text>

      <Text style={styles.label}>Nom de l'inspecteur *</Text>
      <TextInput style={styles.input} value={inspectorName} onChangeText={setInspectorName} placeholder="Jean Tremblay" />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Heures moteur</Text>
          <TextInput style={styles.input} value={hoursMeter} onChangeText={setHoursMeter} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>Kilométrage</Text>
          <TextInput style={styles.input} value={odometerKm} onChangeText={setOdometerKm} keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.label}>État général</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => setOverallStatus(opt.value)}
            style={[
              styles.statusBtn,
              { borderColor: opt.color },
              overallStatus === opt.value && { backgroundColor: opt.color },
            ]}
          >
            <Text style={overallStatus === opt.value ? styles.statusBtnTextActive : { color: opt.color }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Vérifications</Text>
      {DEFAULT_CHECKLIST.map(item => (
        <View key={item.key} style={styles.checkRow}>
          <Text style={styles.checkLabel}>{item.label}</Text>
          <View style={styles.checkBtns}>
            {(["ok", "defaut", "n/a"] as ChecklistItemValue[]).map(v => (
              <Pressable
                key={v}
                onPress={() => setCheckItem(item.key, v)}
                style={[
                  styles.checkBtn,
                  checklist[item.key] === v && styles[`checkBtn_${v}` as keyof typeof styles] as any,
                ]}
              >
                <Text style={[styles.checkBtnText, checklist[item.key] === v && { color: "white" }]}>
                  {v === "ok" ? "OK" : v === "defaut" ? "Défaut" : "N/A"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Défauts ({defects.length})</Text>
        <Pressable onPress={addDefect} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Ajouter</Text>
        </Pressable>
      </View>

      {defects.map((d, i) => (
        <View key={d.id} style={styles.defectCard}>
          <View style={styles.sectionRow}>
            <Text style={styles.defectTitle}>Défaut #{i + 1}</Text>
            <Pressable onPress={() => removeDefect(d.id)}>
              <Text style={styles.removeText}>✕ Retirer</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Catégorie</Text>
          <TextInput
            style={styles.input}
            value={d.category}
            onChangeText={t => updateDefect(d.id, { category: t })}
            placeholder="ex: freins, hydraulique..."
          />

          <Text style={styles.label}>Sévérité</Text>
          <View style={styles.statusRow}>
            {SEVERITY_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => updateDefect(d.id, { severity: opt.value })}
                style={[
                  styles.statusBtn,
                  { borderColor: opt.color },
                  d.severity === opt.value && { backgroundColor: opt.color },
                ]}
              >
                <Text style={d.severity === opt.value ? styles.statusBtnTextActive : { color: opt.color }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={d.description}
            onChangeText={t => updateDefect(d.id, { description: t })}
            multiline
            placeholder="Décrire le défaut..."
          />

          <Pressable style={styles.photoBtn} onPress={() => pickPhotoForDefect(d.id)}>
            <Text style={styles.photoBtnText}>{d.photoUri ? "📷 Changer la photo" : "📷 Prendre une photo"}</Text>
          </Pressable>
          {d.photoUri && <Image source={{ uri: d.photoUri }} style={styles.photoPreview} />}
        </View>
      ))}

      <Text style={styles.label}>Commentaires généraux</Text>
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        value={comments}
        onChangeText={setComments}
        multiline
        placeholder="Notes supplémentaires..."
      />

      <Pressable
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitBtnText}>Envoyer au bureau</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  machineLabel: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  label: { fontWeight: "600", marginTop: 12, marginBottom: 4, color: "#334155" },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: { flexDirection: "row" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 16,
  },
  statusBtnTextActive: { color: "white", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8, color: "#0f172a" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  checkRow: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkLabel: { flex: 1, fontSize: 14 },
  checkBtns: { flexDirection: "row", gap: 4 },
  checkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1f5f9" },
  checkBtnText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  checkBtn_ok: { backgroundColor: "#16a34a" },
  checkBtn_defaut: { backgroundColor: "#ea580c" },
  "checkBtn_n/a": { backgroundColor: "#64748b" },
  addBtn: { backgroundColor: "#0ea5e9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: "white", fontWeight: "600" },
  defectCard: { backgroundColor: "white", padding: 12, borderRadius: 8, marginBottom: 12 },
  defectTitle: { fontWeight: "700" },
  removeText: { color: "#dc2626", fontWeight: "600" },
  photoBtn: {
    backgroundColor: "#e2e8f0",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  photoBtnText: { fontWeight: "600", color: "#334155" },
  photoPreview: { width: "100%", height: 200, borderRadius: 6, marginTop: 8 },
  submitBtn: {
    backgroundColor: "#0f172a",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
