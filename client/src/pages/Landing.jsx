import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Rocket, Package, Boxes, Users, Siren,
  Radar, Satellite, Fuel, BellRing, ShieldCheck, Map as MapIcon, Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PublicHeader, { ThemeToggle } from '../components/PublicHeader';
import { API_BASE } from '../lib/api';

const modules = [
  { icon: Rocket, title: 'Expedition Planning', text: '44-IAE style missions, station assignments, quotas and multi-stage approvals.' },
  { icon: Package, title: 'Cargo Tracking', text: 'Goa → Port → Icebreaker → Station. QR-tracked crates with hazmat compliance.' },
  { icon: Boxes, title: 'Inventory & Life Support', text: 'Fuel, rations, medical stock with depletion forecasting against the next resupply window.' },
  { icon: Users, title: 'Personnel Movement', text: 'Roster, check-in/out, GPS pings and dead-man switch safety for field teams.' },
  { icon: Siren, title: 'Emergency Response', text: 'One-click SOS, incident triage, refuge proximity and MEDEVAC checklists.' },
];

const engines = [
  { icon: BellRing, title: 'Dead-Man Switch', text: 'Auto-escalation when a field team misses its ping window.' },
  { icon: Radar, title: 'Geofence Interceptor', text: 'Instant alerts inside crevasse fields and ASPA zones.' },
  { icon: Fuel, title: 'Depletion Forecaster', text: 'Days-remaining math on every consumable, every minute.' },
  { icon: Satellite, title: 'Cargo ETA Watch', text: 'Weather-window slip detection with P1 airlift reprioritisation.' },
  { icon: ShieldCheck, title: 'Predictive Maintenance', text: 'Service warnings before generators and snowcats fail.' },
];

export default function Landing() {
  const { user } = useAuth();
  const [health, setHealth] = useState('checking');

  const checkHealth = () => {
    fetch(API_BASE + '/api/v1/health')
      .then(r => setHealth(r.ok ? 'online' : 'offline'))
      .catch(() => setHealth('offline'));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      {/* Nav */}
      <PublicHeader
        center={
          <>
            <a href="#modules" className="hidden text-sm text-slate-500 hover:text-cyan-500 sm:block">Modules</a>
            <a href="#automation" className="hidden text-sm text-slate-500 hover:text-cyan-500 sm:block">Automation</a>
          </>
        }
        actions={
          <>
            <ThemeToggle />
            <Link to={user ? '/command' : '/login'} className="flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
              {user ? 'Open Command' : 'Sign in'} <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 text-center sm:pt-20">
        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
          <Radio size={14} /> SIH 2026 · PS 26062 · MoES / NCPOR
        </p>
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Mission control for India's <span className="text-cyan-500">polar expeditions</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          One platform for expedition planning, cargo across 4+ transport nodes, life-support
          inventory, personnel geo-safety and emergency response — from Goa HQ to Bharati, Maitri and Himadri.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link to={user ? '/command' : '/login'} className="flex w-full items-center justify-center gap-1 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 sm:w-auto">
            Launch Mission Control <ArrowRight size={18} />
          </Link>
          <a href="#modules" className="w-full rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 sm:w-auto">
            Explore modules
          </a>
        </div>
        <button
          type="button"
          onClick={checkHealth}
          className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          title="Click to recheck API status"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${health === 'online' ? 'bg-emerald-500' : health === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
          {health === 'online' ? 'API live — all systems operational' : health === 'offline' ? 'API offline — start the server (retrying…)' : 'Checking API status…'}
        </button>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">Five modules. One expedition ERP.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(m => (
            <div key={m.title} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111a2e]">
              <m.icon className="text-cyan-500" size={24} />
              <p className="mt-2 font-bold">{m.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.text}</p>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-cyan-500/50 bg-cyan-500/5 p-4">
            <MapIcon className="text-cyan-500" size={24} />
            <p className="mt-2 font-bold">+ Live Polar Map</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Stations, field parties and hazard polygons tracked in real time.</p>
          </div>
        </div>
      </section>

      {/* Automation */}
      <section id="automation" className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1424]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-center text-xl font-extrabold sm:text-2xl">It acts before humans notice</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500 dark:text-slate-400">
            A background automation engine watches telemetry every 60 seconds and raises alerts on its own.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {engines.map(m => (
              <div key={m.title} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <m.icon className="text-amber-500" size={24} />
                <p className="mt-2 font-bold">{m.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.text}</p>
              </div>
            ))}
            <div className="rounded-xl bg-red-500/10 p-4">
              <Siren className="text-red-500" size={24} />
              <p className="mt-2 font-bold">SOS Broadcast</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Disaster-severity alerts pushed live to every command screen via WebSocket.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="font-bold text-slate-700 dark:text-slate-200">POLARIS · NCPOR / Ministry of Earth Sciences</p>
        <p className="mt-1">React 19 · Node.js · MongoDB Atlas · Socket.IO · Leaflet · Tailwind</p>
      </footer>
    </div>
  );
}
