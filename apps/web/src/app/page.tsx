import Link from "next/link";
import { TreePine, Leaf, Globe, Shield, TrendingUp, Users, ArrowRight, CheckCircle } from "lucide-react";
import CarbonCalculator from "@/components/ui/CarbonCalculator";

async function fetchPublicStats() {
  try {
    const authUrl = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
    const res = await fetch(`${authUrl}/auth/public-stats`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as { activeProjects: number; totalCreditsIssued: number; countries: number; totalUsers: number };
  } catch {
    return null;
  }
}

const landTypes = [
  {
    icon: "🌳", label: "Indigenous Forests", desc: "Restore native tree species and biodiversity corridors",
    color: "from-forest-600 to-forest-800",
    photo: "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=600&q=65&auto=format&fit=crop&fm=webp",
  },
  {
    icon: "🌿", label: "Savannas", desc: "Protect and regenerate vast African grasslands",
    color: "from-savanna-500 to-savanna-700",
    photo: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=65&auto=format&fit=crop&fm=webp",
  },
  {
    icon: "🌾", label: "Grasslands", desc: "Revive carbon-storing native grass ecosystems",
    color: "from-earth-500 to-earth-700",
    photo: "https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=600&q=65&auto=format&fit=crop&fm=webp",
  },
  {
    icon: "🌱", label: "Efficient Farming", desc: "Agroforestry and regenerative agriculture for profit",
    color: "from-forest-500 to-forest-700",
    photo: "https://images.unsplash.com/photo-1582409284161-5bf7c520dce9?w=600&q=65&auto=format&fit=crop&fm=webp",
  },
];

const steps = [
  { n: "01", title: "Register Your Land", desc: "Submit GPS coordinates, land type, and project docs online.", icon: "📍" },
  { n: "02", title: "Get Verified", desc: "Independent verifiers + satellite monitoring confirm sequestration.", icon: "✅" },
  { n: "03", title: "Earn Credits", desc: "Verified CO₂ is issued as certified carbon credits to your account.", icon: "🪙" },
  { n: "04", title: "Get Paid", desc: "Corporations buy your credits. Payments settle directly to your bank or M-Pesa.", icon: "💰" },
];

const features = [
  { icon: Shield, title: "100% Verified", desc: "Every project is independently verified before a single credit is issued. No greenwashing." },
  { icon: Globe, title: "Verified Proof", desc: "Every project is independently verified. All issuances, sales, and retirements are permanently recorded." },
  { icon: TrendingUp, title: "Real Income", desc: "Communities earn $12–25 per tonne. Payments settle directly to your bank or M-Pesa account." },
  { icon: TreePine, title: "Indigenous Focus", desc: "We prioritise indigenous forest restoration, Africa's highest carbon-density ecosystems." },
  { icon: Leaf, title: "Farming Guide", desc: "Expert agroforestry guidance that earns additional credits alongside your food crops." },
  { icon: Users, title: "Community Owned", desc: "Register individually or as a collective. Earnings go to the land stewards, not middlemen." },
];

const testimonials = [
  { name: "Mama Wanjiru", role: "Forest Landowner, Kenya", quote: "I registered 12 hectares of degraded forest. After verification, I received credits worth $3,200. That funded my children's school fees for 3 years.", avatar: "MW" },
  { name: "Amara Diallo", role: "Community Leader, Senegal", quote: "Our community of 40 families restored savanna together. The carbon income supplements farming income during dry seasons. Kabon.Africa changed our lives.", avatar: "AD" },
];

export default async function HomePage() {
  const liveStats = await fetchPublicStats();
  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-forest-950" style={{ contain: "layout" }}>
        {/* LCP hero image — fetchpriority=high so the browser fetches it in the first network burst */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=60&auto=format&fit=crop&fm=webp"
          alt="African savanna landscape"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          fetchPriority="high"
          decoding="sync"
        />
        {/* Dark + green overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/60 to-forest-950/90" />

        <div className="relative max-w-5xl mx-auto px-4 text-center py-24">
          <div className="inline-flex items-center gap-2 bg-forest-500/10 border border-forest-500/20 text-forest-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-forest-400 rounded-full animate-pulse-slow" />
            Verified by Science · Compliant · Real Financial Returns
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Restore Africa.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 to-savanna-300">
              Earn Carbon Credits.
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kabon.Africa connects African communities restoring forests, savannas, and grasslands
            with global buyers who pay for verified carbon offsets, straight to your bank account.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register" className="btn-primary text-base px-8 py-3 text-base shadow-lg shadow-forest-900/50">
              Start Earning Credits
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-150">
              Browse Marketplace
            </Link>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {["🔒 Secure", "🌍 54 African nations", "✅ Independently verified", "📋 Published standard"].map((t) => (
              <span key={t} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-y border-gray-100 py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              label: "Credits Issued (t CO₂)",
              value: liveStats ? (liveStats.totalCreditsIssued > 0 ? liveStats.totalCreditsIssued.toLocaleString() : "—") : "50K+",
            },
            {
              label: "Active Projects",
              value: liveStats ? liveStats.activeProjects.toLocaleString() : "2M+",
            },
            {
              label: "African Countries",
              value: liveStats ? (liveStats.countries > 0 ? liveStats.countries.toString() : "54") : "54",
            },
            { label: "Credit Price / Tonne", value: "$12–25" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-forest-700">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Land Asset Banner + Calculator ── */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1574169208507-84376144848b?w=1200&q=60&auto=format&fit=crop&fm=webp"
          alt="African landscape aerial"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/85 via-forest-950/70 to-savanna-900/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.35)_100%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 bg-savanna-400 rounded-full animate-pulse" />
            For African Landowners
          </div>

          {/* Headline */}
          <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5">
            Your land is{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-savanna-300 via-forest-300 to-savanna-200">
              an asset.
            </span>
          </h2>

          {/* Sub-headline */}
          <p className="text-2xl md:text-3xl font-semibold text-white/80 mb-4 leading-snug">
            Start earning from it today.
          </p>

          <p className="text-base text-white/75 max-w-xl mx-auto mb-8 leading-relaxed">
            Every hectare of restored forest, savanna, or grassland produces verified carbon
            credits worth $12–$28 per tonne, paid directly to you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register"
              className="inline-flex items-center justify-center gap-2 bg-forest-500 hover:bg-forest-400 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-forest-900/40 text-sm">
              Register Your Land
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/marketplace"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-8 py-3.5 rounded-xl transition-all backdrop-blur-sm text-sm">
              See Active Projects
            </Link>
          </div>

          {/* Earnings Calculator */}
          <CarbonCalculator />
        </div>
      </section>

      {/* ── Land Types ── */}
      <section className="section bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-700 uppercase tracking-widest">Eligible Land</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">What You Can Restore</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Any African land restoration qualifies. Our verifiers confirm the carbon potential of your specific ecosystem.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {landTypes.map((lt) => (
              <div key={lt.label} className="group relative overflow-hidden rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 h-64 cursor-default">
                {/* Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lt.photo} alt={lt.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${lt.color} opacity-70 group-hover:opacity-60 transition-opacity duration-300`} />
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                  <span className="text-2xl mb-2">{lt.icon}</span>
                  <h3 className="font-bold text-lg leading-tight mb-1">{lt.label}</h3>
                  <p className="text-xs text-white/80 leading-relaxed">{lt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-700 uppercase tracking-widest">Process</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">From Land to Payment in 4 Steps</h2>
            <p className="text-gray-500">Simple enough for individuals. Robust enough for communities of thousands.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gray-200 z-0 -translate-x-4" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-2xl mb-5">
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-forest-700 mb-2 tracking-widest">{s.n}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section text-white relative overflow-hidden">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=55&auto=format&fit=crop&fm=webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* Deep overlay so feature cards stay readable */}
        <div className="absolute inset-0 bg-forest-950/85" />
        <div className="container mx-auto relative">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-400 uppercase tracking-widest">Why Kabon.Africa</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-3">Built for Africa</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Not adapted from European frameworks. Designed from the ground up for African ecosystems, land tenure, and communities.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group flex gap-4 p-5 rounded-2xl hover:bg-white/5 transition-colors duration-200">
                <div className="flex-shrink-0 w-11 h-11 bg-forest-500/20 rounded-xl flex items-center justify-center border border-forest-500/30 group-hover:bg-forest-500/30 transition-colors">
                  <f.icon className="w-5 h-5 text-forest-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-forest-700 uppercase tracking-widest">Stories</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">Real People. Real Impact.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((t) => (
              <div key={t.name} className="card">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-savanna-400 text-sm">★</span>)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-forest-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section bg-white">
        <div className="container mx-auto">
          <div className="rounded-3xl p-12 text-center text-white relative overflow-hidden">
            {/* Background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200&q=55&auto=format&fit=crop&fm=webp"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {/* Dark green overlay so text stays readable */}
            <div className="absolute inset-0 bg-forest-900/75" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm mb-6">
                <CheckCircle className="w-4 h-4 text-forest-300" />
                Free to register · No upfront costs
              </div>
              <h2 className="text-4xl font-black mb-4 leading-tight">
                Your land is an asset.<br />Start earning from it today.
              </h2>
              <p className="text-forest-200 mb-8 text-lg max-w-lg mx-auto">
                Whether you have 1 hectare or 10,000, individuals, farmers, and communities all qualify.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-forest-800 font-bold px-8 py-3 rounded-xl hover:bg-forest-50 transition-all duration-150 shadow-lg">
                  Register as Land Owner
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/request-access" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-all duration-150">
                  I&apos;m a Buyer / Corporate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
