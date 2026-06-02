"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { FolderOpen, SlidersHorizontal, Leaf } from "lucide-react";
import ProjectCard, { type ProjectCardData } from "@/components/ui/ProjectCard";
import Link from "next/link";

const TYPE_LABEL: Record<string, string> = {
  FOREST: "Forest", SAVANNA: "Savanna", GRASSLAND: "Grassland", FARMLAND: "Farmland",
  WETLAND: "Wetland", MANGROVE: "Mangrove",
  SOLAR_PV: "Solar PV", BIOGAS: "Biogas", BIOCHARCOAL: "Biocharcoal",
  COOKSTOVES: "Cookstoves", MICRO_HYDRO: "Micro-Hydro", WIND: "Wind",
};
const TYPE_EMOJI: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-px bg-gray-50" />
        <div className="flex justify-between">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-4" />
        </div>
      </div>
    </div>
  );
}

async function fetchProjects(status: string): Promise<ProjectCardData[]> {
  const res = await api.get<{ data: { items: (ProjectCardData & { credits?: { id: string }[] })[] } }>(`/api/projects?status=${status}&pageSize=50`);
  return (res.data?.items ?? []).map(item => ({
    ...item,
    hasListings: (item.credits?.length ?? 0) > 0,
  }));
}

export default function ProjectsPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [country, setCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ["projects-active"],
    queryFn: () => fetchProjects("ACTIVE"),
  });
  const { data: verifiedData, isLoading: loadingVerified } = useQuery({
    queryKey: ["projects-verified"],
    queryFn: () => fetchProjects("VERIFIED"),
  });

  const isLoading = loadingActive || loadingVerified;
  const all: ProjectCardData[] = [...(activeData ?? []), ...(verifiedData ?? [])];

  const filtered = all.filter(p => {
    const key = p.energyType ?? p.landType ?? "";
    if (typeFilter && key !== typeFilter) return false;
    if (country && !p.country.toLowerCase().includes(country.toLowerCase())) return false;
    return true;
  });

  const activeFilterCount = [typeFilter, country].filter(Boolean).length;
  const clearAll = () => { setTypeFilter(""); setCountry(""); };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-forest-700" />
                </div>
                <span className="text-xs font-bold text-forest-600 uppercase tracking-widest">Projects</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900">Verified Projects</h1>
              <p className="text-gray-500 mt-1">Browse active and verified carbon projects across Africa</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all ${showFilters ? "bg-forest-50 border-forest-200 text-forest-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </button>
          </div>

          {showFilters && (
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-3">
              <select className="input w-auto text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Project Types</option>
                <optgroup label="Land Restoration">
                  {["FOREST","SAVANNA","GRASSLAND","FARMLAND","WETLAND","MANGROVE"].map(t => (
                    <option key={t} value={t}>{TYPE_EMOJI[t]} {TYPE_LABEL[t]}</option>
                  ))}
                </optgroup>
                <optgroup label="Clean Energy">
                  {["SOLAR_PV","BIOGAS","BIOCHARCOAL","COOKSTOVES","MICRO_HYDRO","WIND"].map(t => (
                    <option key={t} value={t}>{TYPE_EMOJI[t]} {TYPE_LABEL[t]}</option>
                  ))}
                </optgroup>
              </select>
              <input className="input w-auto text-sm" placeholder="🔍 Country..." value={country} onChange={e => setCountry(e.target.value)} />
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-sm text-red-500 hover:underline px-2">Clear</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">No projects found</h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeFilterCount > 0 ? "Try adjusting your filters." : "Projects are being reviewed. Check back soon."}
            </p>
            {activeFilterCount > 0
              ? <button onClick={clearAll} className="btn-secondary text-sm">Clear filters</button>
              : <Link href="/projects/new" className="btn-primary">Submit your project</Link>
            }
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {filtered.length} project{filtered.length !== 1 ? "s" : ""}
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="ml-3 text-red-500 hover:underline">Clear filters</button>
                )}
              </p>
              <Link href="/projects/new" className="btn-primary text-sm py-2 px-4">+ Submit Project</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
