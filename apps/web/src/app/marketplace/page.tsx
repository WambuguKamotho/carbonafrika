"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { MapPin, Leaf, Filter } from "lucide-react";
import { useState } from "react";

const landTypeColors: Record<string, string> = {
  FOREST: "badge-green",
  SAVANNA: "badge-yellow",
  GRASSLAND: "badge-green",
  FARMLAND: "badge-yellow",
  WETLAND: "badge-green",
  MANGROVE: "badge-green",
};

const landTypeEmoji: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
};

export default function MarketplacePage() {
  const [landType, setLandType] = useState("");
  const [country, setCountry] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["listings", landType, country],
    queryFn: () => {
      const params = new URLSearchParams();
      if (landType) params.set("landType", landType);
      if (country) params.set("country", country);
      return api.get<{ data: { items: Listing[] } }>(`/api/marketplace?${params}`);
    },
  });

  interface Listing {
    id: string;
    pricePerTon: number;
    totalTons: number;
    currency: string;
    credit: {
      amount: number;
      project: {
        id: string;
        title: string;
        landType: string;
        country: string;
        region?: string;
        hectares: number;
        owner: { name: string };
      };
    };
  }

  const listings: Listing[] = data?.data?.items ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Carbon Credit Marketplace</h1>
        <p className="text-gray-500">Browse verified African carbon credits. Each credit = 1 tonne of CO₂.</p>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-sm text-gray-700">Filter</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="input w-auto" value={landType} onChange={(e) => setLandType(e.target.value)}>
            <option value="">All Land Types</option>
            {["FOREST", "SAVANNA", "GRASSLAND", "FARMLAND", "WETLAND", "MANGROVE"].map((t) => (
              <option key={t} value={t}>{landTypeEmoji[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <input className="input w-auto" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-100 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-100 rounded mb-2 w-1/2" />
              <div className="h-8 bg-gray-100 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Leaf className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm mt-1">Check back soon as projects get verified</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/marketplace/${listing.id}`} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <span className={landTypeColors[listing.credit.project.landType] || "badge-gray"}>
                  {landTypeEmoji[listing.credit.project.landType]} {listing.credit.project.landType}
                </span>
                <span className="text-xs text-gray-400">{listing.totalTons.toLocaleString()} t available</span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-forest-700 transition-colors mb-1">
                {listing.credit.project.title}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                <MapPin className="w-3.5 h-3.5" />
                {listing.credit.project.country}
                {listing.credit.project.region ? `, ${listing.credit.project.region}` : ""}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <span className="text-2xl font-bold text-forest-700">${listing.pricePerTon}</span>
                  <span className="text-sm text-gray-500 ml-1">/ tonne</span>
                </div>
                <span className="text-xs text-gray-400">{listing.credit.project.hectares.toLocaleString()} ha</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
