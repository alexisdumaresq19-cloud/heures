import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function NewMachinePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "",
    brand: "",
    model: "",
    serial_number: "",
    year: "",
    site: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { data, error } = await supabase
      .from("machines")
      .insert({
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        year: form.year ? Number(form.year) : null,
        site: form.site.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/machines/${data.id}`);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1>Nouvelle machine</h1>
      <form className="card" onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code (unique) *">
            <input className="input" required value={form.code} onChange={e => update("code", e.target.value)} placeholder="EXC-001" />
          </Field>
          <Field label="Nom *">
            <input className="input" required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Excavatrice Cat 320" />
          </Field>
          <Field label="Type">
            <input className="input" value={form.type} onChange={e => update("type", e.target.value)} placeholder="excavatrice" />
          </Field>
          <Field label="Marque">
            <input className="input" value={form.brand} onChange={e => update("brand", e.target.value)} placeholder="Caterpillar" />
          </Field>
          <Field label="Modèle">
            <input className="input" value={form.model} onChange={e => update("model", e.target.value)} placeholder="320" />
          </Field>
          <Field label="N° de série">
            <input className="input" value={form.serial_number} onChange={e => update("serial_number", e.target.value)} />
          </Field>
          <Field label="Année">
            <input className="input" type="number" value={form.year} onChange={e => update("year", e.target.value)} />
          </Field>
          <Field label="Chantier">
            <input className="input" value={form.site} onChange={e => update("site", e.target.value)} placeholder="Chantier A" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" rows={3} value={form.notes} onChange={e => update("notes", e.target.value)} />
        </Field>

        {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer la machine"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
