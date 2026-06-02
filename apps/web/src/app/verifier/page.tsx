"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken } from "@/lib/auth";
import {
  ClipboardCheck, RefreshCw, CheckCircle, XCircle, Clock,
  Loader2, MapPin, Zap, Leaf, ChevronRight, TreePine, History,
} from "lucide-react";

interface Project {
  id: string; title: string; country: string; hectares: number;
  estimatedTons: number; landType: string | null; energyType: string | null;
  projectType: string; capacityKw?: number | null;
  owner: { id: string; name: string };
}
interface Verification {
  id: string; status: string; carbonTons?: number | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  project: Project;
  verifier?: { id: string; name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  APPROVED:    "bg-forest-100 text-forest-700",
  REJECTED:    "bg-red-100 text-red-700",
};
const TYPE_EMOJI: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱",
  WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳",
  MICRO_HYDRO: "💧", WIND: "💨",
};

function headers() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

function ProjectChip({ project }: { project: Project }) {
  const isEnergy = project.projectType === "CLEAN_ENERGY";
  const typeKey  = project.energyType ?? project.landType ?? "";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isEnergy ? "bg-amber-50 text-amber-700" : "bg-forest-50 text-forest-700"}`}>
      {isEnergy ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
      {TYPE_EMOJI[typeKey]} {typeKey.replace("_", " ")}
    </span>
  );
}

type Tab = "queue" | "mine" | "history";

export default function VerifierPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [tab, setTab]   = useState<Tab>("queue");
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState({ msg: "", ok: true });
  const [forms, setForms]     = useState<Record<string, { carbonTons: string; notes: string; saving: boolean }>>({});

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) { router.push("/login?next=/verifier"); return; }
    if (u.role !== "VERIFIER") router.push("/dashboard");
  }, [router]);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/verifications?pageSize=100", { headers: headers() });
    const d = await r.json();
    if (d.success) setVerifications(d.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.role === "VERIFIER") load(); }, [user, load]);

  const assign = async (id: string) => {
    const r = await fetch(`/api/verifications/${id}/assign`, { method: "PATCH", headers: headers() });
    const d = await r.json();
    if (d.success) { notify("Assigned to you — switching to In Progress"); setTab("mine"); load(); }
    else notify(d.error ?? "Failed to assign", false);
  };

  const review = async (id: string, decision: "APPROVED" | "REJECTED") => {
    const form = forms[id] ?? { carbonTons: "", notes: "", saving: false };
    setForms(p => ({ ...p, [id]: { ...form, saving: true } }));
    const r = await fetch(`/api/verifications/${id}/review`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        decision,
        carbonTons: form.carbonTons ? parseFloat(form.carbonTons) : undefined,
        notes: form.notes || undefined,
      }),
    });
    const d = await r.json();
    setForms(p => ({ ...p, [id]: { ...form, saving: false } }));
    if (d.success) { notify(decision === "APPROVED" ? "Project approved — credits queued for minting" : "Project rejected"); load(); }
    else notify(d.error ?? "Failed to submit review", false);
  };

  if (!user || user.role !== "VERIFIER") return null;

  const queue   = verifications.filter(v => v.status === "PENDING");
  const mine    = verifications.filter(v => v.status === "IN_PROGRESS" && v.verifier?.id === user.id);
  const history = verifications.filter(v => ["APPROVED", "REJECTED"].includes(v.status));

  const totalApproved = history.filter(v => v.status === "APPROVED").length;
  const totalTons     = history.filter(v => v.status === "APPROVED").reduce((s, v) => s + (v.carbonTons ?? 0), 0);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "queue",   label: "Pending Queue", count: queue.length },
    { id: "mine",    label: "In Progress",   count: mine.length  },
    { id: "history", label: "History" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast.msg && (
        <div className={`fixed top-20 right-4 z-50 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all ${toast.ok ? "bg-forest-700" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Verifier Portal</h1>
              <p className="text-xs text-gray-500">{user.name}</p>
            </div>
            <button onClick={load} className="ml-auto btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Pending",      value: queue.length,   color: "bg-amber-50 text-amber-700 border-amber-100" },
              { label: "In Progress",  value: mine.length,    color: "bg-blue-50 text-blue-700 border-blue-100"   },
              { label: "Approved",     value: totalApproved,  color: "bg-forest-50 text-forest-700 border-forest-100" },
              { label: "Tonnes verified", value: totalTons > 0 ? `${totalTons.toLocaleString()}t` : "—", color: "bg-gray-50 text-gray-700 border-gray-100" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-xs mt-0.5 opacity-70">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
        ) : tab === "queue" ? (
          queue.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Queue is clear</p>
              <p className="text-sm mt-1">No pending verifications right now.</p>
            </div>
          ) : queue.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {TYPE_EMOJI[v.project.energyType ?? v.project.landType ?? ""] ?? "🌍"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLOR[v.status]}`}>{v.status}</span>
                    <ProjectChip project={v.project} />
                  </div>
                  <a href={`/projects/${v.project.id}`} className="font-bold text-gray-900 hover:text-blue-700 text-sm transition-colors">
                    {v.project.title}
                  </a>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.project.country}</span>
                    {v.project.hectares > 0 && <span><TreePine className="w-3 h-3 inline mr-0.5" />{v.project.hectares.toLocaleString()} ha</span>}
                    {v.project.capacityKw && <span><Zap className="w-3 h-3 inline mr-0.5" />{v.project.capacityKw} kW</span>}
                    <span>Est. {v.project.estimatedTons.toLocaleString()} t CO₂</span>
                    <span className="text-gray-300">·</span>
                    <span>Submitted {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                  </div>
                  {v.notes && <p className="text-xs text-gray-500 mt-2 italic">"{v.notes}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button onClick={() => assign(v.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Assign to Me
                  </button>
                  <a href={`/projects/${v.project.id}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                    View project <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : tab === "mine" ? (
          mine.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Nothing assigned to you yet</p>
              <p className="text-sm mt-1">Pick an item from the Pending Queue to start.</p>
              <button onClick={() => setTab("queue")} className="btn-primary mt-4 text-sm">Go to Queue</button>
            </div>
          ) : mine.map(v => {
            const form = forms[v.id] ?? { carbonTons: "", notes: "", saving: false };
            const isEnergy = v.project.projectType === "CLEAN_ENERGY";
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-blue-200 shadow-card p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {TYPE_EMOJI[v.project.energyType ?? v.project.landType ?? ""] ?? "🌍"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLOR[v.status]}`}>{v.status.replace("_", " ")}</span>
                      <ProjectChip project={v.project} />
                    </div>
                    <a href={`/projects/${v.project.id}`} className="font-bold text-gray-900 hover:text-blue-700 text-sm">
                      {v.project.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span><MapPin className="w-3 h-3 inline mr-0.5" />{v.project.country}</span>
                      {v.project.hectares > 0 && <span>{v.project.hectares.toLocaleString()} ha</span>}
                      {v.project.capacityKw && <span>{v.project.capacityKw} kW</span>}
                      <span>Owner: {v.project.owner.name}</span>
                    </div>
                  </div>
                  <a href={`/projects/${v.project.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0">
                    View <ChevronRight className="w-3 h-3" />
                  </a>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Submit Review Decision</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {isEnergy ? "Energy-based CO₂ avoided (t)" : "Carbon tonnes verified"}
                        <span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input type="number" min="0" step="0.01"
                        className="input text-sm py-2 w-full"
                        placeholder={`e.g. ${Math.round(v.project.estimatedTons * 0.9)}`}
                        value={form.carbonTons}
                        onChange={e => setForms(p => ({ ...p, [v.id]: { ...form, carbonTons: e.target.value } }))} />
                      <p className="text-xs text-gray-400 mt-1">Estimated: {v.project.estimatedTons.toLocaleString()} t</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Verification notes</label>
                      <textarea rows={2}
                        className="input text-sm py-2 w-full resize-none"
                        placeholder="Field observations, methodology used, data sources, any concerns…"
                        value={form.notes}
                        onChange={e => setForms(p => ({ ...p, [v.id]: { ...form, notes: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      disabled={form.saving}
                      onClick={() => review(v.id, "REJECTED")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      disabled={!form.carbonTons || form.saving}
                      onClick={() => review(v.id, "APPROVED")}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-forest-600 text-white hover:bg-forest-700 disabled:opacity-50 transition-colors">
                      {form.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve & Mint Credits
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* History tab */
          history.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No completed verifications yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">All completed verifications</h3>
                <span className="text-xs text-gray-400">{history.length} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {history.map(v => (
                  <div key={v.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="text-xl">{TYPE_EMOJI[v.project.energyType ?? v.project.landType ?? ""] ?? "🌍"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[v.status]}`}>{v.status}</span>
                        <span className="font-medium text-gray-900 text-sm truncate">{v.project.title}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {v.project.country} · {new Date(v.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                        {v.verifier && ` · by ${v.verifier.name}`}
                      </div>
                    </div>
                    {v.carbonTons && (
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-gray-900 text-sm">{v.carbonTons.toLocaleString()} t</div>
                        <div className="text-xs text-gray-400">CO₂ verified</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
