// Cache lecture-seule (machines + dernières inspections par machine).
// On rafraîchit dès qu'on a du réseau; en l'absence de réseau on lit le cache.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, type Inspection, type Machine } from "./supabase";
import { STORAGE_KEYS } from "./storage-keys";

export async function getCachedMachines(): Promise<Machine[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.machinesCache);
  return raw ? (JSON.parse(raw) as Machine[]) : [];
}

export async function refreshMachinesCache(): Promise<Machine[]> {
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .eq("is_active", true)
    .order("code");
  if (error || !data) throw error ?? new Error("Cache machines: pas de données");
  await AsyncStorage.setItem(STORAGE_KEYS.machinesCache, JSON.stringify(data));
  return data as Machine[];
}

// Charge depuis le réseau si possible, sinon depuis le cache. Toujours retourne quelque chose.
export async function loadMachines(online: boolean | null): Promise<{ machines: Machine[]; fromCache: boolean }> {
  if (online !== false) {
    try {
      const machines = await refreshMachinesCache();
      return { machines, fromCache: false };
    } catch {
      const machines = await getCachedMachines();
      return { machines, fromCache: true };
    }
  }
  const machines = await getCachedMachines();
  return { machines, fromCache: true };
}

export async function getCachedInspections(machineId: string): Promise<Inspection[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.inspectionsCache(machineId));
  return raw ? (JSON.parse(raw) as Inspection[]) : [];
}

export async function refreshInspectionsCache(machineId: string): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from("inspections")
    .select("*")
    .eq("machine_id", machineId)
    .order("inspected_at", { ascending: false })
    .limit(50);
  if (error || !data) throw error ?? new Error("Cache inspections: pas de données");
  await AsyncStorage.setItem(STORAGE_KEYS.inspectionsCache(machineId), JSON.stringify(data));
  return data as Inspection[];
}

export async function loadInspections(
  machineId: string,
  online: boolean | null,
): Promise<{ inspections: Inspection[]; fromCache: boolean }> {
  if (online !== false) {
    try {
      const inspections = await refreshInspectionsCache(machineId);
      return { inspections, fromCache: false };
    } catch {
      const inspections = await getCachedInspections(machineId);
      return { inspections, fromCache: true };
    }
  }
  const inspections = await getCachedInspections(machineId);
  return { inspections, fromCache: true };
}
