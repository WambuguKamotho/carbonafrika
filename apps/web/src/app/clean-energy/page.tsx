import { Sun, Flame, Wind, Zap, Droplets, Cpu, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

const technologies = [
  {
    icon: Sun,
    title: "Solar PV Mini-Grids & Rooftop",
    desc: "Off-grid or rooftop solar that displaces diesel generators or extends electricity to previously unserved communities. Strongest credit yield in African markets.",
    credits: "0.4–0.7 t CO₂/kWp/yr",
    color: "amber",
    photo: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80&auto=format&fit=crop",
    steps: ["Conduct site solar irradiation survey", "Size system to match displaced grid/diesel load", "Install with IoT energy meter on inverter", "Submit monthly kWh + emission-factor data"],
  },
  {
    icon: Flame,
    title: "Biogas Digesters",
    desc: "Anaerobic digesters that turn livestock manure and food waste into cooking gas while capturing methane that would otherwise escape. Doubles as a manure-management win.",
    credits: "1.5–3.5 t CO₂/m³/yr",
    color: "forest",
    photo: "https://images.unsplash.com/photo-1739539978578-6c280bf8c582?w=800&q=80&auto=format&fit=crop",
    steps: ["Install fixed-dome or balloon digester (4–20 m³)", "Connect to household kitchen stove", "Add IoT flow meter on the gas line", "Maintain feed-input log and quarterly servicing"],
  },
  {
    icon: Zap,
    title: "Improved Cookstoves",
    desc: "Distribute ICS units that cut wood fuel use by 40–60% versus three-stone fires. Highest household-scale carbon ROI on the continent.",
    credits: "1.5–3 t CO₂/household/yr",
    color: "savanna",
    photo: "https://images.unsplash.com/photo-1551982932-92d213f565a7?w=800&q=80&auto=format&fit=crop",
    steps: ["Procure or manufacture certified ICS units", "Distribute via cooperatives or village agents", "Sample-monitor with fuel sensors on 5–10% of stoves", "Submit kitchen-performance testing report annually"],
  },
  {
    icon: Cpu,
    title: "Biocharcoal Production",
    desc: "Industrial pyrolysis of agricultural waste into clean charcoal — displaces unsustainable wood charcoal while sequestering carbon as recalcitrant char.",
    credits: "2.5–3.5 t CO₂/t produced",
    color: "amber",
    photo: "https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=800&q=80&auto=format&fit=crop",
    steps: ["Source agricultural residues (rice husk, coconut shell, sawdust)", "Operate a low-emission TLUD kiln", "Track feedstock + output mass with IoT sensors", "Independent lab analysis of fixed-carbon content"],
  },
  {
    icon: Droplets,
    title: "Micro-Hydro",
    desc: "Run-of-river turbines (5–500 kW) that displace diesel mini-grids in remote communities. Year-round generation in highland and coastal areas with stable rainfall.",
    credits: "0.45 t CO₂/MWh",
    color: "blue",
    photo: "https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=800&q=80&auto=format&fit=crop",
    steps: ["Survey head and flow over a full wet/dry cycle", "Design penstock, turbine and weir", "Install with IoT energy meter on inverter output", "Submit monthly kWh + uptime report"],
  },
  {
    icon: Wind,
    title: "Small Wind",
    desc: "1–50 kW turbines for coastal, highland and Sahel sites with average wind speeds above 5 m/s. Best paired with solar for diurnal coverage.",
    credits: "0.45 t CO₂/MWh",
    color: "blue",
    photo: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80&auto=format&fit=crop",
    steps: ["Install wind mast for 6-12 months pre-build", "Pick turbine type to match wind class", "Install with IoT energy meter + wind anemometer", "Submit monthly kWh + wind speed records"],
  },
];

const COLOR_MAP: Record<string, { badge: string; dot: string }> = {
  amber:   { badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500"   },
  forest:  { badge: "bg-forest-100 text-forest-700", dot: "bg-forest-500"  },
  savanna: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500"  },
  blue:    { badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"    },
};

const stats = [
  { value: "6",       label: "Clean energy types" },
  { value: "180 MW",  label: "Pipeline capacity" },
  { value: "$10–32",  label: "Per tonne earned" },
  { value: "6 wks",   label: "First payment" },
];

export default function CleanEnergyGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="relative h-80 md:h-96 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=85&auto=format&fit=crop"
          alt="Solar array on a Kenyan ridge"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/60 via-amber-950/50 to-amber-950/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="inline-block bg-amber-400/20 border border-amber-400/40 text-amber-100 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            Clean Energy Guide
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-3 leading-tight">
            Produce clean power.<br /> Earn from every kilowatt-hour.
          </h1>
          <p className="text-amber-100 text-lg md:text-xl max-w-2xl">
            Six clean-energy technologies generating monitored, verifiable carbon credits across Africa.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-black text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Technologies ── */}
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
            Six paths to credit-eligible energy
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Pick the technology that matches your site, capital, and operator capacity. Each has clear MRV requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {technologies.map((t, i) => {
            const c = COLOR_MAP[t.color];
            return (
              <article key={i} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.photo} alt={t.title} className="w-full h-48 object-cover" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl ${c.badge} flex items-center justify-center`}>
                        <t.icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900">{t.title}</h3>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${c.badge}`}>
                      {t.credits}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.desc}</p>
                  <ol className="space-y-2 text-sm text-gray-700 mt-auto">
                    {t.steps.map((s, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full ${c.badge} text-[10px] font-black flex items-center justify-center`}>
                          {j + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="bg-amber-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 text-amber-200" />
          <h2 className="text-3xl md:text-4xl font-black mb-3">
            Got a clean-energy project?
          </h2>
          <p className="text-amber-100 mb-6 max-w-xl mx-auto">
            From single-stove rollouts to multi-megawatt solar farms — register your project, set monitoring up, and start earning.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/projects/new" className="inline-flex items-center gap-2 bg-white text-amber-900 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors">
              Register your project <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/standard" className="inline-flex items-center gap-2 bg-amber-600 border border-amber-400 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-500 transition-colors">
              Read the methodology
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
