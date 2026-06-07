"use client";
import { useState, useEffect } from "react";
import { Calculator, Plus, Trash2, ChevronDown, ArrowRight, Loader2, Zap, Fuel, Plane, Package } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

type EmissionType = "electricity" | "fuel" | "travel" | "freight";

interface EmissionEntry {
  id: string;
  type: EmissionType;
  label: string;
  co2eTonnes: number;
  addedAt: string;
}

const TYPE_ICON = {
  electricity: Zap,
  fuel: Fuel,
  travel: Plane,
  freight: Package,
};

const TYPE_COLOR = {
  electricity: "bg-yellow-50 text-yellow-700 border-yellow-200",
  fuel:        "bg-orange-50 text-orange-700 border-orange-200",
  travel:      "bg-blue-50 text-blue-700 border-blue-200",
  freight:     "bg-purple-50 text-purple-700 border-purple-200",
};

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

const STORAGE_KEY = "kabon_emissions_tracker";

function loadEntries(): EmissionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch { return []; }
}

function saveEntries(entries: EmissionEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function EmissionsTracker({ retiredTons }: { retiredTons: number }) {
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<EmissionType>("electricity");
  const [params, setParams] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setEntries(loadEntries()); }, []);

  const set = (key: string) => (val: string | number | boolean) =>
    setParams(p => ({ ...p, [key]: val }));

  const totalEmissions = entries.reduce((s, e) => s + e.co2eTonnes, 0);
  const shortfall = Math.max(0, totalEmissions - retiredTons);
  const surplus   = Math.max(0, retiredTons - totalEmissions);
  const covered   = totalEmissions > 0 ? Math.min(100, (retiredTons / totalEmissions) * 100) : 0;

  async function addEntry() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ data: { label: string; co2eTonnes: number } }>(
        "/api/iot/emissions/calculate",
        { type, ...params }
      );
      const entry: EmissionEntry = {
        id: `${Date.now()}`,
        type,
        label: res.data.label,
        co2eTonnes: res.data.co2eTonnes,
        addedAt: new Date().toISOString(),
      };
      const updated = [...entries, entry];
      setEntries(updated);
      saveEntries(updated);
      setShowForm(false);
      setParams({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  function removeEntry(id: string) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-savanna-100 rounded-xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-savanna-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Emissions Tracker</h2>
            <p className="text-xs text-gray-500">Log your emissions to see how many credits you still need</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="flex items-center gap-1.5 text-sm btn-secondary py-1.5 px-3"
        >
          <Plus className="w-3.5 h-3.5" /> Add emission
        </button>
      </div>

      {/* Progress bar */}
      {totalEmissions > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Offset coverage</span>
            <span>{covered.toFixed(0)}% covered</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${shortfall > 0 ? "bg-savanna-500" : "bg-forest-500"}`}
              style={{ width: `${covered}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <div className="text-xl font-black text-gray-900">{totalEmissions.toFixed(1)} t</div>
              <div className="text-xs text-gray-500 mt-0.5">Total emissions logged</div>
            </div>
            <div>
              <div className="text-xl font-black text-forest-700">{retiredTons.toFixed(1)} t</div>
              <div className="text-xs text-gray-500 mt-0.5">Credits retired</div>
            </div>
            <div>
              {shortfall > 0 ? (
                <>
                  <div className="text-xl font-black text-savanna-600">{shortfall.toFixed(1)} t</div>
                  <div className="text-xs text-gray-500 mt-0.5">Still to offset</div>
                </>
              ) : (
                <>
                  <div className="text-xl font-black text-forest-600">+{surplus.toFixed(1)} t</div>
                  <div className="text-xs text-gray-500 mt-0.5">Surplus credits</div>
                </>
              )}
            </div>
          </div>

          {shortfall > 0 && (
            <Link
              href={`/marketplace?tonnes=${Math.ceil(shortfall)}`}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-savanna-600 hover:bg-savanna-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              Buy {Math.ceil(shortfall)} more credits to be fully offset
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* Add emission form */}
      {showForm && (
        <div className="border border-gray-100 rounded-xl p-4 mb-4 bg-gray-50">
          {/* Type tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["electricity","fuel","travel","freight"] as EmissionType[]).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setParams({}); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  type === t ? "bg-savanna-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t === "electricity" ? "⚡ Electricity" : t === "fuel" ? "⛽ Fuel" : t === "travel" ? "✈️ Travel" : "📦 Freight"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {type === "electricity" && (
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
                  <input className="input" placeholder="e.g. China" onChange={e => set("originCountry")(e.target.value)} />
                </div>
                <div>
                  <label className="label">To (country)</label>
                  <input className="input" placeholder="e.g. Kenya" onChange={e => set("destinationCountry")(e.target.value)} />
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

          <div className="flex gap-2 mt-4">
            <button
              onClick={addEntry}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-savanna-600 hover:bg-savanna-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? "Calculating…" : "Add to tracker"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Logged entries */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(e => {
            const Icon = TYPE_ICON[e.type];
            return (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLOR[e.type]}`}>
                    <Icon className="w-3 h-3" />
                    {e.type}
                  </span>
                  <span className="text-sm text-gray-700 truncate max-w-xs">{e.label}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{e.co2eTonnes.toFixed(2)} t</span>
                  <button onClick={() => removeEntry(e.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : !showForm && (
        <div className="text-center py-8 text-gray-400">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No emissions logged yet.</p>
          <p className="text-xs mt-1">Add your electricity, fuel, travel or freight to see your offset gap.</p>
        </div>
      )}
    </div>
  );
}
