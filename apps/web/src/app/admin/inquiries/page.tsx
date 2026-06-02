"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import {
  Mail, Globe, Building2, RefreshCw, Search, ArrowRight,
  CheckCircle, XCircle, Loader2, Copy, X, Clock,
} from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface Inquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string | null;
  estimatedAnnualTons: number | null;
  useCase: string | null;
  message: string | null;
  source: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;
type StatusFilter = typeof STATUSES[number];

const STATUS_COLOR: Record<string, string> = {
  PENDING:  "badge badge-yellow",
  APPROVED: "badge badge-green",
  REJECTED: "badge badge-red",
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
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
      const r = await fetch(`/api/admin/inquiries?${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      setItems(d.data?.items ?? []);
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const pendingCount = items.filter(i => i.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Buyer Inquiries</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {items.length} total{filter === "PENDING" && pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ""}
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
              className="input pl-9 text-sm" placeholder="Search company, contact, email…"
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
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No inquiries found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Volume</th>
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
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{i.companyName}</div>
                          {i.country && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Globe className="w-3 h-3" /> {i.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-gray-700">{i.contactName}</div>
                      <div className="text-xs text-gray-400">{i.email}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 hidden lg:table-cell">
                      {i.estimatedAnnualTons ? `${i.estimatedAnnualTons.toLocaleString()} t/yr` : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={STATUS_COLOR[i.status] ?? "badge badge-gray"}>{i.status}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">{timeAgo(i.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1 text-xs text-forest-600 font-medium">
                        {i.status === "PENDING" ? "Review" : "Open"} <ArrowRight className="w-3 h-3" />
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
        <InquiryDrawer
          inquiryId={selected}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

function InquiryDrawer({
  inquiryId,
  onClose,
  onResolved,
}: {
  inquiryId: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [pending, setPending] = useState<null | "approve" | "reject">(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [approval, setApproval] = useState<{ inviteUrl: string; inviteExpiry: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const drawerReadOnly = isReadOnly(getUser()?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/inquiries/${inquiryId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await r.json();
        if (cancelled) return;
        if (d.success) setInquiry(d.data);
        else setError(d.error ?? "Failed to load");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [inquiryId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function approve() {
    setPending("approve");
    try {
      const r = await fetch(`/api/admin/inquiries/${inquiryId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Approve failed");
      setApproval({ inviteUrl: d.data.inviteUrl, inviteExpiry: d.data.inviteExpiry });
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
      const r = await fetch(`/api/admin/inquiries/${inquiryId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Reject failed");
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setPending(null);
    }
  }

  async function copyInvite() {
    if (!approval) return;
    try {
      await navigator.clipboard.writeText(approval.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-savanna-100 text-savanna-700 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 truncate">Buyer Inquiry</h2>
              <p className="text-xs text-gray-400 font-mono truncate">{inquiryId}</p>
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
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {inquiry && (
            <>
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h1 className="text-xl font-black text-gray-900 leading-tight">{inquiry.companyName}</h1>
                  <span className={STATUS_COLOR[inquiry.status] ?? "badge badge-gray"}>{inquiry.status}</span>
                </div>
                <p className="text-sm text-gray-500">{inquiry.contactName} · {inquiry.email}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Submitted {timeAgo(inquiry.createdAt)}
                </p>
              </div>

              {/* Approval result panel */}
              {approval && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-forest-700 font-semibold text-sm">
                    <CheckCircle className="w-4 h-4" /> Approved — invite ready
                  </div>
                  <p className="text-xs text-forest-800 leading-relaxed">
                    We've emailed the magic link to <strong>{inquiry.email}</strong>.
                    If they don't receive it, copy and share manually. Expires {new Date(approval.inviteExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                  </p>
                  <div className="flex items-center gap-2 bg-white border border-forest-100 rounded-xl px-3 py-2">
                    <code className="text-xs font-mono text-gray-700 truncate flex-1">{approval.inviteUrl}</code>
                    <button onClick={copyInvite}
                      className="text-xs font-semibold text-forest-700 hover:underline flex items-center gap-1 flex-shrink-0">
                      <Copy className="w-3 h-3" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button onClick={onResolved}
                    className="text-xs font-semibold text-forest-700 hover:underline">
                    Done — back to queue
                  </button>
                </div>
              )}

              {/* Details */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 space-y-3 text-sm">
                {inquiry.phone && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24 flex-shrink-0 pt-0.5">Phone</span>
                    <span className="text-gray-800">{inquiry.phone}</span>
                  </div>
                )}
                {inquiry.country && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24 flex-shrink-0 pt-0.5">Country</span>
                    <span className="text-gray-800">{inquiry.country}</span>
                  </div>
                )}
                {inquiry.estimatedAnnualTons && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24 flex-shrink-0 pt-0.5">Annual t</span>
                    <span className="text-gray-800 font-semibold">{inquiry.estimatedAnnualTons.toLocaleString()} t/yr</span>
                  </div>
                )}
                {inquiry.useCase && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24 flex-shrink-0 pt-0.5">Use case</span>
                    <span className="text-gray-800">{inquiry.useCase}</span>
                  </div>
                )}
                {inquiry.source && (
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24 flex-shrink-0 pt-0.5">Source</span>
                    <span className="text-gray-500 font-mono text-xs">{inquiry.source}</span>
                  </div>
                )}
              </div>

              {/* Message */}
              {inquiry.message && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Message</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    {inquiry.message}
                  </p>
                </div>
              )}

              {/* Rejection reason if already rejected */}
              {inquiry.status === "REJECTED" && inquiry.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">Rejection reason</div>
                  <p className="text-sm text-red-900 whitespace-pre-wrap">{inquiry.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              {inquiry.status === "PENDING" && !approval && !showReject && !drawerReadOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                    Awaiting your decision
                  </div>
                  <p className="text-sm text-amber-900 mb-3 leading-relaxed">
                    Approve to create a buyer account and send a magic-link invite. Reject to send a polite no.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={approve} disabled={pending != null}
                      className="flex-1 flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                      {pending === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve & invite
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
                  <div className="text-xs font-bold uppercase tracking-wider text-red-700">Reject inquiry</div>
                  <textarea
                    rows={3}
                    className="input text-sm resize-none"
                    placeholder="Reason (kept for internal record). Minimum 5 characters."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
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

              {inquiry.status === "APPROVED" && !approval && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 flex items-center gap-2 text-sm text-forest-800">
                  <CheckCircle className="w-4 h-4 text-forest-600 flex-shrink-0" />
                  Already approved. Buyer account was created.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
