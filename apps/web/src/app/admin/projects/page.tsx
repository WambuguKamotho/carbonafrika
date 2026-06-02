"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { MapPin, Search, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import ProjectApprovalDrawer from "@/components/admin/ProjectApprovalDrawer";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface Project {
  id: string; title: string; status: string; projectType: string;
  landType: string | null; energyType: string | null;
  country: string; hectares: number; estimatedTons: number;
  createdAt: string;
  owner: { name: string; email: string | null };
  _count: { verifications: number; credits: number };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-yellow", UNDER_REVIEW: "badge-blue", VERIFIED: "badge-green",
  ACTIVE: "badge-green", REJECTED: "badge-red", COMPLETED: "badge-gray",
};

const TYPE_EMOJI: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱",
  WETLAND: "💧", MANGROVE: "🌊", SOLAR_PV: "☀️", BIOGAS: "🔥",
  BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};

const STATUSES = ["ALL", "PENDING", "UNDER_REVIEW", "VERIFIED", "ACTIVE", "REJECTED"];

export default function AdminProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const loadPendingCount = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/admin/all?status=PENDING&pageSize=1`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      setPendingCount(d.data?.total ?? 0);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { if (user) loadPendingCount(); }, [user, loadPendingCount]);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/projects/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      setProjects(json.data?.items ?? []);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.country.toLowerCase().includes(search.toLowerCase()) ||
    p.owner.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-0.5">{projects.length} total</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Pending-approval call-out */}
        {pendingCount > 0 && statusFilter !== "PENDING" && (
          <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-amber-900">{pendingCount}</span>
              <span className="text-amber-800"> project{pendingCount === 1 ? "" : "s"} awaiting your review</span>
            </div>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className="text-xs font-semibold text-amber-900 hover:underline"
            >
              Review now →
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 text-sm" placeholder="Search title, country, owner…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                {s === "ALL" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No projects found</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const typeKey = p.energyType ?? p.landType ?? "";
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setReviewId(p.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{TYPE_EMOJI[typeKey] ?? "🌍"}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{p.title}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="w-3 h-3" /> {p.country}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-gray-700">{p.owner.name}</div>
                        <div className="text-xs text-gray-400">{p.owner.email}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 hidden lg:table-cell">
                        {p.hectares.toLocaleString()} ha · {p.estimatedTons} t est.
                      </td>
                      <td className="px-4 py-4">
                        <span className={STATUS_COLORS[p.status] ?? "badge-gray"}>
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1 text-xs text-forest-600 font-medium">
                          {p.status === "PENDING" ? "Review" : "Open"} <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewId && (
        <ProjectApprovalDrawer
          projectId={reviewId}
          onClose={() => setReviewId(null)}
          onResolved={() => { load(); loadPendingCount(); }}
        />
      )}
    </div>
  );
}
