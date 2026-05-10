// Clés AsyncStorage centralisées pour le cache offline et la queue de sync.

export const STORAGE_KEYS = {
  machinesCache: "cache.machines.v1",
  inspectionsCache: (machineId: string) => `cache.inspections.${machineId}.v1`,
  outbox: "outbox.inspections.v1",
};

// Photos en attente d'envoi: copiées dans documentDirectory/pending-photos/
export const PENDING_PHOTOS_DIR = "pending-photos";
