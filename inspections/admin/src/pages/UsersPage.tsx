import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Row = {
  id: string;
  full_name: string | null;
  role: "admin" | "inspector";
  created_at: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setRows(data as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setRole(id: string, role: "admin" | "inspector") {
    setBusyId(id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    setBusyId(null);
    if (error) {
      alert("Erreur: " + error.message);
      return;
    }
    setRows(rs => rs.map(r => r.id === id ? { ...r, role } : r));
  }

  return (
    <div>
      <h1>Utilisateurs</h1>
      <p style={{ color: "#64748b" }}>
        Les nouveaux comptes se créent depuis l'app mobile. Promouvoir un employé en admin lui donne
        accès à cette console.
      </p>

      {loading ? <p>Chargement...</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.full_name ?? "—"}</td>
                  <td>
                    <span className={`badge ${r.role === "admin" ? "badge-major" : "badge-ok"}`}>
                      {r.role}
                    </span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString("fr-CA")}</td>
                  <td>
                    {r.role === "inspector" ? (
                      <button
                        className="btn"
                        disabled={busyId === r.id}
                        onClick={() => setRole(r.id, "admin")}
                      >
                        Promouvoir admin
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        disabled={busyId === r.id}
                        onClick={() => {
                          if (confirm("Retirer les droits admin?")) setRole(r.id, "inspector");
                        }}
                      >
                        Retirer admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "#94a3b8" }}>Aucun utilisateur.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
