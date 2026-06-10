"use client";
import { useState } from "react";
import Link from "next/link";
import { Calculator, ArrowRight } from "lucide-react";

interface PracticeConfig {
  label: string;
  unit: string;
  unitLabel: string;
  tMin: number;
  tMax: number;
}

const PRACTICES: Record<string, PracticeConfig> = {
  FOREST:    { label: "Community Forest Management", unit: "ha", unitLabel: "Hectares", tMin: 3,   tMax: 10  },
  SAVANNA:   { label: "Savanna Management",           unit: "ha", unitLabel: "Hectares", tMin: 0.5, tMax: 3   },
  GRASSLAND: { label: "Grassland / No-Till Farming",  unit: "ha", unitLabel: "Hectares", tMin: 0.5, tMax: 2   },
  FARMLAND:  { label: "Agroforestry",                 unit: "ha", unitLabel: "Hectares", tMin: 2,   tMax: 5   },
  WETLAND:   { label: "Wetland Restoration",          unit: "ha", unitLabel: "Hectares", tMin: 5,   tMax: 20  },
  MANGROVE:  { label: "Mangrove Restoration",         unit: "ha", unitLabel: "Hectares", tMin: 5,   tMax: 20  },
  BIOCHARCOAL: { label: "Biochar Production",         unit: "ha", unitLabel: "Hectares", tMin: 0.3, tMax: 1   },
  SOLAR_PV:  { label: "Solar PV",                     unit: "kW", unitLabel: "Capacity (kW)", tMin: 0.5, tMax: 2 },
  BIOGAS:    { label: "Biogas Plant",                 unit: "units", unitLabel: "Digesters",  tMin: 1,   tMax: 5 },
  COOKSTOVES:{ label: "Clean Cookstoves",             unit: "units", unitLabel: "Stoves",     tMin: 1,   tMax: 3 },
  MICRO_HYDRO:{ label: "Micro-Hydro",                 unit: "kW", unitLabel: "Capacity (kW)", tMin: 0.5, tMax: 2 },
  WIND:      { label: "Wind Energy",                  unit: "kW", unitLabel: "Capacity (kW)", tMin: 0.5, tMax: 2 },
};

export default function CarbonCalculator() {
  const [type, setType] = useState("FARMLAND");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(15);

  const cfg = PRACTICES[type];
  const qty = parseFloat(quantity) || 0;
  const low  = qty * cfg.tMin;
  const high = qty * cfg.tMax;
  const mid  = (low + high) / 2;
  const hasResult = qty > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-forest-600 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Earnings Calculator</h3>
          <p className="text-xs text-gray-500">Estimate your annual carbon credit income</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* Practice type */}
        <div className="sm:col-span-1">
          <label htmlFor="calc-type" className="label">Practice type</label>
          <select id="calc-type" className="input text-sm" value={type} onChange={e => setType(e.target.value)}>
            <optgroup label="Land Restoration">
              {["FOREST","SAVANNA","GRASSLAND","FARMLAND","WETLAND","MANGROVE","BIOCHARCOAL"].map(k => (
                <option key={k} value={k}>{PRACTICES[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="Clean Energy">
              {["SOLAR_PV","BIOGAS","COOKSTOVES","MICRO_HYDRO","WIND"].map(k => (
                <option key={k} value={k}>{PRACTICES[k].label}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="calc-quantity" className="label">{cfg.unitLabel}</label>
          <input
            id="calc-quantity"
            type="number" min="0" step="any"
            className="input text-sm"
            placeholder={`e.g. ${cfg.unit === "ha" ? "50" : cfg.unit === "kW" ? "10" : "20"}`}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </div>

        {/* Price slider */}
        <div>
          <label htmlFor="calc-price" className="label flex items-center justify-between">
            Price per tonne <span className="text-forest-700 font-bold">${price}</span>
          </label>
          <input
            id="calc-price"
            type="range" min="8" max="28" step="1"
            className="w-full accent-forest-600 mt-2"
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>$8</span><span>$28</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className={`rounded-xl transition-all duration-300 ${hasResult ? "bg-forest-50 border border-forest-200" : "bg-gray-50 border border-gray-100"} p-4`}>
        {hasResult ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-black text-forest-700">{low.toFixed(0)}–{high.toFixed(0)} t</div>
              <div className="text-xs text-forest-600">CO₂/year</div>
            </div>
            <div>
              <div className="text-xl font-black text-forest-700">${(mid * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-forest-600">Est. annual income</div>
            </div>
            <div>
              <div className="text-xl font-black text-forest-700">${(high * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-forest-600">Max potential / yr</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center">Enter your {cfg.unitLabel.toLowerCase()} above to see estimated earnings</p>
        )}
      </div>

      {hasResult && (
        <div className="mt-4 flex justify-end">
          <Link href="/projects/new" className="btn-primary text-sm flex items-center gap-2">
            Register My Project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 leading-relaxed">
        Estimates are indicative only and based on published ranges for each practice type. Actual credits issued depend on independent field verification, satellite analysis, baseline assessment, and project-specific conditions. Results do not constitute a financial guarantee.
      </p>
    </div>
  );
}
