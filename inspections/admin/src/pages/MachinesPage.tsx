import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase, type Machine } from "../lib/supabase";

export default function MachinesPage() {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("machines")
      .select("*")
      .order("code")
      .then(({ data }) => {
        if (data) setMachines(data as Machine[]);
        setLoading(false);
      });
  }, []);

  const filtered = machines.filter(m =>
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.site ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1>Machines</h1>
        {profile?.role === "admin" && (
          <Link to="/machines/new" className="btn" style={{ alignSelf: "center" }}>
            + Nouvelle machine
          </Link>
        )}
      </div>

      <input
        className="input"
        placeholder="Rechercher par code, nom ou chantier..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {loading ? <p>Chargement...</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Type</th>
                <th>Chantier</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td><Link to={`/machines/${m.id}`}><strong>{m.code}</strong></Link></td>
                  <td>{m.name}</td>
                  <td>{m.type ?? "—"}</td>
                  <td>{m.site ?? "—"}</td>
                  <td>{m.is_active ? "Actif" : "Inactif"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>Aucune machine.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
