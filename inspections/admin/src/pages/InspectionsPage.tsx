import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STATUS_BADGE, STATUS_LABEL, supabase } from "../lib/supabase";

type InspectionRow = {
  id: string;
  inspector_name: string;
  hours_meter: number | null;
  overall_status: string;
  inspected_at: string;
  machines: { id: string; code: string; name: string; site: string | null };
};

export default function InspectionsPage() {
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    let q = supabase
      .from("inspections")
      .select("id, inspector_name, hours_meter, overall_status, inspected_at, machines(id,code,name,site)")
      .order("inspected_at", { ascending: false })
      .limit(200);
    if (statusFilter) q = q.eq("overall_status", statusFilter);
    q.then(({ data }) => {
      if (data) setRows(data as unknown as InspectionRow[]);
      setLoading(false);
    });
  }, [statusFilter]);

  return (
    <div>
      <h1>Inspections</h1>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <label>Filtrer:&nbsp;</label>
        <select className="input" style={{ width: "auto" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous</option>
          <option value="ok">OK</option>
          <option value="minor_issues">Défauts mineurs</option>
          <option value="major_issues">Défauts majeurs</option>
          <option value="out_of_service">Hors service</option>
        </select>
      </div>

      {loading ? <p>Chargement...</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Machine</th>
                <th>Inspecteur</th>
                <th>Chantier</th>
                <th>Statut</th>
                <th>Heures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><Link to={`/inspections/${r.id}`}>{new Date(r.inspected_at).toLocaleString("fr-CA")}</Link></td>
                  <td><Link to={`/machines/${r.machines.id}`}>{r.machines.code}</Link> — {r.machines.name}</td>
                  <td>{r.inspector_name}</td>
                  <td>{r.machines.site ?? "—"}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.overall_status]}`}>{STATUS_LABEL[r.overall_status]}</span></td>
                  <td>{r.hours_meter ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>Aucune inspection.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
