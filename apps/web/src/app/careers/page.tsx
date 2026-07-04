import type { Metadata } from "next";
import {
  Leaf, ArrowRight, MapPin, Clock, Briefcase, Globe, Users, Heart,
  TrendingUp, Sparkles, Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Help build the carbon market Africa actually needs. Explore open roles at Kabon.Africa.",
  alternates: { canonical: "/careers" },
};

interface Role {
  slug: string;
  title: string;
  team: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  description: string;
  requirements: string[];
  niceToHave?: string[];
}

// Open roles. Maintained as data here for now — when hiring at scale, move
// this to the database with an admin UI similar to /admin/blog.
const ROLES: Role[] = [
  {
    slug: "senior-fullstack-engineer",
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Nairobi · Hybrid",
    type: "Full-time",
    description:
      "Help us scale the platform that powers African carbon credits. You'll work across the Next.js web app, Node microservices, and the Polygon smart-contract layer.",
    requirements: [
      "5+ years building production web apps (Next.js / Node ideal)",
      "Comfortable with Postgres + Prisma",
      "Track record of shipping features end-to-end",
      "Excellent written communication, since most of our team is distributed",
    ],
    niceToHave: [
      "Experience with Solidity / ethers.js",
      "Prior fintech or marketplace experience",
      "Familiarity with BullMQ / Redis-backed queues",
    ],
  },
  {
    slug: "carbon-project-lead",
    title: "Carbon Project Lead, East Africa",
    team: "Operations",
    location: "Nairobi or Kampala",
    type: "Full-time",
    description:
      "Run the on-ground operations for our growing portfolio of restoration and clean-energy projects. You'll partner with local mobilizers, verify field claims, and own the relationship with our biggest project owners.",
    requirements: [
      "3+ years in carbon project development, agroforestry, or community conservation",
      "Strong field experience in East Africa",
      "Comfortable reading remote-sensing and biomass-inventory data",
      "Excellent Swahili + English; additional regional languages a plus",
    ],
    niceToHave: [
      "Familiarity with international carbon accounting methodologies and MRV frameworks",
      "Drone / GIS field experience",
    ],
  },
  {
    slug: "community-partnerships-manager",
    title: "Community Partnerships Manager",
    team: "Growth",
    location: "Remote (East / Southern Africa)",
    type: "Full-time",
    description:
      "Grow our Community Partner network: the NGOs, cooperatives and extension officers who bring landowners to Kabon.Africa. You'll own partner onboarding, training, and retention.",
    requirements: [
      "4+ years in NGO partnerships, agribusiness extension, or rural marketing",
      "Existing relationships with East-African conservation orgs / cooperatives",
      "Comfortable presenting financial models to non-financial audiences",
    ],
  },
];

const VALUES = [
  {
    icon: Globe,
    title: "Africa-first",
    body: "Our platform serves African landowners, African communities, African economies. Decisions get filtered through that lens.",
  },
  {
    icon: Heart,
    title: "Trust over speed",
    body: "Carbon is a trust market. We'd rather ship slower and be right than ship fast and need to retract.",
  },
  {
    icon: TrendingUp,
    title: "Builders, not theorists",
    body: "Whether engineering, ops, or growth, we hire people who ship and follow through. Bias for action.",
  },
  {
    icon: Sparkles,
    title: "Optimism with rigour",
    body: "We're genuinely excited about what carbon markets can do for Africa, and refuse to pretend the problems away.",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-forest-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, rgb(22 101 52) 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-4 py-16 relative">
          <div className="flex items-center gap-2 text-forest-300 text-xs font-bold uppercase tracking-widest mb-3">
            <Briefcase className="w-3.5 h-3.5" /> Careers at Kabon.Africa
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
            Build the carbon market<br />Africa actually needs.
          </h1>
          <p className="text-forest-200 text-lg max-w-2xl leading-relaxed">
            We're a small team building infrastructure for the next generation of African climate finance: the
            registry, the marketplace, the field operations. Join us.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">

        {/* Values */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-forest-600" />
            How we work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                <v.icon className="w-5 h-5 text-forest-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-1.5">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open roles */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-forest-600" />
              Open roles
            </h2>
            <span className="text-sm text-gray-400">{ROLES.length} positions</span>
          </div>

          <div className="space-y-3">
            {ROLES.map(role => (
              <RoleCard key={role.slug} role={role} />
            ))}
          </div>
        </section>

        {/* General application */}
        <section className="bg-gradient-to-br from-forest-700 to-forest-900 text-white rounded-3xl p-8 text-center">
          <Leaf className="w-8 h-8 mx-auto mb-3 text-forest-300" />
          <h2 className="text-2xl font-black mb-2">Don't see your role?</h2>
          <p className="text-forest-200 text-sm mb-6 max-w-md mx-auto">
            If you'd build well at Kabon, we want to hear from you regardless of what's listed.
            Tell us what you'd own and why.
          </p>
          <a
            href="mailto:kabon@kabon.africa?subject=General%20application"
            className="inline-flex items-center gap-2 bg-white text-forest-900 font-bold px-6 py-2.5 rounded-xl hover:bg-forest-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            kabon@kabon.africa
          </a>
        </section>

        {/* Footer note */}
        <section className="text-center text-xs text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Kabon.Africa is an equal-opportunity employer. We hire and pay based on demonstrated impact, not credentials.
          We particularly welcome applications from African candidates, women in tech and climate, and people with
          non-traditional backgrounds.
        </section>
      </div>
    </div>
  );
}

function RoleCard({ role }: { role: Role }) {
  const applyHref =
    `mailto:kabon@kabon.africa?subject=${encodeURIComponent(`Application: ${role.title}`)}`;

  return (
    <article id={role.slug} className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-gray-900 text-lg">{role.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{role.team}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{role.location}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{role.type}</span>
          </div>
        </div>
        <a
          href={applyHref}
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Apply <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-4">{role.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">You should bring</div>
          <ul className="space-y-1.5 text-gray-700">
            {role.requirements.map(r => (
              <li key={r} className="flex items-start gap-2 leading-relaxed">
                <span className="w-1 h-1 rounded-full bg-forest-600 flex-shrink-0 mt-2" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        {role.niceToHave && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Nice to have</div>
            <ul className="space-y-1.5 text-gray-700">
              {role.niceToHave.map(r => (
                <li key={r} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
