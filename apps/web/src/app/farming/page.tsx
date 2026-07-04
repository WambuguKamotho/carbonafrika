import type { Metadata } from "next";
import { Leaf, Sun, Droplets, Wind, TreePine, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regenerative Farming & Land Restoration",
  description:
    "Turn your land into income. List farmland, savanna, or grassland restoration projects and earn verified carbon credits with Kabon.Africa.",
  alternates: { canonical: "/farming" },
};

const practices = [
  {
    icon: TreePine,
    title: "Agroforestry",
    desc: "Integrate trees into farmland to sequester carbon while improving yields. Native species like acacia and moringa provide shade, nitrogen-fixing, and fruit income.",
    credits: "2–5 t CO₂/ha/yr",
    color: "forest",
    photo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&auto=format&fit=crop",
    steps: ["Plant native trees between crops", "Maintain 30–50% canopy cover", "Document tree count and species", "Submit annual photo evidence"],
  },
  {
    icon: Leaf,
    title: "No-Till Farming",
    desc: "Avoiding tillage keeps carbon locked in soil organic matter. Combined with cover crops, this can double soil carbon over 5 years.",
    credits: "0.5–2 t CO₂/ha/yr",
    color: "forest",
    photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&auto=format&fit=crop",
    steps: ["Use direct seeding instead of plowing", "Plant cover crops in off-season", "Rotate crops to maintain soil health", "Test soil carbon annually"],
  },
  {
    icon: Droplets,
    title: "Wetland & Mangrove Restoration",
    desc: "Mangroves and wetlands are among the highest carbon-density ecosystems on Earth. Restoring even 1 hectare earns premium blue carbon credits.",
    credits: "5–20 t CO₂/ha/yr",
    color: "blue",
    photo: "https://images.unsplash.com/photo-1672153920077-8bea4b38b077?w=800&q=80&auto=format&fit=crop",
    steps: ["Map degraded wetland areas", "Replant native mangrove species", "Control invasive species", "Monitor water levels and biomass"],
  },
  {
    icon: Wind,
    title: "Savanna Management",
    desc: "Controlled burns and rotational grazing prevent carbon-releasing wildfires and allow savanna grasses to build deep root carbon stores.",
    credits: "0.5–3 t CO₂/ha/yr",
    color: "savanna",
    photo: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80&auto=format&fit=crop",
    steps: ["Implement rotational grazing", "Conduct controlled early-season burns", "Remove invasive shrubs", "Monitor grass cover and density"],
  },
  {
    icon: Sun,
    title: "Biochar Production",
    desc: "Converting agricultural waste into biochar and applying it to soil permanently stores carbon and improves fertility for generations.",
    credits: "0.3–1 t CO₂/ha/yr",
    color: "amber",
    photo: "https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=800&q=80&auto=format&fit=crop",
    steps: ["Collect crop residues and wood waste", "Produce biochar using low-emission kiln", "Apply biochar to farmland", "Record application rates and location"],
  },
  {
    icon: TrendingUp,
    title: "Community Forest Management",
    desc: "Formalizing community protection of existing forests prevents deforestation and earns REDD+ credits. The most scalable approach for large communities.",
    credits: "3–10 t CO₂/ha/yr",
    color: "forest",
    photo: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80&auto=format&fit=crop",
    steps: ["Map community forest boundaries", "Establish forest governance rules", "Monitor forest cover with satellite data", "Register on Kabon.Africa"],
  },
];

const COLOR_MAP: Record<string, { badge: string; dot: string }> = {
  forest:  { badge: "bg-forest-100 text-forest-700",  dot: "bg-forest-500"  },
  blue:    { badge: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  savanna: { badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  amber:   { badge: "bg-orange-100 text-orange-700",   dot: "bg-orange-500"  },
};

const stats = [
  { value: "16+", label: "African countries" },
  { value: "2.4M ha", label: "Eligible land" },
  { value: "$8–28", label: "Per tonne earned" },
  { value: "3 mo", label: "First payment" },
];

export default function FarmingGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=85&auto=format&fit=crop"
          alt="African farmland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 via-forest-950/50 to-forest-950/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="inline-block bg-forest-400/20 border border-forest-400/40 text-forest-200 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            Farming Guide
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            Your land. Your income.
          </h1>
          <p className="text-forest-200 max-w-xl text-sm md:text-base leading-relaxed">
            Six proven practices that turn African farmland and forests into verified carbon credits,
            and a steady income for your community.
          </p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-forest-700">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Explainer card ── */}
        <div className="bg-forest-50 border border-forest-200 rounded-2xl p-5 mb-10 flex gap-4 items-start">
          <div className="w-10 h-10 bg-forest-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-forest-900 mb-1">How carbon credit estimation works</h2>
            <p className="text-sm text-forest-800 leading-relaxed">
              Credits are calculated from the difference between a <strong>baseline</strong> (what happens without your project) and
              actual CO₂ sequestered. Verifiers use satellite imagery, soil tests, and biomass measurements.
              Ranges below are conservative, and your verifier confirms the exact amount at no cost to you.
            </p>
          </div>
        </div>

        {/* ── Practice cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {practices.map((p) => {
            const c = COLOR_MAP[p.color];
            return (
              <div key={p.title} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden hover:shadow-md transition-shadow">
                {/* Photo */}
                <div className="relative h-44 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/15 backdrop-blur-sm rounded-xl border border-white/30 flex items-center justify-center">
                      <p.icon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-sm drop-shadow">{p.title}</h3>
                  </div>
                  <span className={`absolute top-3 right-3 ${c.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>
                    {p.credits}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5">
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{p.desc}</p>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Steps</div>
                    <ul className="space-y-1.5">
                      {p.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <span className={`w-4 h-4 ${c.dot} text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5`}>
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── How it works timeline ── */}
        <div className="mt-14 mb-10">
          <h2 className="text-xl font-black text-gray-900 text-center mb-8">From land to income in 4 steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-0">
            {[
              { n: "1", title: "Submit project", desc: "Fill in your land details, location, and practice type on Kabon.Africa.", img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80&auto=format&fit=crop" },
              { n: "2", title: "Satellite review", desc: "Our system runs NDVI analysis on your land to confirm baseline carbon stock.", img: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80&auto=format&fit=crop" },
              { n: "3", title: "Field verification", desc: "A certified verifier visits or conducts a video inspection. You get your credit amount.", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80&auto=format&fit=crop" },
              { n: "4", title: "Get paid", desc: "Credits are issued and listed. Buyers purchase; funds go directly to your bank or M-Pesa account.", img: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&q=80&auto=format&fit=crop" },
            ].map((step, i) => (
              <div key={step.n} className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0">
                <div className="flex sm:flex-col items-center sm:items-center w-full sm:w-auto">
                  {/* Image */}
                  <div className="relative sm:mb-4 flex-shrink-0">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={step.img} alt={step.title} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-forest-600 text-white text-xs font-black rounded-full flex items-center justify-center shadow">
                      {step.n}
                    </span>
                  </div>
                  {/* Connector line on desktop */}
                  {i < 3 && (
                    <div className="hidden sm:flex flex-1 items-center justify-center w-full py-4">
                      <div className="flex-1 border-t-2 border-dashed border-forest-200" />
                      <ArrowRight className="w-4 h-4 text-forest-400 -mx-1" />
                    </div>
                  )}
                </div>
                <div className="sm:text-center sm:px-2 pb-6 sm:pb-0">
                  <div className="font-bold text-gray-900 text-sm mb-1">{step.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=1200&q=80&auto=format&fit=crop"
            alt="African landscape"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-forest-950/80" />
          <div className="relative px-8 py-10 text-center">
            <h2 className="text-2xl font-black text-white mb-2">Ready to earn from your land?</h2>
            <p className="text-forest-200 mb-6 text-sm max-w-md mx-auto">
              Once you implement any of these practices, submit your land as a project.
              Our verifiers confirm your sequestration and issue credits to your account within 90 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2 justify-center">
                Submit My Land Project <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/marketplace" className="inline-flex items-center gap-2 justify-center border border-white/30 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
