import { Link, Route, Routes } from "react-router-dom";
import MachinesPage from "./pages/MachinesPage";
import MachineDetailPage from "./pages/MachineDetailPage";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import NewMachinePage from "./pages/NewMachinePage";

export default function App() {
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
      </nav>

      <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<MachinesPage />} />
          <Route path="/machines/new" element={<NewMachinePage />} />
          <Route path="/machines/:id" element={<MachineDetailPage />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
