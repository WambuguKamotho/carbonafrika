"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { RefreshCw, CheckCircle, XCircle, Search } from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface User {
  id: string; name: string; email: string | null; role: string;
  country: string | null; kycVerified: boolean; createdAt: string;
  walletAddress: string | null; _count: { projects: number; purchases: number };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800", VERIFIER: "bg-blue-100 text-blue-700",
  LANDOWNER: "bg-forest-100 text-forest-800", BUYER: "bg-savanna-100 text-savanna-800",
  COMMUNITY_PARTNER: "bg-emerald-100 text-emerald-800",
  VIEWER: "bg-gray-200 text-gray-700",
};

const ROLES = ["ALL", "LANDOWNER", "BUYER", "VERIFIER", "ADMIN", "COMMUNITY_PARTNER", "VIEWER"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      setUsers(json.data?.items ?? []);
    } finally { setLoading(false); }
  }, [roleFilter, search]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const updateRole = async (id: string, role: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (json.success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      notify(`Role updated to ${role}`);
    }
  };

  const toggleKyc = async (id: string, current: boolean) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kycVerified: !current }),
    });
    const json = await res.json();
    if (json.success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, kycVerified: !current } : u));
      notify(!current ? "KYC verified" : "KYC revoked");
    }
  };

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const counts = ROLES.slice(1).reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-forest-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium">{toast}</div>
      )}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">{users.length} total</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Search name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${roleFilter === r ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                {r === "ALL" ? `All (${users.length})` : `${r} (${counts[r] ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No users found</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["User", "Email", "Role", "Country", "KYC", "Projects", "Purchases", "Joined"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                      {u.email ?? <span className="italic text-gray-300">wallet only</span>}
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {u.role}
                        </span>
                      ) : (
                        <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {["LANDOWNER", "BUYER", "VERIFIER", "ADMIN", "COMMUNITY_PARTNER", "VIEWER"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.country ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => !readOnly && toggleKyc(u.id, u.kycVerified)}
                        disabled={readOnly}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                          u.kycVerified ? "bg-forest-100 text-forest-700" : "bg-gray-100 text-gray-500"
                        } ${readOnly ? "cursor-default" : "hover:opacity-80"}`}>
                        {u.kycVerified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.kycVerified ? "Verified" : "Unverified"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{u._count.projects}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{u._count.purchases}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
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
