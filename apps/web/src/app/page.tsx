import Link from "next/link";
import { TreePine, Leaf, Globe, Shield, TrendingUp, Users } from "lucide-react";

const stats = [
  { label: "Tonnes CO₂ Sequestered", value: "0" },
  { label: "Hectares Restored", value: "0" },
  { label: "Communities Funded", value: "0" },
  { label: "Credits Traded", value: "0" },
];

const landTypes = [
  { icon: "🌳", label: "Indigenous Forests", desc: "Restore native tree species and biodiversity" },
  { icon: "🌿", label: "Savannas", desc: "Protect and regenerate vast African grasslands" },
  { icon: "🌾", label: "Grasslands", desc: "Revive carbon-storing native grass ecosystems" },
  { icon: "🌱", label: "Efficient Farming", desc: "Agroforestry and regenerative agriculture" },
];

const steps = [
  { n: "01", title: "Register Your Land", desc: "Submit GPS coordinates, land type, and project documentation." },
  { n: "02", title: "Get Verified", desc: "Our verifiers and satellite monitoring confirm your carbon sequestration." },
  { n: "03", title: "Earn Credits", desc: "Verified CO₂ is minted as blockchain tokens in your wallet." },
  { n: "04", title: "Get Paid", desc: "Corporations buy your credits. You receive USDC or MATIC." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700 text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <span className="bg-forest-500/30 border border-forest-400/30 text-forest-100 px-4 py-1.5 rounded-full text-sm font-medium">
              Polygon Blockchain · Verified Credits · Real Impact
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Restore Africa.<br />
            <span className="text-forest-300">Earn Carbon Credits.</span>
          </h1>
          <p className="text-xl text-forest-100 max-w-2xl mx-auto mb-10">
            CarbonAfrika connects communities restoring indigenous forests, savannas, and grasslands
            with global buyers who need verified carbon offsets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-center text-base">
              Start Earning Credits
            </Link>
            <Link href="/marketplace" className="btn-secondary text-center text-base bg-white/10 border-white/20 text-white hover:bg-white/20">
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-forest-800 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-forest-300">{s.value}</div>
              <div className="text-sm text-forest-200 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Land Types */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">What You Can Restore</h2>
          <p className="text-center text-gray-500 mb-12">Any African land restoration qualifies for carbon credits</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {landTypes.map((lt) => (
              <div key={lt.label} className="card hover:shadow-md transition-shadow text-center">
                <div className="text-5xl mb-4">{lt.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{lt.label}</h3>
                <p className="text-sm text-gray-500">{lt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">How It Works</h2>
          <p className="text-center text-gray-500 mb-12">From land to blockchain in 4 steps</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-black text-forest-100 mb-3">{s.n}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Built for Africa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Verified & Trusted", desc: "Every project is independently verified. Carbon tons are confirmed before credits are issued." },
              { icon: Globe, title: "Blockchain Transparent", desc: "All credits live on Polygon. Every mint, transfer, and retirement is publicly verifiable." },
              { icon: TrendingUp, title: "Real Financial Returns", desc: "Communities earn USDC for their restoration work. Credits are priced by global demand." },
              { icon: TreePine, title: "Indigenous Focus", desc: "Priority support for indigenous forest and savanna restoration — the most carbon-dense ecosystems." },
              { icon: Leaf, title: "Agroforestry Guide", desc: "Farmers get expert guidance on efficient farming practices that earn additional credits." },
              { icon: Users, title: "Community Owned", desc: "Communities register collectively. Earnings distributed to members, not middlemen." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-forest-700" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-forest-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to start?</h2>
          <p className="text-forest-200 mb-8 text-lg">
            Register your land today. Whether you are an individual, farmer, or community — you can earn from Africa&apos;s restoration.
          </p>
          <Link href="/register" className="btn-primary text-base">
            Register as a Land Owner
          </Link>
        </div>
      </section>
    </div>
  );
}
