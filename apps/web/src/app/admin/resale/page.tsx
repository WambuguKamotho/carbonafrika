"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import {
  Repeat, RefreshCw, Search, ArrowRight, CheckCircle, XCircle,
  Loader2, X, Clock, TreePine, User as UserIcon,
} from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface ProjectRef { id: string; title: string; country: string }
interface ResaleRequest {
  id: string;
  tons: number;
  proposedPricePerTon: number;
  approvedPricePerTon: number | null;
  currency: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  buyerNote: string | null;
  adminNote: string | null;
  rejectionReason: string | null;
  listingId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  buyer: { id: string; name: string; email: string | null; walletAddress?: string | null; country?: string | null; kycVerified?: boolean };
  purchase: {
    id: string; totalTons: number; totalPrice: number; buyerTotal?: number | null; currency: string;
    settlementStatus: string; retired: boolean; resold: boolean; createdAt?: string;
    listing: { pricePerTon?: number; credit: { vintageYear?: number | null; project: ProjectRef } };
  };
}

const STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "ALL"] as const;
type StatusFilter = typeof STATUSES[number];

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: "badge badge-yellow",
  APPROVED:  "badge badge-green",
  REJECTED:  "badge badge-red",
  CANCELLED: "badge badge-gray",
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminResalePage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [items, setItems] = useState<ResaleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("REQUESTED");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: "100" });
      if (filter !== "ALL") qs.set("status", filter);
      if (search.trim())   qs.set("search", search.trim());
      const r = await fetch(`/api/admin/resale-requests?${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      setItems(d.data?.items ?? []);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);
  const pendingCount = items.filter(i => i.status === "REQUESTED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Resale Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {items.length} total{filter === "REQUESTED" && pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ""}
            </p>
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
            <input
              className="input pl-9 text-sm" placeholder="Search buyer or project…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Repeat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No resale requests found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Seller (buyer)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tonnes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Asking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(i => (
                  <tr key={i.id} onClick={() => setSelected(i.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <TreePine className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{i.purchase.listing.credit.project.title}</div>
                          <div className="text-xs text-gray-400">{i.purchase.listing.credit.project.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-gray-700">{i.buyer.name}</div>
                      <div className="text-xs text-gray-400">{i.buyer.email}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700 font-medium">{i.tons} t</td>
                    <td className="px-4 py-4 text-gray-600 hidden lg:table-cell">${i.proposedPricePerTon.toFixed(2)}/t</td>
                    <td className="px-4 py-4">
                      <span className={STATUS_COLOR[i.status] ?? "badge badge-gray"}>{i.status}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">{timeAgo(i.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1 text-xs text-forest-600 font-medium">
                        {i.status === "REQUESTED" ? "Review" : "Open"} <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ResaleDrawer
          requestId={selected}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

function ResaleDrawer({
  requestId, onClose, onResolved,
}: {
  requestId: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [request, setRequest] = useState<ResaleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [pending, setPending] = useState<null | "approve" | "reject">(null);
  const [priceOverride, setPriceOverride] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [done, setDone] = useState<{ listingId: string; pricePerTon: number } | null>(null);
  const drawerReadOnly = isReadOnly(getUser()?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/resale-requests/${requestId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await r.json();
        if (cancelled) return;
        if (d.success) {
          setRequest(d.data);
          setPriceOverride(String(d.data.proposedPricePerTon));
        } else setError(d.error ?? "Failed to load");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function approve() {
    const priceNum = parseFloat(priceOverride);
    if (!(priceNum > 0)) { setError("Enter a valid price per tonne."); return; }
    setPending("approve");
    setError(null);
    try {
      const r = await fetch(`/api/admin/resale-requests/${requestId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerTon: priceNum, note: adminNote.trim() || undefined }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(typeof d.error === "string" ? d.error : "Approve failed");
      setDone({ listingId: d.data.listingId, pricePerTon: d.data.pricePerTon });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setPending(null);
    }
  }

  async function reject() {
    if (rejectReason.trim().length < 5) { setError("Reason must be at least 5 characters"); return; }
    setPending("reject");
    try {
      const r = await fetch(`/api/admin/resale-requests/${requestId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(typeof d.error === "string" ? d.error : "Reject failed");
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setPending(null);
    }
  }

  const priceNum = parseFloat(priceOverride);
  const gross = priceNum > 0 && request ? priceNum * request.tons : 0;
  const origPaid = request?.purchase.listing.pricePerTon;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-savanna-100 text-savanna-700 flex items-center justify-center flex-shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 truncate">Resale Request</h2>
              <p className="text-xs text-gray-400 font-mono truncate">{requestId}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {request && (
            <>
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h1 className="text-xl font-black text-gray-900 leading-tight">{request.purchase.listing.credit.project.title}</h1>
                  <span className={STATUS_COLOR[request.status] ?? "badge badge-gray"}>{request.status}</span>
                </div>
                <p className="text-sm text-gray-500">{request.purchase.listing.credit.project.country}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Requested {timeAgo(request.createdAt)}
                </p>
              </div>

              {/* Seller (the reselling buyer) */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <UserIcon className="w-4 h-4 text-gray-400" /> {request.buyer.name}
                </div>
                <div className="text-xs text-gray-500">{request.buyer.email}</div>
                {request.buyer.walletAddress && (
                  <div className="text-xs text-gray-400 font-mono truncate">Payout wallet: {request.buyer.walletAddress}</div>
                )}
                {!request.buyer.walletAddress && (
                  <div className="text-xs text-amber-600">⚠ No payout wallet on file — seller can't be paid until they connect one.</div>
                )}
              </div>

              {/* Trade economics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tonnes</div>
                  <div className="text-lg font-black text-gray-900">{request.tons} t</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Asking / t</div>
                  <div className="text-lg font-black text-gray-900">${request.proposedPricePerTon.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Orig. paid / t</div>
                  <div className="text-lg font-black text-gray-700">{origPaid ? `$${origPaid.toFixed(2)}` : "—"}</div>
                </div>
              </div>

              {request.buyerNote && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Buyer note</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    {request.buyerNote}
                  </p>
                </div>
              )}

              {/* Approval result */}
              {done && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-forest-700 font-semibold text-sm">
                    <CheckCircle className="w-4 h-4" /> Approved — relisted at ${done.pricePerTon.toFixed(2)}/t
                  </div>
                  <p className="text-xs text-forest-800 leading-relaxed">
                    The credits are now live on the marketplace with {request.buyer.name} as the seller.
                  </p>
                  <a href={`/marketplace/${done.listingId}`} target="_blank" rel="noreferrer"
                    className="text-xs font-semibold text-forest-700 hover:underline">
                    View listing →
                  </a>
                  <button onClick={onResolved} className="block text-xs font-semibold text-forest-700 hover:underline">
                    Done — back to queue
                  </button>
                </div>
              )}

              {/* Rejection reason if already rejected */}
              {request.status === "REJECTED" && request.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">Rejection reason</div>
                  <p className="text-sm text-red-900 whitespace-pre-wrap">{request.rejectionReason}</p>
                </div>
              )}

              {request.status === "APPROVED" && !done && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 flex items-center gap-2 text-sm text-forest-800">
                  <CheckCircle className="w-4 h-4 text-forest-600 flex-shrink-0" />
                  Already approved & relisted.
                  {request.listingId && (
                    <a href={`/marketplace/${request.listingId}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">View listing →</a>
                  )}
                </div>
              )}

              {/* Actions */}
              {request.status === "REQUESTED" && !done && !showReject && !drawerReadOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Review & relist</div>
                  <div>
                    <label className="label text-xs">List price per tonne ({request.currency})</label>
                    <input type="number" min="0" step="0.01" className="input text-sm"
                      value={priceOverride} onChange={e => setPriceOverride(e.target.value)} />
                    {priceNum > 0 && (
                      <p className="text-xs text-amber-700 mt-1">Gross if fully sold: <strong>${gross.toFixed(2)} {request.currency}</strong></p>
                    )}
                  </div>
                  <div>
                    <label className="label text-xs">Admin note <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="input text-sm" placeholder="Internal note…"
                      value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={approve} disabled={pending != null}
                      className="flex-1 flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                      {pending === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve & relist
                    </button>
                    <button onClick={() => setShowReject(true)} disabled={pending != null}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 text-red-700 rounded-xl py-2.5 text-sm font-semibold transition-colors">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {showReject && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700">Reject request</div>
                  <textarea rows={3} className="input text-sm resize-none"
                    placeholder="Reason (shared with the seller). Minimum 5 characters."
                    value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowReject(false); setRejectReason(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-white">Cancel</button>
                    <button onClick={reject} disabled={pending != null || rejectReason.trim().length < 5}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                      {pending === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
