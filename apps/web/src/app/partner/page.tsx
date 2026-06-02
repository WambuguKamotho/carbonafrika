"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, TreePine, TrendingUp, Award, ArrowRight, Copy, Loader2,
  CheckCircle, Clock, MapPin, ScrollText, Leaf,
} from "lucide-react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface PartnerProject {
  id: string; title: string; country: string; status: string;
  projectType: string; landType: string | null; energyType: string | null;
  hectares: number; estimatedTons: number; createdAt: string;
  partnerRoyaltyPercent: number;
  owner: { id: string; name: string };
  methodology: { code: string; name: string } | null;
  _count: { credits: number };
}

interface PartnerEarning {
  id: string;
  projectId: string | null;
  purchaseId: string | null;
  kind: "ONBOARDING" | "VERIFICATION" | "ROYALTY";
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "REVERSED";
  paidAt: string | null;
  note: string | null;
  createdAt: string;
}

interface EarningsResponse {
  items: PartnerEarning[];
  pending: number;
  paid: number;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:      "badge badge-yellow",
  UNDER_REVIEW: "badge badge-blue",
  VERIFIED:     "badge badge-green",
  ACTIVE:       "badge badge-green",
  REJECTED:     "badge badge-red",
  COMPLETED:    "badge badge-gray",
};

const KIND_COLOR: Record<string, string> = {
  ONBOARDING:   "bg-blue-100 text-blue-700",
  VERIFICATION: "bg-purple-100 text-purple-700",
  ROYALTY:      "bg-forest-100 text-forest-700",
};

const TYPE_EMOJI: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱",
  WETLAND: "💧", MANGROVE: "🌊", SOLAR_PV: "☀️", BIOGAS: "🔥",
  BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [user,  setUser]  = useState<ReturnType<typeof getUser>>(null);
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login?next=/partner"); return; }
    if (u.role !== "COMMUNITY_PARTNER" && u.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<{ data: PartnerProject[] }>("/api/auth/me/partner-projects"),
      api.get<{ data: EarningsResponse }>("/api/auth/me/partner-earnings"),
    ])
      .then(([p, e]) => {
        setProjects(p.data ?? []);
        setEarnings(e.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function copyPartnerCode() {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-forest-600 animate-spin" />
      </div>
    );
  }

  const verifiedProjects = projects.filter(p => ["VERIFIED", "ACTIVE", "COMPLETED"].includes(p.status)).length;
  const totalTonnesEstimated = projects.reduce((s, p) => s + p.estimatedTons, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Community Partner
              </p>
              <h1 className="text-2xl font-black text-gray-900 mt-0.5">{user.name}</h1>
            </div>
            <button
              onClick={copyPartnerCode}
              className="flex items-center gap-2 bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-forest-600">Your partner code</div>
                <code className="font-mono text-xs font-bold">{user.id}</code>
              </div>
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Earnings */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EarningCard
            icon={Clock}
            value={earnings ? `$${earnings.pending.toFixed(2)}` : "—"}
            label="Pending balance"
            sub="Accrued, not yet paid"
            color="bg-amber-50 border-amber-200 text-amber-900"
            iconColor="text-amber-600"
          />
          <EarningCard
            icon={CheckCircle}
            value={earnings ? `$${earnings.paid.toFixed(2)}` : "—"}
            label="Paid out"
            sub="Lifetime"
            color="bg-forest-50 border-forest-200 text-forest-900"
            iconColor="text-forest-600"
          />
          <EarningCard
            icon={TrendingUp}
            value={verifiedProjects}
            label="Verified projects"
            sub={`of ${projects.length} registered`}
            color="bg-blue-50 border-blue-200 text-blue-900"
            iconColor="text-blue-600"
          />
        </section>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-10 text-center">
            <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TreePine className="w-7 h-7 text-forest-600" />
            </div>
            <h2 className="font-black text-gray-900 text-lg mb-2">Bring your first project</h2>
            <p className="text-sm text-gray-500 mb-1 max-w-md mx-auto leading-relaxed">
              Share your partner code with a landowner so they can attribute their project to you.
              You earn an onboarding payout when admin approves it, a verification payout after carbon assessment,
              and royalties on every credit sold.
            </p>
            <div className="text-xs text-gray-400 mt-4">
              They'll enter your code on the project-creation form:
            </div>
            <code className="inline-block mt-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-mono text-xs font-bold">
              {user.id}
            </code>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Your projects</h2>
              <span className="text-xs text-gray-400">
                {projects.length} project{projects.length === 1 ? "" : "s"} · {totalTonnesEstimated.toLocaleString()} t estimated
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {projects.map(p => {
                const typeKey = p.energyType ?? p.landType ?? "";
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="text-2xl flex-shrink-0">{TYPE_EMOJI[typeKey] ?? "🌍"}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{p.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.country}</span>
                          <span>·</span>
                          <span>{p.owner.name}</span>
                          {p.methodology && <><span>·</span><span className="font-mono">{p.methodology.code}</span></>}
                          <span>·</span>
                          <span>{p.partnerRoyaltyPercent}% royalty</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={STATUS_COLOR[p.status] ?? "badge badge-gray"}>{p.status.replace("_", " ")}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Earnings ledger */}
        {earnings && earnings.items.length > 0 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-forest-600" /> Earnings ledger
              </h2>
              <span className="text-xs text-gray-400">{earnings.items.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kind</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {earnings.items.map(e => (
                    <tr key={e.id}>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${KIND_COLOR[e.kind]}`}>
                          {e.kind === "ONBOARDING"  ? <Award      className="w-3 h-3 inline mr-1" /> :
                           e.kind === "VERIFICATION" ? <CheckCircle className="w-3 h-3 inline mr-1" /> :
                                                       <TrendingUp className="w-3 h-3 inline mr-1" />}
                          {e.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{e.note ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ${e.amount.toFixed(2)} <span className="text-xs font-normal text-gray-400">{e.currency}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          e.status === "PAID"     ? "badge-green" :
                          e.status === "REVERSED" ? "badge-gray"  :
                                                    "badge-yellow"
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {new Date(e.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer info */}
        <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-xs text-gray-600 leading-relaxed flex items-start gap-3">
          <Leaf className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
          <div>
            Pending earnings settle to your wallet or bank in our weekly payout run.
            Royalties accrue automatically every time a credit from one of your projects is sold and released to the seller.
          </div>
        </section>
      </div>
    </div>
  );
}

function EarningCard({
  icon: Icon, value, label, sub, color, iconColor,
}: {
  icon: React.ElementType; value: string | number; label: string; sub: string;
  color: string; iconColor: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <Icon className={`w-5 h-5 mb-3 ${iconColor}`} />
      <div className="text-3xl font-black leading-none">{value}</div>
      <div className="text-sm font-semibold mt-1.5">{label}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}
