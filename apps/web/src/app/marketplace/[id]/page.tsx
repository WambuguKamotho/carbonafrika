"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { MapPin, CheckCircle, Zap, Leaf, ExternalLink, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RetirementIntentModal from "@/components/ui/RetirementIntentModal";
import { getUser } from "@/lib/auth";
import { connectWallet, approveUsdcForTreasury } from "@/lib/web3";
import { CreditClassBadges } from "@/lib/creditClass";

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
const TYPE_PHOTO: Record<string, string> = {
  FOREST:    "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=800&q=80&auto=format&fit=crop",
  SAVANNA:   "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80&auto=format&fit=crop",
  GRASSLAND: "https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=800&q=80&auto=format&fit=crop",
  FARMLAND:  "https://images.unsplash.com/photo-1582409284161-5bf7c520dce9?w=800&q=80&auto=format&fit=crop",
  WETLAND:   "https://images.unsplash.com/photo-1589556183130-530470785fab?w=800&q=80&auto=format&fit=crop",
  MANGROVE:  "https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=800&q=80&auto=format&fit=crop",
  SOLAR_PV:    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80&auto=format&fit=crop",
  BIOGAS:      "https://images.unsplash.com/photo-1739539978578-6c280bf8c582?w=800&q=80&auto=format&fit=crop",
  BIOCHARCOAL: "https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=800&q=80&auto=format&fit=crop",
  COOKSTOVES:  "https://images.unsplash.com/photo-1551982932-92d213f565a7?w=800&q=80&auto=format&fit=crop",
  MICRO_HYDRO: "https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=800&q=80&auto=format&fit=crop",
  WIND:        "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80&auto=format&fit=crop",
};

interface ListingDetail {
  id: string;
  pricePerTon: number;
  totalTons: number;
  currency: string;
  credit: {
    amount: number;
    tokenId: string;
    vintageYear?: number | null;
    project: {
      id: string;
      title: string;
      description: string;
      projectType: string;
      landType: string | null;
      energyType: string | null;
      country: string;
      region?: string;
      hectares: number;
      capacityKw?: number | null;
      householdsServed?: number | null;
      estimatedTons: number;
      mediaUrls: string[];
      owner: { name: string; country: string; walletAddress?: string };
      verifications: Array<{ status: string; carbonTons?: number; notes?: string }>;
    };
  };
}

const PLATFORM_FEE = 0.02;
const PRESETS = [10, 25, 50, 100, 250];

function ImpactEquivalents({ tons }: { tons: number }) {
  const cars    = Math.round(tons / 2.4);
  const flights = Math.round((tons * 1000) / 255);
  const trees   = Math.round(tons / 0.021);
  const homes   = Math.round(tons / 1.2);
  const rows = [
    { emoji: "🚗", label: "Cars off the road", value: cars,    unit: "for 1 year" },
    { emoji: "✈️", label: "Flights offset",     value: flights, unit: "London–Nairobi" },
    { emoji: "🌳", label: "Trees absorbing",    value: trees,   unit: "for 1 year" },
    { emoji: "🏠", label: "Homes powered",      value: homes,   unit: "for 1 year" },
  ];
  return (
    <div className="bg-forest-50 border border-forest-100 rounded-xl p-3.5 mb-4">
      <p className="text-xs font-semibold text-forest-700 mb-2.5 uppercase tracking-wide">
        {tons} tonne{tons !== 1 ? "s" : ""} offsets…
      </p>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1.5">
              <span>{r.emoji}</span>{r.label}
            </span>
            <span className="font-bold text-gray-800">
              {r.value.toLocaleString()} <span className="font-normal text-gray-400">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [tons, setTons] = useState(1);
  const [loading,          setLoading]          = useState(false);
  const [success,          setSuccess]          = useState(false);
  const [purchaseTxHash,   setPurchaseTxHash]   = useState<string | null>(null);
  const [purchaseId,       setPurchaseId]       = useState<string | null>(null);
  const [retireImmediately, setRetireImmediately] = useState(false);
  const [showRetireModal,  setShowRetireModal]  = useState(false);
  const [error,            setError]            = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    setUserRole(u?.role ?? null);
  }, []);

  const canPurchase = userRole === "BUYER";

  const { data, isLoading } = useQuery({
    queryKey: ["listing", params.id],
    queryFn: () => api.get<{ data: ListingDetail }>(`/api/marketplace/${params.id}`),
  });

  const listing = data?.data;

  const [step, setStep] = useState<"idle" | "connecting" | "approving" | "submitting">("idle");

  const handlePurchase = async () => {
    if (!listing) return;
    setLoading(true);
    setError("");

    const subtotalCalc = tons * listing.pricePerTon;
    const totalCalc    = parseFloat((subtotalCalc * 1.02).toFixed(6));   // includes 2% platform fee

    try {
      // 1. Connect wallet (no-op if already connected). Same flow used for wallet login.
      setStep("connecting");
      const { signer } = await connectWallet();

      // 2. Sign USDC approval so platform treasury can pull the buyer's payment.
      //    Skipped automatically if buyer already has enough allowance.
      setStep("approving");
      await approveUsdcForTreasury(signer, totalCalc);

      // 3. Create the purchase server-side; settlement worker takes over from here.
      setStep("submitting");
      const res = await api.post<{ data: { id: string; txHash?: string } }>(
        `/api/marketplace/${params.id}/purchase`,
        { tons },
      );
      setPurchaseTxHash(res.data?.txHash ?? null);
      setPurchaseId(res.data?.id ?? null);
      if (retireImmediately && res.data?.id) {
        setShowRetireModal(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      // Treat user wallet rejection as a soft error
      const msg = err instanceof Error ? err.message : "Purchase failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled in your wallet." : msg);
    } finally {
      setStep("idle");
      setLoading(false);
    }
  };

  const buttonLabel =
    step === "connecting" ? "Connect wallet…" :
    step === "approving"  ? "Approve USDC in your wallet…" :
    step === "submitting" ? "Finalising purchase…" :
    listing ? `Buy ${tons} tonne${tons !== 1 ? "s" : ""} · $${(tons * listing.pricePerTon * 1.02).toFixed(2)}` :
    "Buy";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading listing…</div>
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Listing not found</div>
      </div>
    );
  }

  const { project } = listing.credit;
  const isEnergy  = !!project.energyType;
  const typeKey   = project.energyType ?? project.landType ?? "FOREST";
  const label     = TYPE_LABEL[typeKey] ?? typeKey;
  const emoji     = TYPE_EMOJI[typeKey] ?? "🌍";
  const photo     = project.mediaUrls?.[0] || TYPE_PHOTO[typeKey];
  const accentColor = isEnergy ? "text-amber-600" : "text-forest-700";
  const badgeCls    = isEnergy ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700";

  const verification = project.verifications[0];
  const subtotal     = tons * listing.pricePerTon;
  const fee          = subtotal * PLATFORM_FEE;
  const total        = subtotal + fee;

  const vintageYear = listing.credit.vintageYear;

  const detailRows = isEnergy
    ? [
        ["Capacity",            project.capacityKw ? `${project.capacityKw} kW` : "—"],
        ["Households served",   project.householdsServed ? project.householdsServed.toLocaleString() : "—"],
        ["Total credits",       `${listing.credit.amount.toLocaleString()} tonnes`],
        ["Available",           `${listing.totalTons.toLocaleString()} tonnes`],
        ...(vintageYear ? [["Vintage year", String(vintageYear)]] : []),
        ["Project owner",       project.owner.name],
        ["Country",             project.country + (project.region ? `, ${project.region}` : "")],
      ]
    : [
        ["Land area",           `${project.hectares.toLocaleString()} ha`],
        ["Total credits",       `${listing.credit.amount.toLocaleString()} tonnes`],
        ["Available",           `${listing.totalTons.toLocaleString()} tonnes`],
        ...(vintageYear ? [["Vintage year", String(vintageYear)]] : []),
        ["Land type",           label],
        ["Project owner",       project.owner.name],
        ["Country",             project.country + (project.region ? `, ${project.region}` : "")],
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-5 left-5 flex items-center gap-2 flex-wrap">
          <span className={`${badgeCls} text-sm font-bold px-3 py-1 rounded-full`}>
            {emoji} {label}
          </span>
          {isEnergy && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> Clean Energy
            </span>
          )}
          {vintageYear && (
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {vintageYear} vintage
            </span>
          )}
        </div>
      </div>
      {/* Thumbnail strip */}
      {project.mediaUrls && project.mediaUrls.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 pt-3 flex gap-2 overflow-x-auto">
          {project.mediaUrls.slice(1, 4).map((url, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={i} src={url} alt="" className="h-16 w-24 object-cover rounded-xl flex-shrink-0 border border-gray-100 shadow-sm" />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* ── Left: Project details ── */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">{project.title}</h1>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {project.country}{project.region ? `, ${project.region}` : ""}
                <span className="ml-1 text-gray-400">· by {project.owner.name}</span>
              </div>
              <CreditClassBadges project={project} className="mb-4" />
              <p className="text-gray-600 leading-relaxed">{project.description}</p>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {isEnergy ? <Zap className="w-4 h-4 text-amber-500" /> : <Leaf className="w-4 h-4 text-forest-500" />}
                Project Details
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {detailRows.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="font-medium text-gray-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Verification badge */}
            {verification && (
              <div className="bg-forest-50 border border-forest-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-forest-600" />
                  <h3 className="font-semibold text-forest-800">Independent Verification</h3>
                </div>
                <span className="inline-block bg-forest-100 text-forest-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                  {verification.status}
                </span>
                {verification.carbonTons && (
                  <p className="text-sm text-forest-700 mt-1">
                    <strong>{verification.carbonTons.toLocaleString()} tonnes</strong> of CO₂ independently verified
                  </p>
                )}
                {verification.notes && (
                  <p className="text-sm text-gray-600 mt-1 italic">{verification.notes}</p>
                )}
              </div>
            )}

            <div className="text-center pt-2">
              <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-forest-600 hover:underline font-medium">
                View full project page <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Right: Purchase card ── */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sticky top-20">

              {success ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-forest-600" />
                  </div>
                  <p className="font-bold text-gray-900 mb-1">Purchase complete</p>
                  <p className="text-sm text-gray-500 mb-3">Credits are in your dashboard.</p>
                  {purchaseTxHash && (
                    <p className="text-xs text-gray-400 font-mono break-all mb-4">{purchaseTxHash.slice(0, 20)}…</p>
                  )}
                  <button onClick={() => router.push("/dashboard")} className="btn-primary w-full text-sm mb-2">
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => { setSuccess(false); setPurchaseTxHash(null); setTons(1); }}
                    className="btn-secondary w-full text-sm"
                  >
                    Buy more from this project
                  </button>
                </div>
              ) : !canPurchase ? (
                <div className="text-center py-2">
                  <div className="text-center mb-4 pb-4 border-b border-gray-50">
                    <span className={`text-3xl font-black ${accentColor}`}>${listing.pricePerTon}</span>
                    <span className="text-gray-400 text-sm"> / tonne CO₂e</span>
                    <div className="text-xs text-gray-400 mt-1">{listing.totalTons.toLocaleString()} tonnes available</div>
                  </div>
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="font-bold text-gray-900 mb-1">
                    {userRole == null ? "Sign in to buy" : "Buyer account required"}
                  </p>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    {userRole == null
                      ? "Create a free buyer account to purchase carbon credits from verified African projects."
                      : userRole === "LANDOWNER"
                        ? "Landowners list and sell credits. To purchase offsets, register a separate buyer account."
                        : userRole === "VERIFIER"
                          ? "Verifier accounts review projects and cannot purchase credits."
                          : "Admin accounts cannot purchase credits. Use a buyer account to offset."}
                  </p>
                  {userRole == null ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => router.push(`/register?role=BUYER&next=/marketplace/${params.id}`)}
                        className="btn-primary w-full text-sm"
                      >
                        Create buyer account
                      </button>
                      <button
                        onClick={() => router.push(`/login?next=/marketplace/${params.id}`)}
                        className="btn-secondary w-full text-sm"
                      >
                        Sign in
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push("/marketplace")}
                      className="btn-secondary w-full text-sm"
                    >
                      Browse more listings
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Price header */}
                  <div className="text-center mb-4 pb-4 border-b border-gray-50">
                    <span className={`text-3xl font-black ${accentColor}`}>${listing.pricePerTon}</span>
                    <span className="text-gray-400 text-sm"> / tonne CO₂e</span>
                    <div className="text-xs text-gray-400 mt-1">{listing.totalTons.toLocaleString()} tonnes available</div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm mb-4">
                      {error}
                    </div>
                  )}

                  {/* Quick presets */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick select</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.filter(p => p <= listing.totalTons).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTons(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            tons === p
                              ? isEnergy ? "bg-amber-500 text-white border-amber-500" : "bg-forest-600 text-white border-forest-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {p}t
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Qty input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Custom amount (tonnes)
                    </label>
                    <input
                      type="number" min={1} max={listing.totalTons} value={tons}
                      onChange={(e) => setTons(Math.max(1, Math.min(listing.totalTons, parseInt(e.target.value) || 1)))}
                      className="input text-center text-lg font-bold"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Min 1t</span><span>Max {listing.totalTons.toLocaleString()}t</span>
                    </div>
                  </div>

                  {/* Live impact equivalents */}
                  <ImpactEquivalents tons={tons} />

                  {/* Price breakdown */}
                  <div className="bg-gray-50 rounded-xl p-3.5 mb-4 text-sm space-y-1.5">
                    <div className="flex justify-between text-gray-500">
                      <span>{tons} × ${listing.pricePerTon}</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Platform fee (2%)</span>
                      <span>${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>${total.toFixed(2)} {listing.currency}</span>
                    </div>
                  </div>

                  {/* Retire immediately toggle */}
                  <label className="flex items-start gap-2.5 mb-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={retireImmediately}
                      onChange={e => setRetireImmediately(e.target.checked)}
                      className="mt-0.5 accent-forest-600 w-4 h-4 flex-shrink-0"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                        Retire immediately after purchase
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        Skip the holding phase and offset right now. You'll document the reason and it goes straight to your certificate.
                      </p>
                    </div>
                  </label>

                  <button
                    onClick={handlePurchase}
                    disabled={loading}
                    className={`w-full font-bold py-3 rounded-xl transition-all duration-150 text-sm ${
                      isEnergy
                        ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                        : "btn-primary"
                    }`}
                  >
                    {loading ? buttonLabel : `Buy ${tons} tonne${tons !== 1 ? "s" : ""} · $${total.toFixed(2)}`}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                    Payment settled on Polygon · USDC stablecoin
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRetireModal && purchaseId && listing && (
        <RetirementIntentModal
          purchaseId={purchaseId}
          projectTitle={listing.credit.project.title}
          tonnes={tons}
          purchasedAt={new Date().toISOString()}
          isEnergy={isEnergy}
          onClose={() => { setShowRetireModal(false); setSuccess(true); }}
          onRetired={() => { setShowRetireModal(false); setSuccess(true); }}
        />
      )}
    </div>
  );
}
