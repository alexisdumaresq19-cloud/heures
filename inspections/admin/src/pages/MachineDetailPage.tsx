import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  QR_BASE_URL,
  STATUS_BADGE,
  STATUS_LABEL,
  supabase,
  type Inspection,
  type Machine,
} from "../lib/supabase";

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: m } = await supabase.from("machines").select("*").eq("id", id).maybeSingle();
      if (m) {
        setMachine(m as Machine);
        const { data: insp } = await supabase
          .from("inspections")
          .select("*")
          .eq("machine_id", id)
          .order("inspected_at", { ascending: false });
        if (insp) setInspections(insp as Inspection[]);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!machine || !qrRef.current) return;
    const url = `${QR_BASE_URL}/machine/${encodeURIComponent(machine.code)}`;
    QRCode.toCanvas(qrRef.current, url, { width: 300, margin: 2 });
  }, [machine]);

  function downloadQr() {
    if (!qrRef.current || !machine) return;
    const link = document.createElement("a");
    link.download = `qr-${machine.code}.png`;
    link.href = qrRef.current.toDataURL("image/png");
    link.click();
  }

  if (loading) return <p>Chargement...</p>;
  if (!machine) return <p>Machine introuvable.</p>;

  const qrPayload = `${QR_BASE_URL}/machine/${encodeURIComponent(machine.code)}`;

  return (
    <div>
      <Link to="/" className="no-print">← Retour</Link>
      <h1>{machine.code} — {machine.name}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card">
          <h3>Détails</h3>
          <table>
            <tbody>
              {machine.type && <tr><th>Type</th><td>{machine.type}</td></tr>}
              {machine.brand && <tr><th>Marque</th><td>{machine.brand}</td></tr>}
              {machine.model && <tr><th>Modèle</th><td>{machine.model}</td></tr>}
              {machine.serial_number && <tr><th>N° série</th><td>{machine.serial_number}</td></tr>}
              {machine.year && <tr><th>Année</th><td>{machine.year}</td></tr>}
              {machine.site && <tr><th>Chantier</th><td>{machine.site}</td></tr>}
            </tbody>
          </table>
          {machine.notes && <p style={{ marginTop: 12, color: "#64748b" }}>{machine.notes}</p>}
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <h3>Code QR à imprimer</h3>
          <canvas ref={qrRef} />
          <p style={{ fontSize: 12, color: "#64748b", wordBreak: "break-all" }}>{qrPayload}</p>
          <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn" onClick={downloadQr}>Télécharger PNG</button>
            <button className="btn btn-secondary" onClick={() => window.print()}>Imprimer</button>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Historique des inspections ({inspections.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Inspecteur</th>
              <th>Statut</th>
              <th>Heures moteur</th>
              <th>Km</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map(i => (
              <tr key={i.id}>
                <td><Link to={`/inspections/${i.id}`}>{new Date(i.inspected_at).toLocaleString("fr-CA")}</Link></td>
                <td>{i.inspector_name}</td>
                <td><span className={`badge ${STATUS_BADGE[i.overall_status]}`}>{STATUS_LABEL[i.overall_status]}</span></td>
                <td>{i.hours_meter ?? "—"}</td>
                <td>{i.odometer_km ?? "—"}</td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>Aucune inspection.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
