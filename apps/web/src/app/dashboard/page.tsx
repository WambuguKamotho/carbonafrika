"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { TreePine, TrendingUp, Leaf, Plus, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const statusColors: Record<string, string> = {
  PENDING: "badge-gray",
  UNDER_REVIEW: "badge-yellow",
  VERIFIED: "badge-green",
  REJECTED: "badge-red",
  ACTIVE: "badge-green",
};

export default function DashboardPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

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

  interface Project {
    id: string;
    title: string;
    landType: string;
    country: string;
    hectares: number;
    status: string;
    credits: Array<{ amount: number; status: string }>;
  }

  interface Purchase {
    id: string;
    totalTons: number;
    totalPrice: number;
    currency: string;
    retired: boolean;
    nftTokenId?: string;
    listing: { credit: { project: { title: string; landType: string } } };
    createdAt: string;
  }

  const projects: Project[] = projectsData?.data ?? [];
  const purchases: Purchase[] = purchasesData?.data ?? [];
  const totalCredits = projects.reduce((a, p) => a + p.credits.reduce((b, c) => b + c.amount, 0), 0);
  const totalPurchased = purchases.reduce((a, p) => a + p.totalTons, 0);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name}</p>
        </div>
        {user.role === "LANDOWNER" && (
          <Link href="/projects/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Submit Project
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: TreePine, label: "Projects", value: projects.length, color: "text-forest-600" },
          { icon: Leaf, label: "Credits Earned (t)", value: totalCredits.toFixed(1), color: "text-forest-600" },
          { icon: TrendingUp, label: "Credits Bought (t)", value: totalPurchased.toFixed(1), color: "text-savanna-600" },
          { icon: Leaf, label: "Credits Retired", value: purchases.filter((p) => p.retired).length, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="card">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* My Projects */}
      {user.role === "LANDOWNER" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">My Projects</h2>
            <Link href="/projects" className="text-sm text-forest-700 hover:underline">View all</Link>
          </div>
          {projects.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <TreePine className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No projects yet</p>
              <Link href="/projects/new" className="btn-primary inline-block mt-4 text-sm">Submit your first project</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="card flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="font-medium text-gray-900">{p.title}</div>
                    <div className="text-sm text-gray-500">{p.country} · {p.hectares.toLocaleString()} ha · {p.landType}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusColors[p.status] || "badge-gray"}>{p.status}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Purchases */}
      {purchases.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">My Purchases</h2>
          <div className="space-y-3">
            {purchases.map((p) => (
              <div key={p.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{p.listing.credit.project.title}</div>
                  <div className="text-sm text-gray-500">{p.totalTons} tonnes · ${p.totalPrice.toFixed(2)} {p.currency}</div>
                </div>
                <div className="flex items-center gap-3">
                  {p.retired ? (
                    <span className="badge-green">Retired ✓</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await api.post(`/api/marketplace/purchases/${p.id}/retire`, {});
                        window.location.reload();
                      }}
                      className="text-xs btn-secondary py-1 px-3"
                    >
                      Retire Credits
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
