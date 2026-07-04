import type { Metadata } from "next";
import { DynamicAllProjectsMap } from "@/components/map/DynamicAllProjectsMap";

export const metadata: Metadata = {
  title: "Project Map",
  description:
    "Explore verified and active land restoration and clean energy carbon projects across Africa on an interactive map.",
  alternates: { canonical: "/map" },
};

const LAND_LEGEND = [
  { label: "Forest",    color: "#16a34a", shape: "circle" },
  { label: "Savanna",   color: "#d97706", shape: "circle" },
  { label: "Grassland", color: "#65a30d", shape: "circle" },
  { label: "Farmland",  color: "#ea580c", shape: "circle" },
  { label: "Wetland",   color: "#2563eb", shape: "circle" },
  { label: "Mangrove",  color: "#0d9488", shape: "circle" },
];

const ENERGY_LEGEND = [
  { label: "Solar PV",    color: "#f59e0b", shape: "square" },
  { label: "Biogas",      color: "#f97316", shape: "square" },
  { label: "Wind",        color: "#7c3aed", shape: "square" },
  { label: "Micro-Hydro", color: "#0284c7", shape: "square" },
  { label: "Cookstoves",  color: "#a16207", shape: "square" },
  { label: "Biocharcoal", color: "#57534e", shape: "square" },
];

export default function MapPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-black text-gray-900">Active Carbon Projects</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified and active land restoration &amp; clean energy projects across Africa
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            {/* Land types */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Land Restoration</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {LAND_LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
                      style={{ background: l.color, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
                    />
                    <span className="text-xs text-gray-600 font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Energy types */}
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1.5">⚡ Clean Energy</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {ENERGY_LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm border-2 border-white flex-shrink-0"
                      style={{ background: l.color, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
                    />
                    <span className="text-xs text-gray-600 font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-height map */}
      <div className="relative flex-1">
        <DynamicAllProjectsMap />
      </div>
    </div>
  );
}
