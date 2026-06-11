import Link from "next/link";
import { ArrowRight, MapPin, Cpu, Package, Film, Leaf, ExternalLink } from "lucide-react";

const chapters = [
  {
    icon: Film,
    accent: "blue",
    period: "2010 – 2024",
    title: "Documenting Africa's frontlines",
    location: "20+ countries · BBC · CNN · Firelight · Shujaaz",
    photo: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=900&q=80&auto=format&fit=crop",
    photoAlt: "Documentary filmmaker at work",
    paras: [
      "Fourteen years behind a camera across the continent: BBC Global Questions in Nairobi, CNN Africa, TEDx, Firelight Foundation across Zambia and Malawi, and Emmy-winning Shujaaz Inc. Not covering politics or celebrity, but in rural communities, watching farmers replant degraded hillsides, filming women's cooperatives protecting wetlands, listening to village elders describe the rains that no longer came on schedule.",
      "The same story repeated from Senegal to Malawi: communities doing the hard, invisible work of ecological restoration, and receiving nothing for it. International NGOs flew in, captured the story, and flew out. The land stayed restored. The families stayed poor.",
    ],
  },
  {
    icon: Package,
    accent: "amber",
    period: "2014 – 2023",
    title: "Moving commodities across the continent",
    location: "DRC · Tanzania · Kenya · Sierra Leone",
    photo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80&auto=format&fit=crop",
    photoAlt: "Trucks on an African road",
    paras: [
      "Running Wafalme Logistics and later joining Fork Freight took Wambugu into a different kind of Africa: the extraction economy. Copper cathode loaded in Kolwezi, DRC, trucked 3,000 km to Dar es Salaam, shipped to China. Eleven trucks, border crossings, fuel, bribes, delays. A separate mandate representing Lugymar in Sierra Leone, verifying the existence of gold.",
      "What struck him wasn't the logistics. It was the asymmetry. Raw resources left the continent at commodity prices. Value-added products came back at retail prices. The same logic applied to carbon: African land was sequestering carbon that European corporations would claim credit for through intermediary brokers who never set foot on the actual soil. The communities holding title to that land saw none of it.",
    ],
  },
  {
    icon: Cpu,
    accent: "purple",
    period: "2024 – Present",
    title: "Building with IoT at Bandika",
    location: "East Africa · bandikaiot.com",
    photo: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80&auto=format&fit=crop",
    photoAlt: "IoT sensor circuit board",
    paras: [
      "As Director at Bandika IoT, Wambugu worked on real-time sensor networks for fleet and asset tracking across East Africa. The technology insight was simple but profound: cheap, connected sensors produce tamper-proof, timestamped data streams from anywhere on the continent, including remote conservation sites with no road access.",
      "That meant the verification problem in carbon markets (how do you prove a forest in rural Tanzania is actually growing?) was technically solved. NDVI satellite imagery, soil moisture sensors, gas flow meters on biogas digesters: all of it could be logged automatically, stored immutably, and audited without a single expensive consultant flying in from Geneva.",
    ],
  },
];

const timeline = [
  { year: "2010", event: "Starts career in film, first NGO documentary work across East Africa" },
  { year: "2012", event: "Vision Mixer & Script Supervisor on Mali Project, Kenya's first soap opera (NTV, ~320 episodes)" },
  { year: "2014", event: "Founds Wafalme Logistics, begins cross-continental commodity trading" },
  { year: "2015", event: "Joins Shujaaz Inc (Emmy Award winners) as Visual Content Producer" },
  { year: "2017", event: "Wafalme shortlisted by USAID for Post-Harvest Loss solutions in Tanzania" },
  { year: "2022", event: "Joins Fork Freight, expanding freight logistics into African markets" },
  { year: "2023", event: "Leads Bandika IoT as Director, building real-time sensor networks across East Africa" },
  { year: "2024", event: "Films Firelight Foundation across Zambia & Malawi, where the insight crystallises" },
  { year: "2025", event: "Founds Kabon.Africa: IoT proof, blockchain settlement, and direct community income" },
];

const differentiators = [
  {
    title: "IoT-verified data",
    desc: "Soil sensors, gas flow meters, satellite NDVI: continuous, tamper-proof readings from the project site. No self-reporting. No consultants with clipboards.",
    photo: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80&auto=format&fit=crop",
    alt: "Smart agriculture sensor in field",
  },
  {
    title: "On-chain settlement",
    desc: "Carbon credits minted as blockchain tokens on Polygon. Every sale settles in USDC directly to the land owner's wallet. No escrow. No 90-day wire transfers.",
    photo: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80&auto=format&fit=crop",
    alt: "Blockchain network visualization",
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
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-forest-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1920&q=80&auto=format&fit=crop"
          alt="African plains aerial view"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-950/50 to-forest-950/90" />

        <div className="relative max-w-4xl mx-auto text-center px-4 py-24">
          <div className="inline-flex items-center gap-2 bg-forest-500/10 border border-forest-500/20 text-forest-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <Leaf className="w-3.5 h-3.5" />
            The story behind Kabon.Africa
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Built by someone who's<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-300 to-savanna-300">
              seen both sides of the problem.
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Kabon.Africa sits at the intersection of three careers: documentary filmmaking for international NGOs, cross-continental commodity logistics, and IoT infrastructure at Bandika. The platform is what happens when one person finally connects those dots.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Founder section ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Photo side */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=900&q=80&auto=format&fit=crop"
                alt="African community gathering"
                className="w-full h-80 lg:h-96 object-cover rounded-3xl shadow-2xl shadow-gray-200"
              />
              {/* Overlay card */}
              <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-forest-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-black text-white">WK</span>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Wambugu Kamotho</p>
                  <p className="text-xs text-forest-600 font-semibold">Founder · Nairobi, Kenya</p>
                </div>
              </div>
            </div>

            {/* Bio side */}
            <div>
              <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Founder</span>
              <h2 className="text-3xl font-black text-gray-900 mt-2 mb-4">
                15 years across Africa.<br />One platform to show for it.
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Director at{" "}
                <a href="https://www.bandikaiot.com" target="_blank" rel="noopener noreferrer"
                  className="text-forest-700 font-semibold hover:underline inline-flex items-center gap-1">
                  Bandika IoT <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Documentary Filmmaker", "Commodity Logistics", "IoT Director @ Bandika"].map(tag => (
                  <span key={tag} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three chapters ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Origin</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">Three careers. One insight.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              The idea didn't come from a boardroom. It came from 15 years of moving between worlds that rarely talk to each other.
            </p>
          </div>

          <div className="space-y-10">
            {chapters.map((ch, i) => {
              const Icon = ch.icon;
              const accentClasses: Record<string, string> = {
                blue:   "bg-blue-500/10 border-blue-400/30 text-blue-500",
                amber:  "bg-amber-500/10 border-amber-400/30 text-amber-500",
                purple: "bg-purple-500/10 border-purple-400/30 text-purple-500",
              };
              const badgeClasses: Record<string, string> = {
                blue:   "bg-blue-50 text-blue-700",
                amber:  "bg-amber-50 text-amber-700",
                purple: "bg-purple-50 text-purple-700",
              };
              return (
                <div key={ch.title} className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden">
                  {/* Image header */}
                  <div className="relative h-56 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ch.photo}
                      alt={ch.photoAlt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {/* Chapter badge bottom-left */}
                    <div className="absolute bottom-4 left-5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${accentClasses[ch.accent]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-white/60 font-medium uppercase tracking-widest">Chapter {i + 1} · {ch.period}</p>
                        <p className="text-white font-bold text-lg leading-tight">{ch.title}</p>
                      </div>
                    </div>
                    {/* Location tag top-right */}
                    <span className={`absolute top-4 right-4 text-xs px-3 py-1 rounded-full font-semibold ${badgeClasses[ch.accent]}`}>
                      {ch.location}
                    </span>
                  </div>

                  {/* Text body */}
                  <div className="p-8">
                    {ch.paras.map((para, j) => (
                      <p key={j} className="text-gray-600 leading-relaxed mb-4 last:mb-0">{para}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── The insight quote ── */}
      <section className="relative py-28 px-4 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop"
          alt="Sunlit woodland, Zambia miombo forest"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-forest-950/85" />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold text-forest-400 uppercase tracking-widest mb-6 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            A question that wouldn&rsquo;t go away
          </span>
          <blockquote className="text-2xl md:text-3xl font-bold text-white leading-snug mb-8">
            &ldquo;Through years of travelling the continent (filming for NGOs, moving commodities, deploying sensors), I kept seeing the same thing: indigenous forests disappearing, communities destroying what was left because they had no resources, no income, and no alternative. The global climate conversation was happening, billions were being pledged, but it wasn&rsquo;t reaching the people whose land and labour made it possible. I couldn&rsquo;t stop asking why.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-600 flex items-center justify-center text-white text-xs font-black">WK</div>
            <p className="text-forest-300 font-semibold">Wambugu Kamotho · Founder, Kabon.Africa</p>
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">Journey</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2">15 years to one platform</h2>
          </div>

          {/* Photo strip */}
          <div className="grid grid-cols-3 gap-3 mb-14 rounded-2xl overflow-hidden h-40">
            {[
              { src: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&q=80&auto=format&fit=crop", alt: "African village" },
              { src: "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=600&q=80&auto=format&fit=crop", alt: "Shipping containers" },
              { src: "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=600&q=80&auto=format&fit=crop", alt: "African forest" },
            ].map(p => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.alt} src={p.src} alt={p.alt} className="w-full h-full object-cover rounded-2xl" />
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-7">
              {timeline.map((item, i) => (
                <div key={item.year} className="flex items-start gap-6 pl-12 relative">
                  <div className={`absolute left-0 w-8 h-8 rounded-full border-4 border-white shadow flex items-center justify-center flex-shrink-0 ${i === timeline.length - 1 ? 'bg-forest-600' : 'bg-gray-300'}`} />
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${i === timeline.length - 1 ? 'text-forest-600' : 'text-gray-400'}`}>{item.year}</span>
                    <p className={`text-sm mt-0.5 leading-relaxed ${i === timeline.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-forest-600 uppercase tracking-widest">The platform</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-3">What Kabon.Africa does differently</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Designed from the ground up for the African carbon market, not adapted from frameworks built for European forestry projects.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {differentiators.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
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
