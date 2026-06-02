"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { ScrollText, RefreshCw, Search } from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string | null } | null;
}

const ACTION_COLOR: Record<string, string> = {
  "user.role_change":  "badge badge-blue",
  "user.kyc_change":   "badge badge-blue",
  "purchase.release":  "badge badge-green",
  "purchase.refund":   "badge badge-yellow",
  "purchase.dispute":  "badge badge-red",
  "resale.approve":    "badge badge-green",
  "resale.reject":     "badge badge-red",
  "inquiry.approve":   "badge badge-green",
  "inquiry.reject":    "badge badge-red",
  "partner.approve":   "badge badge-green",
  "partner.reject":    "badge badge-red",
  "buffer.drawdown":   "badge badge-red",
  "verification.issue":"badge badge-green",
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: "200" });
      if (filter !== "ALL") qs.set("action", filter);
      const r = await fetch(`/api/admin/audit-logs?${qs}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      setItems(d.data?.items ?? []);
      if (d.data?.actions) setActions(d.data.actions);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const visible = search.trim()
    ? items.filter(i =>
        (i.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (i.actor?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        i.action.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Audit Log</h1>
              <p className="text-sm text-gray-500 mt-0.5">Trail of privileged actions across the platform</p>
            </div>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Search summary, actor, action…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm sm:max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading && items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audit entries yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={ACTION_COLOR[i.action] ?? "badge badge-gray"}>{i.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-md"><span className="line-clamp-2">{i.summary ?? "—"}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {i.actor ? (
                        <div>
                          <div className="text-gray-700">{i.actor.name}</div>
                          <div className="text-xs text-gray-400">{i.actorRole}</div>
                        </div>
                      ) : <span className="text-gray-400 text-xs">system</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {i.targetType ? <span>{i.targetType}</span> : "—"}
                      {i.targetId && <div className="font-mono text-gray-400 truncate max-w-[140px]">{i.targetId}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell" title={new Date(i.createdAt).toLocaleString()}>
                      {timeAgo(i.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
