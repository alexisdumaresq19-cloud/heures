import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const QR_BASE_URL =
  (import.meta.env.VITE_QR_BASE_URL as string) ?? window.location.origin;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Variables VITE_SUPABASE_* manquantes — vérifier .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Machine = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  year: number | null;
  site: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type Inspection = {
  id: string;
  machine_id: string;
  inspector_name: string;
  hours_meter: number | null;
  odometer_km: number | null;
  overall_status: "ok" | "minor_issues" | "major_issues" | "out_of_service";
  checklist: Record<string, string>;
  general_comments: string | null;
  inspected_at: string;
};

export const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  minor_issues: "Défauts mineurs",
  major_issues: "Défauts majeurs",
  out_of_service: "Hors service",
};

export const STATUS_BADGE: Record<string, string> = {
  ok: "badge-ok",
  minor_issues: "badge-minor",
  major_issues: "badge-major",
  out_of_service: "badge-out",
};
