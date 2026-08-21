import type { Metadata } from "next";
import Link from "next/link";
import {
  Satellite, SatelliteDish, Radar, Layers3, Cloud, Database,
  ArrowRight, ShieldCheck, ScanLine, Radio, CheckCircle2, FileCode2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Kabon.Africa's Earth Observation and MRV pipeline: Sentinel-2 satellite processing, NDVI band-math, cloud masking, and IoT ground sensors that measure a project before an independent reviewer certifies it.",
  alternates: { canonical: "/technology" },
};

const pipelineSteps = [
  {
    icon: SatelliteDish,
    title: "Authenticate & task",
    body: "Each check-in authenticates to the Copernicus Data Space Ecosystem via OAuth client-credentials, with the token cached until it expires.",
  },
  {
    icon: ScanLine,
    title: "Build the parcel window",
    body: "A bounding box is built from the project's GPS centroid and hectares, capped at a 5 km half-side to stay within Copernicus's sample-size limit — with ground resolution chosen adaptively: 10 m up to 100 ha, 20 m up to 2,500 ha, 30 m above that, so large projects stay tractable.",
  },
  {
    icon: Radar,
    title: "Run the evalscript",
    body: "A custom Sentinel-2 L2A evalscript reads the red (B04) and near-infrared (B08) bands to compute NDVI, then masks cloud and shadow pixels using the Scene Classification Layer (SCL 4–6: vegetation, soil, water).",
  },
  {
    icon: Layers3,
    title: "Aggregate the time series",
    body: "A 60-day daily NDVI series is pulled and reduced to 25th / 50th / 75th percentile statistics plus a derived cloud-cover figure, taking the most recent valid interval as the reading.",
  },
  {
    icon: Cloud,
    title: "Fall back when needed",
    body: "If Copernicus is unavailable, the pipeline falls back to the Agromonitoring NDVI history API over the same 60-day window, so a reading is still produced.",
  },
];

const dataSources = [
  {
    name: "Copernicus Sentinel-2 L2A",
    status: "Integrated · free",
    detail: "Primary source. 10 m multispectral optical imagery, atmospherically corrected, accessed via the Copernicus Data Space Ecosystem Statistics API.",
  },
  {
    name: "Agromonitoring NDVI history",
    status: "Integrated · fallback",
    detail: "Secondary source used automatically when the Copernicus API is unreachable, over the same 60-day window.",
  },
  {
    name: "Sentinel-1 SAR",
    status: "Available · not yet integrated",
    detail: "Free radar imagery that sees through cloud cover — a natural next input for the rainy-season gaps optical NDVI can't fill.",
  },
  {
    name: "Landsat 8/9",
    status: "Available · not yet integrated",
    detail: "Free, longer-baseline optical archive (since 2013) — useful for pre-project baseline and long-run change detection.",
  },
  {
    name: "Planet NICFI basemaps",
    status: "Available · licensing to be negotiated",
    detail: "High-resolution (≤5 m) tropical basemaps, free for approved non-commercial monitoring use under the Norway's International Climate & Forests Initiative programme.",
  },
];

export default function TechnologyPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden bg-forest-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80&auto=format&fit=crop"
          alt="Satellite view of African landscape"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/60 to-forest-950/95" />

        <div className="relative max-w-4xl mx-auto px-4 py-24">
          <div className="inline-flex items-center gap-2 bg-forest-500/10 border border-forest-500/20 text-forest-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <Satellite className="w-3.5 h-3.5" />
            Technology
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            We measure the land.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 to-savanna-300">
              Independent reviewers certify it.
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
            Kabon.Africa runs its own Earth Observation and MRV (Measurement, Reporting &
            Verification) pipeline in production — satellite band-math and ground IoT sensors,
            not a third-party dashboard bolted on for show.
          </p>
        </div>
      </section>

      {/* ── Measurement vs certification ── */}
      <section className="bg-white section">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-forest-50 border border-forest-100 rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-forest-600 flex items-center justify-center mb-4">
                <Satellite className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-black text-gray-900 text-lg mb-2">Measurement — Kabon</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Our own pipeline processes Sentinel-2 satellite bands into an NDVI time series
                for the project's exact parcel, and combines it with IoT ground readings —
                soil, gas flow, temperature — where devices are deployed. This is the evidence
                a reviewer sees, generated by our code, not re-published from someone else's
                report.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7">
              <div className="w-11 h-11 rounded-xl bg-gray-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-black text-gray-900 text-lg mb-2">Certification — independent reviewers</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                A Kabon-assigned or client-nominated reviewer assesses that evidence against the
                published Kabon Carbon Standard methodology and records the carbon figure. A{" "}
                <strong>second</strong> reviewer — never the one who assessed it — must sign off
                before any credit is issued.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            Full issuance chain, buffer pool, and methodology library on the{" "}
            <Link href="/standard" className="text-forest-600 font-semibold hover:text-forest-700">
              Kabon Carbon Standard
            </Link>{" "}
            page.
          </p>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className="section bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-700 uppercase tracking-widest">The pipeline</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">From orbit to NDVI reading</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every step below runs against live Sentinel-2 imagery for the project's own
              coordinates — not a static basemap tile.
            </p>
          </div>
          <ol className="space-y-4">
            {pipelineSteps.map((s, i) => (
              <li key={s.title} className="flex gap-5 bg-white border border-gray-100 rounded-2xl shadow-card p-6">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-11 h-11 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-forest-700" />
                  </div>
                  {i < pipelineSteps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-forest-700 tracking-widest mb-1">
                    STEP {i + 1}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── IoT layer ── */}
      <section className="bg-white section">
        <div className="max-w-4xl mx-auto">
          <div className="bg-forest-950 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(ellipse at 80% 0%, rgb(22 101 52) 0%, transparent 60%)" }} />
            <div className="relative">
              <div className="flex items-center gap-2 text-forest-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Radio className="w-3.5 h-3.5" /> Ground layer
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-4">IoT sensors, on-site</h2>
              <p className="text-forest-100 leading-relaxed max-w-2xl mb-6">
                For clean-energy projects — solar, biogas, cookstoves — Kabon pulls
                country-specific grid-intensity and fuel emission factors and caches them per
                ISO country code, underpinning the avoided-emissions maths for the project. Soil
                and gas-flow sensors on land-restoration sites report continuous, tamper-proof
                readings from the field: no self-reporting, no consultant with a clipboard.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {["Soil moisture", "Gas flow", "Temperature", "Grid intensity"].map(t => (
                  <div key={t} className="bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-center font-semibold text-forest-100">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data sources ── */}
      <section className="section bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-forest-700 uppercase tracking-widest">Data sources</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">What's live, what's next</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We name our sources and their availability plainly — free, integrated, or still to
              be negotiated.
            </p>
          </div>
          <div className="space-y-3">
            {dataSources.map(d => (
              <div key={d.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 bg-white border border-gray-100 rounded-2xl shadow-card p-5">
                <div className="sm:w-56 flex-shrink-0">
                  <div className="font-bold text-gray-900 text-sm">{d.name}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${
                    d.status.includes("Integrated") ? "text-forest-600" : "text-amber-600"
                  }`}>
                    {d.status}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IP note ── */}
      <section className="bg-white section">
        <div className="max-w-3xl mx-auto bg-forest-50 border border-forest-100 rounded-2xl p-8 flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-11 h-11 rounded-xl bg-forest-600 flex items-center justify-center flex-shrink-0">
            <FileCode2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 mb-2">Kabon's own processing layer</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sentinel-2 imagery is open Copernicus data — anyone can request it. The processing
              layer above it (adaptive bounding-box and resolution logic, the NDVI evalscript,
              cloud/shadow masking, time-series aggregation, and the IoT emissions-factor
              pipeline) is built and maintained in-house, and is Kabon.Africa's own intellectual
              property.
            </p>
          </div>
        </div>
      </section>

      {/* ── Honest gap ── */}
      <section className="bg-gray-50 section">
        <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-7">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-widest mb-3">
            <Database className="w-3.5 h-3.5" /> Where we are today
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">
            Satellite NDVI and IoT readings inform the reviewer's assessment; the reviewer
            currently records the final carbon figure by hand against that evidence, rather than
            the pipeline deriving it automatically. Fusing satellite and IoT evidence into an
            automated carbon estimate is on our near-term roadmap — we'd rather tell you where
            the line sits today than round up.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1516571748831-5d81767b788d?w=1920&q=80&auto=format&fit=crop"
          alt="Satellite imagery of terrain"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900/95 to-forest-700/90" />
        <div className="relative max-w-2xl mx-auto text-center">
          <CheckCircle2 className="w-8 h-8 text-forest-300 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            See it applied to a real methodology.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Link href="/standard" className="inline-flex items-center justify-center gap-2 bg-white text-forest-800 font-bold px-8 py-3 rounded-xl hover:bg-forest-50 transition-all duration-150 shadow-lg">
              The Kabon Carbon Standard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/map" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-all duration-150">
              Explore the project map
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
