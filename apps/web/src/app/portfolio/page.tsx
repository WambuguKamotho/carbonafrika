"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUser, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, TrendingUp, Car, TreePine, Plane, ArrowRight, ScrollText, Plus, CheckCircle, AlertTriangle, Loader2, Tag } from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import RetirementCertificate from "@/components/ui/RetirementCertificate";
import RetirementIntentModal from "@/components/ui/RetirementIntentModal";
import ResellRequestModal from "@/components/portfolio/ResellRequestModal";

interface ResaleRequest {
  id: string; status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  proposedPricePerTon: number; approvedPricePerTon?: number | null;
  rejectionReason?: string | null; listingId?: string | null; createdAt: string;
}

interface Purchase {
  id: string; totalTons: number; totalPrice: number; buyerTotal?: number | null; currency: string;
  settlementStatus?: string | null;
  autoReleaseAt?: string | null;
  buyerConfirmedAt?: string | null;
  retired: boolean; nftTokenId?: string | null; retirementTxHash?: string | null;
  retirementReason?: string | null; retirementNote?: string | null; retiredAt?: string | null;
  resold?: boolean;
  resaleRequests?: ResaleRequest[];
  listing: { id: string; status: string; totalTons: number; pricePerTon?: number; credit: { vintageYear?: number | null; project: { title: string; country: string; landType: string | null; energyType: string | null } } };
  createdAt: string;
}

const SETTLEMENT_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Awaiting payment",  cls: "badge badge-gray" },
  COLLECTING: { label: "Collecting payment", cls: "badge badge-blue" },
  COLLECTED:  { label: "Payment received",   cls: "badge badge-blue" },
  DELIVERED:  { label: "Held in escrow",     cls: "badge badge-yellow" },
  RELEASED:   { label: "Seller paid",        cls: "badge badge-green" },
  REFUNDED:   { label: "Refunded",           cls: "badge badge-gray" },
  DISPUTED:   { label: "Disputed",           cls: "badge badge-red" },
  FAILED:     { label: "Payment failed",     cls: "badge badge-red" },
};

const TYPE_LABEL: Record<string, string> = {
  FOREST: "Forest", SAVANNA: "Savanna", GRASSLAND: "Grassland", FARMLAND: "Farmland",
  WETLAND: "Wetland", MANGROVE: "Mangrove",
  SOLAR_PV: "Solar PV", BIOGAS: "Biogas", BIOCHARCOAL: "Biocharcoal",
  COOKSTOVES: "Cookstoves", MICRO_HYDRO: "Micro-Hydro", WIND: "Wind",
};
const TYPE_COLOR = ["#16a34a","#d97706","#2563eb","#7c3aed","#0891b2","#dc2626","#65a30d","#f59e0b","#1d4ed8","#9333ea","#0284c7","#b91c1c"];

const typeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [certPurchase,  setCertPurchase]  = useState<Purchase | null>(null);
  const [retireTarget,  setRetireTarget]  = useState<Purchase | null>(null);
  const [resellTarget,  setResellTarget]  = useState<Purchase | null>(null);
  const [localPurchases, setLocalPurchases] = useState<Purchase[] | null>(null);
  const [escrowPending, setEscrowPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function confirmReceipt(purchase: Purchase) {
    setEscrowPending(purchase.id);
    try {
      const r = await fetch(`/api/marketplace/purchases/${purchase.id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || d.message || "Confirm failed");
      setLocalPurchases(prev => (prev ?? data?.data ?? []).map(p =>
        p.id === purchase.id ? { ...p, settlementStatus: "RELEASED", buyerConfirmedAt: new Date().toISOString() } : p
      ));
      setToast("Receipt confirmed — funds released to seller.");
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Confirm failed");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setEscrowPending(null);
    }
  }

  async function disputePurchase(purchase: Purchase) {
    const reason = window.prompt("Tell us what went wrong (minimum 5 characters):");
    if (!reason || reason.trim().length < 5) return;
    setEscrowPending(purchase.id);
    try {
      const r = await fetch(`/api/marketplace/purchases/${purchase.id}/dispute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || d.message || "Dispute failed");
      setLocalPurchases(prev => (prev ?? data?.data ?? []).map(p =>
        p.id === purchase.id ? { ...p, settlementStatus: "DISPUTED" } : p
      ));
      setToast("Dispute opened — our team will be in touch.");
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Dispute failed");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setEscrowPending(null);
    }
  }

  async function cancelResale(purchase: Purchase, resaleId: string) {
    if (!window.confirm("Cancel this resale request? Your credits stay in your portfolio.")) return;
    setEscrowPending(purchase.id);
    try {
      const r = await fetch(`/api/marketplace/resale-requests/${resaleId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || d.message || "Cancel failed");
      setLocalPurchases(prev => (prev ?? data?.data ?? []).map(p =>
        p.id === purchase.id
          ? { ...p, resaleRequests: (p.resaleRequests ?? []).map(rr => rr.id === resaleId ? { ...rr, status: "CANCELLED" as const } : rr) }
          : p
      ));
      setToast("Resale request cancelled.");
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Cancel failed");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setEscrowPending(null);
    }
  }

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) router.push("/login?next=/portfolio");
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-purchases-portfolio"],
    queryFn: () => api.get<{ data: Purchase[] }>("/api/marketplace/me/purchases"),
    enabled: !!user,
  });

  const purchases: Purchase[] = localPurchases ?? data?.data ?? [];
  const totalTons   = purchases.reduce((s, p) => s + p.totalTons, 0);
  const retiredTons = purchases.filter(p => p.retired).reduce((s, p) => s + p.totalTons, 0);
  const activeTons  = totalTons - retiredTons;
  const totalSpend  = purchases.reduce((s, p) => s + (p.buyerTotal ?? p.totalPrice), 0);

  // Equivalencies based on credits actually retired against emissions.
  // Trees: ~22 kg CO2/year per mature tree → ~45 trees per t·yr.
  // Car: EPA passenger-vehicle average ~170 g CO2/km → ~5,880 km per t.
  // Flights: transatlantic round-trip ~1.6 t CO2 per passenger.
  const treesEquiv   = Math.round(retiredTons * 45);
  const carKmEquiv   = Math.round(retiredTons * 5880);
  const flightsEquiv = Math.round(retiredTons / 1.6);

  // Type breakdown for pie chart
  const typeMap: Record<string, number> = {};
  purchases.forEach(p => {
    const key = p.listing.credit.project.energyType ?? p.listing.credit.project.landType ?? "OTHER";
    typeMap[key] = (typeMap[key] ?? 0) + p.totalTons;
  });
  const pieData = Object.entries(typeMap).map(([key, val]) => ({ name: TYPE_LABEL[key] ?? key, value: val, emoji: typeEmoji[key] ?? "🌍" }));

  // Cumulative timeline for area chart
  const sorted = [...purchases].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let cumulative = 0;
  const timelineData = sorted.map(p => {
    cumulative += p.totalTons;
    return { date: new Date(p.createdAt).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), tonnes: +cumulative.toFixed(1) };
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-sm">
          {toast}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Impact Portfolio</h1>
              <p className="text-sm text-gray-500 mt-0.5">Your verified carbon offset record</p>
            </div>
            <Link href="/marketplace" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              Buy Credits <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <div className="text-center py-24 text-gray-400">Loading portfolio…</div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-savanna-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-10 h-10 text-savanna-400" />
            </div>
            <h3 className="font-bold text-gray-700 mb-2">No purchases yet</h3>
            <p className="text-gray-400 text-sm mb-6">Purchase verified credits to start building your portfolio</p>
            <Link href="/marketplace" className="btn-primary">Browse Credits</Link>
          </div>
        ) : (
          <>
            {/* Impact summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Award,      label: "Total Offset",     value: `${totalTons.toLocaleString(undefined,{maximumFractionDigits:1})} t`,   card: "bg-forest-50 border-forest-100",   chip: "bg-forest-100 text-forest-700" },
                { icon: TrendingUp, label: "Retired",          value: `${retiredTons.toLocaleString(undefined,{maximumFractionDigits:1})} t`, card: "bg-blue-50 border-blue-100",       chip: "bg-blue-100 text-blue-700" },
                { icon: TrendingUp, label: "Active Holdings",  value: `${activeTons.toLocaleString(undefined,{maximumFractionDigits:1})} t`,  card: "bg-savanna-50 border-savanna-100", chip: "bg-savanna-100 text-savanna-700" },
                { icon: TrendingUp, label: "Total Invested",   value: `$${totalSpend.toLocaleString(undefined,{maximumFractionDigits:0})}`,   card: "bg-gray-50 border-gray-100",       chip: "bg-gray-200 text-gray-700" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border shadow-card p-5 ${s.card}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.chip}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Equivalencies */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
              <h2 className="font-bold text-gray-900 mb-4">What your offset equals</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-forest-50 rounded-xl p-4">
                  <TreePine className="w-6 h-6 text-forest-600 mx-auto mb-2" />
                  <div className="text-xl font-black text-forest-700">{treesEquiv.toLocaleString()}</div>
                  <div className="text-xs text-forest-600 mt-0.5">trees absorbing CO₂ for one year</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <Car className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-black text-blue-700">{(carKmEquiv/1000).toLocaleString()}k km</div>
                  <div className="text-xs text-blue-600 mt-0.5">of average car driving avoided</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <Plane className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-black text-purple-700">{flightsEquiv.toLocaleString()}</div>
                  <div className="text-xs text-purple-600 mt-0.5">transatlantic flights offset</div>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cumulative chart */}
              {timelineData.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
                  <h2 className="font-bold text-gray-900 mb-4">Cumulative offset (t CO₂)</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v} t`, "Total offset"]} />
                      <Area type="monotone" dataKey="tonnes" stroke="#16a34a" fill="url(#tGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Type breakdown */}
              {pieData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
                  <h2 className="font-bold text-gray-900 mb-4">Portfolio by type</h2>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                          {pieData.map((_, i) => <Cell key={i} fill={TYPE_COLOR[i % TYPE_COLOR.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v.toFixed(1)} t`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {pieData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[i % TYPE_COLOR.length] }} />
                          <span className="text-gray-600 flex-1">{item.emoji} {item.name}</span>
                          <span className="font-semibold text-gray-700">{item.value.toFixed(1)} t</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Holdings table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Holdings</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {purchases.map(p => {
                  const key = p.listing.credit.project.energyType ?? p.listing.credit.project.landType ?? "FOREST";
                  const resale = p.resaleRequests?.[0];
                  const settled = p.settlementStatus === "DELIVERED" || p.settlementStatus === "RELEASED";
                  return (
                    <div key={p.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">{typeEmoji[key] ?? "🌍"}</div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{p.listing.credit.project.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{p.totalTons} t · ${(p.buyerTotal ?? p.totalPrice).toFixed(2)} {p.currency} · {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                              {p.settlementStatus && SETTLEMENT_BADGE[p.settlementStatus] && !p.retired && (
                                <span className={SETTLEMENT_BADGE[p.settlementStatus].cls}>
                                  {SETTLEMENT_BADGE[p.settlementStatus].label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.listing.status === "ACTIVE" && p.listing.totalTons > 0 && (
                            <Link
                              href={`/marketplace/${p.listing.id}`}
                              className="flex items-center gap-1 text-xs text-forest-700 hover:underline font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" /> Buy more
                            </Link>
                          )}
                          {p.retired ? (
                            <>
                              <span className="badge badge-green">✓ Retired</span>
                              <button onClick={() => setCertPurchase(p)} className="flex items-center gap-1 text-xs text-forest-700 hover:underline font-medium">
                                <ScrollText className="w-3.5 h-3.5" /> Certificate
                              </button>
                            </>
                          ) : p.resold ? (
                            <span className="badge badge-blue">↗ Relisted for resale</span>
                          ) : resale?.status === "REQUESTED" ? (
                            <span className="flex items-center gap-2">
                              <span className="badge badge-yellow">Resale pending review</span>
                              <button
                                onClick={() => cancelResale(p, resale.id)}
                                disabled={escrowPending === p.id}
                                className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50">
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <>
                              {settled && (
                                <button
                                  onClick={() => setResellTarget(p)}
                                  className="flex items-center gap-1 text-xs btn-secondary py-1.5 px-3">
                                  <Tag className="w-3.5 h-3.5" /> Resell
                                </button>
                              )}
                              <button
                                onClick={() => setRetireTarget(p)}
                                className="text-xs btn-secondary py-1.5 px-3">
                                Retire Credits
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Escrow actions — only while DELIVERED and not yet confirmed/disputed */}
                      {p.settlementStatus === "DELIVERED" && !p.retired && (
                        <div className="mt-3 ml-12 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => confirmReceipt(p)}
                            disabled={escrowPending === p.id}
                            className="flex items-center gap-1.5 bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          >
                            {escrowPending === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Confirm receipt
                          </button>
                          <button
                            onClick={() => disputePurchase(p)}
                            disabled={escrowPending === p.id}
                            className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Something's wrong
                          </button>
                          {p.autoReleaseAt && (
                            <span className="text-xs text-gray-400">
                              Auto-releases {new Date(p.autoReleaseAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Resale rejected — show why so the buyer can adjust and re-request */}
                      {!p.resold && resale?.status === "REJECTED" && resale.rejectionReason && (
                        <div className="mt-3 ml-12 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          Resale request declined: {resale.rejectionReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {resellTarget && (
        <ResellRequestModal
          purchaseId={resellTarget.id}
          projectTitle={resellTarget.listing.credit.project.title}
          tonnes={resellTarget.totalTons}
          originalPricePerTon={resellTarget.listing.pricePerTon}
          currency={resellTarget.currency}
          onClose={() => setResellTarget(null)}
          onRequested={() => {
            const now = new Date().toISOString();
            setLocalPurchases(purchases.map(p =>
              p.id === resellTarget.id
                ? { ...p, resaleRequests: [{ id: `pending-${now}`, status: "REQUESTED" as const, proposedPricePerTon: 0, createdAt: now }] }
                : p
            ));
            setResellTarget(null);
            setToast("Resale request submitted — our team will review it shortly.");
            setTimeout(() => setToast(null), 4000);
          }}
        />
      )}

      {retireTarget && (
        <RetirementIntentModal
          purchaseId={retireTarget.id}
          projectTitle={retireTarget.listing.credit.project.title}
          tonnes={retireTarget.totalTons}
          purchasedAt={retireTarget.createdAt}
          isEnergy={!!retireTarget.listing.credit.project.energyType}
          onClose={() => setRetireTarget(null)}
          onRetired={(reason, note, retiredAt) => {
            const updated = purchases.map(p =>
              p.id === retireTarget.id ? { ...p, retired: true, retirementReason: reason, retirementNote: note, retiredAt } : p
            );
            setLocalPurchases(updated);
            setRetireTarget(null);
          }}
        />
      )}

      {certPurchase && (
        <RetirementCertificate
          purchaseId={certPurchase.id}
          buyerName={user.name ?? "Carbon Buyer"}
          projectTitle={certPurchase.listing.credit.project.title}
          country={certPurchase.listing.credit.project.country}
          tonnes={certPurchase.totalTons}
          retiredAt={certPurchase.retiredAt ?? certPurchase.createdAt}
          txHash={certPurchase.retirementTxHash}
          nftTokenId={certPurchase.nftTokenId}
          retirementReason={certPurchase.retirementReason}
          retirementNote={certPurchase.retirementNote}
          vintageYear={certPurchase.listing.credit.vintageYear}
          onClose={() => setCertPurchase(null)}
        />
      )}
    </div>
  );
}
