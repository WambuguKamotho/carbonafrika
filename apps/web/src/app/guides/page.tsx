import Link from "next/link";
import { ArrowRight, TreePine, Zap, BookOpen } from "lucide-react";

const guides = [
  {
    href: "/farming",
    title: "Land Restoration",
    subtitle: "Forests, savannas, farmland, wetlands, mangroves",
    body: "Six sequestration and conservation pathways for African landowners and community managers. Carbon yield, monitoring requirements, and the steps to register each one.",
    icon: TreePine,
    photo: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80&auto=format&fit=crop",
    accent: "bg-forest-700 hover:bg-forest-800",
    badge: "bg-forest-100 text-forest-700",
  },
  {
    href: "/clean-energy",
    title: "Clean Energy Production",
    subtitle: "Solar, biogas, cookstoves, biocharcoal, micro-hydro, wind",
    body: "Six clean-energy technologies that generate verifiable carbon credits. From household biogas digesters to multi-megawatt solar farms.",
    icon: Zap,
    photo: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80&auto=format&fit=crop",
    accent: "bg-amber-600 hover:bg-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <div className="bg-forest-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, rgb(22 101 52) 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-4 py-16 relative">
          <div className="flex items-center gap-2 text-forest-300 text-xs font-bold uppercase tracking-widest mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Project Owner Guides
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
            Pick the sector that fits<br />your project.
          </h1>
          <p className="text-forest-200 text-lg max-w-2xl leading-relaxed">
            Whether you steward land or run a clean-energy programme, each sector has its own monitoring, methodology and credit yield. Start with the right one.
          </p>
        </div>
      </div>

      {/* ── Sector cards ── */}
      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guides.map(g => (
            <Link key={g.href} href={g.href}
              className="group bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.photo} alt={g.title} className="w-full h-52 object-cover" />
              <div className="p-6">
                <div className={`inline-flex items-center gap-1.5 ${g.badge} text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3`}>
                  <g.icon className="w-3.5 h-3.5" /> Sector
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-1 group-hover:text-forest-800 transition-colors">
                  {g.title}
                </h2>
                <p className="text-sm text-gray-500 mb-3">{g.subtitle}</p>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">{g.body}</p>
                <span className={`inline-flex items-center gap-1.5 ${g.accent} text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors`}>
                  Read the guide <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Cross-link to the Kabon Carbon Standard */}
        <div className="mt-10 bg-white border border-gray-100 rounded-2xl shadow-card p-6 text-center">
          <h3 className="font-black text-gray-900 mb-1">Already know your sector?</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            See the published methodology, buffer-pool policy, and current methodology library used for every project on the platform.
          </p>
          <Link href="/standard" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            Read the Kabon Carbon Standard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
