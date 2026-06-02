"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import {
  Shield, RefreshCw, TrendingUp, TrendingDown, Scale,
  AlertTriangle, Loader2, X, CheckCircle,
} from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface ProjectRef { id: string; title: string; country: string }
interface LedgerEntry {
  id: string;
  tonnes: number;
  reason: string;
  note: string | null;
  createdAt: string;
  project: ProjectRef | null;
  tokenId: string | null;
}
interface PoolData {
  pool: { totalReserved: number; totalDrawn: number; net: number };
  byReason: Record<string, { tonnes: number; count: number }>;
  items: LedgerEntry[];
  total: number;
}

const REASON_LABEL: Record<string, string> = {
  issuance:          "Issuance",
  reversal_backfill: "Reversal drawdown",
  manual:            "Manual adjustment",
};

function fmt(n: number, d = 1) {
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminBufferPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [data, setData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDraw, setShowDraw] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/buffer-pool?pageSize=200`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (d.success) setData(d.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);
  const pool = data?.pool;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-100 text-forest-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Buffer Pool</h1>
              <p className="text-sm text-gray-500 mt-0.5">Permanence reserve — held against project reversals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button onClick={() => setShowDraw(v => !v)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
                <TrendingDown className="w-4 h-4" /> Record reversal drawdown
              </button>
            )}
            <button onClick={load}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} color="bg-forest-100 text-forest-700"
            value={pool ? `${fmt(pool.totalReserved)} t` : "—"} label="Total reserved" sub="Contributed at issuance" />
          <StatCard icon={TrendingDown} color="bg-red-100 text-red-700"
            value={pool ? `${fmt(pool.totalDrawn)} t` : "—"} label="Total drawn" sub="Retired to cover reversals" />
          <StatCard icon={Scale} color="bg-blue-100 text-blue-700"
            value={pool ? `${fmt(pool.net)} t` : "—"} label="Net available" sub="Reserved − drawn (shown on /standard)" />
        </div>

        {/* Drawdown form */}
        {showDraw && !readOnly && (
          <DrawdownPanel
            available={pool?.net ?? 0}
            onClose={() => setShowDraw(false)}
            onDone={() => { setShowDraw(false); load(); }}
          />
        )}

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Ledger {data ? <span className="text-gray-400 font-normal">({data.total})</span> : null}</h2>
          </div>
          {loading && !data ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pool movements yet. Contributions appear when a verifier approves a project.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tonnes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Note</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map(i => {
                  const isDraw = i.reason === "reversal_backfill";
                  return (
                    <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`badge ${isDraw ? "badge-red" : "badge-green"}`}>
                          {REASON_LABEL[i.reason] ?? i.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {i.project ? (
                          <a href={`/projects/${i.project.id}`} className="text-forest-700 hover:underline font-medium line-clamp-1">
                            {i.project.title}
                          </a>
                        ) : <span className="text-gray-400">—</span>}
                        {i.project && <div className="text-xs text-gray-400">{i.project.country}</div>}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isDraw ? "text-red-600" : "text-forest-700"}`}>
                        {isDraw ? "−" : "+"}{fmt(i.tonnes, 4)} t
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs">
                        <span className="line-clamp-2">{i.note ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">{timeAgo(i.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label, sub }: {
  icon: React.ElementType; color: string; value: string; label: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Drawdown panel ───────────────────────────────────────────────────────────

function DrawdownPanel({ available, onClose, onDone }: {
  available: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [tonnes, setTonnes] = useState("");
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/projects/admin/all?pageSize=200`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await r.json();
        const items = (d.data?.items ?? []) as Array<{ id: string; title: string; country: string }>;
        setProjects(items.map(p => ({ id: p.id, title: p.title, country: p.country })));
      } catch { /* dropdown stays empty — projectId is optional anyway */ }
    })();
  }, []);

  const tonnesNum = parseFloat(tonnes);
  const valid = tonnesNum > 0 && tonnesNum <= available && note.trim().length >= 5;

  async function submit() {
    if (!(tonnesNum > 0)) { setError("Enter a tonnage greater than 0."); return; }
    if (tonnesNum > available) { setError(`Only ${available.toFixed(4)} t available.`); return; }
    if (note.trim().length < 5) { setError("Add a note (min 5 characters) explaining the reversal."); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/buffer-pool/drawdown`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tonnes: tonnesNum, projectId: projectId || undefined, note: note.trim() }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(typeof d.error === "string" ? d.error : "Drawdown failed");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drawdown failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 shadow-card overflow-hidden">
      <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" /> Record a reversal drawdown
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-red-400 hover:bg-red-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Use this when a verified project reverses (fire, conversion, failure). Pooled tonnes are
          spent to keep buyers' offsets whole. This reduces the net pool shown publicly on{" "}
          <span className="font-mono">/standard</span>. <span className="font-semibold text-gray-700">{available.toFixed(4)} t</span> available.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tonnes to draw</label>
            <input type="number" min="0" step="0.0001" max={available} className="input"
              placeholder="e.g. 12.5" value={tonnes} onChange={e => setTonnes(e.target.value)} />
          </div>
          <div>
            <label className="label">Reversed project <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">— not linked —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title} · {p.country}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Reason / note</label>
          <textarea rows={2} className="input text-sm resize-none"
            placeholder="What reversed and why these tonnes are being drawn. Kept in the audit ledger."
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
          <button onClick={submit} disabled={saving || !valid}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl py-2 px-5 text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm drawdown
          </button>
        </div>
      </div>
    </div>
  );
}
