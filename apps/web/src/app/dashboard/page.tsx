"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { TreePine, TrendingUp, Leaf, Plus, ArrowRight, Award, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const statusColors: Record<string, string> = {
  PENDING: "badge-gray", UNDER_REVIEW: "badge-yellow",
  VERIFIED: "badge-green", REJECTED: "badge-red", ACTIVE: "badge-green",
};
const statusDot: Record<string, string> = {
  PENDING: "bg-gray-400", UNDER_REVIEW: "bg-savanna-400 animate-pulse",
  VERIFIED: "bg-forest-500", REJECTED: "bg-red-400", ACTIVE: "bg-forest-500",
};

interface Project {
  id: string; title: string; landType: string; country: string;
  hectares: number; status: string; credits: Array<{ amount: number; status: string }>;
}
interface Purchase {
  id: string; totalTons: number; totalPrice: number; currency: string;
  retired: boolean; nftTokenId?: string;
  listing: { credit: { project: { title: string; landType: string } } };
  createdAt: string;
}

const landTypeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
};

export default function DashboardPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const { data: projectsData } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => api.get<{ data: Project[] }>("/api/projects/me/projects"),
    enabled: !!user,
  });
  const { data: purchasesData } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: () => api.get<{ data: Purchase[] }>("/api/marketplace/me/purchases"),
    enabled: !!user,
  });

  const projects: Project[] = projectsData?.data ?? [];
  const purchases: Purchase[] = purchasesData?.data ?? [];
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
          {user.role === "LANDOWNER" && (
            <Link href="/projects/new" className="btn-primary">
              <Plus className="w-4 h-4" /> New Project
            </Link>
          )}
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
                        {landTypeEmoji[p.landType] || "🌍"}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-forest-700 transition-colors">{p.title}</div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {p.country} · {p.hectares.toLocaleString()} ha
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
              <Link href="/marketplace" className="text-sm text-forest-600 font-semibold hover:underline flex items-center gap-1">
                Browse market <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
                        {landTypeEmoji[p.listing.credit.project.landType] || "🌍"}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{p.listing.credit.project.title}</div>
                        <div className="text-sm text-gray-400 mt-0.5">
                          {p.totalTons} tonnes · ${p.totalPrice.toFixed(2)} {p.currency}
                        </div>
                      </div>
                    </div>
                    <div>
                      {p.retired ? (
                        <span className="badge-green">✓ Retired</span>
                      ) : (
                        <button
                          onClick={async () => { await api.post(`/api/marketplace/purchases/${p.id}/retire`, {}); window.location.reload(); }}
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
    </div>
  );
}
