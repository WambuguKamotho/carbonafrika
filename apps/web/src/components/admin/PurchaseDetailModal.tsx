"use client";
import { useEffect, useState } from "react";
import {
  X, ExternalLink, Award, User, ShoppingCart, Leaf, Building2,
  Mail, MapPin, BadgeCheck, Clock, DollarSign, Hash, FileText,
  AlertTriangle, RotateCcw, Send, Loader2,
} from "lucide-react";
import { getToken, getUser, isReadOnly } from "@/lib/auth";
import RetirementCertificate from "@/components/ui/RetirementCertificate";

interface PurchaseDetail {
  id: string;
  totalTons: number;
  totalPrice: number;
  feeAmount: number | null;
  buyerTotal: number | null;
  currency: string;
  txHash: string | null;
  collectTxHash: string | null;
  deliverTxHash: string | null;
  settlementStatus: string;
  settlementError: string | null;
  collectedAt: string | null;
  deliveredAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  autoReleaseAt: string | null;
  buyerConfirmedAt: string | null;
  disputeOpenedAt: string | null;
  disputeReason: string | null;
  retired: boolean;
  retirementTxHash: string | null;
  nftTokenId: string | null;
  retirementReason: string | null;
  retirementNote: string | null;
  retiredAt: string | null;
  createdAt: string;
  buyer: {
    id: string; name: string; email: string | null; country: string | null;
    role: string; kycVerified: boolean; createdAt: string;
  };
  listing: {
    id: string;
    pricePerTon: number;
    totalTons: number;
    currency: string;
    credit: {
      id: string;
      amount: number;
      vintageYear?: number | null;
      project: {
        id: string; title: string; country: string;
        projectType: string; energyType: string | null; landType: string | null;
        owner: { id: string; name: string; email: string | null; country: string | null };
      };
    };
  };
}

const CHAIN_ID = process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID;
const POLY_EXPLORER = CHAIN_ID === "137"
  ? "https://polygonscan.com/tx/"
  : "https://amoy.polygonscan.com/tx/";

const STATUS_BADGE: Record<string, string> = {
  PENDING:    "badge-yellow",
  COLLECTING: "badge-blue",
  COLLECTED:  "badge-blue",
  DELIVERED:  "badge-yellow",
  RELEASED:   "badge-green",
  REFUNDED:   "badge-gray",
  DISPUTED:   "badge-red",
  FAILED:     "badge-red",
  SETTLED:    "badge-green",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function TxLink({ hash }: { hash: string }) {
  const isSim = hash.startsWith("0xsim_");
  if (isSim) {
    return (
      <span className="font-mono text-xs text-gray-500" title="Simulated transaction">
        {hash.slice(0, 12)}…{hash.slice(-6)} <span className="italic">(sim)</span>
      </span>
    );
  }
  return (
    <a
      href={`${POLY_EXPLORER}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-forest-700 hover:underline inline-flex items-center gap-1"
    >
      {hash.slice(0, 12)}…{hash.slice(-6)}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function Row({ icon: Icon, label, children }: { icon?: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm text-gray-800 break-words">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

export default function PurchaseDetailModal({
  purchaseId,
  onClose,
}: {
  purchaseId: string;
  onClose: () => void;
}) {
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const [actionPending, setActionPending] = useState<null | "release" | "refund" | "dispute">(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const readOnly = isReadOnly(getUser()?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/purchases/${purchaseId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const d = await r.json();
        if (cancelled) return;
        if (d.success) setPurchase(d.data);
        else setError(d.error ?? "Failed to load purchase");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [purchaseId, reload]);

  async function callAction(action: "release" | "refund" | "dispute", body: Record<string, unknown> = {}) {
    setActionPending(action);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/admin/purchases/${purchaseId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || d.message || `${action} failed`);
      setActionMsg(d.message || `${action} queued`);
      setReload(x => x + 1);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionPending(null);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (showCert && purchase) {
    return (
      <RetirementCertificate
        purchaseId={purchase.id}
        buyerName={purchase.buyer.name}
        projectTitle={purchase.listing.credit.project.title}
        country={purchase.listing.credit.project.country}
        tonnes={purchase.totalTons}
        retiredAt={purchase.retiredAt ?? purchase.createdAt}
        txHash={purchase.retirementTxHash}
        nftTokenId={purchase.nftTokenId}
        retirementReason={purchase.retirementReason}
        retirementNote={purchase.retirementNote}
        vintageYear={purchase.listing.credit.vintageYear ?? null}
        onClose={() => setShowCert(false)}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-savanna-100 text-savanna-700 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 truncate">Purchase Detail</h2>
              <p className="text-xs text-gray-400 font-mono truncate">{purchaseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="py-20 text-center text-gray-400 text-sm">Loading purchase…</div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {purchase && (
            <>
              {/* Headline numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-forest-50 border border-forest-100 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-forest-700 leading-none">
                    {purchase.totalTons.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-forest-600 mt-1">
                    Tonnes CO₂e
                  </div>
                </div>
                <div className="bg-savanna-50 border border-savanna-100 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-savanna-700 leading-none">
                    ${purchase.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-savanna-600 mt-1">
                    {purchase.currency}
                  </div>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${
                  purchase.retired
                    ? "bg-purple-50 border-purple-100"
                    : "bg-blue-50 border-blue-100"
                }`}>
                  <div className={`text-base font-black leading-tight ${
                    purchase.retired ? "text-purple-700" : "text-blue-700"
                  }`}>
                    {purchase.retired ? "Retired" : "Held"}
                  </div>
                  <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${
                    purchase.retired ? "text-purple-600" : "text-blue-600"
                  }`}>
                    {purchase.retired ? "Permanently" : "Not retired"}
                  </div>
                </div>
              </div>

              {/* Certificate CTA */}
              {purchase.retired && (
                <button
                  onClick={() => setShowCert(true)}
                  className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 text-white rounded-2xl py-3 font-semibold text-sm transition-colors"
                >
                  <Award className="w-4 h-4" />
                  View Retirement Certificate
                </button>
              )}

              {/* Settlement state + admin controls — hidden entirely for VIEWER */}
              {!readOnly && (["COLLECTED", "DELIVERED", "DISPUTED"].includes(purchase.settlementStatus)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                        Escrow controls
                      </div>
                      <div className="text-xs text-amber-600 mt-0.5">
                        Status: <span className="font-mono font-semibold">{purchase.settlementStatus}</span>
                        {purchase.autoReleaseAt && purchase.settlementStatus === "DELIVERED" && (
                          <> · auto-releases {new Date(purchase.autoReleaseAt).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {purchase.disputeReason && (
                    <div className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-gray-700">
                      <div className="font-semibold text-amber-700 mb-0.5">Dispute reason</div>
                      <div className="whitespace-pre-wrap">{purchase.disputeReason}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => callAction("release")}
                      disabled={actionPending != null}
                      className="flex items-center justify-center gap-1.5 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl py-2 text-xs font-semibold transition-colors"
                    >
                      {actionPending === "release" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Release
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt("Refund reason (visible to buyer):");
                        if (!reason || reason.length < 5) return;
                        callAction("refund", { reason });
                      }}
                      disabled={actionPending != null}
                      className="flex items-center justify-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-50 text-amber-700 rounded-xl py-2 text-xs font-semibold transition-colors"
                    >
                      {actionPending === "refund" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Refund
                    </button>
                    {purchase.settlementStatus !== "DISPUTED" && (
                      <button
                        onClick={() => {
                          const reason = window.prompt("Why is this purchase being marked DISPUTED?");
                          if (!reason || reason.length < 5) return;
                          callAction("dispute", { reason });
                        }}
                        disabled={actionPending != null}
                        className="flex items-center justify-center gap-1.5 bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 text-red-700 rounded-xl py-2 text-xs font-semibold transition-colors"
                      >
                        {actionPending === "dispute" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        Dispute
                      </button>
                    )}
                  </div>

                  {actionMsg && (
                    <div className="text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 text-gray-700">
                      {actionMsg}
                    </div>
                  )}
                </div>
              )}

              {/* Buyer */}
              <Section title="Buyer">
                <Row icon={User} label="Name">{purchase.buyer.name}</Row>
                {purchase.buyer.email && (
                  <Row icon={Mail} label="Email">
                    <a href={`mailto:${purchase.buyer.email}`} className="text-forest-700 hover:underline">
                      {purchase.buyer.email}
                    </a>
                  </Row>
                )}
                {purchase.buyer.country && <Row icon={MapPin} label="Country">{purchase.buyer.country}</Row>}
                <Row icon={BadgeCheck} label="KYC">
                  <span className={`badge ${purchase.buyer.kycVerified ? "badge-green" : "badge-gray"}`}>
                    {purchase.buyer.kycVerified ? "Verified" : "Unverified"}
                  </span>
                </Row>
              </Section>

              {/* Project */}
              <Section title="Project & Seller">
                <Row icon={Leaf} label="Project">
                  <a href={`/projects/${purchase.listing.credit.project.id}`}
                     className="text-forest-700 font-semibold hover:underline">
                    {purchase.listing.credit.project.title}
                  </a>
                </Row>
                <Row icon={MapPin} label="Country">{purchase.listing.credit.project.country}</Row>
                <Row icon={FileText} label="Type">
                  {purchase.listing.credit.project.projectType}
                  {purchase.listing.credit.project.energyType && ` · ${purchase.listing.credit.project.energyType}`}
                  {purchase.listing.credit.project.landType   && ` · ${purchase.listing.credit.project.landType}`}
                </Row>
                <Row icon={Building2} label="Seller / Owner">
                  {purchase.listing.credit.project.owner.name}
                  {purchase.listing.credit.project.owner.email && (
                    <span className="text-gray-400 text-xs"> · {purchase.listing.credit.project.owner.email}</span>
                  )}
                </Row>
                {purchase.listing.credit.vintageYear && (
                  <Row label="Vintage">{purchase.listing.credit.vintageYear}</Row>
                )}
              </Section>

              {/* Transaction */}
              <Section title="Transaction">
                <Row icon={DollarSign} label="Price / tonne">
                  ${purchase.listing.pricePerTon.toFixed(2)} {purchase.listing.currency}
                </Row>
                <Row icon={DollarSign} label="Total Price">
                  ${purchase.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} {purchase.currency}
                </Row>
                {purchase.feeAmount != null && (
                  <Row label="Platform Fee">
                    ${purchase.feeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Row>
                )}
                {purchase.buyerTotal != null && (
                  <Row label="Buyer Total">
                    ${purchase.buyerTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Row>
                )}
                <Row icon={Clock} label="Purchased">{fmtDate(purchase.createdAt)}</Row>
                <Row label="Settlement">
                  <span className={`badge ${STATUS_BADGE[purchase.settlementStatus] ?? "badge-gray"}`}>
                    {purchase.settlementStatus}
                  </span>
                  {purchase.settlementError && (
                    <p className="text-xs text-red-600 mt-1">{purchase.settlementError}</p>
                  )}
                </Row>
                {purchase.collectTxHash && (
                  <Row icon={Hash} label="Collect Tx"><TxLink hash={purchase.collectTxHash} /></Row>
                )}
                {purchase.txHash && (
                  <Row icon={Hash} label="Purchase Tx"><TxLink hash={purchase.txHash} /></Row>
                )}
              </Section>

              {/* Retirement */}
              {purchase.retired && (
                <Section title="Retirement">
                  <Row icon={Clock} label="Retired At">{fmtDate(purchase.retiredAt)}</Row>
                  {purchase.retirementReason && (
                    <Row label="Reason">{purchase.retirementReason.replace(/_/g, " ")}</Row>
                  )}
                  {purchase.retirementNote && (
                    <Row label="Note"><span className="italic text-gray-700">"{purchase.retirementNote}"</span></Row>
                  )}
                  {purchase.retirementTxHash && (
                    <Row icon={Hash} label="Retirement Tx"><TxLink hash={purchase.retirementTxHash} /></Row>
                  )}
                  {purchase.nftTokenId && (
                    <Row label="NFT Token ID"><span className="font-mono text-xs">#{purchase.nftTokenId}</span></Row>
                  )}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
