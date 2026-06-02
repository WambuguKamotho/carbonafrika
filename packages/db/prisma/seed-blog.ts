/**
 * Seed the Kabon.Africa blog with starter articles. Idempotent (upsert by slug).
 * Run with: DATABASE_URL=... npx tsx packages/db/prisma/seed-blog.ts
 */
import { prisma } from "../src";

interface Seed {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl?: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  publishedAt: Date;
}

const POSTS: Seed[] = [
  {
    slug: "why-africa-needs-its-own-carbon-registry",
    title: "Why Africa needs its own carbon registry",
    excerpt:
      "The big international registries take 18–36 months to approve an African project. Smallholders can't wait that long. Here's why we built a faster alternative.",
    body: `
The voluntary carbon market is dominated by Verra and Gold Standard, two non-profits headquartered in Washington DC and Geneva respectively. Together they issue most of the world's carbon credits.

For African projects, the wait to register on those registries is brutal. Documentation, validation, and verification cycles can stretch 18 to 36 months. Smallholder farmers and community cooperatives — the people doing the actual restoration work — simply can't keep their projects financially viable for that long without the credit revenue.

**Kabon.Africa is the opposite end of the spectrum.**

We're a boutique African registry built specifically for projects too small, too local, or too time-pressed for the global standards. Our methodologies are published, our buffer pool is on-chain transparent, and our retirement certificates are designed to be read by both buyers and the communities supplying the offsets.

We are explicit that **Kabon credits are not Verra credits.** They are issued under our own published Kabon Carbon Standard. Buyers who need accredited verification for institutional disclosure should still go through Verra or Gold Standard. But for impact-focused buyers who care more about the story behind every tonne than about CDP reporting box-ticking, we offer something nobody else does: a registry that puts African landowners first.

This is the first post in a series about how that works.
    `.trim(),
    coverUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop",
    tags: ["philosophy", "market"],
    authorName: "Wambugu Kamotho",
    authorRole: "Founder",
    publishedAt: new Date("2025-11-15T08:00:00Z"),
  },
  {
    slug: "how-the-kabon-buffer-pool-works",
    title: "How the Kabon Buffer Pool protects buyers",
    excerpt:
      "Forests burn. Projects fail. Buyers want assurance their offsets aren't paper. Here's how we use a 15–20% reserve to keep every retirement honest.",
    body: `
Permanence is the hardest problem in nature-based carbon. A reforestation project that gets converted to farmland 10 years later doesn't deliver the sequestration it promised. A buyer who retired credits from that project would, technically, no longer be offsetting anything.

The standard industry response is a **buffer pool** — a portion of every credit issuance held in reserve. When a reversal event occurs, credits are pulled from the pool and retired to backfill the loss, keeping buyer offsets whole.

Kabon's buffer reserve is set per methodology:

- **20%** for afforestation/reforestation projects (highest reversal risk)
- **18%** for improved forest management
- **15%** for mangrove restoration and rangeland
- **10%** for cookstoves and biogas
- **8%** for off-grid solar

Every time credits are issued under one of our methodologies, the buffer percentage is automatically diverted to the platform-wide Kabon Buffer Pool — a single, transparent accounting line you can see live at [kabon.africa/standard](/standard).

We don't pretend this is the same as institutional-grade insurance. The pool is platform-administered, not a third-party product. But it's real, it's measurable, and it's the most honest answer to "what happens if something goes wrong" that any African boutique registry has offered.
    `.trim(),
    coverUrl: "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1600&q=80&auto=format&fit=crop",
    tags: ["standard", "permanence", "buffer"],
    authorName: "Wambugu Kamotho",
    authorRole: "Founder",
    publishedAt: new Date("2025-12-05T08:00:00Z"),
  },
  {
    slug: "community-partners-the-backbone-of-african-carbon",
    title: "Community partners: the backbone of African carbon",
    excerpt:
      "No tech platform reaches a Bungoma smallholder without a trusted local face. Meet the people who actually bring projects to Kabon.",
    body: `
Walk into any successful African agroforestry project and you will find, at the centre of it, someone whose name everyone in the community knows. The extension officer who's worked the area for 12 years. The cooperative chair. The NGO field worker.

These are our **Community Partners** — the trusted local organizers who do the hard, unglamorous work of identifying landowners, explaining the programme in local language, helping with GPS mapping, and vouching for project legitimacy.

We compensate them in three layers:

1. **Onboarding payout** when a project they bring is admin-approved.
2. **Verification milestone** when carbon assessment is complete.
3. **Lifetime royalty** on every credit sold from their projects.

All paid in USDC on Polygon — instant, stable, auditable. We're explicit that the royalty comes out of the seller's share, not on top of it. That's by design: it aligns the partner with the long-term success of the projects they brought rather than just the volume of paperwork.

If you're an NGO worker, cooperative leader, extension officer, or just someone trusted in your community, we'd love to hear from you. [Apply here.](/partner-application)
    `.trim(),
    coverUrl: "https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=1600&q=80&auto=format&fit=crop",
    tags: ["partners", "community"],
    authorName: "Wambugu Kamotho",
    authorRole: "Founder",
    publishedAt: new Date("2026-01-10T08:00:00Z"),
  },
  {
    slug: "what-we-mean-by-verification",
    title: "What 'verified' actually means at Kabon",
    excerpt:
      "Verification at Verra means an ISO 14065-accredited body audits your project. Ours doesn't — yet. Here's exactly what our review process is, what it isn't, and where we're heading.",
    body: `
"Verified" is a loaded word in carbon markets. When Verra says a project is verified, they mean an ISO 14065-accredited Validation and Verification Body has audited it against a registered methodology. That's a high bar.

When **Kabon** says a project is verified, we mean:

- A Kabon admin reviewed the project documentation for legitimacy and methodology fit.
- A Kabon-assigned reviewer assessed the carbon impact against the applicable Kabon Carbon Standard methodology.
- The carbon estimate was attested in a verification record stored on IPFS.
- A portion of the resulting credits was reserved in the Kabon Buffer Pool.

This is meaningful work, done by people who understand African landscapes. It is not, however, third-party accredited verification. If you're a Fortune 500 company filing under CDP, your auditors will need credits with accredited VVB sign-off — and that means Verra or Gold Standard.

We are completely upfront about this on every retirement certificate and on our [Standard page](/standard). What we're building is a **boutique registry** for the next 5 years — fast, local, transparent, intentionally smaller in scope than the global standards.

Where are we heading? Towards working with accredited VVBs on a per-project basis (Aster Global, Earthood, EPIC all have African footprints), and eventually bridging credits to Verra for projects that want the dual-registry stamp. That's a 2–3 year journey. We're not pretending we're there yet.
    `.trim(),
    coverUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=80&auto=format&fit=crop",
    tags: ["standard", "verification"],
    authorName: "Wambugu Kamotho",
    authorRole: "Founder",
    publishedAt: new Date("2026-02-20T08:00:00Z"),
  },
  {
    slug: "mangroves-on-the-east-african-coast",
    title: "Mangroves on the East African coast",
    excerpt:
      "Coastal blue carbon is some of the densest, most permanent carbon storage on Earth. We're starting to register Kenyan and Tanzanian mangrove projects under KCS-MNG-01.",
    body: `
A hectare of healthy mangrove forest can store 3–5 times more carbon than the same hectare of upland tropical forest. The reason is the sediment: organic matter trapped in waterlogged soils breaks down extremely slowly, so the carbon stays locked away for decades or centuries.

East Africa has one of the world's most threatened mangrove belts. Land conversion, charcoal harvesting, and aquaculture have driven decades of decline along the Kenyan and Tanzanian coasts.

Restoration projects in the region — particularly community-led replanting in places like Gazi Bay (Mikoko Pamoja), Vanga, and parts of the Rufiji Delta — have shown that with the right governance, mangroves come back fast. Five-to-ten-year regrowth periods are realistic for many species.

Our **KCS-MNG-01** methodology is calibrated for this work:

- Above- and below-ground carbon measurement per the IPCC Wetlands Supplement
- Stratified plot inventories every 12 months
- Cover-change tracking via Sentinel-2 imagery
- 15% buffer reserved for sea-level rise risk

If you run or know of a mangrove restoration project that could use technical and financial backing, [come talk to us](/partner-application).
    `.trim(),
    coverUrl: "https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=1600&q=80&auto=format&fit=crop",
    tags: ["projects", "mangroves", "blue-carbon"],
    authorName: "Field Operations",
    authorRole: "Kabon East Africa",
    publishedAt: new Date("2026-04-08T08:00:00Z"),
  },
];

async function main() {
  console.log(`Seeding ${POSTS.length} blog posts…`);
  for (const p of POSTS) {
    await prisma.blogPost.upsert({
      where:  { slug: p.slug },
      create: { ...p, status: "PUBLISHED" },
      update: { ...p, status: "PUBLISHED" },
    });
    console.log(`  ✓ ${p.slug}`);
  }
  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
