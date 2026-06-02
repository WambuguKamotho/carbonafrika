"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { MapPin, Leaf, SlidersHorizontal, ArrowRight, TrendingUp } from "lucide-react";
import { useState } from "react";

const typeColors: Record<string, string> = {
  FOREST: "badge-green", SAVANNA: "badge-yellow", GRASSLAND: "badge-green",
  FARMLAND: "badge-yellow", WETLAND: "badge-blue", MANGROVE: "badge-green",
  SOLAR_PV: "badge-yellow", BIOGAS: "badge-orange", BIOCHARCOAL: "badge-gray",
  COOKSTOVES: "badge-yellow", MICRO_HYDRO: "badge-blue", WIND: "badge-blue",
};
const typeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};
const typeLabel: Record<string, string> = {
  FOREST: "Forest", SAVANNA: "Savanna", GRASSLAND: "Grassland", FARMLAND: "Farmland",
  WETLAND: "Wetland", MANGROVE: "Mangrove",
  SOLAR_PV: "Solar PV", BIOGAS: "Biogas", BIOCHARCOAL: "Biocharcoal",
  COOKSTOVES: "Cookstoves", MICRO_HYDRO: "Micro-Hydro", WIND: "Wind",
};
const typeGradient: Record<string, string> = {
  FOREST: "from-forest-800 to-forest-600", SAVANNA: "from-savanna-700 to-savanna-500",
  GRASSLAND: "from-forest-700 to-earth-500", FARMLAND: "from-earth-700 to-savanna-500",
  WETLAND: "from-blue-700 to-blue-500", MANGROVE: "from-teal-700 to-forest-500",
  SOLAR_PV: "from-amber-600 to-yellow-400", BIOGAS: "from-orange-700 to-orange-500",
  BIOCHARCOAL: "from-stone-700 to-stone-500", COOKSTOVES: "from-amber-800 to-amber-600",
  MICRO_HYDRO: "from-sky-700 to-blue-500", WIND: "from-violet-700 to-blue-500",
};
const typePhoto: Record<string, string> = {
  FOREST:    "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=600&q=70&auto=format&fit=crop",
  SAVANNA:   "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=70&auto=format&fit=crop",
  GRASSLAND: "https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=600&q=70&auto=format&fit=crop",
  FARMLAND:  "https://images.unsplash.com/photo-1582409284161-5bf7c520dce9?w=600&q=70&auto=format&fit=crop",
  WETLAND:   "https://images.unsplash.com/photo-1589556183130-530470785fab?w=600&q=70&auto=format&fit=crop",
  MANGROVE:  "https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=600&q=70&auto=format&fit=crop",
  SOLAR_PV:    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=70&auto=format&fit=crop",
  BIOGAS:      "https://images.unsplash.com/photo-1739539978578-6c280bf8c582?w=600&q=70&auto=format&fit=crop",
  BIOCHARCOAL: "https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=600&q=70&auto=format&fit=crop",
  COOKSTOVES:  "https://images.unsplash.com/photo-1551982932-92d213f565a7?w=600&q=70&auto=format&fit=crop",
  MICRO_HYDRO: "https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=600&q=70&auto=format&fit=crop",
  WIND:        "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=70&auto=format&fit=crop",
};

interface Listing {
  id: string; pricePerTon: number; totalTons: number; currency: string;
  credit: { amount: number; vintageYear?: number | null; project: {
    id: string; title: string;
    projectType: string;
    landType: string | null;
    energyType: string | null;
    country: string; region?: string; hectares: number;
    capacityKw?: number | null;
    mediaUrls: string[];
    owner: { name: string };
  }};
}

function ListingCard({ listing }: { listing: Listing }) {
  const { project } = listing.credit;
  const vintageYear = listing.credit.vintageYear;
  // energyType is set iff it's a clean-energy project — use it as the source of truth
  const key     = project.energyType ?? project.landType ?? "FOREST";
  const isEnergy = !!project.energyType;
  const grad  = typeGradient[key]  ?? "from-gray-700 to-gray-500";
  const photo = project.mediaUrls?.[0] || typePhoto[key];
  const label = typeLabel[key] ?? key;
  const emoji = typeEmoji[key] ?? "🌍";
  const color = typeColors[key] ?? "badge-gray";

  return (
    <Link href={`/marketplace/${listing.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
      {/* Photo header */}
      <div className="relative h-40 overflow-hidden">
        {photo
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={photo} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className={`w-full h-full bg-gradient-to-br ${grad}`} />
        }
        <div className={`absolute inset-0 bg-gradient-to-t ${grad} opacity-40`} />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {label}
          </span>
          {isEnergy && (
            <span className="text-xs font-bold bg-amber-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-full">⚡</span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <span className={`${color} text-xs`}>
            {emoji} {label}
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
        <div className="flex items-center gap-2 mb-4">
          <div className="text-xs text-gray-400">by {project.owner.name}</div>
          {vintageYear && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{vintageYear}</span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className={`text-2xl font-black ${isEnergy ? "text-amber-600" : "text-forest-700"}`}>${listing.pricePerTon}</span>
            <span className="text-sm text-gray-400 ml-1">/ tonne</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{isEnergy && project.capacityKw ? `${project.capacityKw} kW` : `${project.hectares.toLocaleString()} ha`}</span>
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

type SortBy = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

export default function MarketplacePage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [country, setCountry] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [vintageFilter, setVintageFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", typeFilter, country, minPrice, maxPrice],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter) {
        const isEnergy = typeFilter in { SOLAR_PV:1, BIOGAS:1, BIOCHARCOAL:1, COOKSTOVES:1, MICRO_HYDRO:1, WIND:1 };
        params.set(isEnergy ? "energyType" : "landType", typeFilter);
      }
      if (country) params.set("country", country);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      return api.get<{ data: { items: Listing[] } }>(`/api/marketplace?${params}`);
    },
  });

  const raw: Listing[] = data?.data?.items ?? [];
  const listings = [...raw]
    .filter(l => !vintageFilter || String(l.credit.vintageYear ?? "") === vintageFilter)
    .sort((a, b) => {
      if (sortBy === "price_asc")  return a.pricePerTon - b.pricePerTon;
      if (sortBy === "price_desc") return b.pricePerTon - a.pricePerTon;
      return 0;
    });

  // Build list of available vintage years from fetched listings
  const availableVintages = [...new Set(raw.map(l => l.credit.vintageYear).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0));

  const activeFilterCount = [typeFilter, country, minPrice, maxPrice, vintageFilter].filter(Boolean).length;
  const clearAll = () => { setTypeFilter(""); setCountry(""); setMinPrice(""); setMaxPrice(""); setVintageFilter(""); setSortBy("newest"); };

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
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <div className="flex flex-wrap gap-3">
                <select className="input w-auto text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All Project Types</option>
                  <optgroup label="Land Restoration">
                    {["FOREST","SAVANNA","GRASSLAND","FARMLAND","WETLAND","MANGROVE"].map((t) => (
                      <option key={t} value={t}>{typeEmoji[t]} {typeLabel[t]}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Clean Energy">
                    {["SOLAR_PV","BIOGAS","BIOCHARCOAL","COOKSTOVES","MICRO_HYDRO","WIND"].map((t) => (
                      <option key={t} value={t}>{typeEmoji[t]} {typeLabel[t]}</option>
                    ))}
                  </optgroup>
                </select>
                <input className="input w-auto text-sm" placeholder="🔍 Filter by country..." value={country} onChange={(e) => setCountry(e.target.value)} />
                {availableVintages.length > 0 && (
                  <select className="input w-auto text-sm" value={vintageFilter} onChange={(e) => setVintageFilter(e.target.value)}>
                    <option value="">All Vintages</option>
                    {availableVintages.map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Price / t</span>
                  <input
                    type="number" min="0" placeholder="Min $"
                    className="input w-24 text-sm" value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number" min="0" placeholder="Max $"
                    className="input w-24 text-sm" value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="text-sm text-red-500 hover:underline px-2">Clear all</button>
                )}
              </div>
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
            <h3 className="font-bold text-gray-700 mb-1">No listings found</h3>
            <p className="text-gray-400 text-sm mb-6">{activeFilterCount > 0 ? "Try adjusting your filters." : "Projects are being verified. Check back soon."}</p>
            {activeFilterCount > 0
              ? <button onClick={clearAll} className="btn-secondary text-sm">Clear filters</button>
              : <Link href="/register" className="btn-primary">Register your land</Link>
            }
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {listings.length} listing{listings.length !== 1 ? "s" : ""} available
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="ml-3 text-red-500 hover:underline">Clear filters</button>
                )}
              </p>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === opt.value ? "bg-forest-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
