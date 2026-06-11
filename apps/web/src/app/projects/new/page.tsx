"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MapPin, Upload, TreePine, Zap, ChevronRight, BookOpen, Shield } from "lucide-react";
import { DynamicMapPicker } from "@/components/map/DynamicMapPicker";
import IpfsUpload from "@/components/ui/IpfsUpload";

interface Methodology {
  code: string;
  name: string;
  category: string;
  scope: string | null;
  summary: string;
  bufferPercent: number;
  monitoringPeriodMonths: number;
}

const landTypes = [
  { value: "FOREST",    label: "Indigenous Forest", emoji: "🌳" },
  { value: "SAVANNA",   label: "Savanna",            emoji: "🌿" },
  { value: "GRASSLAND", label: "Grassland",          emoji: "🌾" },
  { value: "FARMLAND",  label: "Farmland",           emoji: "🌱" },
  { value: "WETLAND",   label: "Wetland",            emoji: "💧" },
  { value: "MANGROVE",  label: "Mangrove",           emoji: "🌊" },
];

const energyTypes = [
  { value: "BIOGAS",      label: "Biogas",              emoji: "🔥", desc: "Anaerobic digestion of organic waste" },
  { value: "SOLAR_PV",    label: "Solar PV",            emoji: "☀️", desc: "Photovoltaic electricity generation" },
  { value: "BIOCHARCOAL", label: "Biocharcoal",         emoji: "⚫", desc: "Pyrolysis-based clean charcoal" },
  { value: "COOKSTOVES",  label: "Improved Cookstoves", emoji: "🍳", desc: "Fuel-efficient household cooking" },
  { value: "MICRO_HYDRO", label: "Micro-Hydro",         emoji: "💧", desc: "Run-of-river small hydropower" },
  { value: "WIND",        label: "Wind",                emoji: "💨", desc: "Small-scale wind turbines" },
];

const energyBenchmarks: Record<string, string> = {
  BIOGAS:      "A 10 m³ biogas plant serving 5 families avoids ~6–8 t CO₂e/year",
  SOLAR_PV:    "1 kWp solar replaces ~0.45 t CO₂e/year on East Africa grid",
  BIOCHARCOAL: "1 tonne biochar sequesters 2.5–3 t CO₂e and displaces charcoal",
  COOKSTOVES:  "One improved cookstove avoids 2–3 t CO₂e/year per household",
  MICRO_HYDRO: "10 kW micro-hydro serving 200 homes avoids ~40 t CO₂e/year",
  WIND:        "1 kW small wind turbine avoids ~0.45 t CO₂e/year on-grid",
};

const LAND_TYPE_HEX: Record<string, string> = {
  FOREST: '#16a34a', SAVANNA: '#d97706', GRASSLAND: '#65a30d',
  FARMLAND: '#92400e', WETLAND: '#0284c7', MANGROVE: '#0d9488',
};

type ProjectCategory = "LAND_RESTORATION" | "CLEAN_ENERGY";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [category, setCategory] = useState<ProjectCategory>("LAND_RESTORATION");

  const [form, setForm] = useState({
    title: "", description: "",
    // land
    landType: "FOREST",
    // energy
    energyType: "SOLAR_PV",
    capacityKw: "", householdsServed: "", fuelDisplacedKgY: "",
    // shared
    country: "", region: "", lat: "", lng: "",
    hectares: "", estimatedTons: "", ipfsDocumentHash: "",
    mediaUrls: [] as string[],
    boundaryJson: "",
    methodologyCode: "",
    partnerCode: "",
  });

  // Methodology library — loaded once, filtered by category in the UI.
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  useEffect(() => {
    api.get<{ data: Methodology[] }>("/api/projects/methodologies")
      .then((res) => setMethodologies(res.data ?? []))
      .catch(() => { /* form still works without the list */ });
  }, []);

  // Reset methodology when category changes so a stale land-restoration choice
  // doesn't survive a switch to clean-energy.
  useEffect(() => {
    setForm(f => ({ ...f, methodologyCode: "" }));
  }, [category]);

  // Reverse-geocode lat/lng → prefill Country (and Region if blank). Runs whenever
  // the pin moves. We never overwrite a value the user has typed manually.
  useEffect(() => {
    if (!form.lat || !form.lng) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?lat=${encodeURIComponent(form.lat)}&lng=${encodeURIComponent(form.lng)}`);
        if (!res.ok || cancelled) return;
        const j = await res.json() as { country?: string; region?: string };
        if (cancelled) return;
        setForm(f => ({
          ...f,
          country: f.country.trim() ? f.country : (j.country ?? f.country),
          region:  f.region.trim()  ? f.region  : (j.region  ?? f.region),
        }));
      } catch { /* silent — manual entry still works */ }
    }, 350);  // debounce a touch so drag events don't fire dozens of requests
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.lat, form.lng]);

  const expectedCategory = category === "LAND_RESTORATION" ? "Land Restoration" : "Clean Energy";
  const eligibleMethodologies = methodologies.filter(m => m.category === expectedCategory);
  const selectedMethodology = methodologies.find(m => m.code === form.methodologyCode);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  // Scroll the error banner into view + scroll the offending section into view
  // so users on a long form don't think "the page just moved" when validation fails.
  function failWith(msg: string, anchorId?: string) {
    setError(msg);
    // Wait a tick for React to render the error banner, then scroll.
    requestAnimationFrame(() => {
      const target = anchorId ? document.getElementById(anchorId) : document.getElementById("form-error");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lat || !form.lng)     { failWith("Please click on the map to set the project location.", "step-location"); return; }
    if (!form.methodologyCode)      { failWith("Please pick a Kabon Carbon Standard methodology.",  "step-methodology"); return; }
    setLoading(true); setError("");
    try {
      const shared = {
        projectType: category,
        title: form.title,
        description: form.description,
        country: form.country,
        region:  form.region  || undefined,
        lat:     parseFloat(form.lat),
        lng:     parseFloat(form.lng),
        hectares:     parseFloat(form.hectares),
        estimatedTons: parseFloat(form.estimatedTons),
        methodologyCode: form.methodologyCode,
        partnerCode:     form.partnerCode.trim() || undefined,
        ipfsDocumentHash: form.ipfsDocumentHash || undefined,
      };

      let boundary: object | undefined;
      try { if (form.boundaryJson.trim()) boundary = JSON.parse(form.boundaryJson); } catch { /* invalid JSON — skip */ }

      const validMediaUrls = form.mediaUrls.filter(u => u.trim().startsWith("http"));
      const payload = category === "LAND_RESTORATION"
        ? { ...shared, landType: form.landType, ...(boundary ? { boundary } : {}), ...(validMediaUrls.length ? { mediaUrls: validMediaUrls } : {}) }
        : {
            ...shared,
            energyType: form.energyType,
            ...(form.capacityKw     ? { capacityKw:        parseFloat(form.capacityKw) }     : {}),
            ...(form.householdsServed ? { householdsServed: parseInt(form.householdsServed) } : {}),
            ...(form.fuelDisplacedKgY ? { fuelDisplacedKgY: parseFloat(form.fuelDisplacedKgY) } : {}),
            ...(validMediaUrls.length ? { mediaUrls: validMediaUrls } : {}),
          };

      await api.post("/api/projects", payload);
      router.push("/dashboard");
    } catch (err) {
      failWith(err instanceof Error ? err.message : "Submission failed");
    } finally { setLoading(false); }
  };

  const stepLabel = "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <span>Dashboard</span><ChevronRight className="w-3.5 h-3.5" /><span className="text-gray-700 font-medium">New Project</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Submit a Carbon Project</h1>
          <p className="text-gray-500 text-sm mt-1">Our team verifies and issues carbon credits within 2–4 weeks.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div id="form-error" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm mb-6 flex items-start gap-2 scroll-mt-24">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Step 0: Project Category ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-50 mb-5">
              <span className={`${stepLabel} bg-forest-100 text-forest-700`}>0</span>
              <h2 className="font-bold text-gray-900">Project Category</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setCategory("LAND_RESTORATION")}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${category === "LAND_RESTORATION" ? "border-forest-500 bg-forest-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center">
                  <TreePine className="w-5 h-5 text-forest-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Land Restoration</div>
                  <div className="text-xs text-gray-500 mt-0.5">Forest, savanna, wetland & farmland carbon sequestration</div>
                </div>
              </button>
              <button type="button" onClick={() => setCategory("CLEAN_ENERGY")}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${category === "CLEAN_ENERGY" ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Clean Energy</div>
                  <div className="text-xs text-gray-500 mt-0.5">Biogas, solar, biocharcoal, cookstoves & more</div>
                </div>
              </button>
            </div>
          </div>

          {/* ── Step 0b: Methodology ── */}
          <div id="step-methodology" className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 scroll-mt-24">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-50 mb-5">
              <span className={`${stepLabel} ${category === "CLEAN_ENERGY" ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700"}`}>
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              <h2 className="font-bold text-gray-900">Methodology</h2>
              <a href="/standard" target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                What is the Kabon Carbon Standard?
              </a>
            </div>

            {eligibleMethodologies.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">Loading methodologies…</div>
            ) : (
              <>
                <div className="space-y-2">
                  {eligibleMethodologies.map(m => {
                    const active = form.methodologyCode === m.code;
                    return (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, methodologyCode: m.code }))}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          active
                            ? (category === "CLEAN_ENERGY" ? "border-amber-500 bg-amber-50" : "border-forest-500 bg-forest-50")
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="font-semibold text-sm text-gray-900">{m.name}</div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 flex-shrink-0">{m.code}</span>
                        </div>
                        {m.scope && <div className="text-xs text-gray-400 mb-1.5">{m.scope}</div>}
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{m.summary}</p>
                      </button>
                    );
                  })}
                </div>

                {selectedMethodology && (
                  <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
                    <Shield className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
                    <div className="text-gray-600 leading-relaxed">
                      <strong className="text-gray-900">{selectedMethodology.bufferPercent}% buffer</strong> of every credit issuance will be reserved in the Kabon Buffer Pool against permanence risk.
                      Re-verification every <strong className="text-gray-900">{selectedMethodology.monitoringPeriodMonths} months</strong>.
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Optional partner code — landowners attribute their organizer here */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <label className="label flex items-center gap-1.5">
                Community Partner code
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="input font-mono text-sm"
                value={form.partnerCode}
                onChange={e => setForm(f => ({ ...f, partnerCode: e.target.value }))}
                placeholder="If a Kabon partner helped you, paste their code here"
              />
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Your community organizer will give you their code. They earn a small share (typically 3%) of every
                credit you sell, which comes off your payout. Most partners only ask for a code from landowners they
                actively help register, so leave blank if no one helped you.
              </p>
            </div>
          </div>

          {/* ── Step 1: Basic Info ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className={`${stepLabel} ${category === "CLEAN_ENERGY" ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700"}`}>1</span>
              <h2 className="font-bold text-gray-900">Basic Information</h2>
            </div>
            <div>
              <label className="label">Project Title</label>
              <input className="input" value={form.title} onChange={set("title")}
                placeholder={category === "CLEAN_ENERGY" ? "e.g. Nairobi Biogas Hub, Kibera Community Plant" : "e.g. Aberdare Forest Restoration Initiative"}
                required minLength={5} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none leading-relaxed" rows={4} value={form.description} onChange={set("description")}
                placeholder={category === "CLEAN_ENERGY"
                  ? "Describe the technology, feedstock or fuel source, communities served, and expected emissions avoided..."
                  : "Describe the land, its current state, your restoration approach, and expected outcomes..."}
                required minLength={20} />
            </div>

            {/* Land type OR Energy type selector */}
            {category === "LAND_RESTORATION" ? (
              <div>
                <label className="label">Land Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {landTypes.map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, landType: t.value }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${form.landType === t.value ? "border-forest-500 bg-forest-50 text-forest-800" : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"}`}>
                      <span className="text-lg">{t.emoji}</span>
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Energy Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {energyTypes.map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, energyType: t.value }))}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left ${form.energyType === t.value ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <span className="text-xl">{t.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                      <span className="text-xs text-gray-400 leading-snug">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Location ── */}
          <div id="step-location" className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5 scroll-mt-24">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className={`${stepLabel} ${category === "CLEAN_ENERGY" ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700"}`}>2</span>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={set("country")} placeholder="e.g. Kenya" required />
              </div>
              <div>
                <label className="label">Region / Province <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" value={form.region} onChange={set("region")} placeholder="e.g. Nyeri County" />
              </div>
            </div>
            <div>
              <label className="label">
                {category === "CLEAN_ENERGY" ? "Pin the installation site on the map" : "Pin your land on the map"}
              </label>
              <DynamicMapPicker
                lat={form.lat ? parseFloat(form.lat) : undefined}
                lng={form.lng ? parseFloat(form.lng) : undefined}
                onChange={(lat, lng) => setForm(f => ({ ...f, lat: String(lat), lng: String(lng) }))}
                boundary={(() => { try { return form.boundaryJson.trim() ? JSON.parse(form.boundaryJson) : null; } catch { return null; } })()}
                hectares={form.hectares ? parseFloat(form.hectares) : undefined}
                typeColor={category === "LAND_RESTORATION" ? (LAND_TYPE_HEX[form.landType] ?? '#16a34a') : '#f59e0b'}
              />
            </div>

            {category === "LAND_RESTORATION" && (
              <div className="border-t border-gray-100 pt-4">
                <label className="label flex items-center gap-1.5">
                  Land Boundary <span className="text-gray-400 font-normal">(optional, paste GeoJSON)</span>
                </label>
                <textarea
                  className="input font-mono text-xs resize-y"
                  rows={4}
                  placeholder={'{ "type": "Polygon", "coordinates": [[[36.8, -1.3], [36.9, -1.3], [36.9, -1.2], [36.8, -1.2], [36.8, -1.3]]] }'}
                  value={form.boundaryJson}
                  onChange={e => setForm(f => ({ ...f, boundaryJson: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Accepted: GeoJSON Polygon, Feature, or FeatureCollection from your GPS survey.
                  Leave blank to auto-generate an approximate circle from hectares.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Latitude</label>
                <input type="number" step="any" className="input bg-gray-50" value={form.lat} onChange={set("lat")} placeholder="-1.2921" required />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" step="any" className="input bg-gray-50" value={form.lng} onChange={set("lng")} placeholder="36.8219" required />
              </div>
            </div>
          </div>

          {/* ── Step 3: Carbon Estimates ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className={`${stepLabel} ${category === "CLEAN_ENERGY" ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700"}`}>3</span>
              <h2 className="font-bold text-gray-900">
                {category === "CLEAN_ENERGY" ? "Output & Carbon Estimates" : "Carbon Estimates"}
              </h2>
            </div>

            {category === "CLEAN_ENERGY" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Installed Capacity (kW) <span className="text-gray-400 font-normal">optional</span></label>
                  <input type="number" step="0.1" min="0" className="input" value={form.capacityKw} onChange={set("capacityKw")} placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="label">Households Served <span className="text-gray-400 font-normal">optional</span></label>
                  <input type="number" step="1" min="0" className="input" value={form.householdsServed} onChange={set("householdsServed")} placeholder="e.g. 200" />
                </div>
                <div>
                  <label className="label">Fuel Displaced kg/year <span className="text-gray-400 font-normal">optional</span></label>
                  <input type="number" step="0.1" min="0" className="input" value={form.fuelDisplacedKgY} onChange={set("fuelDisplacedKgY")} placeholder="e.g. 15000" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{category === "CLEAN_ENERGY" ? "Project Footprint (ha)" : "Total Area (hectares)"}</label>
                <input type="number" step="0.1" min="0.1" className="input" value={form.hectares} onChange={set("hectares")} placeholder="e.g. 0.5" required />
              </div>
              <div>
                <label className="label">Est. CO₂e per year (tonnes)</label>
                <input type="number" step="0.1" min="0.1" className="input" value={form.estimatedTons} onChange={set("estimatedTons")} placeholder="e.g. 120" required />
              </div>
            </div>

            {/* Contextual benchmark hint */}
            <div className={`border rounded-xl p-4 text-sm ${category === "CLEAN_ENERGY" ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-forest-50 border-forest-100 text-forest-800"}`}>
              {category === "CLEAN_ENERGY" ? (
                <>
                  <strong className="font-semibold">Benchmark for {energyTypes.find(t => t.value === form.energyType)?.label}:</strong>
                  <p className="mt-1 text-sm">{energyBenchmarks[form.energyType]}</p>
                  <p className="mt-2 text-xs opacity-70">Our verifiers will confirm exact figures from IoT meter data and field inspections.</p>
                </>
              ) : (
                <>
                  <strong className="font-semibold">Carbon sequestration benchmarks:</strong>
                  <ul className="mt-2 space-y-1 text-forest-700">
                    <li>🌳 Tropical forest: <strong>3–8 t CO₂ / ha / year</strong></li>
                    <li>🌿 Savanna: <strong>1–3 t CO₂ / ha / year</strong></li>
                    <li>🌾 Grassland: <strong>0.5–2 t CO₂ / ha / year</strong></li>
                    <li>🌱 Agroforestry: <strong>2–5 t CO₂ / ha / year</strong></li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* ── Step 4: Documents ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className={`${stepLabel} ${category === "CLEAN_ENERGY" ? "bg-amber-100 text-amber-700" : "bg-forest-100 text-forest-700"}`}>4</span>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4" /> Supporting Documents</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {category === "CLEAN_ENERGY"
                ? "Upload equipment specs, installation certificates, or baseline surveys."
                : "Upload land title, GPS survey report, or supporting photos."}
              {" "}Files are stored permanently on IPFS via Pinata. Any supporting documentation is accepted.
            </p>
            <IpfsUpload
              value={form.ipfsDocumentHash}
              onChange={hash => setForm(f => ({ ...f, ipfsDocumentHash: hash }))}
              label={category === "CLEAN_ENERGY" ? "Equipment / Certification Document" : "Land Title / Survey Document"}
              accentColor={category === "CLEAN_ENERGY" ? "amber" : "forest"}
            />

            {/* Project Photos */}
            <div className="pt-2">
              <label className="label">Project Photos <span className="text-gray-400 font-normal">(optional)</span></label>
              <p className="text-xs text-gray-400 mb-3">
                Paste direct image URLs from Google Photos, Cloudinary, Dropbox, or any public link.
                The first image becomes your marketplace cover photo.
              </p>
              <div className="space-y-2">
                {form.mediaUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="input flex-1 text-sm"
                      value={url}
                      onChange={(e) => {
                        const updated = [...form.mediaUrls];
                        updated[i] = e.target.value;
                        setForm(f => ({ ...f, mediaUrls: updated }));
                      }}
                      placeholder="https://..."
                    />
                    {url && url.startsWith("http") && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, mediaUrls: f.mediaUrls.filter((_, j) => j !== i) }))}
                      className="text-red-400 hover:text-red-600 text-sm px-2 flex-shrink-0">✕</button>
                  </div>
                ))}
                {form.mediaUrls.length < 5 && (
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, mediaUrls: [...f.mediaUrls, ""] }))}
                    className={`text-sm font-medium hover:underline ${category === "CLEAN_ENERGY" ? "text-amber-600" : "text-forest-600"}`}>
                    + Add photo URL
                  </button>
                )}
              </div>
            </div>

            {category === "CLEAN_ENERGY" && (
              <div className={`rounded-xl p-4 text-xs text-amber-800 bg-amber-50 border border-amber-100`}>
                <strong>IoT Monitoring:</strong> Once your project is approved, register your monitoring devices in the admin portal.
                Each device receives a unique API key to POST real-time energy and climate readings directly to the platform.
              </div>
            )}
          </div>

          {/* Repeat the error here so users on the submit button see it without scrolling */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button type="submit" className={`w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 transition-all ${category === "CLEAN_ENERGY" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20" : "btn-primary"}`} disabled={loading}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting for verification...
              </>
            ) : (
              <>
                Submit {category === "CLEAN_ENERGY" ? "Energy" : "Land"} Project for Verification
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
