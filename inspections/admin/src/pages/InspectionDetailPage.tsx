import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { STATUS_BADGE, STATUS_LABEL, supabase } from "../lib/supabase";

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
  machines: { id: string; code: string; name: string; site: string | null };
  defects: { id: string; category: string; severity: string; description: string }[];
  inspection_photos: { id: string; storage_path: string; defect_id: string | null }[];
};

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [insp, setInsp] = useState<Detail | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("inspections")
        .select("*, machines(id,code,name,site), defects(*), inspection_photos(*)")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setInsp(data as unknown as Detail);
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

  if (loading) return <p>Chargement...</p>;
  if (!insp) return <p>Inspection introuvable.</p>;

  return (
    <div>
      <Link to="/inspections" className="no-print">← Retour</Link>
      <h1>
        Inspection — <Link to={`/machines/${insp.machines.id}`}>{insp.machines.code}</Link>{" "}
        <span className={`badge ${STATUS_BADGE[insp.overall_status]}`}>{STATUS_LABEL[insp.overall_status]}</span>
      </h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <table>
          <tbody>
            <tr><th>Machine</th><td>{insp.machines.code} — {insp.machines.name}</td></tr>
            {insp.machines.site && <tr><th>Chantier</th><td>{insp.machines.site}</td></tr>}
            <tr><th>Inspecteur</th><td>{insp.inspector_name}</td></tr>
            <tr><th>Date</th><td>{new Date(insp.inspected_at).toLocaleString("fr-CA")}</td></tr>
            {insp.hours_meter != null && <tr><th>Heures moteur</th><td>{insp.hours_meter}</td></tr>}
            {insp.odometer_km != null && <tr><th>Kilométrage</th><td>{insp.odometer_km} km</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Vérifications</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <table>
          <tbody>
            {Object.entries(insp.checklist ?? {}).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td style={{ color: v === "defaut" ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Défauts ({insp.defects?.length ?? 0})</h2>
      {insp.defects?.map(d => {
        const photo = insp.inspection_photos.find(p => p.defect_id === d.id);
        return (
          <div className="card" style={{ marginBottom: 12 }} key={d.id}>
            <strong style={{ color: "#dc2626" }}>[{SEVERITY_LABEL[d.severity]}]</strong> {d.category}
            <p>{d.description}</p>
            {photo && photoUrls[photo.id] && (
              <img src={photoUrls[photo.id]} alt="" style={{ maxWidth: 400, borderRadius: 6 }} />
            )}
          </div>
        );
      })}
      {(!insp.defects || insp.defects.length === 0) && <p>Aucun défaut signalé.</p>}

      {insp.general_comments && (
        <>
          <h2>Commentaires</h2>
          <div className="card"><p>{insp.general_comments}</p></div>
        </>
      )}
    </div>
  );
}
