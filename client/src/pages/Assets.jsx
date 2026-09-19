import { useEffect, useState } from 'react';
import {
  Wrench, Plus, Truck, Radio, Shield, AlertTriangle, Activity,
  BatteryCharging, Gauge, CheckCircle2, RefreshCw, Trash2, Edit3,
  Search, Cpu, Satellite
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, StatCard, Pill, Spinner, Empty, Modal, Field, inputCls,
  btnPrimary, btnGhost, btnDanger, ErrorNote, ConfirmDialog, CustomSelect
} from '../components/ui';

const ASSET_TYPES = [
  'SnowVehicle',
  'Generator',
  'SatelliteDish',
  'Spectrometer',
  'Drone',
  'HeloRefueler'
];

const ASSET_CONDITIONS = [
  'Operational',
  'InUse',
  'Standby',
  'Degraded',
  'ScheduledMaintenance',
  'UnderMaintenance',
  'EmergencyOffline',
  'Damaged',
  'Retired'
];

export default function Assets() {
  const { user } = useAuth();
  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'AssetOfficer'].includes(user?.role);

  const [list, setList] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStation, setFilterStation] = useState('ALL');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    assetTag: '',
    name: '',
    type: 'SnowVehicle',
    station: '',
    condition: 'Operational',
    operatingHours: 0,
    maxHoursBeforeService: 500
  });

  const [teleId, setTeleId] = useState(null);
  const [teleForm, setTeleForm] = useState({ operatingHours: '', engineTempC: '', fuelLevelPercent: '', oilPressurePsi: '' });
  const [maintId, setMaintId] = useState(null);
  const [desc, setDesc] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', station: '', type: '', maxHoursBeforeService: '', condition: '' });
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [assetsData, locsData] = await Promise.all([
        api('/api/v1/assets'),
        api('/api/v1/locations').catch(() => [])
      ]);
      setList(assetsData || []);
      const stationNames = Array.isArray(locsData)
        ? locsData.filter(l => ['Station', 'Warehouse', 'Outpost'].includes(l.type)).map(l => l.name.replace(' Station', ''))
        : ['Bharati', 'Maitri', 'Himadri', 'Cape_Town_Hub'];
      setStations([...new Set([...stationNames, 'Bharati', 'Maitri', 'Himadri'])]);
      if (!createForm.station && stationNames.length > 0) {
        setCreateForm(prev => ({ ...prev, station: stationNames[0] }));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/v1/assets', {
        method: 'POST',
        body: {
          ...createForm,
          operatingHours: Number(createForm.operatingHours) || 0,
          maxHoursBeforeService: Number(createForm.maxHoursBeforeService) || 500
        }
      });
      setShowCreate(false);
      setCreateForm({
        assetTag: '',
        name: '',
        type: 'SnowVehicle',
        station: stations[0] || 'Bharati',
        condition: 'Operational',
        operatingHours: 0,
        maxHoursBeforeService: 500
      });
      load();
    } catch (err) {
      setError(err.message || 'Failed to register asset');
    }
    setBusy(false);
  };

  const saveTele = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/v1/assets/${teleId}/telemetry`, {
        method: 'PATCH',
        body: {
          operatingHours: Number(teleForm.operatingHours),
          engineTempC: teleForm.engineTempC !== '' ? Number(teleForm.engineTempC) : undefined,
          fuelLevelPercent: teleForm.fuelLevelPercent !== '' ? Number(teleForm.fuelLevelPercent) : undefined,
          oilPressurePsi: teleForm.oilPressurePsi !== '' ? Number(teleForm.oilPressurePsi) : undefined
        }
      });
      setTeleId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
    setBusy(false);
  };

  const saveMaint = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/api/v1/assets/${maintId}/maintenance`, {
        method: 'POST',
        body: { description: desc, partsUsed: [] }
      });
      setMaintId(null);
      setDesc('');
      load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const openEdit = (a) => {
    setEditing(a._id);
    setEditForm({
      name: a.name,
      station: a.station,
      type: a.type,
      maxHoursBeforeService: a.maxHoursBeforeService,
      condition: a.condition
    });
    setError('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/api/v1/assets/${editing}`, {
        method: 'PATCH',
        body: {
          name: editForm.name,
          station: editForm.station,
          type: editForm.type,
          maxHoursBeforeService: Number(editForm.maxHoursBeforeService),
          condition: editForm.condition
        }
      });
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/v1/assets/${deleting}`, { method: 'DELETE' });
      setDeleting(null);
      load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const filtered = list.filter(a => {
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    if (filterStation !== 'ALL' && a.station !== filterStation) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q) || a.station.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <Spinner />;

  const operationalCount = list.filter(a => a.condition === 'Operational').length;
  const maintCount = list.filter(a => ['UnderMaintenance', 'ScheduledMaintenance', 'EmergencyOffline', 'Damaged'].includes(a.condition)).length;
  const avgFuel = list.length > 0
    ? Math.round(list.reduce((s, a) => s + (a.telemetry?.fuelPercent || 80), 0) / list.length)
    : 85;

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            BASE & LOGISTICS
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Station Assets & Heavy Telematics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Polar tracked PistenBully vehicles, power generators, heating chillers & scientific sensors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load} className={`${btnGhost} !px-3 !py-2 text-xs flex items-center gap-1.5 font-semibold`}>
            <RefreshCw size={13} />
            Refresh
          </button>
          {canEdit && (
            <button
              onClick={() => {
                setError('');
                setShowCreate(true);
              }}
              className={btnPrimary}
            >
              <Plus size={14} className="inline mr-1" />
              Register New Asset
            </button>
          )}
        </div>
      </div>

      {/* 4 Asset Telematics KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Total Heavy Assets"
          value={list.length}
          sub="Deployed across polar stations"
          trend="↑ 1"
          trendType="positive"
        />
        <StatCard
          label="Active & Operational"
          value={operationalCount}
          sub="Engine telemetry nominal"
          trend="Optimal"
          trendType="positive"
        />
        <StatCard
          label="Under Maintenance"
          value={maintCount}
          sub="Scheduled service or repairs"
          trend={maintCount > 0 ? "Inspect" : "Clear"}
          trendType={maintCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Average Fleet Fuel"
          value={`${avgFuel}%`}
          sub="Sub-zero fuel tank level"
          trend="Nominal"
          trendType="positive"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by tag or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputCls} !pl-8 !py-1 text-xs w-48 sm:w-64`}
            />
          </div>

          <CustomSelect
            value={filterStation}
            onChange={setFilterStation}
            options={[
              { value: 'ALL', label: 'All Stations' },
              ...stations.map(s => ({ value: s, label: s }))
            ]}
          />

          <CustomSelect
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'ALL', label: 'All Asset Types' },
              ...ASSET_TYPES.map(t => ({ value: t, label: t }))
            ]}
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {filtered.length} of {list.length} assets registered
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-base">No Station Assets Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
              {list.length === 0
                ? "No heavy equipment or instruments are currently registered to any station. Add snowmobiles, power plants, or radar dishes to monitor operating hours and service schedules."
                : "No assets match your search and filter criteria."}
            </p>
          </div>
          {canEdit && list.length === 0 && (
            <button
              onClick={() => {
                setError('');
                setShowCreate(true);
              }}
              className={`${btnPrimary} !px-4 !py-2 text-xs flex items-center gap-1.5 font-semibold mt-2`}
            >
              <Plus size={14} />
              Register First Station Asset
            </button>
          )}
        </Card>
      )}

      {/* Asset Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(a => {
          const servicePct = Math.min(100, (a.operatingHours / Math.max(1, a.maxHoursBeforeService)) * 100);
          const hrsRemaining = Math.max(0, a.maxHoursBeforeService - a.operatingHours);
          const needsService = hrsRemaining <= 25;

          return (
            <Card key={a._id} className="p-4 text-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {a.assetTag}
                      </span>
                      <Pill value={a.condition} />
                    </div>
                    <h3 className="font-bold text-sm mt-1">{a.name}</h3>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Radio size={12} /> {a.station}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu size={12} /> {a.type}
                  </span>
                </div>

                {/* Service Schedule Bar */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-500">{a.operatingHours} / {a.maxHoursBeforeService} hrs</span>
                    <span className={needsService ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                      {needsService ? `⚠️ ${hrsRemaining} hrs to overhaul` : `${hrsRemaining} hrs left`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        needsService ? 'bg-rose-500' : servicePct > 75 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${servicePct}%` }}
                    />
                  </div>
                </div>

                {/* Live Telemetry Sensors */}
                {a.telemetry && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 p-2 rounded bg-slate-100/50 dark:bg-slate-800/40 text-[11px] font-mono text-slate-500">
                    <div>
                      <span className="text-slate-400 block text-[10px]">TEMP</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{a.telemetry.engineTempC ?? '—'}°C</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">FUEL</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{a.telemetry.fuelLevelPercent ?? '—'}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">OIL PSI</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{a.telemetry.oilPressurePsi ?? '—'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {canEdit && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTeleId(a._id);
                        setTeleForm({
                          operatingHours: String(a.operatingHours),
                          engineTempC: a.telemetry?.engineTempC ?? '',
                          fuelLevelPercent: a.telemetry?.fuelLevelPercent ?? '',
                          oilPressurePsi: a.telemetry?.oilPressurePsi ?? ''
                        });
                      }}
                      className={`${btnGhost} !px-2.5 !py-1 text-xs flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:border-cyan-500`}
                    >
                      <Gauge size={12} />
                      Log Telemetry
                    </button>
                    <button
                      onClick={() => setMaintId(a._id)}
                      className={`${btnGhost} !px-2.5 !py-1 text-xs flex items-center gap-1`}
                    >
                      <Wrench size={12} />
                      Service
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      className={`${btnGhost} !p-1.5 text-xs text-slate-500 hover:text-slate-200`}
                      title="Edit Asset"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => { setDeleting(a._id); setError(''); }}
                      className={`${btnGhost} !p-1.5 text-xs text-red-500 hover:text-red-600 hover:border-red-500`}
                      title="Retire / Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Register Asset Modal */}
      {showCreate && (
        <Modal title="Register Station Asset" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asset Tag (Unique)">
                <input
                  required
                  className={inputCls}
                  placeholder="e.g. SNW-CAT-01"
                  value={createForm.assetTag}
                  onChange={e => setCreateForm({ ...createForm, assetTag: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Asset Type">
                <select
                  className={inputCls}
                  value={createForm.type}
                  onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                >
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Equipment Name & Model">
              <input
                required
                className={inputCls}
                placeholder="e.g. PistenBully 300 Polar Tracked Groomer"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigned Station">
                <select
                  className={inputCls}
                  value={createForm.station}
                  onChange={e => setCreateForm({ ...createForm, station: e.target.value })}
                >
                  {stations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Initial Condition">
                <select
                  className={inputCls}
                  value={createForm.condition}
                  onChange={e => setCreateForm({ ...createForm, condition: e.target.value })}
                >
                  {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Operating Hours">
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={createForm.operatingHours}
                  onChange={e => setCreateForm({ ...createForm, operatingHours: e.target.value })}
                />
              </Field>
              <Field label="Service Interval (Max Hours)">
                <input
                  type="number"
                  min="10"
                  className={inputCls}
                  value={createForm.maxHoursBeforeService}
                  onChange={e => setCreateForm({ ...createForm, maxHoursBeforeService: e.target.value })}
                />
              </Field>
            </div>

            <ErrorNote message={error} />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setShowCreate(false)} className={btnGhost}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? 'Registering...' : 'Register Asset'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Telemetry Modal */}
      {teleId && (
        <Modal title="Log Asset Telemetry & Sensor Readings" onClose={() => setTeleId(null)}>
          <form onSubmit={saveTele} className="flex flex-col gap-3 text-xs">
            <Field label="Operating Hours">
              <input
                type="number"
                required
                className={inputCls}
                value={teleForm.operatingHours}
                onChange={e => setTeleForm({ ...teleForm, operatingHours: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Engine Temp (°C)">
                <input
                  type="number"
                  className={inputCls}
                  value={teleForm.engineTempC}
                  onChange={e => setTeleForm({ ...teleForm, engineTempC: e.target.value })}
                  placeholder="82"
                />
              </Field>
              <Field label="Fuel Level (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={inputCls}
                  value={teleForm.fuelLevelPercent}
                  onChange={e => setTeleForm({ ...teleForm, fuelLevelPercent: e.target.value })}
                  placeholder="95"
                />
              </Field>
              <Field label="Oil Pressure (psi)">
                <input
                  type="number"
                  className={inputCls}
                  value={teleForm.oilPressurePsi}
                  onChange={e => setTeleForm({ ...teleForm, oilPressurePsi: e.target.value })}
                  placeholder="50"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setTeleId(null)} className={btnGhost}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary}>Save Telemetry</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Service Maintenance Modal */}
      {maintId && (
        <Modal title="Log Overhaul & Maintenance" onClose={() => setMaintId(null)}>
          <form onSubmit={saveMaint} className="flex flex-col gap-3 text-xs">
            <Field label="Maintenance Work Description">
              <textarea
                required
                rows={3}
                className={inputCls}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Synthetic cold-weather oil replacement, hydraulic seal inspection, and track tension adjustment."
              />
            </Field>
            <ErrorNote message={error} />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setMaintId(null)} className={btnGhost}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary}>Record Service</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Asset Specification" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="flex flex-col gap-3 text-xs">
            <Field label="Asset Name">
              <input
                className={inputCls}
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Station">
                <select
                  className={inputCls}
                  value={editForm.station}
                  onChange={e => setEditForm({ ...editForm, station: e.target.value })}
                >
                  {stations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  className={inputCls}
                  value={editForm.condition}
                  onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                >
                  {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Service Interval (Max Hours)">
              <input
                type="number"
                className={inputCls}
                value={editForm.maxHoursBeforeService}
                onChange={e => setEditForm({ ...editForm, maxHoursBeforeService: e.target.value })}
              />
            </Field>
            <ErrorNote message={error} />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Retire Confirmation */}
      {deleting && (
        <ConfirmDialog
          title="Retire / Remove Asset?"
          message="Assets with logged service history cannot be hard deleted for audit compliance. If maintenance logs exist, change condition to Retired instead."
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
