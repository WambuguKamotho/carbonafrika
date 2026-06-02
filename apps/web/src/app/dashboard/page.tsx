"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { TreePine, TrendingUp, Leaf, Plus, ArrowRight, Award, MapPin, ScrollText, RefreshCw, Tag } from "lucide-react";
import ListCreditModal from "@/components/landowner/ListCreditModal";
import RetirementCertificate from "@/components/ui/RetirementCertificate";
import RetirementIntentModal from "@/components/ui/RetirementIntentModal";
import IssuanceCertificate from "@/components/ui/IssuanceCertificate";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const statusColors: Record<string, string> = {
  PENDING: "badge-gray", UNDER_REVIEW: "badge-yellow",
  VERIFIED: "badge-green", REJECTED: "badge-red", ACTIVE: "badge-green",
};
const statusDot: Record<string, string> = {
  PENDING: "bg-gray-400", UNDER_REVIEW: "bg-savanna-400 animate-pulse",
  VERIFIED: "bg-forest-500", REJECTED: "bg-red-400", ACTIVE: "bg-forest-500",
};

interface Credit {
  id: string; amount: number; status: string;
  mintTxHash?: string | null; tokenId?: string | null; createdAt: string;
  vintageYear?: number | null;
}
interface ProjectVerification { status: string; carbonTons?: number | null; }
interface Project {
  id: string; title: string; landType: string | null; energyType: string | null;
  country: string; hectares: number; status: string;
  credits: Credit[];
  verifications?: ProjectVerification[];
}
interface Purchase {
  id: string; totalTons: number; totalPrice: number; buyerTotal?: number | null; currency: string;
  settlementStatus?: string | null;
  retired: boolean; nftTokenId?: string | null; retirementTxHash?: string | null;
  retirementReason?: string | null; retirementNote?: string | null; retiredAt?: string | null;
  listing: { credit: { vintageYear?: number | null; project: { title: string; country: string; landType: string | null; energyType: string | null } } };
  createdAt: string;
}

const projectTypeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [certPurchase,   setCertPurchase]   = useState<Purchase | null>(null);
  const [retireTarget,   setRetireTarget]   = useState<Purchase | null>(null);
  const [purchases_,     setPurchases_]     = useState<Purchase[] | null>(null);
  const [issuanceProjct, setIssuanceProjct] = useState<Project | null>(null);
  const [listTarget, setListTarget] = useState<{ credit: Credit; projectTitle: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) router.push("/login");
    else if (u.role === "ADMIN")             router.replace("/admin");
    else if (u.role === "VERIFIER")          router.replace("/verifier");
    else if (u.role === "BUYER")             router.replace("/portfolio");
    else if (u.role === "COMMUNITY_PARTNER") router.replace("/partner");
  }, [router]);

  const { data: projectsData, refetch: refetchProjects, isFetching: isFetchingProjects } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => api.get<{ data: Project[] }>("/api/projects/me/projects"),
    enabled: !!user,
    // Poll every 30s while the dashboard is open so the landowner sees admin
    // approval flips without needing to refresh. Cheap call — owner's own projects only.
    refetchInterval: 30_000,
  });
  const { data: purchasesData } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: () => api.get<{ data: Purchase[] }>("/api/marketplace/me/purchases"),
    enabled: !!user,
  });

  const projects: Project[] = projectsData?.data ?? [];
  const purchases: Purchase[] = purchases_ ?? purchasesData?.data ?? [];
  const totalCredits = projects.reduce((a, p) => a + p.credits.reduce((b, c) => b + c.amount, 0), 0);
  const totalPurchased = purchases.reduce((a, p) => a + p.totalTons, 0);
  const retired = purchases.filter(p => p.retired).length;

  if (!user) return null;

  const stats = [
    { icon: TreePine, label: "Projects", value: projects.length, color: "bg-forest-50 text-forest-700", border: "border-forest-100" },
    { icon: Leaf, label: "Credits Earned", value: `${totalCredits.toFixed(0)}t`, color: "bg-forest-50 text-forest-700", border: "border-forest-100" },
    { icon: TrendingUp, label: "Credits Bought", value: `${totalPurchased.toFixed(0)}t`, color: "bg-savanna-50 text-savanna-700", border: "border-savanna-100" },
    { icon: Award, label: "Retired", value: retired, color: "bg-blue-50 text-blue-700", border: "border-blue-100" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Welcome back</p>
            <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchProjects()}
              disabled={isFetchingProjects}
              title="Refresh projects"
              aria-label="Refresh projects"
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingProjects ? "animate-spin" : ""}`} />
            </button>
            {user.role === "LANDOWNER" && (
              <Link href="/projects/new" className="btn-primary">
                <Plus className="w-4 h-4" /> New Project
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-card p-5`}>
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My Projects */}
        {user.role === "LANDOWNER" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">My Projects</h2>
              <Link href="/projects/new" className="text-sm text-forest-600 font-semibold hover:underline flex items-center gap-1">
                Add new <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-forest-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TreePine className="w-8 h-8 text-forest-400" />
                </div>
                <h3 className="font-bold text-gray-700 mb-1">No projects yet</h3>
                <p className="text-sm text-gray-400 mb-6">Submit your first land project to start earning carbon credits</p>
                <Link href="/projects/new" className="btn-primary">Submit first project</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="group flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-forest-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {projectTypeEmoji[p.energyType ?? p.landType ?? ""] ?? "🌍"}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-forest-700 transition-colors">{p.title}</div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {p.country} · {p.hectares.toLocaleString()} ha
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* List-on-marketplace CTA appears for credits with status AVAILABLE
                          (minted but not yet listed). Once listed the credit's status flips
                          to LISTED and the button hides itself. */}
                      {(() => {
                        const listable = p.credits.find(c => c.status === "AVAILABLE" && c.amount > 0);
                        if (!listable) return null;
                        return (
                          <button
                            onClick={e => { e.preventDefault(); setListTarget({ credit: listable, projectTitle: p.title }); }}
                            className="flex items-center gap-1 text-xs text-white bg-forest-700 hover:bg-forest-800 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" /> List for sale
                          </button>
                        );
                      })()}
                      {p.credits.some(c => c.mintTxHash) && (
                        <button
                          onClick={e => { e.preventDefault(); setIssuanceProjct(p); }}
                          className="flex items-center gap-1 text-xs text-savanna-700 hover:underline font-medium"
                        >
                          <ScrollText className="w-3.5 h-3.5" /> Certificate
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusDot[p.status] || "bg-gray-300"}`} />
                        <span className={statusColors[p.status] || "badge-gray"}>{p.status.replace("_", " ")}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-forest-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Purchases */}
        {(user.role === "BUYER" || purchases.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">My Purchases</h2>
              <div className="flex items-center gap-3">
                {user.role === "BUYER" && purchases.length > 0 && (
                  <Link href="/portfolio" className="text-sm text-forest-600 font-semibold hover:underline flex items-center gap-1">
                    Full portfolio <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link href="/marketplace" className="text-sm text-forest-600 font-semibold hover:underline flex items-center gap-1">
                  Browse market <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            {purchases.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-savanna-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-savanna-400" />
                </div>
                <h3 className="font-bold text-gray-700 mb-1">No purchases yet</h3>
                <p className="text-sm text-gray-400 mb-6">Browse verified African carbon credits on the marketplace</p>
                <Link href="/marketplace" className="btn-primary">Browse credits</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-savanna-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {projectTypeEmoji[p.listing.credit.project.energyType ?? p.listing.credit.project.landType ?? ""] ?? "🌍"}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{p.listing.credit.project.title}</div>
                        <div className="text-sm text-gray-400 mt-0.5">
                          {p.totalTons} tonnes · ${(p.buyerTotal ?? p.totalPrice).toFixed(2)} {p.currency}
                          {p.settlementStatus === "FAILED" && (
                            <span className="ml-2 badge-red text-xs">Payment failed</span>
                          )}
                          {p.settlementStatus === "PENDING" && !p.retired && (
                            <span className="ml-2 text-xs text-gray-400">· settling…</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.retired ? (
                        <>
                          <span className="badge-green">✓ Retired</span>
                          <button
                            onClick={() => setCertPurchase(p)}
                            className="flex items-center gap-1.5 text-xs text-forest-700 hover:underline font-medium">
                            <ScrollText className="w-3.5 h-3.5" /> Certificate
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setRetireTarget(p)}
                          className="text-xs btn-secondary py-1.5 px-3 rounded-xl">
                          Retire Credits
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {listTarget && (
        <ListCreditModal
          credit={listTarget.credit}
          projectTitle={listTarget.projectTitle}
          onClose={() => setListTarget(null)}
          onListed={() => { setListTarget(null); refetchProjects(); }}
        />
      )}

      {issuanceProjct && (() => {
        const credit = issuanceProjct.credits.find(c => c.mintTxHash) ?? issuanceProjct.credits[0];
        return (
          <IssuanceCertificate
            projectId={issuanceProjct.id}
            ownerName={user.name ?? "Project Owner"}
            projectTitle={issuanceProjct.title}
            country={issuanceProjct.country}
            hectares={issuanceProjct.hectares}
            creditAmount={credit?.amount ?? 0}
            verifiedTons={issuanceProjct.verifications?.[0]?.carbonTons}
            mintTxHash={credit?.mintTxHash}
            tokenId={credit?.tokenId}
            issuedAt={credit?.createdAt ?? new Date().toISOString()}
            vintageYear={credit?.vintageYear}
            onClose={() => setIssuanceProjct(null)}
          />
        );
      })()}

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
            setPurchases_(updated);
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
