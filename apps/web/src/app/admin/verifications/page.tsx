"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { RefreshCw, CheckCircle, XCircle, Clock, ArrowRight, Coins, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface Verification {
  id: string; status: string; carbonTons?: number | null; notes?: string | null;
  creditsIssued?: boolean;
  createdAt: string; updatedAt: string;
  project: { id: string; title: string; country: string; owner?: { name: string } | null };
  verifier?: { id: string; name: string } | null;
}

interface Verifier {
  id: string;
  name: string;
  email: string;
  verifierScopes: string[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-yellow", IN_PROGRESS: "badge-blue", APPROVED: "badge-green", REJECTED: "badge-red",
};
const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: Clock, IN_PROGRESS: Clock, APPROVED: CheckCircle, REJECTED: XCircle,
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminVerificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [verifiers, setVerifiers] = useState<Verifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewForms, setReviewForms] = useState<Record<string, { carbonTons: string; notes: string; saving: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const headers = useCallback(() => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, uRes] = await Promise.all([
        fetch("/api/verifications?pageSize=100", { headers: headers() }),
        fetch("/api/admin/users?role=VERIFIER&pageSize=100", { headers: headers() }),
      ]);
      const vJson = await vRes.json();
      const uJson = await uRes.json();
      setVerifications(vJson.data?.items ?? vJson.data ?? []);
      setVerifiers(uJson.data?.items ?? uJson.data ?? []);
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const filtered = statusFilter === "ALL" ? verifications
    : statusFilter === "AWAITING_ISSUANCE"
      ? verifications.filter(v => v.status === "APPROVED" && !v.creditsIssued)
      : verifications.filter(v => v.status === statusFilter);

  const assign = async (verificationId: string) => {
    const verifierId = assignSelections[verificationId];
    setBusy(verificationId);
    try {
      const body = verifierId ? JSON.stringify({ verifierId }) : undefined;
      const r = await fetch(`/api/verifications/${verificationId}/assign`, {
        method: "PATCH", headers: headers(), body,
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Assign failed");
      const name = verifiers.find(v => v.id === verifierId)?.name ?? "you";
      notify(`Assigned to ${name}`);
      load();
    } catch (e) { notify(e instanceof Error ? e.message : "Assign failed"); }
    finally { setBusy(null); }
  };

  const review = async (id: string, decision: "APPROVED" | "REJECTED") => {
    const form = reviewForms[id];
    if (!form) return;
    if (decision === "APPROVED" && !(parseFloat(form.carbonTons) > 0)) { notify("Enter verified tonnes to approve"); return; }
    setReviewForms(f => ({ ...f, [id]: { ...f[id], saving: true } }));
    try {
      const r = await fetch(`/api/verifications/${id}/review`, {
        method: "PATCH", headers: headers(),
        body: JSON.stringify({ decision, carbonTons: form.carbonTons ? parseFloat(form.carbonTons) : undefined, notes: form.notes || undefined }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Review failed");
      notify(`Assessment ${decision.toLowerCase()}`);
      setReviewForms(f => { const n = { ...f }; delete n[id]; return n; });
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Review failed");
      setReviewForms(f => ({ ...f, [id]: { ...f[id], saving: false } }));
    }
  };

  const issue = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch(`/api/verifications/${id}/issue`, { method: "POST", headers: headers() });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Issuance failed");
      notify(`Credits issued. ${d.data?.tradeable ?? ""} t available`);
      load();
    } catch (e) { notify(e instanceof Error ? e.message : "Issuance failed"); }
    finally { setBusy(null); }
  };

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const counts = { PENDING: 0, IN_PROGRESS: 0, APPROVED: 0, REJECTED: 0 };
  verifications.forEach(v => { if (v.status in counts) counts[v.status as keyof typeof counts]++; });
  const awaitingIssuance = verifications.filter(v => v.status === "APPROVED" && !v.creditsIssued).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium max-w-sm">{toast}</div>
      )}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Verifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {counts.PENDING} pending · {counts.IN_PROGRESS} in progress
              {awaitingIssuance > 0 && <span className="text-amber-600 font-semibold"> · {awaitingIssuance} awaiting issuance</span>}
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Maker-checker: a <strong>verifier</strong> assesses and approves; an <strong>admin</strong> then issues the credits. The reviewer who assessed a project can't also issue it; a second reviewer signs off.</span>
        </div>

        <div className="flex gap-1.5 mb-6 flex-wrap">
          {["ALL", "PENDING", "IN_PROGRESS", "AWAITING_ISSUANCE", "APPROVED", "REJECTED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {s === "ALL" ? `All (${verifications.length})`
                : s === "AWAITING_ISSUANCE" ? `Awaiting issuance (${awaitingIssuance})`
                : `${s.replace("_", " ")} (${counts[s as keyof typeof counts] ?? 0})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(v => {
              const Icon = STATUS_ICON[v.status] ?? Clock;
              const form = reviewForms[v.id];
              const awaiting = v.status === "APPROVED" && !v.creditsIssued;
              return (
                <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${v.status === "APPROVED" ? "text-forest-500" : v.status === "REJECTED" ? "text-red-400" : "text-savanna-500"}`} />
                      <div>
                        <Link href={`/projects/${v.project.id}`} className="font-semibold text-gray-900 hover:text-forest-700 transition-colors">
                          {v.project.title}
                        </Link>
                        <div className="text-sm text-gray-500 mt-0.5">
                          {v.project.country}{v.project.owner ? ` · by ${v.project.owner.name}` : ""}
                        </div>
                        {v.verifier && <div className="text-xs text-gray-400 mt-0.5">Assessed by: {v.verifier.name}</div>}
                        {v.carbonTons != null && <div className="text-xs text-forest-600 font-semibold mt-1">{v.carbonTons} t CO₂ assessed</div>}
                        {v.notes && <div className="text-xs text-gray-500 mt-1 italic">{v.notes}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${awaiting ? "badge-yellow" : STATUS_COLORS[v.status] ?? "badge-gray"}`}>
                        {awaiting ? "AWAITING ISSUANCE" : v.status.replace("_", " ")}
                      </span>
                      {v.status === "APPROVED" && v.creditsIssued && <span className="badge badge-green">ISSUED</span>}
                      <span className="text-xs text-gray-400">{timeAgo(v.createdAt)}</span>
                    </div>
                  </div>

                  {/* PENDING → assign verifier */}
                  {v.status === "PENDING" && !readOnly && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                      <UserCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <select
                        value={assignSelections[v.id] ?? ""}
                        onChange={e => setAssignSelections(s => ({ ...s, [v.id]: e.target.value }))}
                        className="input text-sm py-1.5 flex-1 min-w-[180px]"
                      >
                        <option value="">Assign to myself</option>
                        {verifiers.map(vr => (
                          <option key={vr.id} value={vr.id}>
                            {vr.name}{vr.verifierScopes.length > 0 ? ` (${vr.verifierScopes.map(s => s === "LAND_RESTORATION" ? "Land" : "Energy").join(", ")})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => assign(v.id)}
                        disabled={busy === v.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {busy === v.id ? "Assigning…" : "Assign"}
                      </button>
                    </div>
                  )}

                  {/* IN_PROGRESS → review */}
                  {v.status === "IN_PROGRESS" && !readOnly && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {form ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input type="number" placeholder="Verified tonnes CO₂" step="0.1"
                            className="input text-sm flex-1"
                            value={form.carbonTons} onChange={e => setReviewForms(f => ({ ...f, [v.id]: { ...f[v.id], carbonTons: e.target.value } }))} />
                          <input placeholder="Notes (optional)"
                            className="input text-sm flex-1"
                            value={form.notes} onChange={e => setReviewForms(f => ({ ...f, [v.id]: { ...f[v.id], notes: e.target.value } }))} />
                          <div className="flex gap-2">
                            <button onClick={() => review(v.id, "APPROVED")} disabled={form.saving}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-600 text-white text-sm font-semibold hover:bg-forest-700 disabled:opacity-50 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => review(v.id, "REJECTED")} disabled={form.saving}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button onClick={() => setReviewForms(f => { const n = { ...f }; delete n[v.id]; return n; })}
                              className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setReviewForms(f => ({ ...f, [v.id]: { carbonTons: v.carbonTons ? String(v.carbonTons) : "", notes: "", saving: false } }))}
                          className="flex items-center gap-1.5 text-sm text-forest-600 hover:underline font-medium">
                          Submit assessment <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* APPROVED & not issued → issue (the checker step) */}
                  {awaiting && !readOnly && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-gray-500">
                        Assessment approved. Issuing mints the tradeable credits and reserves the buffer share.
                      </p>
                      <button onClick={() => issue(v.id)} disabled={busy === v.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 transition-colors">
                        <Coins className="w-4 h-4" /> Issue credits
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-20 text-gray-400">No verifications found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
