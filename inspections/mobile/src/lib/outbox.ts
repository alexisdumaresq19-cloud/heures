// Outbox des inspections soumises hors ligne.
//
// Idée: on écrit toujours d'abord dans l'outbox (AsyncStorage + photos copiées
// dans documentDirectory). Ensuite, soit on sync immédiatement (si réseau),
// soit la sync se fera plus tard (foreground / retour réseau / bouton manuel).
//
// Avantages: comportement uniforme online/offline, jamais de perte de données.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { PENDING_PHOTOS_DIR, STORAGE_KEYS } from "./storage-keys";
import { supabase, type DefectSeverity, type OverallStatus } from "./supabase";

export type OutboxDefect = {
  category: string;
  severity: DefectSeverity;
  description: string;
  photoLocalPath?: string;  // chemin dans documentDirectory/PENDING_PHOTOS_DIR/
};

export type OutboxItem = {
  id: string;             // local id (uuid v4 généré côté client)
  machineId: string;
  machineCode: string;    // pour affichage dans la liste pending
  inspectorId: string | null;
  inspectorName: string;
  inspectorEmail: string | null;
  hoursMeter: number | null;
  odometerKm: number | null;
  overallStatus: OverallStatus;
  checklist: Record<string, string>;
  generalComments: string | null;
  defects: OutboxDefect[];
  createdAt: string;      // ISO
  attempts: number;
  lastError?: string;
};

// =========================================================================
// Lecture / écriture de l'outbox
// =========================================================================

export async function getOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.outbox);
  return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
}

async function saveOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.outbox, JSON.stringify(items));
}

export async function getOutboxCount(): Promise<number> {
  return (await getOutbox()).length;
}

export async function enqueue(item: Omit<OutboxItem, "id" | "createdAt" | "attempts">): Promise<OutboxItem> {
  const newItem: OutboxItem = {
    ...item,
    id: generateLocalId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const current = await getOutbox();
  current.push(newItem);
  await saveOutbox(current);
  return newItem;
}

export async function removeFromOutbox(id: string): Promise<void> {
  const current = await getOutbox();
  const remaining = current.filter(i => i.id !== id);
  await saveOutbox(remaining);
}

// =========================================================================
// Persistance des photos: copiées dans documentDirectory pour ne pas être
// effacées par le système. Retourne le chemin stable.
// =========================================================================

async function ensurePhotosDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}${PENDING_PHOTOS_DIR}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export async function persistPhoto(sourceUri: string): Promise<string> {
  const dir = await ensurePhotosDir();
  const ext = sourceUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const dest = `${dir}${generateLocalId()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

async function deletePhoto(path: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // ignore
  }
}

// =========================================================================
// Synchronisation: traite tous les items de l'outbox jusqu'au premier échec.
// =========================================================================

let syncRunning = false;

export async function syncOutbox(): Promise<{ sent: number; failed: number }> {
  if (syncRunning) return { sent: 0, failed: 0 };
  syncRunning = true;
  let sent = 0;
  let failed = 0;
  try {
    const items = await getOutbox();
    for (const item of items) {
      try {
        await sendOne(item);
        await removeFromOutbox(item.id);
        sent++;
      } catch (e: any) {
        failed++;
        await markAttempt(item.id, e?.message ?? String(e));
        // Ne bloque pas: on continue avec le suivant.
      }
    }
  } finally {
    syncRunning = false;
  }
  return { sent, failed };
}

async function markAttempt(id: string, errMsg: string): Promise<void> {
  const items = await getOutbox();
  const updated = items.map(i =>
    i.id === id ? { ...i, attempts: i.attempts + 1, lastError: errMsg } : i,
  );
  await saveOutbox(updated);
}

async function sendOne(item: OutboxItem): Promise<void> {
  // 1. Insert l'inspection
  const { data: inspection, error: insErr } = await supabase
    .from("inspections")
    .insert({
      machine_id: item.machineId,
      inspector_id: item.inspectorId,
      inspector_name: item.inspectorName,
      inspector_email: item.inspectorEmail,
      hours_meter: item.hoursMeter,
      odometer_km: item.odometerKm,
      overall_status: item.overallStatus,
      checklist: item.checklist,
      general_comments: item.generalComments,
      inspected_at: item.createdAt,  // garde la date de saisie terrain
    })
    .select()
    .single();

  if (insErr || !inspection) {
    throw new Error(insErr?.message ?? "insert inspection failed");
  }

  // 2. Insert les défauts + upload des photos
  for (const d of item.defects) {
    const { data: defect, error: dErr } = await supabase
      .from("defects")
      .insert({
        inspection_id: inspection.id,
        category: d.category,
        severity: d.severity,
        description: d.description,
      })
      .select()
      .single();

    if (dErr || !defect) {
      throw new Error(dErr?.message ?? "insert defect failed");
    }

    if (d.photoLocalPath) {
      const path = await uploadPhoto(d.photoLocalPath, inspection.id);
      if (path) {
        await supabase.from("inspection_photos").insert({
          inspection_id: inspection.id,
          defect_id: defect.id,
          storage_path: path,
        });
        await deletePhoto(d.photoLocalPath);
      } else {
        throw new Error("upload photo failed");
      }
    }
  }
}

async function uploadPhoto(localPath: string, inspectionId: string): Promise<string | null> {
  try {
    const ext = localPath.split(".").pop() ?? "jpg";
    const path = `${inspectionId}/${Date.now()}.${ext}`;
    const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const { error } = await supabase.storage
      .from("inspection-photos")
      .upload(path, bytes, { contentType: `image/${ext}`, upsert: false });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

// =========================================================================
// Helpers
// =========================================================================

function generateLocalId(): string {
  // RFC4122 v4 simplifié — suffisant pour des IDs locaux.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
