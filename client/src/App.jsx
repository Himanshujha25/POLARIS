import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Command from './pages/Command';
import Expeditions from './pages/Expeditions';
import ExpeditionDetail from './pages/ExpeditionDetail';
import Cargo from './pages/Cargo';
import Inventory from './pages/Inventory';
import Personnel from './pages/Personnel';
import Assets from './pages/Assets';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import Locations from './pages/Locations';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import { Spinner } from './components/ui';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-full items-center justify-center bg-slate-100 dark:bg-[#0B111E]"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/command" replace />;
  return <Layout>{children}</Layout>;
}

// PRD Section 5 role scopes
const SA = 'SuperAdmin', EM = 'ExpeditionManager', LO = 'LogisticsOfficer',
  IO = 'InventoryOfficer', PO = 'PersonnelOfficer', AO = 'AssetOfficer', EO = 'EmergencyOfficer';
const ALL = [SA, EM, LO, IO, PO, AO, EO];

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Landing />} />
            <Route path="/command" element={<Protected><Command /></Protected>} />
            <Route path="/expeditions" element={<Protected roles={ALL}><Expeditions /></Protected>} />
            <Route path="/expeditions/:id" element={<Protected roles={ALL}><ExpeditionDetail /></Protected>} />
            <Route path="/locations" element={<Protected roles={[SA, EM, LO]}><Locations /></Protected>} />
            <Route path="/cargo" element={<Protected roles={[SA, EM, LO]}><Cargo /></Protected>} />
            <Route path="/inventory" element={<Protected roles={[SA, EM, IO]}><Inventory /></Protected>} />
            <Route path="/personnel" element={<Protected roles={[SA, EM, PO]}><Personnel /></Protected>} />
            <Route path="/assets" element={<Protected roles={[SA, EM, AO]}><Assets /></Protected>} />
            <Route path="/incidents" element={<Protected roles={[SA, EM, EO]}><Incidents /></Protected>} />
            <Route path="/incidents/:id" element={<Protected roles={[SA, EM, EO]}><IncidentDetail /></Protected>} />
            <Route path="/map" element={<Protected><MapView /></Protected>} />
            <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />
            <Route path="/analytics" element={<Protected roles={[SA, EM]}><Analytics /></Protected>} />
            <Route path="/audit" element={<Protected roles={[SA, EM]}><AuditLogs /></Protected>} />
            <Route path="/users" element={<Protected roles={[SA]}><Users /></Protected>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
