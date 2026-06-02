"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { RefreshCw, DollarSign, ArrowRight, ShoppingCart, Leaf, Award } from "lucide-react";
import Link from "next/link";
import PurchaseDetailModal from "@/components/admin/PurchaseDetailModal";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface Listing {
  id: string; status: string; pricePerTon: number; totalTons: number; currency: string; createdAt: string;
  credit: {
    amount: number;
    project: { id: string; title: string; country: string; owner: { name: string } };
  };
}

interface RecentPurchase {
  id: string; totalTons: number; totalPrice: number; currency: string; retired: boolean; createdAt: string;
  buyer: { name: string };
  listing: { credit: { project: { title: string; country: string } } };
}

interface Stats {
  totalPurchases: number; retiredCredits: number; totalRevenue: number;
  recentPurchases: RecentPurchase[];
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminMarketplacePage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch("/api/marketplace?pageSize=100", {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const listJson = await listRes.json();
      const statsJson = await statsRes.json();
      setListings(listJson.data?.items ?? []);
      if (statsJson.success) setStats(statsJson.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const totalTonsListed = listings.reduce((sum, l) => sum + l.totalTons, 0);
  const avgPrice = listings.length > 0
    ? listings.reduce((sum, l) => sum + l.pricePerTon, 0) / listings.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Marketplace</h1>
            <p className="text-sm text-gray-500 mt-0.5">{listings.length} active listings</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Listings",     value: listings.length,                           icon: ShoppingCart, color: "bg-blue-100 text-blue-700" },
            { label: "Tonnes Available",    value: `${totalTonsListed.toLocaleString()} t`,   icon: Leaf,         color: "bg-forest-100 text-forest-700" },
            { label: "Avg Price / tonne",   value: `$${avgPrice.toFixed(2)}`,                 icon: DollarSign,   color: "bg-savanna-100 text-savanna-700" },
            { label: "Total Revenue",       value: stats ? `$${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", icon: DollarSign, color: "bg-purple-100 text-purple-700" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active listings table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Active Listings</h2>
            </div>
            {loading ? (
              <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
            ) : listings.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-sm">No active listings</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Project", "Seller", "Price/t", "Available", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {listings.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 max-w-[180px] truncate">{l.credit.project.title}</div>
                          <div className="text-xs text-gray-400">{l.credit.project.country}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{l.credit.project.owner.name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          ${l.pricePerTon.toFixed(2)} <span className="text-xs font-normal text-gray-400">{l.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{l.totalTons.toLocaleString()} t</td>
                        <td className="px-4 py-3">
                          <Link href={`/marketplace/${l.id}`}
                            className="flex items-center gap-1 text-xs text-forest-600 hover:underline font-medium">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent purchases */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Purchases</h2>
              {stats && (
                <span className="text-xs text-gray-400">{stats.totalPurchases} total</span>
              )}
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : !stats?.recentPurchases?.length ? (
              <p className="text-sm text-gray-400 text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-2 -mx-2">
                {stats.recentPurchases.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPurchaseId(p.id)}
                    className="w-full text-left flex items-start justify-between gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate group-hover:text-forest-700 transition-colors">
                        {p.listing.credit.project.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.buyer.name} · {p.totalTons} t · {timeAgo(p.createdAt)}
                      </div>
                      {p.retired && (
                        <span className="inline-flex items-center gap-1 text-xs text-forest-600 font-medium mt-0.5">
                          <Award className="w-3 h-3" /> Retired
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">
                        ${p.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                        {p.currency}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {stats && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>{stats.retiredCredits} purchases retired</span>
                <span>{stats.totalPurchases > 0 ? Math.round(stats.retiredCredits / stats.totalPurchases * 100) : 0}% retirement rate</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPurchaseId && (
        <PurchaseDetailModal
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
        />
      )}
    </div>
  );
}
