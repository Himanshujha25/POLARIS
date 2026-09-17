import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import CargoDashboard from './dashboards/CargoDashboard';
import InventoryDashboard from './dashboards/InventoryDashboard';
import EmergencyDashboard from './dashboards/EmergencyDashboard';
import Personnel from './Personnel';
import Assets from './Assets';

// PRD Section 5 persona → command view mapping
export default function Command() {
  const { user } = useAuth();
  if (user?.role === 'LogisticsOfficer') return <CargoDashboard />;
  if (user?.role === 'InventoryOfficer') return <InventoryDashboard />;
  if (user?.role === 'PersonnelOfficer') return <Personnel />;
  if (user?.role === 'AssetOfficer') return <Assets />;
  if (user?.role === 'EmergencyOfficer') return <EmergencyDashboard />;
  return <Dashboard />; // SuperAdmin + ExpeditionManager: full mission overview
}
