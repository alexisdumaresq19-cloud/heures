import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Variables EXPO_PUBLIC_SUPABASE_* manquantes — vérifier .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type OverallStatus = "ok" | "minor_issues" | "major_issues" | "out_of_service";
export type DefectSeverity = "minor" | "major" | "critical";

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
};

export type Inspection = {
  id: string;
  machine_id: string;
  inspector_name: string;
  inspector_email: string | null;
  hours_meter: number | null;
  odometer_km: number | null;
  overall_status: OverallStatus;
  checklist: Record<string, string>;
  general_comments: string | null;
  inspected_at: string;
};

export type Defect = {
  id: string;
  inspection_id: string;
  category: string;
  severity: DefectSeverity;
  description: string;
};
