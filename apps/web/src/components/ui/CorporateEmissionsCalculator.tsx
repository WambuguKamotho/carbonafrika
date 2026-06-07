"use client";
import { useState } from "react";
import { Calculator, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

type EmissionType = "electricity" | "fuel" | "travel" | "freight";

interface Result {
  co2eTonnes: number;
  creditsNeeded: number;
  estimatedCostUsd: { low: number; high: number };
  label: string;
}

const FUEL_TYPES = [
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol / Gasoline" },
  { value: "natural_gas", label: "Natural Gas" },
  { value: "lpg", label: "LPG" },
  { value: "coal_industrial", label: "Coal (Industrial)" },
  { value: "wood_logs", label: "Wood / Biomass" },
];

const TRANSPORT_MODES = [
  { value: "flight", label: "Flight" },
  { value: "car", label: "Car" },
  { value: "rail", label: "Train / Rail" },
  { value: "bus", label: "Bus" },
];

const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

export default function CorporateEmissionsCalculator({ onTonnageChange }: { onTonnageChange?: (t: number) => void }) {
  const [type, setType] = useState<EmissionType>("electricity");
  const [params, setParams] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const set = (key: string) => (val: string | number | boolean) =>
    setParams(p => ({ ...p, [key]: val }));

  async function calculate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.post<{ data: Result }>("/api/iot/emissions/calculate", { type, ...params });
      setResult(data.data);
      onTonnageChange?.(data.data.creditsNeeded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-savanna-100 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-savanna-700" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Don't know your tonnage?</h3>
          <p className="text-xs text-gray-500">Calculate your emissions to find out how many credits you need</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["electricity","fuel","travel","freight"] as EmissionType[]).map(t => (
          <button
            key={t}
            onClick={() => { setType(t); setParams({}); setResult(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
              type === t ? "bg-savanna-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "electricity" ? "⚡ Electricity" : t === "fuel" ? "⛽ Fuel" : t === "travel" ? "✈️ Travel" : "📦 Freight"}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        {type === "electricity" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Annual kWh</label>
                <input type="number" className="input" placeholder="e.g. 50000" min="0"
                  onChange={e => set("kwh")(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" placeholder="e.g. Kenya" defaultValue="Kenya"
                  onChange={e => set("country")(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {type === "fuel" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (kg)</label>
              <input type="number" className="input" placeholder="e.g. 5000" min="0"
                onChange={e => set("amountKg")(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Fuel type</label>
              <div className="relative">
                <select className="input appearance-none pr-8" onChange={e => set("fuelType")(e.target.value)} defaultValue="diesel">
                  {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {type === "travel" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From (country)</label>
                <input className="input" placeholder="e.g. United Kingdom"
                  onChange={e => set("originCountry")(e.target.value)} />
              </div>
              <div>
                <label className="label">To (country)</label>
                <input className="input" placeholder="e.g. Kenya"
                  onChange={e => set("destinationCountry")(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Passengers</label>
                <input type="number" className="input" placeholder="1" min="1" defaultValue="1"
                  onChange={e => set("passengers")(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Mode</label>
                <div className="relative">
                  <select className="input appearance-none pr-8" onChange={e => set("transportMode")(e.target.value)} defaultValue="flight">
                    {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label">Cabin</label>
                <div className="relative">
                  <select className="input appearance-none pr-8" onChange={e => set("cabinClass")(e.target.value)} defaultValue="economy">
                    {CABIN_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded" onChange={e => set("returnTrip")(e.target.checked)} />
              Return trip
            </label>
          </>
        )}

        {type === "freight" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From (country)</label>
              <input className="input" placeholder="e.g. China"
                onChange={e => set("originCountry")(e.target.value)} />
            </div>
            <div>
              <label className="label">To (country)</label>
              <input className="input" placeholder="e.g. Kenya"
                onChange={e => set("destinationCountry")(e.target.value)} />
            </div>
            <div>
              <label className="label">Cargo weight (kg)</label>
              <input type="number" className="input" placeholder="e.g. 10000" min="0"
                onChange={e => set("weightKg")(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Transport mode</label>
              <div className="relative">
                <select className="input appearance-none pr-8" onChange={e => set("transportMode")(e.target.value)} defaultValue="sea">
                  <option value="sea">Sea / Ship</option>
                  <option value="road">Road / Truck</option>
                  <option value="rail">Rail</option>
                  <option value="air">Air Freight</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
      )}

      <button
        onClick={calculate}
        disabled={loading}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-savanna-600 hover:bg-savanna-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
        {loading ? "Calculating…" : "Calculate emissions"}
      </button>

      {result && (
        <div className="mt-4 bg-savanna-50 border border-savanna-200 rounded-xl p-4">
          <p className="text-xs text-savanna-700 font-semibold mb-3">{result.label}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black text-gray-900">{result.co2eTonnes.toFixed(1)} t</div>
              <div className="text-xs text-gray-500 mt-0.5">CO₂e emitted</div>
            </div>
            <div>
              <div className="text-xl font-black text-savanna-700">{result.creditsNeeded}</div>
              <div className="text-xs text-gray-500 mt-0.5">Credits needed</div>
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">${result.estimatedCostUsd.low}–${result.estimatedCostUsd.high}</div>
              <div className="text-xs text-gray-500 mt-0.5">Est. cost (USD)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
