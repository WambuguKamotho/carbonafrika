"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { MapPin, TreePine, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ListingDetail {
  id: string;
  pricePerTon: number;
  totalTons: number;
  currency: string;
  credit: {
    amount: number;
    tokenId: string;
    project: {
      id: string;
      title: string;
      description: string;
      landType: string;
      country: string;
      region?: string;
      hectares: number;
      estimatedTons: number;
      owner: { name: string; country: string; walletAddress?: string };
      verifications: Array<{ status: string; carbonTons?: number; notes?: string }>;
    };
  };
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tons, setTons] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["listing", params.id],
    queryFn: () => api.get<{ data: ListingDetail }>(`/api/marketplace/${params.id}`),
  });

  const listing = data?.data;

  const handlePurchase = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/marketplace/${params.id}/purchase`, { tons });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-10 text-gray-400">Loading...</div>;
  if (!listing) return <div className="max-w-4xl mx-auto px-4 py-10">Listing not found</div>;

  const totalPrice = tons * listing.pricePerTon;
  const verification = listing.credit.project.verifications[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Project Details */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="badge badge-green mb-3">{listing.credit.project.landType}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.credit.project.title}</h1>
            <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              {listing.credit.project.country}
              {listing.credit.project.region ? `, ${listing.credit.project.region}` : ""}
            </div>
            <p className="text-gray-600 leading-relaxed">{listing.credit.project.description}</p>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Land Area", `${listing.credit.project.hectares.toLocaleString()} hectares`],
                ["Total Credits", `${listing.credit.amount.toLocaleString()} tonnes`],
                ["Available", `${listing.totalTons.toLocaleString()} tonnes`],
                ["Land Type", listing.credit.project.landType],
                ["Project Owner", listing.credit.project.owner.name],
                ["Country", listing.credit.project.owner.country],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-gray-400">{label}</div>
                  <div className="font-medium text-gray-900">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {verification && (
            <div className="card border-forest-200 bg-forest-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-forest-600" />
                <h3 className="font-semibold text-forest-800">Verification Status</h3>
              </div>
              <div className="badge badge-green mb-2">{verification.status}</div>
              {verification.carbonTons && (
                <p className="text-sm text-forest-700"><strong>{verification.carbonTons} tonnes</strong> of CO₂ verified</p>
              )}
              {verification.notes && <p className="text-sm text-gray-600 mt-1">{verification.notes}</p>}
            </div>
          )}
        </div>

        {/* Right: Purchase Card */}
        <div className="md:col-span-1">
          <div className="card sticky top-20">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-forest-700">${listing.pricePerTon}</span>
              <span className="text-gray-500 text-sm"> / tonne</span>
            </div>

            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 text-forest-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">Purchase Complete!</p>
                <p className="text-sm text-gray-500 mt-1">Check your dashboard for your credits.</p>
                <button onClick={() => router.push("/dashboard")} className="btn-primary w-full mt-4 text-sm">
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                    {error}
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tonnes to purchase</label>
                  <input
                    type="number" min={1} max={listing.totalTons} value={tons}
                    onChange={(e) => setTons(Math.max(1, Math.min(listing.totalTons, parseInt(e.target.value) || 1)))}
                    className="input text-center text-lg font-bold"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Min: 1</span>
                    <span>Max: {listing.totalTons}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span>${(tons * listing.pricePerTon).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Platform fee (2%)</span>
                    <span>${(totalPrice * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${(totalPrice * 1.02).toFixed(2)} {listing.currency}</span>
                  </div>
                </div>

                <button onClick={handlePurchase} className="btn-primary w-full" disabled={loading}>
                  {loading ? "Processing..." : `Buy ${tons} tonne${tons > 1 ? "s" : ""}`}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Credits are transferred via Polygon smart contract
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
