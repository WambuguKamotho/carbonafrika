"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { MapPin, Leaf, SlidersHorizontal, ArrowRight, TrendingUp } from "lucide-react";
import { useState } from "react";

const landTypeColors: Record<string, string> = {
  FOREST: "badge-green", SAVANNA: "badge-yellow", GRASSLAND: "badge-green",
  FARMLAND: "badge-yellow", WETLAND: "badge-blue", MANGROVE: "badge-green",
};
const landTypeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
};
const landTypeGradient: Record<string, string> = {
  FOREST: "from-forest-800 to-forest-600", SAVANNA: "from-savanna-700 to-savanna-500",
  GRASSLAND: "from-forest-700 to-earth-500", FARMLAND: "from-earth-700 to-savanna-500",
  WETLAND: "from-blue-700 to-blue-500", MANGROVE: "from-teal-700 to-forest-500",
};

interface Listing {
  id: string; pricePerTon: number; totalTons: number; currency: string;
  credit: { amount: number; project: { id: string; title: string; landType: string; country: string; region?: string; hectares: number; owner: { name: string } } };
}

function ListingCard({ listing }: { listing: Listing }) {
  const { project } = listing.credit;
  const grad = landTypeGradient[project.landType] || "from-gray-700 to-gray-500";
  return (
    <Link href={`/marketplace/${listing.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
      {/* Color band header */}
      <div className={`bg-gradient-to-r ${grad} h-2`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <span className={landTypeColors[project.landType] || "badge-gray"}>
            {landTypeEmoji[project.landType]} {project.landType.charAt(0) + project.landType.slice(1).toLowerCase()}
          </span>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg font-medium">
            {listing.totalTons.toLocaleString()} t left
          </span>
        </div>
        <h3 className="font-bold text-gray-900 group-hover:text-forest-700 transition-colors mb-1 leading-snug">
          {project.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{project.country}{project.region ? `, ${project.region}` : ""}</span>
        </div>
        <div className="text-xs text-gray-400 mb-4">by {project.owner.name}</div>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-2xl font-black text-forest-700">${listing.pricePerTon}</span>
            <span className="text-sm text-gray-400 ml-1">/ tonne</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{project.hectares.toLocaleString()} ha</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-forest-500 opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden animate-pulse">
      <div className="h-2 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-5 bg-gray-100 rounded-lg w-16" />
        </div>
        <div className="h-5 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-px bg-gray-50 my-2" />
        <div className="flex justify-between items-center">
          <div className="h-7 bg-gray-100 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [landType, setLandType] = useState("");
  const [country, setCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", landType, country],
    queryFn: () => {
      const params = new URLSearchParams();
      if (landType) params.set("landType", landType);
      if (country) params.set("country", country);
      return api.get<{ data: { items: Listing[] } }>(`/api/marketplace?${params}`);
    },
  });

  const listings: Listing[] = data?.data?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-forest-700" />
                </div>
                <span className="text-xs font-bold text-forest-600 uppercase tracking-widest">Live Market</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900">Carbon Credit Marketplace</h1>
              <p className="text-gray-500 mt-1">Verified African credits · 1 credit = 1 tonne CO₂ sequestered</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all ${showFilters ? "bg-forest-50 border-forest-200 text-forest-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters {(landType || country) ? `(${[landType,country].filter(Boolean).length})` : ""}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-3">
              <select className="input w-auto text-sm" value={landType} onChange={(e) => setLandType(e.target.value)}>
                <option value="">All Land Types</option>
                {Object.keys(landTypeEmoji).map((t) => (
                  <option key={t} value={t}>{landTypeEmoji[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
              <input className="input w-auto text-sm" placeholder="🔍 Filter by country..." value={country} onChange={(e) => setCountry(e.target.value)} />
              {(landType || country) && (
                <button onClick={() => { setLandType(""); setCountry(""); }} className="text-sm text-red-500 hover:underline px-2">Clear</button>
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
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">No listings yet</h3>
            <p className="text-gray-400 text-sm mb-6">Projects are being verified. Check back soon.</p>
            <Link href="/register" className="btn-primary">Register your land</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">{listings.length} listing{listings.length !== 1 ? "s" : ""} available</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
