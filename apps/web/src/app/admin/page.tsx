'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getToken, isAdminLike, isReadOnly } from '@/lib/auth';
import ReadOnlyBanner from '@/components/admin/ReadOnlyBanner';
import {
  Users, ShieldCheck, BarChart3, TrendingUp,
  CheckCircle, XCircle, Clock, Leaf, RefreshCw, Cpu, Plus, WifiOff,
  ArrowRight, DollarSign, Award, AlertCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import PurchaseDetailModal from '@/components/admin/PurchaseDetailModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentVerification {
  id: string; status: string; createdAt: string;
  project: { id: string; title: string; country: string };
  verifier: { name: string } | null;
}
interface RecentUser {
  id: string; name: string; email: string | null; role: string; country: string | null; createdAt: string;
}
interface RecentPurchase {
  id: string; totalTons: number; totalPrice: number; currency: string; retired: boolean; createdAt: string;
  buyer: { name: string };
  listing: { credit: { project: { title: string; country: string } } };
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  verifiedProjects: number;
  pendingVerifications: number;
  inProgressVerifications: number;
  totalCreditsIssued: number;
  totalPurchases: number;
  retiredCredits: number;
  totalRevenue: number;
  projectsByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  recentVerifications: RecentVerification[];
  recentUsers: RecentUser[];
  recentPurchases: RecentPurchase[];
}

interface UserRow {
  id: string; name: string; email: string | null; role: string;
  country: string | null; kycVerified: boolean; createdAt: string;
  walletAddress: string | null; _count: { projects: number; purchases: number };
}

interface VerificationRow {
  id: string; status: string; carbonTons?: number | null; notes?: string | null;
  reportIpfsHash?: string | null; createdAt: string;
  project: { title: string; id: string };
  verifier?: { id: string; name: string } | null;
}

interface DeviceRow {
  id: string; deviceType: string; label: string | null; lat: number | null; lng: number | null;
  active: boolean; lastSeenAt: string | null; createdAt: string;
  project: { id: string; title: string; projectType: string; energyType: string | null; country: string };
  _count: { readings: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow', UNDER_REVIEW: 'badge-blue', VERIFIED: 'badge-green',
  ACTIVE: 'badge-green', REJECTED: 'badge-red', COMPLETED: 'badge-gray',
  IN_PROGRESS: 'badge-blue',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800', VERIFIER: 'bg-blue-100 text-blue-700',
  LANDOWNER: 'bg-forest-100 text-forest-800', BUYER: 'bg-savanna-100 text-savanna-800',
  COMMUNITY_PARTNER: 'bg-emerald-100 text-emerald-800',
  VIEWER: 'bg-gray-200 text-gray-700',
};

const PIE_PALETTE = ['#16a34a', '#ca8a04', '#2563eb', '#9333ea', '#dc2626', '#6b7280'];
const BAR_PALETTE: Record<string, string> = {
  LANDOWNER: '#16a34a', BUYER: '#ca8a04', VERIFIER: '#2563eb', ADMIN: '#9333ea',
  COMMUNITY_PARTNER: '#059669', VIEWER: '#6b7280',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}
function fmt(n: number, decimals = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color, onClick,
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200' : ''}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'verifications' | 'devices';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const [reviewForms, setReviewForms] = useState<Record<string, { carbonTons: string; notes: string; saving: boolean }>>({});
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [newDevice, setNewDevice] = useState({ projectId: '', deviceType: 'ENERGY_METER', label: '', lat: '', lng: '' });
  const [newDeviceKey, setNewDeviceKey] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) { router.push('/login'); return; }
    if (!isAdminLike(u.role)) { router.replace('/dashboard'); }
  }, [router]);

  const readOnly = isReadOnly(user?.role);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const r = await fetch('/api/admin/stats', { headers: authHeaders() });
    const d = await r.json();
    if (d.success) setStats(d.data);
    setStatsLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/users?pageSize=50', { headers: authHeaders() });
    const d = await r.json();
    if (d.success) setUsers(d.data.items);
    setLoading(false);
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/verifications', { headers: authHeaders() });
    const d = await r.json();
    if (d.success) setVerifications(d.data?.items ?? []);
    setLoading(false);
  }, []);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/iot/devices?pageSize=100', { headers: authHeaders() });
    const d = await r.json();
    if (d.success) setDevices(d.data.devices ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (tab === 'users')         loadUsers();
    if (tab === 'verifications') loadVerifications();
    if (tab === 'devices')       loadDevices();
  }, [tab, loadUsers, loadVerifications, loadDevices]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const updateUserRole = async (id: string, role: string) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ role }),
    });
    const d = await r.json();
    if (d.success) { setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u)); notify(`Role updated to ${role}`); }
  };

  const toggleKyc = async (id: string, current: boolean) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ kycVerified: !current }),
    });
    const d = await r.json();
    if (d.success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, kycVerified: !current } : u));
      notify(!current ? 'KYC verified ✓' : 'KYC revoked');
    }
  };

  const assignVerification = async (id: string) => {
    const r = await fetch(`/api/verifications/${id}/assign`, { method: 'PATCH', headers: authHeaders() });
    const d = await r.json();
    if (d.success) { notify('Assigned to you'); loadVerifications(); loadStats(); }
    else notify('Failed: ' + (d.error ?? 'Unknown'));
  };

  const reviewVerification = async (id: string, outcome: 'APPROVED' | 'REJECTED') => {
    const form = reviewForms[id] ?? { carbonTons: '', notes: '', saving: false };
    setReviewForms(prev => ({ ...prev, [id]: { ...form, saving: true } }));
    const r = await fetch(`/api/verifications/${id}/review`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({
        decision: outcome,
        carbonTons: form.carbonTons ? parseFloat(form.carbonTons) : undefined,
        notes: form.notes || undefined,
      }),
    });
    const d = await r.json();
    setReviewForms(prev => ({ ...prev, [id]: { ...form, saving: false } }));
    if (d.success) {
      notify(outcome === 'APPROVED' ? 'Verification approved ✓' : 'Verification rejected');
      loadVerifications(); loadStats();
    } else notify('Failed: ' + (d.error ?? 'Unknown'));
  };

  const registerDevice = async () => {
    const r = await fetch('/api/iot/devices', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        projectId: newDevice.projectId, deviceType: newDevice.deviceType,
        label: newDevice.label || undefined,
        lat: newDevice.lat ? parseFloat(newDevice.lat) : undefined,
        lng: newDevice.lng ? parseFloat(newDevice.lng) : undefined,
      }),
    });
    const d = await r.json();
    if (d.success) {
      setNewDeviceKey(d.data.deviceKey);
      setNewDevice({ projectId: '', deviceType: 'ENERGY_METER', label: '', lat: '', lng: '' });
      loadDevices();
    } else notify('Failed: ' + (d.error ?? 'Unknown error'));
  };

  const toggleDevice = async (id: string, active: boolean) => {
    const r = await fetch(`/api/iot/devices/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ active: !active }),
    });
    const d = await r.json();
    if (d.success) {
      setDevices(prev => prev.map(dv => dv.id === id ? { ...dv, active: !active } : dv));
      notify(!active ? 'Device activated' : 'Device deactivated');
    }
  };

  if (!user || !isAdminLike(user.role)) return null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',      label: 'Overview',      icon: BarChart3 },
    { id: 'users',         label: 'Users',         icon: Users },
    { id: 'verifications', label: 'Verifications', icon: ShieldCheck },
    { id: 'devices',       label: 'IoT Devices',   icon: Cpu },
  ];

  // Chart data
  const roleChartData = stats
    ? Object.entries(stats.usersByRole).map(([role, count]) => ({ name: role, value: count }))
    : [];
  const statusChartData = stats
    ? Object.entries(stats.projectsByStatus).map(([status, count]) => ({ status: status.replace('_', ' '), count }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-forest-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Kabon.Africa platform management</p>
              </div>
            </div>
            {tab === 'overview' && (
              <button
                onClick={loadStats}
                disabled={statsLoading}
                className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            )}
          </div>

          <div className="flex gap-1 mt-5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-forest-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
                {t.id === 'verifications' && stats && stats.pendingVerifications > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {stats.pendingVerifications}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {statsLoading && !stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />)}
              </div>
            ) : stats ? (
              <>
                {/* ── Top KPIs ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Users"          value={fmt(stats.totalUsers)}          icon={Users}        color="bg-blue-100 text-blue-700"     onClick={() => setTab('users')} />
                  <StatCard label="Credits Issued"       value={`${fmt(stats.totalCreditsIssued, 1)} t`} icon={Leaf} color="bg-forest-100 text-forest-700" />
                  <StatCard label="Pending Verifications" value={fmt(stats.pendingVerifications)} sub={`${stats.inProgressVerifications} in review`} icon={Clock} color="bg-orange-100 text-orange-700" onClick={() => setTab('verifications')} />
                  <StatCard label="Total Revenue"        value={`$${fmt(stats.totalRevenue, 0)}`} sub={`${fmt(stats.totalPurchases)} purchases`} icon={DollarSign} color="bg-savanna-100 text-savanna-700" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Projects"    value={fmt(stats.totalProjects)}    sub={`${stats.activeProjects} active`}   icon={TrendingUp}  color="bg-emerald-100 text-emerald-700" />
                  <StatCard label="Verified Projects" value={fmt(stats.verifiedProjects)} icon={CheckCircle} color="bg-green-100 text-green-700" />
                  <StatCard label="Total Purchases"   value={fmt(stats.totalPurchases)}   icon={Award}       color="bg-purple-100 text-purple-700" />
                  <StatCard label="Credits Retired"   value={fmt(stats.retiredCredits)}   sub={stats.totalPurchases > 0 ? `${Math.round(stats.retiredCredits / stats.totalPurchases * 100)}% of purchases` : undefined} icon={XCircle} color="bg-sky-100 text-sky-700" />
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Users by role */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Users by Role</h3>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={roleChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                            {roleChartData.map((entry, i) => (
                              <Cell key={entry.name} fill={BAR_PALETTE[entry.name] ?? PIE_PALETTE[i % PIE_PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [fmt(v), 'Users']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Projects by status */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Projects by Status</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={statusChartData} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Activity feeds ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Recent verifications */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-500" /> Verifications
                      </h3>
                      <button onClick={() => setTab('verifications')}
                        className="text-xs text-forest-600 font-semibold hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {stats.pendingVerifications > 0 && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-orange-700">
                            {stats.pendingVerifications} pending assignment
                          </span>
                        </div>
                      )}
                      {stats.recentVerifications.map(v => (
                        <div key={v.id} className="flex items-start gap-3">
                          <span className={`badge mt-0.5 flex-shrink-0 ${STATUS_COLORS[v.status] ?? 'badge-gray'}`}>
                            {v.status.replace('_', ' ')}
                          </span>
                          <div className="min-w-0">
                            <a href={`/projects/${v.project.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-forest-700 truncate block">
                              {v.project.title}
                            </a>
                            <div className="text-xs text-gray-400">
                              {v.project.country} · {v.verifier ? v.verifier.name : 'Unassigned'} · {timeAgo(v.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent purchases */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-savanna-500" /> Recent Purchases
                      </h3>
                    </div>
                    <div className="space-y-1 -mx-2">
                      {stats.recentPurchases.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No purchases yet</p>
                      )}
                      {stats.recentPurchases.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPurchaseId(p.id)}
                          className="w-full text-left flex items-start justify-between gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate group-hover:text-forest-700 transition-colors">
                              {p.listing.credit.project.title}
                            </div>
                            <div className="text-xs text-gray-400">
                              {p.buyer.name} · {p.totalTons} t · {timeAgo(p.createdAt)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-gray-900">${fmt(p.totalPrice, 0)}</div>
                            {p.retired && (
                              <span className="inline-flex items-center gap-1 text-xs text-forest-600 font-medium">
                                <Award className="w-3 h-3" /> Retired
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent users */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> New Users
                      </h3>
                      <button onClick={() => setTab('users')}
                        className="text-xs text-forest-600 font-semibold hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {stats.recentUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.country ?? '—'} · {timeAgo(u.createdAt)}</div>
                          </div>
                          <span className={`badge text-xs flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'badge-gray'}`}>
                            {u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">All Users ({users.length})</h2>
              <button onClick={loadUsers} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Name', 'Email', 'Role', 'Country', 'KYC', 'Projects', 'Joined'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500">{u.email ?? <span className="italic text-gray-300">wallet only</span>}</td>
                        <td className="px-4 py-3">
                          <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                            disabled={readOnly}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {['LANDOWNER', 'BUYER', 'VERIFIER', 'ADMIN', 'COMMUNITY_PARTNER', 'VIEWER'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.country ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleKyc(u.id, u.kycVerified)}
                            disabled={readOnly}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                              u.kycVerified ? 'bg-forest-100 text-forest-700 hover:bg-forest-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {u.kycVerified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {u.kycVerified ? 'Verified' : 'Unverified'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{u._count.projects}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── VERIFICATIONS ── */}
        {tab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Verifications ({verifications.length})</h2>
              <button onClick={loadVerifications} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            {loading ? (
              <div className="card p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : verifications.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No verifications found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.map(v => {
                  const form = reviewForms[v.id] ?? { carbonTons: '', notes: '', saving: false };
                  const isPending    = v.status === 'PENDING';
                  const isInProgress = v.status === 'IN_PROGRESS';
                  const isDone       = ['COMPLETED', 'APPROVED', 'REJECTED'].includes(v.status);
                  return (
                    <div key={v.id} className="card">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`badge ${STATUS_COLORS[v.status] ?? 'badge-gray'}`}>
                              {v.status.replace('_', ' ')}
                            </span>
                            <a href={`/projects/${v.project?.id}`} className="font-semibold text-gray-900 hover:text-forest-700 transition-colors text-sm truncate">
                              {v.project?.title ?? '—'}
                            </a>
                          </div>
                          <div className="text-xs text-gray-400 space-x-3">
                            <span>Verifier: <span className="text-gray-600">{v.verifier?.name ?? 'Unassigned'}</span></span>
                            {v.carbonTons != null && <span>Carbon: <span className="text-gray-600 font-medium">{v.carbonTons.toLocaleString()} t</span></span>}
                            {v.notes && <span className="text-gray-500 italic">{v.notes}</span>}
                            <span>Created: {new Date(v.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isPending && !readOnly && (
                            <button onClick={() => assignVerification(v.id)}
                              className="btn-secondary text-sm py-1.5 px-4 flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50">
                              <ShieldCheck className="w-3.5 h-3.5" /> Assign to Me
                            </button>
                          )}
                          {(isDone || readOnly) && <span className="text-xs text-gray-400 italic">No actions</span>}
                        </div>
                      </div>

                      {isInProgress && !readOnly && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Submit Review</p>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div>
                              <label className="label text-xs">Carbon Tons</label>
                              <input type="number" min="0" step="0.01" className="input w-32 text-sm py-1.5" placeholder="e.g. 42.5"
                                value={form.carbonTons}
                                onChange={e => setReviewForms(prev => ({ ...prev, [v.id]: { ...form, carbonTons: e.target.value } }))} />
                            </div>
                            <div className="flex-1 min-w-40">
                              <label className="label text-xs">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                              <input className="input text-sm py-1.5" placeholder="Reviewer notes…"
                                value={form.notes}
                                onChange={e => setReviewForms(prev => ({ ...prev, [v.id]: { ...form, notes: e.target.value } }))} />
                            </div>
                            <div className="flex gap-2">
                              <button disabled={!form.carbonTons || form.saving}
                                onClick={() => reviewVerification(v.id, 'APPROVED')}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold bg-forest-600 text-white hover:bg-forest-700 disabled:opacity-50 transition-colors">
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button disabled={form.saving}
                                onClick={() => reviewVerification(v.id, 'REJECTED')}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── IoT DEVICES ── */}
        {selectedPurchaseId && (
          <PurchaseDetailModal
            purchaseId={selectedPurchaseId}
            onClose={() => setSelectedPurchaseId(null)}
          />
        )}

        {tab === 'devices' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Cpu className="w-4 h-4 text-amber-500" /> Register New IoT Device</h2>
                {!readOnly && (
                  <button onClick={() => { setShowDeviceForm(v => !v); setNewDeviceKey(null); }}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {showDeviceForm ? 'Cancel' : 'Register Device'}
                  </button>
                )}
              </div>

              {newDeviceKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Device registered! Copy the API key now. It will not be shown again.</p>
                  <div className="font-mono text-xs bg-white border border-amber-200 rounded-lg p-3 break-all select-all text-gray-800">{newDeviceKey}</div>
                  <p className="text-xs text-amber-600 mt-2">Flash this key into the device firmware as <code>X-Device-Key</code> header value.</p>
                </div>
              )}

              {showDeviceForm && !newDeviceKey && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Project ID</label>
                    <input className="input" placeholder="Project cuid…" value={newDevice.projectId}
                      onChange={e => setNewDevice(v => ({ ...v, projectId: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Device Type</label>
                    <select className="input" value={newDevice.deviceType} onChange={e => setNewDevice(v => ({ ...v, deviceType: e.target.value }))}>
                      {['ENERGY_METER','WEATHER_STATION','SOIL_SENSOR','FLOW_METER','FUEL_SENSOR'].map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Label <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="input" placeholder="e.g. Main inverter" value={newDevice.label}
                      onChange={e => setNewDevice(v => ({ ...v, label: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Lat</label>
                      <input type="number" step="any" className="input" placeholder="-1.29" value={newDevice.lat}
                        onChange={e => setNewDevice(v => ({ ...v, lat: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Lng</label>
                      <input type="number" step="any" className="input" placeholder="36.82" value={newDevice.lng}
                        onChange={e => setNewDevice(v => ({ ...v, lng: e.target.value }))} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <button onClick={registerDevice} disabled={!newDevice.projectId} className="btn-primary py-2.5 px-6 disabled:opacity-50">
                      Generate Device Key & Register
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Registered Devices ({devices.length})</h2>
                <button onClick={loadDevices} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
              ) : devices.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No devices registered yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Label / Type','Project','Country','Readings','Last Seen','Status','Toggle'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map(dv => {
                        const minutesAgo = dv.lastSeenAt ? Math.round((Date.now() - new Date(dv.lastSeenAt).getTime()) / 60000) : null;
                        const isOnline = minutesAgo != null && minutesAgo < 10;
                        return (
                          <tr key={dv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{dv.label ?? '—'}</div>
                              <div className="text-xs text-gray-400">{dv.deviceType.replace('_', ' ')}</div>
                            </td>
                            <td className="px-4 py-3">
                              <a href={`/projects/${dv.project.id}`} className="text-forest-700 hover:underline font-medium text-xs line-clamp-1">{dv.project.title}</a>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{dv.project.country}</td>
                            <td className="px-4 py-3 text-gray-600 font-medium">{dv._count.readings.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {dv.lastSeenAt ? (
                                <span className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-forest-600' : 'text-gray-400'}`}>
                                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-forest-500 animate-pulse' : 'bg-gray-300'}`} />
                                  {isOnline ? 'Online' : minutesAgo! < 1440 ? `${minutesAgo}m ago` : new Date(dv.lastSeenAt).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-gray-300"><WifiOff className="w-3 h-3" /> Never</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`badge ${dv.active ? 'badge-green' : 'badge-gray'}`}>{dv.active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleDevice(dv.id, dv.active)}
                                className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${dv.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-forest-200 text-forest-700 hover:bg-forest-50'}`}>
                                {dv.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card bg-amber-50 border-amber-100">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2"><Cpu className="w-4 h-4" /> IoT Integration Guide</h3>
              <p className="text-sm text-amber-800 mb-3">Each registered device gets a unique API key. Configure your hardware to POST readings to:</p>
              <code className="block font-mono text-xs bg-white border border-amber-200 rounded-lg p-3 text-gray-800 mb-3">
                POST https://kabon.africa/api/iot/readings{'\n'}
                X-Device-Key: {'<your-device-key>'}{'\n'}
                Content-Type: application/json{'\n\n'}
                {'{'}{'\n'}
                {'  '}&quot;kwhGenerated&quot;: 12.4,{'\n'}
                {'  '}&quot;temperatureC&quot;: 28.5,{'\n'}
                {'  '}&quot;humidityPct&quot;: 72,{'\n'}
                {'  '}&quot;recordedAt&quot;: &quot;2025-06-01T08:00:00Z&quot;{'\n'}
                {'}'}
              </code>
              <p className="text-xs text-amber-700">Supported fields: <code>kwhGenerated</code>, <code>fuelDisplacedKg</code>, <code>householdsServed</code>, <code>temperatureC</code>, <code>humidityPct</code>, <code>soilMoisturePct</code>, <code>rainfallMm</code>, <code>windSpeedMs</code>, <code>gasFlowM3h</code>, <code>pressureKpa</code>, <code>recordedAt</code></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
