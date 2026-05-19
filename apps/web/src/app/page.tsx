import Link from "next/link";
import { TreePine, Leaf, Globe, Shield, TrendingUp, Users, ArrowRight, CheckCircle } from "lucide-react";

const stats = [
  { label: "Tonnes CO₂ Target", value: "50K+", suffix: "" },
  { label: "Hectares Eligible", value: "2M+", suffix: "" },
  { label: "African Countries", value: "54", suffix: "" },
  { label: "Credit Price / Tonne", value: "$12", suffix: "avg" },
];

const landTypes = [
  { icon: "🌳", label: "Indigenous Forests", desc: "Restore native tree species and biodiversity corridors", color: "from-forest-600 to-forest-800" },
  { icon: "🌿", label: "Savannas", desc: "Protect and regenerate vast African grasslands", color: "from-savanna-500 to-savanna-700" },
  { icon: "🌾", label: "Grasslands", desc: "Revive carbon-storing native grass ecosystems", color: "from-earth-500 to-earth-700" },
  { icon: "🌱", label: "Efficient Farming", desc: "Agroforestry and regenerative agriculture for profit", color: "from-forest-500 to-forest-700" },
];

const steps = [
  { n: "01", title: "Register Your Land", desc: "Submit GPS coordinates, land type, and project docs online.", icon: "📍" },
  { n: "02", title: "Get Verified", desc: "Independent verifiers + satellite monitoring confirm sequestration.", icon: "✅" },
  { n: "03", title: "Earn Credits", desc: "Verified CO₂ is minted as blockchain tokens to your wallet.", icon: "🪙" },
  { n: "04", title: "Get Paid", desc: "Corporations buy your credits. You receive USDC or MATIC directly.", icon: "💰" },
];

const features = [
  { icon: Shield, title: "100% Verified", desc: "Every project is independently verified before a single credit is issued. No greenwashing." },
  { icon: Globe, title: "Blockchain Proof", desc: "Credits live on Polygon. Every mint, sale, and retirement is publicly verifiable on-chain." },
  { icon: TrendingUp, title: "Real Income", desc: "Communities earn $12–25 per tonne. Payments settle directly to your crypto wallet." },
  { icon: TreePine, title: "Indigenous Focus", desc: "Priority for indigenous forest restoration — Africa's highest carbon-density ecosystems." },
  { icon: Leaf, title: "Farming Guide", desc: "Expert agroforestry guidance that earns additional credits alongside your food crops." },
  { icon: Users, title: "Community Owned", desc: "Register individually or as a collective. Earnings go to the land stewards, not middlemen." },
];

const testimonials = [
  { name: "Mama Wanjiru", role: "Forest Landowner, Kenya", quote: "I registered 12 hectares of degraded forest. After verification, I received credits worth $3,200. That funded my children's school fees for 3 years.", avatar: "MW" },
  { name: "Amara Diallo", role: "Community Leader, Senegal", quote: "Our community of 40 families restored savanna together. The carbon income supplements farming income during dry seasons. CarbonAfrika changed our lives.", avatar: "AD" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-forest-950">
        {/* Background texture */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 20%, rgb(22 101 52 / 0.6) 0%, transparent 60%),
                              radial-gradient(ellipse at 80% 80%, rgb(245 158 11 / 0.15) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3Ccircle cx='23' cy='3' r='1'/%3E%3Ccircle cx='33' cy='13' r='1'/%3E%3Ccircle cx='3' cy='23' r='1'/%3E%3Ccircle cx='23' cy='23' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        <div className="relative max-w-5xl mx-auto px-4 text-center py-24">
          <div className="inline-flex items-center gap-2 bg-forest-500/10 border border-forest-500/20 text-forest-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-forest-400 rounded-full animate-pulse-slow" />
            Polygon Blockchain · Verified by Science · Real Financial Returns
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Restore Africa.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 to-savanna-300">
              Earn Carbon Credits.
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            CarbonAfrika connects African communities restoring forests, savannas, and grasslands
            with global buyers who pay for verified carbon offsets — directly to your wallet.
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
            {["🔒 Non-custodial", "🌍 54 African nations", "⛓️ On-chain proof", "🏆 Verra compatible"].map((t) => (
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
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-forest-700">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Land Types ── */}
      <section className="section bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Eligible Land</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">What You Can Restore</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Any African land restoration qualifies. Our verifiers confirm the carbon potential of your specific ecosystem.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {landTypes.map((lt) => (
              <div key={lt.label} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 p-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${lt.color} flex items-center justify-center text-2xl mb-4 shadow-sm`}>
                  {lt.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{lt.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{lt.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-forest-500 to-savanna-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Process</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">From Land to Wallet in 4 Steps</h2>
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
                  <div className="text-xs font-bold text-forest-500 mb-2 tracking-widest">{s.n}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section bg-forest-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='23' cy='23' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="container mx-auto relative">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-400 uppercase tracking-widest">Why CarbonAfrika</span>
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
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Stories</span>
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
          <div className="bg-gradient-to-br from-forest-600 to-forest-900 rounded-3xl p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='23' cy='23' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm mb-6">
                <CheckCircle className="w-4 h-4 text-forest-300" />
                Free to register · No upfront costs
              </div>
              <h2 className="text-4xl font-black mb-4 leading-tight">
                Your land is an asset.<br />Start earning from it today.
              </h2>
              <p className="text-forest-200 mb-8 text-lg max-w-lg mx-auto">
                Whether you have 1 hectare or 10,000 — individuals, farmers, and communities all qualify.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-forest-800 font-bold px-8 py-3 rounded-xl hover:bg-forest-50 transition-all duration-150 shadow-lg">
                  Register as Land Owner
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/register?role=BUYER" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-all duration-150">
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
