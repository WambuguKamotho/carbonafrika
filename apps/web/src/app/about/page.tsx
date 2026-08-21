import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Leaf } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Kabon.Africa connects African land stewards directly to carbon credit buyers, measured by our own satellite + IoT pipeline and settled directly to their bank account or M-Pesa.",
  alternates: { canonical: "/about" },
};

const differentiators = [
  {
    title: "Satellite-measured, not self-reported",
    desc: "Our own Earth Observation pipeline processes Sentinel-2 satellite bands into an NDVI reading for the project's exact parcel — not a third-party dashboard bolted on for show.",
    photo: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80&auto=format&fit=crop",
    alt: "Satellite view of African landscape",
  },
  {
    title: "IoT ground sensors",
    desc: "Soil moisture, gas flow meters, temperature: continuous, tamper-proof readings from the project site, feeding the same review record as the satellite evidence.",
    photo: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80&auto=format&fit=crop",
    alt: "Smart agriculture sensor in field",
  },
  {
    title: "Direct settlement",
    desc: "Every sale settles directly to the land steward who earned it, with no escrow, no middlemen, and no lengthy delays. Returns reach the people doing the work, fully compliant with local regulations.",
    photo: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80&auto=format&fit=crop",
    alt: "Direct settlement reaching land stewards",
  },
  {
    title: "Built for African realities",
    desc: "Mobile-first. GPS coordinates, not cadastral maps. Works for individual farmers and village cooperatives. Priced for $12–25/tonne, not the $150/tonne boutique market.",
    photo: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80&auto=format&fit=crop",
    alt: "African savanna landscape",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-forest-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1920&q=80&auto=format&fit=crop"
          alt="African plains aerial view"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-950/50 to-forest-950/90" />

        <div className="relative max-w-3xl mx-auto text-center px-4 py-24">
          <div className="inline-flex items-center gap-2 bg-forest-500/10 border border-forest-500/20 text-forest-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <Leaf className="w-3.5 h-3.5" />
            About Kabon.Africa
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Africa's land does the work.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 to-savanna-300">
              It's time Africa got paid for it.
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Kabon.Africa connects the communities restoring and protecting African land directly to carbon credit buyers &mdash; measured by our own satellite + IoT pipeline, settled without middlemen.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── The problem, simply ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Why we exist</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-6">
            Carbon markets pay everyone except the people doing the work.
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg">
            Farmers, cooperatives, and circular economy entrepreneurs across Africa restore degraded land, protect forests, and cut emissions every day, but the credits generated from that work are usually claimed by brokers and middlemen who never visit the site. Kabon.Africa cuts them out: our own satellite and IoT pipeline measures the impact directly, and buyers pay the land stewards directly.
          </p>
        </div>
      </section>

      {/* ── Founder note ── */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-8 md:p-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-forest-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-white">WK</span>
            </div>
            <div>
              <p className="text-gray-600 leading-relaxed mb-2">
                &ldquo;I&apos;ve traveled across this continent and watched communities destroy the little land they have left just to survive, because nothing rewards them for protecting it instead. Kabon.Africa exists to fix that incentive, so more people and communities have a reason to take part in climate action.&rdquo;
              </p>
              <p className="text-sm font-black text-gray-900">Wambugu Kamotho</p>
              <p className="text-xs text-forest-600 font-semibold">Founder · Nairobi, Kenya</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">The platform</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">What Kabon.Africa does differently</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Designed from the ground up for the African carbon market, not adapted from frameworks built for European forestry projects.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentiators.map(f => (
              <div key={f.title} className="bg-gray-50 rounded-2xl border border-gray-100 shadow-card overflow-hidden">
                <div className="h-44 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.photo} alt={f.alt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/technology" className="inline-flex items-center gap-2 text-forest-600 font-semibold hover:text-forest-700">
              See how the measurement pipeline works
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=1920&q=80&auto=format&fit=crop"
          alt="African grassland"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900/95 to-forest-700/90" />

        <div className="relative max-w-2xl mx-auto text-center">
          <MapPin className="w-8 h-8 text-forest-300 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            This is Africa's carbon market.<br />Built by Africans.
          </h2>
          <p className="text-forest-200 mb-8 text-lg max-w-lg mx-auto">
            Register your land, connect your IoT devices, and start earning from the ecosystem services your community has always provided for free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-forest-800 font-bold px-8 py-3 rounded-xl hover:bg-forest-50 transition-all duration-150 shadow-lg">
              Register Your Land
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-all duration-150">
              Browse Credits
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
