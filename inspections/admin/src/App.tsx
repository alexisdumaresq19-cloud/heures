import { Link, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAdmin, RequireAuth, useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import MachinesPage from "./pages/MachinesPage";
import MachineDetailPage from "./pages/MachineDetailPage";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import NewMachinePage from "./pages/NewMachinePage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function AppShell() {
  const { profile, signOut } = useAuth();
  return (
    <div>
      <nav className="no-print" style={{
        background: "#0f172a",
        color: "white",
        padding: "12px 24px",
        display: "flex",
        gap: 24,
        alignItems: "center",
      }}>
        <strong style={{ fontSize: 18 }}>Inspections QR</strong>
        <Link to="/" style={{ color: "white" }}>Machines</Link>
        <Link to="/inspections" style={{ color: "white" }}>Inspections</Link>
        {profile?.role === "admin" && (
          <Link to="/users" style={{ color: "white" }}>Utilisateurs</Link>
        )}
        <span style={{ marginLeft: "auto", fontSize: 13 }}>
          {profile?.full_name ?? "—"} ({profile?.role ?? "?"})
        </span>
        <button className="btn btn-secondary" onClick={signOut}>Déconnexion</button>
      </nav>

      <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<MachinesPage />} />
          <Route path="/machines/new" element={<RequireAdmin><NewMachinePage /></RequireAdmin>} />
          <Route path="/machines/:id" element={<MachineDetailPage />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="/users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        </Routes>
      </main>
    </div>
  );
}
