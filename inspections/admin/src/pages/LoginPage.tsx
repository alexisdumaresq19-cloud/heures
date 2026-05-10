import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(location.state?.from?.pathname ?? "/");
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto" }}>
      <h1 style={{ textAlign: "center" }}>Inspections QR</h1>
      <p style={{ textAlign: "center", color: "#64748b" }}>Console d'administration</p>

      <form className="card" onSubmit={submit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Courriel</div>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Mot de passe</div>
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
          {busy ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p style={{ textAlign: "center", color: "#94a3b8", marginTop: 24, fontSize: 13 }}>
        Les comptes employés se créent depuis l'application mobile.
        <br />
        Premier admin: créer un compte sur mobile, puis exécuter dans Supabase SQL:
        <br />
        <code style={{ fontSize: 12 }}>update profiles set role='admin' where id=...</code>
      </p>
    </div>
  );
}
