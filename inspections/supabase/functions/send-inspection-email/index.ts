// Supabase Edge Function: envoie un courriel au bureau quand une nouvelle
// inspection est créée. Déclenchée par le trigger Postgres "trg_inspections_notify".
//
// Secrets requis:
//   RESEND_API_KEY  — clé API Resend (resend.com)
//   FROM_EMAIL      — adresse expéditrice vérifiée sur Resend
//   OFFICE_EMAIL    — adresse du bureau qui reçoit les inspections
//
// Déploiement:
//   supabase functions deploy send-inspection-email

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")!;
const OFFICE_EMAIL   = Deno.env.get("OFFICE_EMAIL")!;
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SEVERITY_LABEL: Record<string, string> = {
  minor:    "Mineur",
  major:    "Majeur",
  critical: "Critique",
};

const STATUS_LABEL: Record<string, string> = {
  ok:             "OK",
  minor_issues:   "Défauts mineurs",
  major_issues:   "Défauts majeurs",
  out_of_service: "Hors service",
};

const STATUS_COLOR: Record<string, string> = {
  ok:             "#16a34a",
  minor_issues:   "#ca8a04",
  major_issues:   "#ea580c",
  out_of_service: "#dc2626",
};

Deno.serve(async (req) => {
  try {
    const { inspection_id } = await req.json();
    if (!inspection_id) {
      return new Response(JSON.stringify({ error: "inspection_id requis" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: inspection, error: insErr } = await supabase
      .from("inspections")
      .select("*, machines(*), defects(*), inspection_photos(*)")
      .eq("id", inspection_id)
      .single();

    if (insErr || !inspection) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "introuvable" }), { status: 404 });
    }

    const machine = inspection.machines;
    const defects = inspection.defects ?? [];
    const photos  = inspection.inspection_photos ?? [];

    // URLs signées (1h) pour les photos
    const photoUrls: string[] = [];
    for (const p of photos) {
      const { data } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(p.storage_path, 60 * 60);
      if (data?.signedUrl) photoUrls.push(data.signedUrl);
    }

    const statusColor = STATUS_COLOR[inspection.overall_status] ?? "#64748b";
    const statusLabel = STATUS_LABEL[inspection.overall_status] ?? inspection.overall_status;

    const checklistRows = Object.entries(inspection.checklist ?? {})
      .map(([k, v]) => `<tr><td style="padding:4px 8px">${escape(k)}</td><td style="padding:4px 8px">${escape(String(v))}</td></tr>`)
      .join("");

    const defectsHtml = defects.length === 0
      ? "<p>Aucun défaut signalé.</p>"
      : defects.map((d: any) => `
          <li style="margin-bottom:8px">
            <strong>[${SEVERITY_LABEL[d.severity] ?? d.severity}]</strong>
            ${escape(d.category)} — ${escape(d.description)}
          </li>
        `).join("");

    const photosHtml = photoUrls.length === 0
      ? ""
      : `<h3>Photos</h3>` + photoUrls.map(u => `<img src="${u}" style="max-width:300px;margin:4px;border-radius:4px" />`).join("");

    const subject = `Inspection ${machine.code} — ${statusLabel}`;

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px">
        <h2>Nouvelle inspection — ${escape(machine.name)}</h2>
        <div style="background:${statusColor};color:white;display:inline-block;padding:4px 12px;border-radius:4px;font-weight:bold">
          ${statusLabel}
        </div>
        <table style="margin-top:16px;border-collapse:collapse">
          <tr><td style="padding:4px 8px"><strong>Machine</strong></td><td style="padding:4px 8px">${escape(machine.code)} — ${escape(machine.name)}</td></tr>
          <tr><td style="padding:4px 8px"><strong>Chantier</strong></td><td style="padding:4px 8px">${escape(machine.site ?? "—")}</td></tr>
          <tr><td style="padding:4px 8px"><strong>Inspecteur</strong></td><td style="padding:4px 8px">${escape(inspection.inspector_name)}</td></tr>
          <tr><td style="padding:4px 8px"><strong>Date</strong></td><td style="padding:4px 8px">${new Date(inspection.inspected_at).toLocaleString("fr-CA")}</td></tr>
          ${inspection.hours_meter != null ? `<tr><td style="padding:4px 8px"><strong>Heures moteur</strong></td><td style="padding:4px 8px">${inspection.hours_meter}</td></tr>` : ""}
          ${inspection.odometer_km != null ? `<tr><td style="padding:4px 8px"><strong>Kilométrage</strong></td><td style="padding:4px 8px">${inspection.odometer_km} km</td></tr>` : ""}
        </table>

        <h3>Vérifications</h3>
        <table style="border-collapse:collapse;border:1px solid #e2e8f0">
          ${checklistRows || "<tr><td>Aucune</td></tr>"}
        </table>

        <h3>Défauts (${defects.length})</h3>
        <ul>${defectsHtml}</ul>

        ${inspection.general_comments ? `<h3>Commentaires</h3><p>${escape(inspection.general_comments)}</p>` : ""}

        ${photosHtml}
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [OFFICE_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return new Response(JSON.stringify({ error: "resend failed", details: errBody }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
