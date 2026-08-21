"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, BookOpen, Leaf, Zap, ClipboardCheck, Layers, Eye, Award,
  TrendingUp, AlertCircle, Clock, ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface Methodology {
  code: string;
  name: string;
  category: string;
  scope: string | null;
  summary: string;
  bufferPercent: number;
  monitoringPeriodMonths: number;
  active: boolean;
}

interface BufferStats {
  totalReserved: number;
  totalDrawn: number;
  net: number;
  contributionCount: number;
  projectsCovered: number;
}

export default function StandardPage() {
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [stats, setStats] = useState<BufferStats | null>(null);

  useEffect(() => {
    api.get<{ data: Methodology[] }>("/api/projects/methodologies")
      .then((r) => setMethodologies(r.data ?? []))
      .catch(() => {});
    api.get<{ data: BufferStats }>("/api/projects/buffer-pool/stats")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  // Scroll to a methodology if the URL has a fragment like #KCS-AR-01
  useEffect(() => {
    if (methodologies.length === 0) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      // Slight delay so layout settles
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [methodologies]);

  const landMethodologies   = methodologies.filter(m => m.category === "Land Restoration");
  const energyMethodologies = methodologies.filter(m => m.category === "Clean Energy");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-forest-950 text-white relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1800&q=85&auto=format&fit=crop"
          alt="African savanna landscape"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/90 via-forest-950/70 to-forest-900/85" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, rgb(22 101 52) 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-24 relative">
          <div className="flex items-center gap-2 text-forest-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Shield className="w-3.5 h-3.5" /> The Kabon Carbon Standard
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
            A boutique African carbon registry.
          </h1>
          <p className="text-forest-200 text-lg max-w-2xl leading-relaxed">
            Every credit on Kabon.Africa is issued under a published methodology, backed by a permanence buffer pool,
            and backed by a government-compliant fiat settlement layer. Built for African projects that are too small, too local, or too time-pressed
            for years-long international registry processes.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">

        {/* Live stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={TrendingUp}
            value={stats ? `${stats.net.toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : "—"}
            label="In the Buffer Pool"
            sub="Reserved against project reversals"
          />
          <StatCard
            icon={Layers}
            value={methodologies.length}
            label="Active Methodologies"
            sub="Published & versioned"
          />
          <StatCard
            icon={Leaf}
            value={stats?.projectsCovered ?? 0}
            label="Verified Projects"
            sub="Carrying buffer protection"
          />
        </section>

        {/* The standard */}
        <section className="bg-white border border-gray-100 rounded-3xl shadow-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Photo column */}
            <div className="lg:col-span-2 relative min-h-[280px] lg:min-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=900&q=85&auto=format&fit=crop"
                alt="African forest canopy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs">
                <div className="font-bold mb-0.5">Carbon, forest to certificate</div>
                <div className="text-forest-200">Six steps from project submission to retired offset.</div>
              </div>
            </div>
            {/* Steps column */}
            <div className="lg:col-span-3 p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-forest-600" />
                How a credit is issued
              </h2>
              <ol className="space-y-5">
                <StandardStep number={1} title="Project submitted under a methodology"
                  body="A landowner registers their project and picks a published Kabon Carbon Standard methodology (listed below). The methodology dictates the buffer reserve, monitoring cadence, and the kinds of evidence we require." />
                <StandardStep number={2} title="Admin review"
                  body="The Kabon team reviews the submission for completeness, legitimacy, and methodology fit. Communication happens through the project's private comment thread. Documents are stored on IPFS for an immutable trail." />
                <StandardStep number={3} title="Carbon assessment"
                  body="Kabon's own Earth Observation pipeline processes Sentinel-2 satellite imagery into an NDVI time series for the parcel, alongside IoT ground-sensor readings where deployed. An assigned reviewer assesses that evidence against the chosen methodology — baseline, project emissions, net tonnes — and the number stamps onto a Verification record." />
                <StandardStep number={4} title="Issuance + buffer split"
                  body="Credits are issued and recorded in the Kabon registry. The methodology's buffer percentage is automatically diverted to the platform-wide Buffer Pool. Only the remainder is tradeable." />
                <StandardStep number={5} title="Trade & retirement"
                  body="Approved buyers purchase credits via bank transfer. Retired credits are permanently marked non-transferable and receive a printable retirement certificate with QR-verified provenance." />
                <StandardStep number={6} title="Ongoing monitoring"
                  body="Per the methodology, projects re-submit monitoring evidence on a fixed cadence. Reversal events (fire, conversion) trigger pool drawdown, where pool credits are retired to backfill so buyer offsets stay whole." />
              </ol>
            </div>
          </div>
        </section>

        {/* Methodologies */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <ClipboardCheck className="w-6 h-6 text-forest-600" />
              Methodology library
            </h2>
            <span className="text-sm text-gray-400">v1.0</span>
          </div>

          {/* Land restoration banner + cards */}
          <SectorBanner
            tint="forest"
            icon={Leaf}
            title="Land restoration"
            subtitle="Forest, savanna, rangeland, mangrove"
            photo="https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=1400&q=85&auto=format&fit=crop"
            alt="Mangrove restoration site"
          />
          <div className="space-y-3 mt-4">
            {landMethodologies.map(m => <MethodologyCard key={m.code} m={m} />)}
            {landMethodologies.length === 0 && (
              <p className="text-sm text-gray-400 italic">Loading…</p>
            )}
          </div>

          {/* Clean energy banner + cards */}
          <div className="mt-10">
            <SectorBanner
              tint="amber"
              icon={Zap}
              title="Clean energy"
              subtitle="Solar, biogas, cookstoves, biocharcoal, hydro, wind"
              photo="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1400&q=85&auto=format&fit=crop"
              alt="Solar array against an African sunset"
            />
          </div>
          <div className="space-y-3 mt-4">
            {energyMethodologies.map(m => <MethodologyCard key={m.code} m={m} />)}
            {energyMethodologies.length === 0 && (
              <p className="text-sm text-gray-400 italic">Loading…</p>
            )}
          </div>
        </section>

        {/* Honest disclaimers */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-lg font-black text-amber-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            What we are, and what we aren't
          </h2>
          <div className="space-y-3 text-sm text-amber-900 leading-relaxed">
            <p>
              <strong>Verification is performed by a Kabon-assigned reviewer or a client-nominated third party.</strong>
              {" "}The satellite and IoT evidence that reviewer works from is generated by our own EO/MRV
              pipeline &mdash; see{" "}
              <Link href="/technology" className="underline hover:text-amber-700">how the measurement pipeline works</Link>.
            </p>
            <p>
              <strong>The buffer pool is platform-administered.</strong> We publish its live balance on this page
              so you can verify our permanence reserve at any time.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="relative bg-gradient-to-br from-forest-700 to-forest-900 text-white rounded-3xl p-8 text-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=1400&q=80&auto=format&fit=crop"
            alt="Highland grassland"
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="relative">
            <Eye className="w-8 h-8 mx-auto mb-3 text-forest-300" />
            <h2 className="text-2xl font-black mb-2">Every credit, traceable.</h2>
            <p className="text-forest-200 text-sm mb-6 max-w-md mx-auto">
              Each retirement certificate carries the methodology code, project ID, and a unique registry reference.
              Audit any credit from the certificate's QR.
            </p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 bg-white text-forest-900 font-bold px-6 py-2.5 rounded-xl hover:bg-forest-50 transition-colors">
              Browse the marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, value, label, sub,
}: { icon: React.ElementType; value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      <Icon className="w-5 h-5 text-forest-600 mb-3" />
      <div className="text-3xl font-black text-gray-900 leading-none">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-1.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectorBanner({
  icon: Icon, title, subtitle, photo, alt, tint,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  photo: string; alt: string; tint: "forest" | "amber";
}) {
  const overlayClass = tint === "forest"
    ? "from-forest-900/85 via-forest-800/60 to-transparent"
    : "from-amber-900/85 via-amber-800/55 to-transparent";
  const iconClass = tint === "forest" ? "text-forest-200" : "text-amber-200";
  return (
    <div className="relative h-32 md:h-36 rounded-2xl overflow-hidden border border-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      <div className={`absolute inset-0 bg-gradient-to-r ${overlayClass}`} />
      <div className="relative h-full flex items-center px-6">
        <div className="text-white">
          <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-1 ${iconClass}`}>
            <Icon className="w-3.5 h-3.5" /> Sector
          </div>
          <div className="font-black text-xl">{title}</div>
          <div className="text-xs opacity-90 mt-0.5">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function StandardStep({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-700 font-black text-sm flex items-center justify-center flex-shrink-0">
        {number}
      </div>
      <div>
        <div className="font-bold text-gray-900 text-sm mb-0.5">{title}</div>
        <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function MethodologyCard({ m }: { m: Methodology }) {
  return (
    <article id={m.code} className="bg-white border border-gray-100 rounded-2xl shadow-card p-5 scroll-mt-24">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-900">{m.name}</h4>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {m.code}
            </span>
          </div>
          {m.scope && <div className="text-xs text-gray-400">{m.scope}</div>}
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">{m.summary}</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 bg-forest-50 border border-forest-100 rounded-xl px-3 py-2">
          <Award className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
          <div>
            <div className="font-bold text-forest-900">{m.bufferPercent}% buffer</div>
            <div className="text-forest-700/80 text-[10px]">Reserved per issuance</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
          <div>
            <div className="font-bold text-blue-900">{m.monitoringPeriodMonths}-mo cycle</div>
            <div className="text-blue-700/80 text-[10px]">Re-verification cadence</div>
          </div>
        </div>
      </div>
    </article>
  );
}
