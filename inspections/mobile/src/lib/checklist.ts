// Items de la checklist d'inspection — adaptable selon les besoins.
// Pour personnaliser par type de machine, retourner une liste différente selon machine.type.

export type ChecklistItemValue = "ok" | "defaut" | "n/a";

export type ChecklistItem = {
  key: string;
  label: string;
};

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "freins",       label: "Freins" },
  { key: "huile",        label: "Niveau d'huile" },
  { key: "liquide",      label: "Liquide de refroidissement" },
  { key: "pneus",        label: "Pneus / chenilles" },
  { key: "lumieres",     label: "Lumières / phares" },
  { key: "klaxon",       label: "Klaxon" },
  { key: "ceinture",     label: "Ceinture de sécurité" },
  { key: "extincteur",   label: "Extincteur" },
  { key: "fuites",       label: "Absence de fuites" },
  { key: "hydraulique",  label: "Système hydraulique" },
  { key: "batterie",     label: "Batterie" },
  { key: "carrosserie",  label: "Carrosserie / structure" },
];
