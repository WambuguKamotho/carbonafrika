"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MapPin, Upload } from "lucide-react";

const landTypes = ["FOREST", "SAVANNA", "GRASSLAND", "FARMLAND", "WETLAND", "MANGROVE"];

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    landType: "FOREST",
    country: "",
    region: "",
    lat: "",
    lng: "",
    hectares: "",
    estimatedTons: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/projects", {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        hectares: parseFloat(form.hectares),
        estimatedTons: parseFloat(form.estimatedTons),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a New Project</h1>
      <p className="text-gray-500 mb-8">Describe your land restoration project. Our team will verify it and issue carbon credits.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
            <input className="input" value={form.title} onChange={set("title")} placeholder="e.g. Aberdare Forest Restoration" required minLength={5} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={set("description")}
              placeholder="Describe the land, current state, restoration approach, and expected outcomes..." required minLength={20} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Land Type</label>
            <select className="input" value={form.landType} onChange={set("landType")}>
              {landTypes.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input className="input" value={form.country} onChange={set("country")} placeholder="e.g. Kenya" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region / Province</label>
              <input className="input" value={form.region} onChange={set("region")} placeholder="e.g. Nyeri County" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" className="input" value={form.lat} onChange={set("lat")}
                placeholder="-1.2921" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" className="input" value={form.lng} onChange={set("lng")}
                placeholder="36.8219" required />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Carbon Estimates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Area (hectares)</label>
              <input type="number" step="0.1" min="0.1" className="input" value={form.hectares} onChange={set("hectares")}
                placeholder="e.g. 500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated CO₂ (tonnes/year)</label>
              <input type="number" step="0.1" min="0.1" className="input" value={form.estimatedTons} onChange={set("estimatedTons")}
                placeholder="e.g. 2000" required />
            </div>
          </div>
          <div className="bg-forest-50 rounded-xl p-3 text-sm text-forest-700">
            <strong>Tip:</strong> A healthy tropical forest sequesters ~3–8 tonnes of CO₂ per hectare per year.
            Savannas average 1–3 tonnes. Our verifiers will confirm the exact figure.
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Supporting Documents
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Upload land title, GPS survey, or photos to IPFS and paste the IPFS hash below.
            Our team accepts Verra, Gold Standard, or custom documentation.
          </p>
          <input className="input" placeholder="ipfs://Qm... (optional — you can add later)" />
        </div>

        <button type="submit" className="btn-primary w-full text-base" disabled={loading}>
          {loading ? "Submitting..." : "Submit Project for Verification"}
        </button>
      </form>
    </div>
  );
}
