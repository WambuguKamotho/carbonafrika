'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Leaf, BarChart3, Globe, User, Zap, Thermometer, Droplets, Wind, Pencil, CheckCircle, X, Clock, XCircle, MessageSquare } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import ProjectCommentThread from '@/components/projects/ProjectCommentThread';
import { DynamicMapPicker } from '@/components/map/DynamicMapPicker';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SatelliteSnapshot {
  id: string; ndvi: number; cloudCover: number; capturedAt: string; source: string;
}

interface DeviceReading {
  id: string;
  kwhGenerated: number | null;
  co2AvoidedKg: number | null;
  householdsServed: number | null;
  fuelDisplacedKg: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  soilMoisturePct: number | null;
  rainfallMm: number | null;
  windSpeedMs: number | null;
  gasFlowM3h: number | null;
  recordedAt: string;
  device: { deviceType: string; label: string | null };
}

interface Project {
  id: string; title: string; description: string;
  projectType: 'LAND_RESTORATION' | 'CLEAN_ENERGY';
  landType: string | null; energyType: string | null;
  country: string; region?: string | null;
  lat: number; lng: number; hectares: number; estimatedTons: number;
  capacityKw: number | null; householdsServed: number | null;
  mediaUrls: string[];
  boundary?: object | null;
  status: string; createdAt: string;
  rejectionReason?: string | null;
  methodologyCode?: string | null;
  methodology?: {
    code: string; name: string; category: string; scope: string | null;
    summary: string; bufferPercent: number; monitoringPeriodMonths: number;
  } | null;
  owner: { id: string; name: string; country?: string | null };
  verifications: Array<{ status: string; notes?: string | null; carbonTons?: number | null }>;
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow', UNDER_REVIEW: 'badge-blue',
  VERIFIED: 'badge-green', ACTIVE: 'badge-green',
  REJECTED: 'badge-red',  COMPLETED: 'badge-gray',
};
const LAND_TYPE_HEX: Record<string, string> = {
  FOREST: '#16a34a', SAVANNA: '#d97706', GRASSLAND: '#65a30d',
  FARMLAND: '#92400e', WETLAND: '#0284c7', MANGROVE: '#0d9488',
};
const LAND_TYPE_EMOJIS: Record<string, string>  = { FOREST: '🌳', SAVANNA: '🌿', GRASSLAND: '🌾', FARMLAND: '🌱', WETLAND: '💧', MANGROVE: '🌊' };
const ENERGY_TYPE_EMOJIS: Record<string, string> = { BIOGAS: '🔥', SOLAR_PV: '☀️', BIOCHARCOAL: '⚫', COOKSTOVES: '🍳', MICRO_HYDRO: '💧', WIND: '💨' };
const ENERGY_TYPE_LABELS: Record<string, string> = { BIOGAS: 'Biogas', SOLAR_PV: 'Solar PV', BIOCHARCOAL: 'Biocharcoal', COOKSTOVES: 'Cookstoves', MICRO_HYDRO: 'Micro-Hydro', WIND: 'Wind' };
const LAND_TYPE_PHOTOS: Record<string, string>   = {
  FOREST: 'https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1200&q=80&auto=format&fit=crop',
  SAVANNA: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&auto=format&fit=crop',
  GRASSLAND: 'https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=1200&q=80&auto=format&fit=crop',
  FARMLAND: 'https://images.unsplash.com/photo-1582409284161-5bf7c520dce9?w=1200&q=80&auto=format&fit=crop',
  WETLAND: 'https://images.unsplash.com/photo-1589556183130-530470785fab?w=1200&q=80&auto=format&fit=crop',
  MANGROVE: 'https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=1200&q=80&auto=format&fit=crop',
};
const ENERGY_TYPE_PHOTOS: Record<string, string> = {
  SOLAR_PV: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80&auto=format&fit=crop',
  BIOGAS: 'https://images.unsplash.com/photo-1739539978578-6c280bf8c582?w=1200&q=80&auto=format&fit=crop',
  BIOCHARCOAL: 'https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=1200&q=80&auto=format&fit=crop',
  COOKSTOVES: 'https://images.unsplash.com/photo-1551982932-92d213f565a7?w=1200&q=80&auto=format&fit=crop',
  MICRO_HYDRO: 'https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=1200&q=80&auto=format&fit=crop',
  WIND: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80&auto=format&fit=crop',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ndviColor(ndvi: number) {
  if (ndvi >= 0.5) return 'text-forest-700 bg-forest-50';
  if (ndvi >= 0.2) return 'text-savanna-700 bg-savanna-50';
  return 'text-red-700 bg-red-50';
}
function ndviLabel(ndvi: number) {
  if (ndvi >= 0.6) return 'Dense Vegetation';
  if (ndvi >= 0.4) return 'Moderate Vegetation';
  if (ndvi >= 0.2) return 'Sparse Vegetation';
  if (ndvi >= 0)   return 'Bare Soil';
  return 'Water / Cloud';
}
function fmt(n: number | null, unit: string, decimals = 1) {
  if (n == null) return '—';
  return `${n.toFixed(decimals)} ${unit}`;
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Equivalents row ───────────────────────────────────────────────────────────

function EquivalentRow({ emoji, label, value, unit }: { emoji: string; label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
        <span className="text-xs text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2.5 text-sm">
      <p className="text-gray-500 text-xs mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-700">{p.name}:</span>
          <span className="font-bold text-gray-900">{p.value} {unit ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

// ── Data aggregation ──────────────────────────────────────────────────────────

interface DailyPoint {
  date: string;
  kwh: number;
  co2Kg: number;
  cumCo2Kg: number;
  avgTemp: number | null;
  avgHum: number | null;
  avgSoil: number | null;
  avgWind: number | null;
  gasFlow: number | null;
}

function aggregateDaily(readings: DeviceReading[]): DailyPoint[] {
  const map: Record<string, {
    kwh: number; co2: number;
    tempSum: number; tempN: number;
    humSum: number; humN: number;
    soilSum: number; soilN: number;
    windSum: number; windN: number;
    gasSum: number; gasN: number;
  }> = {};

  for (const r of readings) {
    const day = r.recordedAt.split('T')[0];
    if (!map[day]) map[day] = { kwh: 0, co2: 0, tempSum: 0, tempN: 0, humSum: 0, humN: 0, soilSum: 0, soilN: 0, windSum: 0, windN: 0, gasSum: 0, gasN: 0 };
    const d = map[day];
    d.kwh  += r.kwhGenerated  ?? 0;
    d.co2  += r.co2AvoidedKg  ?? 0;
    if (r.temperatureC   != null) { d.tempSum  += r.temperatureC;   d.tempN++;  }
    if (r.humidityPct    != null) { d.humSum   += r.humidityPct;    d.humN++;   }
    if (r.soilMoisturePct!= null) { d.soilSum  += r.soilMoisturePct; d.soilN++; }
    if (r.windSpeedMs    != null) { d.windSum  += r.windSpeedMs;    d.windN++;  }
    if (r.gasFlowM3h     != null) { d.gasSum   += r.gasFlowM3h;     d.gasN++;   }
  }

  const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  let cumCo2 = 0;
  return sorted.map(([date, d]) => {
    cumCo2 += d.co2;
    return {
      date: shortDate(date),
      kwh:       parseFloat(d.kwh.toFixed(1)),
      co2Kg:     parseFloat(d.co2.toFixed(1)),
      cumCo2Kg:  parseFloat(cumCo2.toFixed(1)),
      avgTemp:   d.tempN  > 0 ? parseFloat((d.tempSum  / d.tempN).toFixed(1))  : null,
      avgHum:    d.humN   > 0 ? parseFloat((d.humSum   / d.humN).toFixed(0))   : null,
      avgSoil:   d.soilN  > 0 ? parseFloat((d.soilSum  / d.soilN).toFixed(0))  : null,
      avgWind:   d.windN  > 0 ? parseFloat((d.windSum  / d.windN).toFixed(1))  : null,
      gasFlow:   d.gasN   > 0 ? parseFloat((d.gasSum   / d.gasN).toFixed(2))   : null,
    };
  });
}

// ── Chart section components ──────────────────────────────────────────────────

function EnergyCharts({ readings, energyType }: { readings: DeviceReading[]; energyType: string | null }) {
  const daily = aggregateDaily(readings);
  const hasTemp  = daily.some(d => d.avgTemp  != null);
  const hasHum   = daily.some(d => d.avgHum   != null);
  const hasWind  = daily.some(d => d.avgWind  != null);
  const hasGas   = daily.some(d => d.gasFlow  != null);
  const hasClimate = hasTemp || hasHum;

  const isCookstove  = energyType === 'COOKSTOVES' || energyType === 'BIOCHARCOAL';
  const kwhLabel     = isCookstove ? 'Fuel Displaced (kg)' : 'kWh Generated';
  const kwhColor     = '#f59e0b';
  const co2Color     = '#16a34a';

  // Skip chart if only 1 data point
  if (daily.length < 2) return (
    <p className="text-sm text-gray-400 text-center py-4">Not enough data for charts yet (need at least 2 days).</p>
  );

  return (
    <div className="space-y-6">

      {/* kWh / fuel */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {isCookstove ? '🍳 Daily Fuel Displaced (kg)' : '⚡ Daily Energy Generation (kWh)'}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip unit={isCookstove ? 'kg' : 'kWh'} />} />
            <Bar dataKey="kwh" name={kwhLabel} fill={kwhColor} radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative CO₂ */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🌿 Cumulative CO₂ Avoided (kg)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={co2Color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={co2Color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip unit="kg CO₂e" />} />
            <Area dataKey="cumCo2Kg" name="Cumulative CO₂" stroke={co2Color} strokeWidth={2} fill="url(#co2Grad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Biogas flow */}
      {hasGas && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🔥 Biogas Flow Rate (m³/hr)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit="m³/hr" />} />
              <Line dataKey="gasFlow" name="Gas Flow" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Wind speed */}
      {hasWind && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💨 Wind Speed (m/s)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit="m/s" />} />
              <Line dataKey="avgWind" name="Wind Speed" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Climate sensors */}
      {hasClimate && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🌡️ Climate Sensors</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
              <YAxis yAxisId="temp" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {hasTemp && <Line yAxisId="temp" dataKey="avgTemp" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />}
              {hasHum  && <Line yAxisId="hum"  dataKey="avgHum"  name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function NdviChart({ snapshots }: { snapshots: SatelliteSnapshot[] }) {
  if (snapshots.length < 2) return null;

  const data = [...snapshots]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map(s => ({
      date: shortDate(s.capturedAt),
      ndvi: parseFloat(s.ndvi.toFixed(3)),
      cloudCover: s.cloudCover,
    }));

  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">🛰️ NDVI Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          {/* Threshold reference lines */}
          <ReferenceLine y={0.5} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: 'Dense', position: 'right', fontSize: 10, fill: '#16a34a' }} />
          <ReferenceLine y={0.2} stroke="#d97706" strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: 'Sparse', position: 'right', fontSize: 10, fill: '#d97706' }} />
          <Line dataKey="ndvi" name="NDVI" stroke="#16a34a" strokeWidth={2.5}
            dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1">
        Green line = 0.5 threshold (dense vegetation) · Amber line = 0.2 threshold (sparse)
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [project,   setProject]   = useState<Project | null>(null);
  const [snapshots, setSnapshots] = useState<SatelliteSnapshot[]>([]);
  const [refreshingNdvi, setRefreshingNdvi] = useState(false);
  const [ndviError, setNdviError] = useState<string | null>(null);

  async function refreshNdvi() {
    if (!id) return;
    setRefreshingNdvi(true);
    setNdviError(null);
    try {
      const r = await fetch(`/api/projects/${id}/satellites/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then(r => r.json());
      if (!r?.success) throw new Error(r?.error || "Refresh failed");
      // Re-fetch the satellite list so the new row appears in the chart.
      const list = await fetch(`/api/projects/${id}/satellites`).then(r => r.json());
      if (list?.success) setSnapshots(list.data ?? []);
    } catch (err) {
      setNdviError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshingNdvi(false);
    }
  }
  const [readings,  setReadings]  = useState<DeviceReading[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getUser>>(null);

  // Boundary update state
  const [showBoundaryEditor, setShowBoundaryEditor] = useState(false);
  const [boundaryJson, setBoundaryJson]   = useState('');
  const [boundaryPreview, setBoundaryPreview] = useState<object | null>(null);
  const [boundaryError,   setBoundaryError]   = useState('');
  const [savingBoundary,  setSavingBoundary]  = useState(false);
  const [boundarySaved,   setBoundarySaved]   = useState(false);

  useEffect(() => { setCurrentUser(getUser()); }, []);

  const saveBoundary = async (clear = false) => {
    let parsed: object | null = null;
    if (!clear) {
      try { parsed = JSON.parse(boundaryJson); } catch { setBoundaryError('Invalid JSON — check your GeoJSON syntax'); return; }
    }
    setSavingBoundary(true); setBoundaryError('');
    const r = await fetch(`/api/projects/${id}/boundary`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boundary: clear ? null : parsed }),
    });
    const d = await r.json();
    setSavingBoundary(false);
    if (d.success) {
      setProject(prev => prev ? { ...prev, boundary: clear ? null : parsed } : prev);
      setBoundaryPreview(null); setBoundaryJson('');
      setBoundarySaved(true); setShowBoundaryEditor(false);
      setTimeout(() => setBoundarySaved(false), 3000);
    } else {
      setBoundaryError(d.error ?? 'Save failed');
    }
  };

  useEffect(() => {
    if (!id) return;
    // Decoupled fetches: the project lookup MUST succeed for the page to render,
    // but satellites + IoT readings are decorative — if those services are down
    // (e.g. iot-service hit EADDRINUSE) we still want the page to load.
    async function loadProject() {
      try {
        const projectRes = await fetch(`/api/projects/${id}`).then(r => r.json());
        if (!projectRes?.success) {
          setError(projectRes?.error || 'Project not found');
          return;
        }
        setProject(projectRes.data);
      } catch (err) {
        console.error('[project-detail] failed to fetch project', err);
        setError('Failed to reach the project service.');
      } finally {
        setLoading(false);
      }
    }
    async function loadSatellites() {
      try {
        const r = await fetch(`/api/projects/${id}/satellites`).then(r => r.json());
        if (r?.success) setSnapshots(r.data ?? []);
      } catch (err) {
        console.warn('[project-detail] satellites unavailable', err);
      }
    }
    async function loadReadings() {
      try {
        const r = await fetch(`/api/iot/projects/${id}/readings?limit=200`).then(r => r.json());
        if (r?.success) setReadings(r.data ?? []);
      } catch (err) {
        console.warn('[project-detail] iot readings unavailable', err);
      }
    }
    loadProject();
    loadSatellites();
    loadReadings();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || 'Project not found'}</p>
        <button onClick={() => router.back()} className="btn-secondary">Go back</button>
      </div>
    );
  }

  const isEnergy           = !!project.energyType;
  const latestVerification = project.verifications[0];
  const heroPhoto = project.mediaUrls?.[0]
    || (isEnergy
      ? (ENERGY_TYPE_PHOTOS[project.energyType!] ?? ENERGY_TYPE_PHOTOS.SOLAR_PV)
      : (LAND_TYPE_PHOTOS[project.landType!]     ?? LAND_TYPE_PHOTOS.FOREST));
  const typeEmoji = isEnergy
    ? (ENERGY_TYPE_EMOJIS[project.energyType!] ?? '⚡')
    : (LAND_TYPE_EMOJIS[project.landType!]     ?? '🌍');
  const typeLabel = isEnergy
    ? (ENERGY_TYPE_LABELS[project.energyType!] ?? project.energyType)
    : (project.landType ? project.landType.charAt(0) + project.landType.slice(1).toLowerCase() : '');

  const totalKwh   = readings.reduce((s, r) => s + (r.kwhGenerated ?? 0), 0);
  const totalCo2Kg = readings.reduce((s, r) => s + (r.co2AvoidedKg ?? 0), 0);
  const latestReading = readings[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className={`relative h-56 md:h-72 overflow-hidden ${isEnergy ? 'bg-amber-950' : 'bg-forest-950'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroPhoto} alt={typeLabel ?? ''} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className={`absolute inset-0 bg-gradient-to-t ${isEnergy ? 'from-amber-950/90 via-amber-950/30' : 'from-forest-950/90 via-forest-950/30'} to-transparent`} />
        <div className="absolute inset-x-0 bottom-0 max-w-5xl mx-auto px-4 pb-5">
          <Link href="/map" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Map
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-2xl">{typeEmoji}</span>
            <h1 className="text-2xl md:text-3xl font-black text-white">{project.title}</h1>
            <span className={STATUS_COLORS[project.status] ?? 'badge-gray'}>{project.status.replace('_', ' ')}</span>
            {isEnergy && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-full">
                ⚡ Clean Energy
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm">
            {project.country}{project.region ? `, ${project.region}` : ''} · {typeLabel}
            {isEnergy && project.capacityKw ? ` · ${project.capacityKw} kW` : ` · ${project.hectares.toLocaleString()} ha`}
          </p>
        </div>
      </div>

      {/* Review status banner — only visible to the owner and admins */}
      {(currentUser?.id === project.owner.id || currentUser?.role === 'ADMIN') && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          {project.status === 'PENDING' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-amber-900 mb-0.5">Awaiting Kabon.Africa review</div>
                <p className="text-amber-800 leading-relaxed">
                  Your project is queued for admin review. You can still update details and upload documents.
                  Once approved, it moves on to independent carbon verification.
                </p>
              </div>
            </div>
          )}
          {project.status === 'UNDER_REVIEW' && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-blue-900 mb-0.5">In carbon verification</div>
                <p className="text-blue-800 leading-relaxed">
                  Approved by Kabon.Africa. An independent verifier is now assessing the carbon impact.
                </p>
              </div>
            </div>
          )}
          {(project.status === 'VERIFIED' || project.status === 'ACTIVE') && (
            <div className="flex items-start gap-3 bg-forest-50 border border-forest-200 rounded-2xl px-5 py-4">
              <CheckCircle className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-forest-900 mb-0.5">
                  Verified ✓
                  {latestVerification?.carbonTons != null && (
                    <span className="font-normal text-forest-700">
                      {' '}— {latestVerification.carbonTons.toLocaleString()} tonnes CO₂e confirmed
                    </span>
                  )}
                </div>
                <p className="text-forest-800 leading-relaxed">
                  Independent carbon assessment complete. Credits have been minted and {project.status === 'ACTIVE' ? 'are live on the marketplace.' : 'will appear in your dashboard once minted on-chain.'}
                </p>
              </div>
            </div>
          )}
          {project.status === 'REJECTED' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-red-900 mb-0.5">Review needs attention</div>
                {project.rejectionReason && (
                  <p className="text-red-800 leading-relaxed whitespace-pre-wrap">
                    <strong>Reason:</strong> {project.rejectionReason}
                  </p>
                )}
                <p className="text-red-800 leading-relaxed mt-1">
                  Reply in the comments below once you've addressed the issue — we'll re-review.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Review comments — owner + admin only */}
          {(currentUser?.id === project.owner.id || currentUser?.role === 'ADMIN') && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-forest-600" /> Review Comments
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Private conversation between you and the Kabon.Africa team. Buyers and verifiers cannot see this thread.
              </p>
              <ProjectCommentThread
                projectId={project.id}
                currentUserId={currentUser?.id ?? ''}
              />
            </div>
          )}

          {/* Description */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              {isEnergy ? <Zap className="w-4 h-4 text-amber-500" /> : <Leaf className="w-4 h-4 text-forest-600" />}
              About this Project
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{project.description}</p>

            {/* Methodology badge — links to the standard page so buyers can read the methodology */}
            {project.methodology && (
              <Link
                href={`/standard#${project.methodology.code}`}
                className="mt-4 flex items-center gap-3 bg-forest-50 hover:bg-forest-100 border border-forest-100 rounded-xl p-3 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-forest-200 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-4 h-4 text-forest-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-forest-700">Verified under</div>
                  <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-forest-800">
                    {project.methodology.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Kabon Carbon Standard · {project.methodology.code} · {project.methodology.bufferPercent}% buffer reserve
                  </div>
                </div>
              </Link>
            )}

            {/* Photo gallery strip */}
            {project.mediaUrls && project.mediaUrls.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {project.mediaUrls.slice(1).map((url, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={url} alt="" className="h-20 w-28 object-cover rounded-xl flex-shrink-0 border border-gray-100 shadow-sm" />
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest-600" /> Location
            </h2>
            <DynamicMapPicker
              lat={project.lat}
              lng={project.lng}
              readonly
              boundary={boundaryPreview ?? project.boundary}
              hectares={project.hectares}
              typeColor={isEnergy ? '#f59e0b' : (LAND_TYPE_HEX[project.landType ?? ''] ?? '#16a34a')}
            />
            <p className="mt-2 text-xs text-gray-400">{project.lat.toFixed(6)}, {project.lng.toFixed(6)}</p>
          </div>

          {/* Update Boundary (land project owner only) */}
          {!isEnergy && currentUser?.id === project.owner.id && (
            <div className="card border border-dashed border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Pencil className="w-4 h-4 text-forest-600" /> Land Boundary
                </h2>
                <div className="flex items-center gap-2">
                  {boundarySaved && (
                    <span className="flex items-center gap-1 text-xs text-forest-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {project.boundary && !showBoundaryEditor && (
                    <button
                      onClick={() => saveBoundary(true)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Clear boundary
                    </button>
                  )}
                  <button
                    onClick={() => setShowBoundaryEditor(v => !v)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {showBoundaryEditor ? 'Cancel' : project.boundary ? 'Update' : 'Add boundary'}
                  </button>
                </div>
              </div>

              {!showBoundaryEditor && (
                <p className="text-xs text-gray-400 mt-2">
                  {project.boundary
                    ? 'A GeoJSON boundary is stored — visible on the map above.'
                    : `No precise boundary stored. The map shows an approximate ${Math.round(Math.sqrt((project.hectares * 10000) / Math.PI) / 100) / 10} km radius circle based on ${project.hectares.toLocaleString()} ha.`}
                </p>
              )}

              {showBoundaryEditor && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Paste a GeoJSON Polygon, Feature, or FeatureCollection from your GPS survey tool.
                    The map above will preview it as you type.
                  </p>
                  <textarea
                    className="input font-mono text-xs resize-y"
                    rows={5}
                    placeholder={'{ "type": "Polygon", "coordinates": [[[36.8, -1.3], [36.9, -1.3], [36.9, -1.2], [36.8, -1.2], [36.8, -1.3]]] }'}
                    value={boundaryJson}
                    onChange={e => {
                      setBoundaryJson(e.target.value);
                      setBoundaryError('');
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setBoundaryPreview(parsed);
                      } catch {
                        setBoundaryPreview(null);
                      }
                    }}
                  />
                  {boundaryError && (
                    <p className="text-xs text-red-600">{boundaryError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveBoundary(false)}
                      disabled={savingBoundary || !boundaryJson.trim()}
                      className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {savingBoundary ? (
                        <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Save Boundary
                    </button>
                    <button
                      onClick={() => { setShowBoundaryEditor(false); setBoundaryJson(''); setBoundaryPreview(null); setBoundaryError(''); }}
                      className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Energy: IoT monitoring + charts */}
          {isEnergy && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Live IoT Monitoring
              </h2>

              {readings.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">📡</div>
                  <p className="text-sm">No IoT readings yet — devices post data once registered and deployed.</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-amber-50 rounded-xl p-3.5 text-center">
                      <div className="text-2xl font-black text-amber-700">{totalKwh.toFixed(0)}</div>
                      <div className="text-xs text-amber-600 mt-0.5">kWh Generated</div>
                    </div>
                    <div className="bg-forest-50 rounded-xl p-3.5 text-center">
                      <div className="text-2xl font-black text-forest-700">{(totalCo2Kg / 1000).toFixed(2)}</div>
                      <div className="text-xs text-forest-600 mt-0.5">tCO₂e Avoided</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3.5 text-center">
                      <div className="text-2xl font-black text-blue-700">{latestReading?.householdsServed ?? readings.length}</div>
                      <div className="text-xs text-blue-600 mt-0.5">{latestReading?.householdsServed != null ? 'Households' : 'Readings'}</div>
                    </div>
                  </div>

                  {/* Charts */}
                  <EnergyCharts readings={readings} energyType={project.energyType} />

                  {/* Recent readings table */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Readings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 pr-3 font-semibold text-gray-500">Date</th>
                            <th className="text-left py-2 pr-3 font-semibold text-gray-500">Device</th>
                            <th className="text-left py-2 pr-3 font-semibold text-gray-500">kWh</th>
                            <th className="text-left py-2 pr-3 font-semibold text-gray-500">CO₂ Avoided</th>
                            <th className="text-left py-2 pr-3 font-semibold text-gray-500">Temp</th>
                            <th className="text-left py-2 font-semibold text-gray-500">Humidity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {readings.slice(0, 10).map((r) => (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 pr-3 text-gray-600">
                                {new Date(r.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </td>
                              <td className="py-2 pr-3 text-gray-400">{r.device.label ?? r.device.deviceType.replace('_', ' ')}</td>
                              <td className="py-2 pr-3 font-bold text-amber-700">{r.kwhGenerated != null ? r.kwhGenerated.toFixed(1) : '—'}</td>
                              <td className="py-2 pr-3 text-forest-700">{r.co2AvoidedKg != null ? `${r.co2AvoidedKg.toFixed(1)} kg` : '—'}</td>
                              <td className="py-2 pr-3 text-gray-600">{fmt(r.temperatureC, '°C')}</td>
                              <td className="py-2 text-gray-600">{fmt(r.humidityPct, '%', 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {readings.length > 10 && (
                      <p className="text-xs text-gray-400 mt-2">Showing 10 of {readings.length} readings</p>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    CO₂ avoided uses East Africa grid emission factor (0.498 kg CO₂e / kWh).
                  </p>
                </>
              )}
            </div>
          )}

          {/* Land: NDVI satellite history + chart */}
          {!isEnergy && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-forest-600" /> Satellite NDVI Monitoring
              </h2>

              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🛰️</div>
                  <p className="text-sm mb-4">
                    No satellite snapshot has been pulled for this project yet.
                  </p>
                  <button
                    onClick={refreshNdvi}
                    disabled={refreshingNdvi}
                    className="btn-primary py-2 px-5 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {refreshingNdvi
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>🛰️</>
                    }
                    {refreshingNdvi ? "Fetching from Sentinel-2…" : "Fetch NDVI now"}
                  </button>
                  {ndviError && (
                    <p className="text-xs text-red-600 mt-3 max-w-md mx-auto">{ndviError}</p>
                  )}
                </div>
              ) : (
                <>
                  <NdviChart snapshots={snapshots} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-4 font-semibold text-gray-600">Date</th>
                          <th className="text-left py-2 pr-4 font-semibold text-gray-600">NDVI</th>
                          <th className="text-left py-2 pr-4 font-semibold text-gray-600">Health</th>
                          <th className="text-left py-2 pr-4 font-semibold text-gray-600">Cloud Cover</th>
                          <th className="text-left py-2 font-semibold text-gray-600">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.map((snap) => (
                          <tr key={snap.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2.5 pr-4 text-gray-700">
                              {new Date(snap.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${ndviColor(snap.ndvi)}`}>
                                {snap.ndvi.toFixed(3)}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-gray-600">{ndviLabel(snap.ndvi)}</td>
                            <td className="py-2.5 pr-4 text-gray-600">{snap.cloudCover}%</td>
                            <td className="py-2.5 text-gray-400 text-xs capitalize">{snap.source.replace('-', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    NDVI: &gt;0.5 = dense vegetation · 0.2–0.5 = moderate · &lt;0.2 = sparse/bare
                  </p>
                </>
              )}
            </div>
          )}

          {/* Climate sensors for land projects */}
          {!isEnergy && readings.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-blue-500" /> Climate Sensor Data
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {latestReading?.temperatureC    != null && <div className="bg-orange-50 rounded-xl p-3 text-center"><Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" /><div className="font-bold text-orange-700">{latestReading.temperatureC.toFixed(1)}°C</div><div className="text-xs text-gray-500">Temperature</div></div>}
                {latestReading?.humidityPct     != null && <div className="bg-blue-50 rounded-xl p-3 text-center"><Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" /><div className="font-bold text-blue-700">{latestReading.humidityPct.toFixed(0)}%</div><div className="text-xs text-gray-500">Humidity</div></div>}
                {latestReading?.soilMoisturePct != null && <div className="bg-amber-50 rounded-xl p-3 text-center"><Droplets className="w-4 h-4 text-amber-600 mx-auto mb-1" /><div className="font-bold text-amber-700">{latestReading.soilMoisturePct.toFixed(0)}%</div><div className="text-xs text-gray-500">Soil Moisture</div></div>}
                {latestReading?.windSpeedMs     != null && <div className="bg-gray-50 rounded-xl p-3 text-center"><Wind className="w-4 h-4 text-gray-500 mx-auto mb-1" /><div className="font-bold text-gray-700">{latestReading.windSpeedMs.toFixed(1)} m/s</div><div className="text-xs text-gray-500">Wind Speed</div></div>}
              </div>
              {/* Climate chart */}
              {aggregateDaily(readings).length >= 2 && (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={aggregateDaily(readings)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="avgTemp" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line dataKey="avgHum"  name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-gray-400 mt-2">Latest reading: {new Date(latestReading!.recordedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="card space-y-4">
            {isEnergy ? (
              <>
                {project.capacityKw && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Installed Capacity</span>
                    <span className="font-bold text-gray-900">{project.capacityKw} kW</span>
                  </div>
                )}
                {project.householdsServed && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Households Served</span>
                    <span className="font-bold text-gray-900">{project.householdsServed.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Est. CO₂e / year</span>
                  <span className="font-bold text-amber-700">{project.estimatedTons.toLocaleString()} t</span>
                </div>
                {readings.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Measured CO₂e</span>
                    <span className="font-bold text-forest-700">{(totalCo2Kg / 1000).toFixed(2)} t</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Area</span>
                  <span className="font-bold text-gray-900">{project.hectares.toLocaleString()} ha</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Est. CO₂/year</span>
                  <span className="font-bold text-gray-900">{project.estimatedTons.toLocaleString()} t</span>
                </div>
                {latestVerification?.carbonTons && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Verified CO₂</span>
                    <span className="font-bold text-forest-700">{latestVerification.carbonTons.toLocaleString()} t</span>
                  </div>
                )}
                {snapshots[0] && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Latest NDVI</span>
                    <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${ndviColor(snapshots[0].ndvi)}`}>
                      {snapshots[0].ndvi.toFixed(3)}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">
                Submitted {new Date(project.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Project Owner
            </h3>
            <p className="font-semibold text-gray-900">{project.owner.name}</p>
            {project.owner.country && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Globe className="w-3 h-3" /> {project.owner.country}
              </p>
            )}
          </div>

          {latestVerification?.notes && (
            <div className={`card border-l-4 ${isEnergy ? 'border-amber-400' : 'border-forest-400'}`}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Verifier Notes</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{latestVerification.notes}</p>
            </div>
          )}

          {/* Real-world equivalents (energy projects with CO₂ data) */}
          {isEnergy && totalCo2Kg > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🌍 Impact Equivalents</h3>
              <p className="text-xs text-gray-400 mb-3">
                {(totalCo2Kg / 1000).toFixed(2)} tCO₂e avoided is equivalent to:
              </p>
              <div className="space-y-2.5">
                <EquivalentRow
                  emoji="🚗"
                  label="Cars off the road"
                  value={Math.round(totalCo2Kg / 1000 / 2.4)}
                  unit="for 1 year"
                />
                <EquivalentRow
                  emoji="✈️"
                  label="Flights avoided"
                  value={Math.round(totalCo2Kg / 255)}
                  unit="London–Nairobi"
                />
                <EquivalentRow
                  emoji="🌳"
                  label="Trees absorbing for"
                  value={Math.round(totalCo2Kg / 1000 / 0.021)}
                  unit="1 year"
                />
                <EquivalentRow
                  emoji="🏠"
                  label="Homes powered"
                  value={Math.round(totalCo2Kg / 1000 / 1.2)}
                  unit="for 1 year"
                />
              </div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Calculated using country-specific grid emission factors via emissions.dev
              </p>
            </div>
          )}

          <Link href="/marketplace" className="btn-primary w-full text-center block">
            Browse Credits in Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
