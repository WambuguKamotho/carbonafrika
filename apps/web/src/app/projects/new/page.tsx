"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MapPin, Upload, TreePine, ChevronRight } from "lucide-react";

const landTypes = [
  { value: "FOREST",   label: "Indigenous Forest", emoji: "🌳" },
  { value: "SAVANNA",  label: "Savanna",            emoji: "🌿" },
  { value: "GRASSLAND",label: "Grassland",          emoji: "🌾" },
  { value: "FARMLAND", label: "Farmland",           emoji: "🌱" },
  { value: "WETLAND",  label: "Wetland",            emoji: "💧" },
  { value: "MANGROVE", label: "Mangrove",           emoji: "🌊" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", landType: "FOREST",
    country: "", region: "", lat: "", lng: "",
    hectares: "", estimatedTons: "",
  });

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/api/projects", {
        ...form,
        lat: parseFloat(form.lat), lng: parseFloat(form.lng),
        hectares: parseFloat(form.hectares), estimatedTons: parseFloat(form.estimatedTons),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <span>Dashboard</span><ChevronRight className="w-3.5 h-3.5" /><span className="text-gray-700 font-medium">New Project</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-forest-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TreePine className="w-6 h-6 text-forest-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Submit a Land Project</h1>
              <p className="text-gray-500 text-sm mt-1">Our team verifies and issues carbon credits within 2–4 weeks.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm mb-6 flex items-start gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className="w-6 h-6 bg-forest-100 rounded-lg flex items-center justify-center text-xs font-bold text-forest-700">1</span>
              <h2 className="font-bold text-gray-900">Basic Information</h2>
            </div>
            <div>
              <label className="label">Project Title</label>
              <input className="input" value={form.title} onChange={set("title")}
                placeholder="e.g. Aberdare Forest Restoration Initiative" required minLength={5} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none leading-relaxed" rows={4} value={form.description} onChange={set("description")}
                placeholder="Describe the land, its current state, your restoration approach, and expected outcomes..." required minLength={20} />
            </div>
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
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className="w-6 h-6 bg-forest-100 rounded-lg flex items-center justify-center text-xs font-bold text-forest-700">2</span>
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
              <div>
                <label className="label">Latitude</label>
                <input type="number" step="any" className="input" value={form.lat} onChange={set("lat")} placeholder="-1.2921" required />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" step="any" className="input" value={form.lng} onChange={set("lng")} placeholder="36.8219" required />
              </div>
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              💡 Tip: Use Google Maps to find your exact coordinates. Right-click on your land and select "What&apos;s here?"
            </p>
          </div>

          {/* Carbon Estimates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className="w-6 h-6 bg-forest-100 rounded-lg flex items-center justify-center text-xs font-bold text-forest-700">3</span>
              <h2 className="font-bold text-gray-900">Carbon Estimates</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Total Area (hectares)</label>
                <input type="number" step="0.1" min="0.1" className="input" value={form.hectares} onChange={set("hectares")} placeholder="e.g. 500" required />
              </div>
              <div>
                <label className="label">Est. CO₂ per year (tonnes)</label>
                <input type="number" step="0.1" min="0.1" className="input" value={form.estimatedTons} onChange={set("estimatedTons")} placeholder="e.g. 2000" required />
              </div>
            </div>
            <div className="bg-forest-50 border border-forest-100 rounded-xl p-4 text-sm text-forest-800">
              <strong className="font-semibold">Carbon sequestration benchmarks:</strong>
              <ul className="mt-2 space-y-1 text-forest-700">
                <li>🌳 Tropical forest: <strong>3–8 t CO₂ / ha / year</strong></li>
                <li>🌿 Savanna: <strong>1–3 t CO₂ / ha / year</strong></li>
                <li>🌾 Grassland: <strong>0.5–2 t CO₂ / ha / year</strong></li>
                <li>🌱 Agroforestry: <strong>2–5 t CO₂ / ha / year</strong></li>
              </ul>
              <p className="mt-2 text-xs text-forest-600">Our verifiers will confirm the exact figure for your project.</p>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <span className="w-6 h-6 bg-forest-100 rounded-lg flex items-center justify-center text-xs font-bold text-forest-700">4</span>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4" /> Supporting Documents</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Upload land title, GPS survey report, or photos to IPFS and paste the hash below.
              We accept Verra, Gold Standard, or custom documentation.
            </p>
            <input className="input" placeholder="ipfs://Qm... (optional — you can add later)" />
            <p className="text-xs text-gray-400">You can always add documentation after initial submission.</p>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting for verification...
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                Submit Project for Verification <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
