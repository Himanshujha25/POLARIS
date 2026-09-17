import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Users, Package, Wrench, Activity, Heart, Thermometer, Battery,
  ShieldAlert, CheckCircle2, Clock, AlertTriangle, Plus, Trash2,
  ChevronRight, ArrowLeft, RefreshCw, Truck, Shield, FileText, Check
} from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import {
  Card, StatCard, Pill, Spinner, Empty, Modal, Field, TableWrap,
  Th, Td, inputCls, btnPrimary, btnGhost, btnDanger, ErrorNote, ConfirmDialog
} from '../components/ui';

const TABS = [
  { id: 'overview', label: 'Overview & Readiness', icon: Activity },
  { id: 'team', label: 'Team Roster', icon: Users },
  { id: 'medical', label: 'Medical & Vitals', icon: Heart },
  { id: 'cargo', label: 'Cargo & Manifest', icon: Package },
  { id: 'assets', label: 'Assets & Gear', icon: Wrench },
  { id: 'supplies', label: 'Supplies / Quota', icon: FileText },
  { id: 'timeline', label: 'Timeline', icon: Clock }
];

const REQ_CATS = ['Provisions', 'HazardousFuel', 'ScientificInstruments', 'HeavySpares', 'MedicalLifeSupport'];
const CARGO_CATS = ['ScientificInstruments', 'HazardousFuel', 'Provisions', 'HeavySpares', 'MedicalLifeSupport'];
const CARGO_NODES = ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station'];
const PERSONNEL_STATUSES = ['StationHab', 'FieldResearch', 'InTransit', 'MedicalQuarantine', 'SOS_Alert', 'Returned'];
const EXPEDITION_STATUSES = ['Draft', 'Planning', 'Ready', 'Deployed', 'Active', 'Returning', 'InTransit', 'ActiveOnStation', 'Completed', 'Cancelled'];

export default function ExpeditionDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [d, setD] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [readiness, setReadiness] = useState(null);
  const [movements, setMovements] = useState([]);
  const [events, setEvents] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [stationAssets, setStationAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', badgeId: '', roleTitle: '', assignedFieldZone: 'Zone 1 - Main Station', currentStatus: 'StationHab' });

  const [showVitalsModal, setShowVitalsModal] = useState(null);
  const [vitalsForm, setVitalsForm] = useState({ heartRate: 75, bodyTempC: 36.8, batteryLevelPercent: 95 });

  const [showCheckinModal, setShowCheckinModal] = useState(null);
  const [checkinForm, setCheckinForm] = useState({ status: 'StationHab', location: '' });

  const [showAddCargo, setShowAddCargo] = useState(false);
  const [cargoForm, setCargoForm] = useState({ trackingNumber: '', title: '', category: 'Provisions', weightKg: 250, isHazmat: false, transportMode: 'VesselCargo', currentNode: 'NCPOR_Goa' });

  const [showAssignAsset, setShowAssignAsset] = useState(false);

  const [showAddReq, setShowAddReq] = useState(false);
  const [reqForm, setReqForm] = useState({ item: '', category: 'Provisions', requiredQty: 100, unit: 'Units', priority: 'P2' });

  const [confirmDelete, setConfirmDelete] = useState(null);

  const canEdit = ['SuperAdmin', 'ExpeditionManager'].includes(user?.role);
  const canLogistics = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'].includes(user?.role);
  const canMedical = ['SuperAdmin', 'ExpeditionManager', 'PersonnelOfficer', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
    try {
      const [expData, rd, movs, usersList] = await Promise.all([
        api(`/api/v1/expeditions/${id}`),
        api(`/api/v1/requirements/readiness/${id}`).catch(() => null),
        api(`/api/v1/personnel/movements?expeditionId=${id}`).catch(() => []),
        api('/api/v1/auth/users').catch(() => [])
      ]);
      setD(expData);
      setReadiness(rd);
      setMovements(movs);
      setSystemUsers(usersList || []);

      // Load station unassigned assets
      if (expData?.expedition?.targetStation) {
        const rawStation = expData.expedition.targetStation.replace(' Station', '');
        const stAssets = await api(`/api/v1/assets?station=${rawStation}`).catch(() => []);
        setStationAssets(stAssets || []);
      }

      // Load cargo timeline
      const cargoList = expData?.cargo || [];
      const evs = await Promise.all(cargoList.map(c => api(`/api/v1/cargo/${c._id}/timeline`).catch(() => [])));
      setEvents(evs.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 40));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useLiveRefresh(load);

  // --- Handlers ---
  const handleStatusChange = async (newStatus) => {
    try {
      await api(`/api/v1/expeditions/${id}`, { method: 'PATCH', body: { status: newStatus } });
      load();
    } catch (err) { alert(err.message); }
  };

  // Team
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/personnel', {
        method: 'POST',
        body: {
          ...memberForm,
          expeditionId: id,
          currentLocation: d?.expedition?.targetStation || 'Bharati Station'
        }
      });
      setShowAddMember(false);
      setMemberForm({ userId: '', badgeId: '', roleTitle: '', assignedFieldZone: 'Zone 1 - Main Station', currentStatus: 'StationHab' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleRemoveMember = async (personnelId) => {
    try {
      await api(`/api/v1/personnel/${personnelId}`, { method: 'DELETE' });
      setConfirmDelete(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!showCheckinModal) return;
    try {
      await api('/api/v1/personnel/checkin', {
        method: 'POST',
        body: {
          personnelId: showCheckinModal._id,
          status: checkinForm.status,
          location: checkinForm.location
        }
      });
      setShowCheckinModal(null);
      load();
    } catch (err) { alert(err.message); }
  };

  // Medical / Vitals
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!showVitalsModal) return;
    try {
      await api(`/api/v1/personnel/${showVitalsModal._id}`, {
        method: 'PATCH',
        body: {
          vitals: {
            heartRate: Number(vitalsForm.heartRate),
            bodyTempC: Number(vitalsForm.bodyTempC),
            batteryLevelPercent: Number(vitalsForm.batteryLevelPercent)
          }
        }
      });
      setShowVitalsModal(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const toggleQuarantine = async (personnel) => {
    const nextStatus = personnel.currentStatus === 'MedicalQuarantine' ? 'StationHab' : 'MedicalQuarantine';
    try {
      await api(`/api/v1/personnel/${personnel._id}`, {
        method: 'PATCH',
        body: { currentStatus: nextStatus }
      });
      load();
    } catch (err) { alert(err.message); }
  };

  // Cargo
  const handleAddCargo = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/cargo', {
        method: 'POST',
        body: {
          ...cargoForm,
          expeditionId: id,
          weightKg: Number(cargoForm.weightKg),
          currentLocation: cargoForm.currentNode.replace(/_/g, ' ')
        }
      });
      setShowAddCargo(false);
      setCargoForm({ trackingNumber: '', title: '', category: 'Provisions', weightKg: 250, isHazmat: false, transportMode: 'VesselCargo', currentNode: 'NCPOR_Goa' });
      load();
    } catch (err) { setError(err.message); }
  };

  const advanceCargoNode = async (cargo) => {
    const idx = CARGO_NODES.indexOf(cargo.currentNode);
    if (idx < CARGO_NODES.length - 1) {
      const nextNode = CARGO_NODES[idx + 1];
      const isFinal = idx + 1 === CARGO_NODES.length - 1;
      try {
        await api(`/api/v1/cargo/${cargo._id}/stage`, {
          method: 'PATCH',
          body: {
            node: nextNode,
            location: nextNode.replace(/_/g, ' '),
            status: isFinal ? 'DeliveredStation' : 'InTransit'
          }
        });
        load();
      } catch (err) { alert(err.message); }
    }
  };

  // Assets
  const handleAssignAsset = async (assetId) => {
    try {
      await api(`/api/v1/assets/${assetId}`, {
        method: 'PATCH',
        body: { expeditionId: id }
      });
      setShowAssignAsset(false);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleUnassignAsset = async (assetId) => {
    try {
      await api(`/api/v1/assets/${assetId}`, {
        method: 'PATCH',
        body: { expeditionId: null }
      });
      load();
    } catch (err) { alert(err.message); }
  };

  // Requirements
  const handleAddReq = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/requirements', {
        method: 'POST',
        body: { ...reqForm, expeditionId: id, requiredQty: Number(reqForm.requiredQty) }
      });
      setShowAddReq(false);
      setReqForm({ item: '', category: 'Provisions', requiredQty: 100, unit: 'Units', priority: 'P2' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDeleteReq = async (reqId) => {
    try {
      await api(`/api/v1/requirements/${reqId}`, { method: 'DELETE' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleReceiveReq = async (r) => {
    const added = prompt(`Record received quantity for "${r.item}" (Currently received: ${r.receivedQty} / ${r.requiredQty} ${r.unit}):`, r.pendingQty);
    if (added === null) return;
    const val = Number(added);
    if (isNaN(val) || val <= 0) return;
    try {
      await api(`/api/v1/requirements/${r._id}`, {
        method: 'PATCH',
        body: { receivedQty: Math.min(r.requiredQty, r.receivedQty + val) }
      });
      load();
    } catch (err) { alert(err.message); }
  };

  if (loading || !d) return <Spinner />;

  const { expedition: exp, personnel = [], cargo = [], assets = [], requirements: reqs = [] } = d;

  const bar = (pct, color = 'cyan') => (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/80">
      <div
        className={`h-full transition-all duration-500 ${
          color === 'cyan'
            ? pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-cyan-500' : 'bg-amber-500'
            : color
        }`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link to="/expeditions" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400 mb-2">
          <ArrowLeft size={14} /> Back to All Expeditions
        </Link>
        <Card className="p-5 border-l-4 border-l-cyan-500">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-xs font-black tracking-wider text-cyan-600 dark:text-cyan-400">
                  {exp.expeditionCode}
                </span>
                <Pill value={exp.status} />
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{exp.title}</h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>🎯 Target Station: <b>{exp.targetStation}</b></span>
                <span>❄️ Season: <b>{exp.season}</b></span>
                <span>👤 Commander: <b>{exp.leaderId?.fullName || 'Unassigned'}</b></span>
              </p>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Mission Status:</span>
                <select
                  className={`${inputCls} !py-1 !px-2 text-xs font-semibold w-auto`}
                  value={exp.status}
                  onChange={e => handleStatusChange(e.target.value)}
                >
                  {EXPEDITION_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Unified Mission Navigation Tabs */}
          <div className="mt-5 flex gap-1 overflow-x-auto border-t border-slate-100 pt-3 dark:border-slate-800">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              let badge = null;
              if (t.id === 'team') badge = personnel.length;
              if (t.id === 'cargo') badge = cargo.length;
              if (t.id === 'assets') badge = assets.length;
              if (t.id === 'supplies') badge = reqs.length;

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                  {badge !== null && (
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ================= TAB: OVERVIEW & READINESS ================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Quick Metrics Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Mission Crew"
              value={`${personnel.length} / ${exp.totalPersonnelQuota || 35}`}
              sub={personnel.length >= (exp.totalPersonnelQuota || 35) ? 'Quota Filled' : `${(exp.totalPersonnelQuota || 35) - personnel.length} seats open`}
              icon={<Users size={20} />}
            />
            <StatCard
              label="Cargo Manifest"
              value={`${cargo.length} Shipments`}
              sub={`${cargo.reduce((s, c) => s + (c.weightKg || 0), 0).toLocaleString()} kg total weight`}
              icon={<Package size={20} />}
            />
            <StatCard
              label="Assigned Assets"
              value={`${assets.length} Units`}
              sub={`${assets.filter(a => a.condition === 'Operational').length} operational on ice`}
              icon={<Wrench size={20} />}
            />
            <StatCard
              label="Supplies Readiness"
              value={readiness ? `${readiness.overall}%` : 'Calculating…'}
              sub={readiness?.issues?.length ? `${readiness.issues.length} active alerts` : 'All systems nominal'}
              icon={<Activity size={20} />}
              accent="text-emerald-500"
            />
          </div>

          {/* Readiness Deep-Dive */}
          {readiness && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Mission Readiness Breakdown
                  </h3>
                  <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                    {readiness.overall}% Ready
                  </span>
                </div>
                {bar(readiness.overall)}

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>👥 Personnel Deployment</span>
                      <span>{readiness.personnel}% ({personnel.length}/{exp.totalPersonnelQuota})</span>
                    </div>
                    {bar(readiness.personnel)}
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>📦 Cargo Manifest Delivered</span>
                      <span>{readiness.cargo}%</span>
                    </div>
                    {bar(readiness.cargo)}
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>🚜 Asset & Vehicle Allocation</span>
                      <span>{readiness.assets}% ({assets.length} assigned)</span>
                    </div>
                    {bar(readiness.assets)}
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>📋 Supply Quotas Fulfilled</span>
                      <span>{readiness.inventory}%</span>
                    </div>
                    {bar(readiness.inventory)}
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
                  Operational Safety & Alert Status
                </h3>
                {readiness.issues.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={24} className="shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Clear for Deployment</p>
                      <p className="text-xs opacity-90">No open SOS alerts or critical safety incidents blocking this expedition.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {readiness.issues.map(iss => (
                      <div key={iss.code} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-900/50 dark:bg-red-950/30 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-600" />
                          <span className="font-bold">{iss.code}</span>
                          <span className="text-slate-500">· {iss.type}</span>
                        </div>
                        <Pill value={iss.severity} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Station Coordinates:</p>
                  <p className="mt-0.5">Maitri (70°45′58″S 11°43′56″E) · Bharati (69°24′28″S 76°11′14″E)</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: TEAM & ROSTER ================= */}
      {activeTab === 'team' && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Expedition Team Roster ({personnel.length} Members)</h2>
              <p className="text-xs text-slate-500">Scientists, Station Commander, Logistics crew & medical staff assigned to this mission.</p>
            </div>
            {canEdit && (
              <button onClick={() => setShowAddMember(true)} className={`${btnPrimary} flex items-center gap-1.5 !py-1.5 !px-3 text-xs`}>
                <Plus size={15} /> Deploy Crew Member
              </button>
            )}
          </div>

          {personnel.length === 0 ? (
            <Empty text="No crew deployed to this expedition yet. Click 'Deploy Crew Member' to assign scientists and personnel." />
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Badge ID</Th>
                    <Th>Crew Member</Th>
                    <Th>Role / Function</Th>
                    <Th>Field Zone / Location</Th>
                    <Th>Status</Th>
                    <Th>Last Check-In</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {personnel.map(p => (
                    <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-bold text-cyan-600 dark:text-cyan-400">{p.badgeId}</Td>
                      <Td>
                        <p className="font-semibold">{p.userId?.fullName || 'Unknown'}</p>
                        <p className="text-[11px] text-slate-500">@{p.userId?.username} · {p.userId?.role}</p>
                      </Td>
                      <Td className="text-xs font-medium">{p.roleTitle || p.userId?.role || 'Mission Specialist'}</Td>
                      <Td className="text-xs">{p.currentLocation || p.assignedFieldZone || 'Station Base'}</Td>
                      <Td><Pill value={p.currentStatus} /></Td>
                      <Td className="text-xs text-slate-500">
                        {p.lastCheckIn ? new Date(p.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setShowCheckinModal(p);
                              setCheckinForm({ status: p.currentStatus, location: p.currentLocation || '' });
                            }}
                            className={`${btnGhost} !py-1 !px-2 text-xs`}
                            title="Update check-in location / status"
                          >
                            Check-In
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setConfirmDelete({ type: 'member', id: p._id, label: p.badgeId })}
                              className={`${btnGhost} !py-1 !px-2 text-xs text-red-500 hover:text-red-600`}
                              title="Remove from mission"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ================= TAB: MEDICAL & VITALS ================= */}
      {activeTab === 'medical' && (
        <div className="flex flex-col gap-4">
          <Card className="p-5 border-l-4 border-l-rose-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Heart size={18} className="text-rose-500" /> Crew Health & Biometric Telemetry
                </h2>
                <p className="text-xs text-slate-500">Live monitoring of crew vitals, polar hypothermia risk, emergency contacts, and medical quarantine.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {personnel.filter(p => p.currentStatus === 'MedicalQuarantine').length} In Quarantine
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personnel.map(p => {
                const vitals = p.vitals || {};
                const hr = vitals.heartRate || 72;
                const temp = vitals.bodyTempC || 36.8;
                const batt = vitals.batteryLevelPercent || 85;

                const isHypoRisk = temp < 35.5;
                const isTachy = hr > 105;
                const isLowBatt = batt < 25;
                const inQuarantine = p.currentStatus === 'MedicalQuarantine';

                return (
                  <Card key={p._id} className={`p-4 ${inQuarantine ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm">{p.userId?.fullName || p.badgeId}</p>
                        <p className="text-xs text-slate-500">{p.badgeId} · {p.roleTitle || 'Specialist'}</p>
                      </div>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        🩸 {p.userId?.bloodGroup || 'O+'}
                      </span>
                    </div>

                    {/* Vitals Telemetry Gauges */}
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center dark:bg-slate-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Heart size={10} className="text-red-500" /> Pulse
                        </span>
                        <p className={`font-bold mt-0.5 ${isTachy ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                          {hr} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Thermometer size={10} className="text-cyan-500" /> Temp
                        </span>
                        <p className={`font-bold mt-0.5 ${isHypoRisk ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>
                          {temp}° <span className="text-[10px] font-normal text-slate-400">C</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Battery size={10} className="text-emerald-500" /> Radio
                        </span>
                        <p className={`font-bold mt-0.5 ${isLowBatt ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                          {batt}%
                        </p>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    {p.userId?.emergencyContact?.name && (
                      <p className="mt-2 text-[11px] text-slate-500 truncate">
                        📞 SOS Contact: {p.userId.emergencyContact.name} ({p.userId.emergencyContact.relation}) · {p.userId.emergencyContact.phone}
                      </p>
                    )}

                    {/* Medical Actions */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => toggleQuarantine(p)}
                        className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                          inQuarantine
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {inQuarantine ? '✓ Release Clearance' : '⚠️ Medical Quarantine'}
                      </button>

                      {canMedical && (
                        <button
                          onClick={() => {
                            setShowVitalsModal(p);
                            setVitalsForm({
                              heartRate: hr,
                              bodyTempC: temp,
                              batteryLevelPercent: batt
                            });
                          }}
                          className={`${btnGhost} !py-1 !px-2 text-xs`}
                        >
                          Sync Vitals
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {personnel.length === 0 && <Empty text="No crew deployed. Add members in Team Roster to view health telemetry." />}
          </Card>
        </div>
      )}

      {/* ================= TAB: CARGO & MANIFEST ================= */}
      {activeTab === 'cargo' && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Expedition Cargo Manifest ({cargo.length} Shipments)</h2>
              <p className="text-xs text-slate-500">Track containers, scientific instruments, fuel, and supplies routed specifically to this mission.</p>
            </div>
            {canLogistics && (
              <button onClick={() => setShowAddCargo(true)} className={`${btnPrimary} flex items-center gap-1.5 !py-1.5 !px-3 text-xs`}>
                <Plus size={15} /> Manifest Shipment
              </button>
            )}
          </div>

          {cargo.length === 0 ? (
            <Empty text="No cargo manifested for this expedition yet. Click 'Manifest Shipment' to dispatch cargo." />
          ) : (
            <div className="space-y-3">
              {cargo.map(c => {
                const currNodeIdx = CARGO_NODES.indexOf(c.currentNode);
                const isDelivered = c.status === 'DeliveredStation' || currNodeIdx === CARGO_NODES.length - 1;

                return (
                  <Card key={c._id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">{c.trackingNumber}</span>
                          <Pill value={c.status} />
                          {c.isHazmat && (
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400">
                              🔥 HAZMAT
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm mt-0.5">{c.title}</h4>
                        <p className="text-xs text-slate-500">
                          {c.category} · {c.weightKg || 0} kg · via {c.transportMode || 'VesselCargo'}
                        </p>
                      </div>

                      {canLogistics && !isDelivered && (
                        <button
                          onClick={() => advanceCargoNode(c)}
                          className={`${btnPrimary} flex items-center gap-1 !py-1 !px-2.5 text-xs`}
                        >
                          <Truck size={13} /> Advance Node →
                        </button>
                      )}
                    </div>

                    {/* Progress Pipeline */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                        <span>Current Node: <b className="text-slate-800 dark:text-slate-200">{c.currentNode?.replace(/_/g, ' ')}</b></span>
                        <span>Destination: <b className="text-cyan-600 dark:text-cyan-400">{exp.targetStation}</b></span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {CARGO_NODES.map((node, i) => {
                          const reached = i <= currNodeIdx;
                          return (
                            <div
                              key={node}
                              title={node.replace(/_/g, ' ')}
                              className={`h-2 rounded-full transition-all ${
                                reached ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ================= TAB: ASSETS & FIELD GEAR ================= */}
      {activeTab === 'assets' && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Assigned Assets & Field Equipment ({assets.length} Units)</h2>
              <p className="text-xs text-slate-500">Snowmobiles, PistenBully vehicles, generators, drones, and spectrometers assigned to this expedition.</p>
            </div>
            {canEdit && (
              <button onClick={() => setShowAssignAsset(true)} className={`${btnPrimary} flex items-center gap-1.5 !py-1.5 !px-3 text-xs`}>
                <Plus size={15} /> Allocate Station Asset
              </button>
            )}
          </div>

          {assets.length === 0 ? (
            <Empty text="No heavy assets or scientific equipment assigned to this expedition yet. Click 'Allocate Station Asset' to assign vehicles or gear." />
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Asset Tag</Th>
                    <Th>Name & Type</Th>
                    <Th>Condition</Th>
                    <Th>Operating Hours</Th>
                    <Th>Assigned Crew Member</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a._id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">{a.assetTag}</Td>
                      <Td>
                        <p className="font-semibold text-xs">{a.name}</p>
                        <p className="text-[11px] text-slate-500">{a.type} · Base: {a.station}</p>
                      </Td>
                      <Td><Pill value={a.condition} /></Td>
                      <Td className="text-xs">
                        {a.operatingHours || 0} / {a.maxHoursBeforeService || 500} hrs
                      </Td>
                      <Td className="text-xs">
                        {a.assignedToPersonnelId ? a.assignedToPersonnelId.badgeId : 'Station Pool'}
                      </Td>
                      <Td>
                        {canEdit && (
                          <button
                            onClick={() => handleUnassignAsset(a._id)}
                            className={`${btnGhost} !py-1 !px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-red-500`}
                          >
                            Unassign
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ================= TAB: SUPPLIES & QUOTAS ================= */}
      {activeTab === 'supplies' && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Expedition Provisions & Supply Quotas ({reqs.length} Items)</h2>
              <p className="text-xs text-slate-500">Rations, Arctic-grade fuel, spare parts, and scientific consumables required for this mission.</p>
            </div>
            {canEdit && (
              <button onClick={() => setShowAddReq(true)} className={`${btnPrimary} flex items-center gap-1.5 !py-1.5 !px-3 text-xs`}>
                <Plus size={15} /> Add Requirement
              </button>
            )}
          </div>

          {reqs.length === 0 ? (
            <Empty text="No supply requirements added yet. Add Food, Fuel, or Scientific Instruments." />
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Item & Category</Th>
                    <Th>Priority</Th>
                    <Th>Required</Th>
                    <Th>Received</Th>
                    <Th>Pending</Th>
                    <Th>Progress</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map(r => {
                    const pct = r.requiredQty ? Math.round((r.receivedQty / r.requiredQty) * 100) : 0;
                    return (
                      <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800">
                        <Td>
                          <p className="font-semibold text-xs">{r.item}</p>
                          <p className="text-[11px] text-slate-500">{r.category}</p>
                        </Td>
                        <Td><Pill value={r.priority} /></Td>
                        <Td className="text-xs font-semibold">{r.requiredQty} {r.unit}</Td>
                        <Td className="text-xs text-emerald-600 font-semibold">{r.receivedQty} {r.unit}</Td>
                        <Td className={`text-xs font-semibold ${r.pendingQty > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {r.pendingQty} {r.unit}
                        </Td>
                        <Td className="w-28">
                          <div className="text-[10px] font-bold text-slate-500 text-right">{pct}%</div>
                          {bar(pct)}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            {canLogistics && r.pendingQty > 0 && (
                              <button
                                onClick={() => handleReceiveReq(r)}
                                className={`${btnGhost} !py-1 !px-2 text-xs text-emerald-600`}
                                title="Record delivery received"
                              >
                                + Receive
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteReq(r._id)}
                                className={`${btnGhost} !py-1 !px-2 text-xs text-red-500`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ================= TAB: TIMELINE ================= */}
      {activeTab === 'timeline' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Truck size={16} className="text-cyan-500" /> Cargo Waypoint Events ({events.length})
            </h3>
            <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto border-l-2 border-cyan-500/40 pl-3">
              {events.map(ev => (
                <div key={ev._id} className="text-xs pb-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {ev.eventType} {ev.toNode ? `→ ${ev.toNode.replace(/_/g, ' ')}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">{new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {events.length === 0 && <Empty text="No cargo events logged yet" />}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Users size={16} className="text-cyan-500" /> Personnel Check-In Movements ({movements.length})
            </h3>
            <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto border-l-2 border-emerald-500/40 pl-3">
              {movements.map(m => (
                <div key={m._id} className="text-xs pb-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    <b>{m.personnelId?.badgeId}</b>: {m.fromLocation || 'Base'} → <b>{m.toLocation}</b>
                  </p>
                  <p className="text-[11px] text-slate-500">{new Date(m.createdAt).toLocaleString()} · status: {m.status}</p>
                </div>
              ))}
              {movements.length === 0 && <Empty text="No personnel movements recorded" />}
            </div>
          </Card>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Deploy Crew Modal */}
      {showAddMember && (
        <Modal title="Deploy Crew Member to Expedition" onClose={() => setShowAddMember(false)}>
          <form onSubmit={handleAddMember} className="flex flex-col gap-3">
            <Field label="Select Registered User">
              <select
                className={inputCls}
                required
                value={memberForm.userId}
                onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })}
              >
                <option value="">— Select Member —</option>
                {systemUsers.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.role} · @{u.username})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Badge ID">
                <input
                  className={inputCls}
                  required
                  value={memberForm.badgeId}
                  onChange={e => setMemberForm({ ...memberForm, badgeId: e.target.value })}
                  placeholder="BHR-SCI-01"
                />
              </Field>
              <Field label="Mission Role Title">
                <input
                  className={inputCls}
                  required
                  value={memberForm.roleTitle}
                  onChange={e => setMemberForm({ ...memberForm, roleTitle: e.target.value })}
                  placeholder="Chief Glaciologist"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Initial Field Zone">
                <input
                  className={inputCls}
                  value={memberForm.assignedFieldZone}
                  onChange={e => setMemberForm({ ...memberForm, assignedFieldZone: e.target.value })}
                />
              </Field>
              <Field label="Initial Status">
                <select
                  className={inputCls}
                  value={memberForm.currentStatus}
                  onChange={e => setMemberForm({ ...memberForm, currentStatus: e.target.value })}
                >
                  {PERSONNEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Assign to Mission</button>
          </form>
        </Modal>
      )}

      {/* Sync Vitals Modal */}
      {showVitalsModal && (
        <Modal title={`Sync Vitals Telemetry (${showVitalsModal.badgeId})`} onClose={() => setShowVitalsModal(null)}>
          <form onSubmit={handleSaveVitals} className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">Record fresh biometric readings from wristband or polar sensor:</p>
            <Field label="Heart Rate (BPM)">
              <input
                type="number"
                className={inputCls}
                required
                value={vitalsForm.heartRate}
                onChange={e => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
              />
            </Field>
            <Field label="Core Body Temp (°C)">
              <input
                type="number"
                step="0.1"
                className={inputCls}
                required
                value={vitalsForm.bodyTempC}
                onChange={e => setVitalsForm({ ...vitalsForm, bodyTempC: e.target.value })}
              />
            </Field>
            <Field label="Radio / Wearable Battery (%)">
              <input
                type="number"
                className={inputCls}
                required
                value={vitalsForm.batteryLevelPercent}
                onChange={e => setVitalsForm({ ...vitalsForm, batteryLevelPercent: e.target.value })}
              />
            </Field>
            <button className={btnPrimary}>Save Telemetry</button>
          </form>
        </Modal>
      )}

      {/* Checkin Modal */}
      {showCheckinModal && (
        <Modal title={`Check-In Crew Member: ${showCheckinModal.badgeId}`} onClose={() => setShowCheckinModal(null)}>
          <form onSubmit={handleCheckin} className="flex flex-col gap-3">
            <Field label="Current Status">
              <select
                className={inputCls}
                value={checkinForm.status}
                onChange={e => setCheckinForm({ ...checkinForm, status: e.target.value })}
              >
                {PERSONNEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Current Location / Waypoint">
              <input
                className={inputCls}
                required
                value={checkinForm.location}
                onChange={e => setCheckinForm({ ...checkinForm, location: e.target.value })}
                placeholder="Field Camp 2 / Ice Shelf"
              />
            </Field>
            <button className={btnPrimary}>Submit Check-In</button>
          </form>
        </Modal>
      )}

      {/* Manifest Cargo Modal */}
      {showAddCargo && (
        <Modal title="Manifest Cargo Shipment" onClose={() => setShowAddCargo(false)}>
          <form onSubmit={handleAddCargo} className="flex flex-col gap-3">
            <Field label="Tracking Number">
              <input
                className={inputCls}
                required
                value={cargoForm.trackingNumber}
                onChange={e => setCargoForm({ ...cargoForm, trackingNumber: e.target.value })}
                placeholder="CRG-2027-BHR-001"
              />
            </Field>
            <Field label="Shipment Title">
              <input
                className={inputCls}
                required
                value={cargoForm.title}
                onChange={e => setCargoForm({ ...cargoForm, title: e.target.value })}
                placeholder="Deep Ice Core Drilling Consumables"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={cargoForm.category}
                  onChange={e => setCargoForm({ ...cargoForm, category: e.target.value })}
                >
                  {CARGO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  className={inputCls}
                  required
                  value={cargoForm.weightKg}
                  onChange={e => setCargoForm({ ...cargoForm, weightKg: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Transport Mode">
                <select
                  className={inputCls}
                  value={cargoForm.transportMode}
                  onChange={e => setCargoForm({ ...cargoForm, transportMode: e.target.value })}
                >
                  <option value="VesselCargo">Vessel Cargo</option>
                  <option value="AirFreight">Air Freight</option>
                  <option value="HelicopterAirlift">Helicopter Airlift</option>
                  <option value="PistenBullyConvoy">PistenBully Convoy</option>
                </select>
              </Field>
              <Field label="Initial Route Node">
                <select
                  className={inputCls}
                  value={cargoForm.currentNode}
                  onChange={e => setCargoForm({ ...cargoForm, currentNode: e.target.value })}
                >
                  {CARGO_NODES.map(n => <option key={n} value={n}>{n.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={cargoForm.isHazmat}
                onChange={e => setCargoForm({ ...cargoForm, isHazmat: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs font-semibold text-red-600">Hazardous Materials / Fuel (HAZMAT)</span>
            </label>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Manifest Shipment</button>
          </form>
        </Modal>
      )}

      {/* Allocate Station Asset Modal */}
      {showAssignAsset && (
        <Modal title={`Allocate Asset from Station (${exp.targetStation})`} onClose={() => setShowAssignAsset(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">Select an unallocated asset from {exp.targetStation} to assign to this mission:</p>
            {stationAssets.filter(a => !a.expeditionId || a.expeditionId === id).length === 0 ? (
              <Empty text="No available assets found at this station." />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stationAssets.filter(a => !a.expeditionId || a.expeditionId === id).map(a => {
                  const isAssigned = a.expeditionId === id;
                  return (
                    <div key={a._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800 text-xs">
                      <div>
                        <p className="font-bold">{a.name} <span className="font-mono text-cyan-600">({a.assetTag})</span></p>
                        <p className="text-[11px] text-slate-500">{a.type} · Condition: <b>{a.condition}</b></p>
                      </div>
                      {isAssigned ? (
                        <span className="text-emerald-600 font-bold">Assigned</span>
                      ) : (
                        <button
                          onClick={() => handleAssignAsset(a._id)}
                          className={`${btnPrimary} !py-1 !px-2.5 text-xs`}
                        >
                          Allocate
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Requirement Modal */}
      {showAddReq && (
        <Modal title="Add Mission Supply Requirement" onClose={() => setShowAddReq(false)}>
          <form onSubmit={handleAddReq} className="flex flex-col gap-3">
            <Field label="Item Name">
              <input
                className={inputCls}
                required
                value={reqForm.item}
                onChange={e => setReqForm({ ...reqForm, item: e.target.value })}
                placeholder="Arctic Rations / Jet A-1 Fuel"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={reqForm.category}
                  onChange={e => setReqForm({ ...reqForm, category: e.target.value })}
                >
                  {REQ_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className={inputCls}
                  value={reqForm.priority}
                  onChange={e => setReqForm({ ...reqForm, priority: e.target.value })}
                >
                  <option value="P1">P1 (Critical / Life Support)</option>
                  <option value="P2">P2 (Mission Standard)</option>
                  <option value="P3">P3 (Routine)</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Required Qty">
                <input
                  type="number"
                  className={inputCls}
                  required
                  value={reqForm.requiredQty}
                  onChange={e => setReqForm({ ...reqForm, requiredQty: e.target.value })}
                />
              </Field>
              <Field label="Unit">
                <input
                  className={inputCls}
                  required
                  value={reqForm.unit}
                  onChange={e => setReqForm({ ...reqForm, unit: e.target.value })}
                  placeholder="Liters / Kg / Units"
                />
              </Field>
            </div>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Add Requirement</button>
          </form>
        </Modal>
      )}

      {/* Confirm Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Remove Crew Member?"
          message={`Are you sure you want to remove ${confirmDelete.label} from this expedition?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleRemoveMember(confirmDelete.id)}
        />
      )}
    </div>
  );
}
