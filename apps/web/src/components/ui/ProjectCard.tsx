import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

const TYPE_EMOJI: Record<string, string> = {
  FOREST: "🌳", SAVANNA: "🌿", GRASSLAND: "🌾", FARMLAND: "🌱", WETLAND: "💧", MANGROVE: "🌊",
  SOLAR_PV: "☀️", BIOGAS: "🔥", BIOCHARCOAL: "⚫", COOKSTOVES: "🍳", MICRO_HYDRO: "💧", WIND: "💨",
};
const TYPE_LABEL: Record<string, string> = {
  FOREST: "Forest", SAVANNA: "Savanna", GRASSLAND: "Grassland", FARMLAND: "Farmland",
  WETLAND: "Wetland", MANGROVE: "Mangrove",
  SOLAR_PV: "Solar PV", BIOGAS: "Biogas", BIOCHARCOAL: "Biocharcoal",
  COOKSTOVES: "Cookstoves", MICRO_HYDRO: "Micro-Hydro", WIND: "Wind",
};
const TYPE_PHOTO: Record<string, string> = {
  FOREST:    "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=600&q=70&auto=format&fit=crop",
  SAVANNA:   "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=70&auto=format&fit=crop",
  GRASSLAND: "https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=600&q=70&auto=format&fit=crop",
  FARMLAND:  "https://images.unsplash.com/photo-1582409284161-5bf7c520dce9?w=600&q=70&auto=format&fit=crop",
  WETLAND:   "https://images.unsplash.com/photo-1589556183130-530470785fab?w=600&q=70&auto=format&fit=crop",
  MANGROVE:  "https://images.unsplash.com/photo-1672153920077-8bea4b38b077?w=600&q=70&auto=format&fit=crop",
  SOLAR_PV:  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=70&auto=format&fit=crop",
  BIOGAS:    "https://images.unsplash.com/photo-1739539978578-6c280bf8c582?w=600&q=70&auto=format&fit=crop",
  BIOCHARCOAL: "https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=600&q=70&auto=format&fit=crop",
  COOKSTOVES: "https://images.unsplash.com/photo-1551982932-92d213f565a7?w=600&q=70&auto=format&fit=crop",
  MICRO_HYDRO: "https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=600&q=70&auto=format&fit=crop",
  WIND:      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=70&auto=format&fit=crop",
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVE:       "bg-forest-100 text-forest-700",
  VERIFIED:     "bg-blue-100 text-blue-700",
  PENDING:      "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  REJECTED:     "bg-red-100 text-red-700",
};

export interface ProjectCardData {
  id: string;
  title: string;
  country: string;
  region?: string | null;
  landType: string | null;
  energyType: string | null;
  projectType: string;
  status: string;
  hectares: number;
  capacityKw?: number | null;
  estimatedTons: number;
  mediaUrls: string[];
  owner: { name: string };
  hasListings?: boolean;
}

export default function ProjectCard({ project }: { project: ProjectCardData }) {
  const key = project.energyType ?? project.landType ?? "FOREST";
  const isEnergy = !!project.energyType;
  const photo = project.mediaUrls?.[0] || TYPE_PHOTO[key];
  const label = TYPE_LABEL[key] ?? key;
  const emoji = TYPE_EMOJI[key] ?? "🌍";

  return (
    <Link href={`/projects/${project.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {emoji} {label}
          </span>
          {isEnergy && <span className="text-xs font-bold bg-amber-500/80 text-white px-2 py-1 rounded-full">⚡</span>}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-600"}`}>
            {project.status.replace("_", " ")}
          </span>
          {project.hasListings && (
            <span className="text-xs font-bold bg-forest-600 text-white px-2.5 py-1 rounded-full">On Market</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 group-hover:text-forest-700 transition-colors mb-1 leading-snug">{project.title}</h3>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          {project.country}{project.region ? `, ${project.region}` : ""}
        </div>
        <div className="text-xs text-gray-400 mb-4">by {project.owner.name}</div>
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-gray-900">
              {isEnergy && project.capacityKw ? `${project.capacityKw.toLocaleString()} kW` : `${project.hectares.toLocaleString()} ha`}
            </span>
            {project.estimatedTons > 0 && (
              <span className="text-gray-400 ml-1.5">· {project.estimatedTons.toLocaleString()} t CO₂/yr</span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-forest-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
