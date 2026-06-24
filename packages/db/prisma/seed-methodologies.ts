/**
 * Seed the Kabon Carbon Standard methodology library.
 *
 * These are the methodologies projects can be assessed against on path A
 * (our own boutique African registry). Buffer percentages and monitoring
 * cadences are calibrated for the risk profile of each project type:
 *   - Land restoration projects carry permanence risk (fire, conversion) so
 *     reserve 15–20%.
 *   - Cleaner-cookstove and biogas projects have lower permanence risk but
 *     higher MRV uncertainty, so reserve 10%.
 *
 * Run with:
 *   DATABASE_URL=... npx tsx packages/db/prisma/seed-methodologies.ts
 */
import { prisma } from "../src";

interface Seed {
  code: string;
  name: string;
  category: "Land Restoration" | "Clean Energy" | "Circular Economy";
  scope?: string;
  summary: string;
  bufferPercent: number;
  monitoringPeriodMonths: number;
}

const METHODOLOGIES: Seed[] = [
  {
    code: "KCS-AR-01",
    name: "Afforestation & Reforestation of Degraded Land",
    category: "Land Restoration",
    scope: "Forest / Mixed-species planting",
    summary:
      "Planting indigenous tree species on previously cleared or degraded land. Carbon impact derived from " +
      "biomass accumulation over the crediting period, measured via permanent sample plots and Sentinel-2 NDVI " +
      "tracking. Suitable for community-managed forests in East and Southern Africa.",
    bufferPercent: 20,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-IFM-01",
    name: "Improved Forest Management — Conservation Concessions",
    category: "Land Restoration",
    scope: "Forest / Avoided degradation",
    summary:
      "Protecting standing forest from charcoal harvesting and conversion through community concession " +
      "agreements. Baseline is the historical deforestation rate; project emissions are the residual rate " +
      "with active patrols and alternative livelihoods.",
    bufferPercent: 18,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-MNG-01",
    name: "Mangrove Restoration & Conservation",
    category: "Land Restoration",
    scope: "Coastal / Blue carbon",
    summary:
      "Restoration of degraded mangrove ecosystems along the East African coast. Above- and below-ground " +
      "carbon stocks measured per IPCC Wetlands Supplement. High permanence value due to sediment-locked carbon, " +
      "tempered by sea-level rise risk.",
    bufferPercent: 15,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-GR-01",
    name: "Holistic Rangeland & Grassland Management",
    category: "Land Restoration",
    scope: "Savanna / Soil carbon",
    summary:
      "Planned grazing rotations and bush-encroachment reversal on pastoralist rangelands. Soil organic carbon " +
      "gains verified via stratified sampling plus remote sensing of vegetation cover. Aligned with Verra " +
      "VM0042 principles but adapted to East African pastoralist contexts.",
    bufferPercent: 15,
    monitoringPeriodMonths: 24,
  },
  {
    code: "KCS-CS-01",
    name: "Efficient Cookstoves — Fuel Wood Displacement",
    category: "Clean Energy",
    scope: "Household energy",
    summary:
      "Distribution and monitored use of improved cookstoves displacing non-renewable biomass. Impact " +
      "calculated from baseline fuel consumption surveys and per-stove kitchen-performance testing. IoT " +
      "fuel sensors on a sample of stoves verify usage rates.",
    bufferPercent: 10,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-BG-01",
    name: "Smallholder Biogas Digesters",
    category: "Clean Energy",
    scope: "Household energy / Methane capture",
    summary:
      "Anaerobic digesters on smallholder farms replacing firewood and capturing manure methane. Carbon " +
      "impact = avoided wood fuel + avoided methane. Continuous monitoring via flow meters reporting " +
      "kWh-equivalent gas output to the platform.",
    bufferPercent: 10,
    monitoringPeriodMonths: 6,
  },
  {
    code: "KCS-SOLAR-01",
    name: "Off-Grid Solar PV — Grid Displacement",
    category: "Clean Energy",
    scope: "Distributed generation",
    summary:
      "Stand-alone solar systems serving households or community facilities without prior grid access, or " +
      "displacing diesel generators. Carbon impact derived from monitored kWh output via the platform IoT " +
      "energy meter and the country grid emission factor (or diesel benchmark).",
    bufferPercent: 8,
    monitoringPeriodMonths: 6,
  },

  // ── Circular Economy methodologies ────────────────────────────────────────
  {
    code: "KCS-REC-01",
    name: "Plastic & Material Waste Recycling",
    category: "Circular Economy",
    scope: "Waste diversion / Material recovery",
    summary:
      "Collection and mechanical recycling of plastic, textile, or mixed solid waste that would otherwise " +
      "be landfilled or incinerated. Carbon impact calculated via lifecycle assessment: emissions avoided = " +
      "virgin-material production emissions minus recycling-process emissions. Aligned with Verra PWRM0001/0002 " +
      "principles. Typical avoided emissions: 1.5–3 t CO₂e per tonne of plastic recycled, 0.5–1.5 t CO₂e " +
      "per tonne of textiles diverted. Verification via waste manifests, gate weights, and material certificates.",
    bufferPercent: 10,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-EWASTE-01",
    name: "E-Waste Recovery & Recycling",
    category: "Circular Economy",
    scope: "Electronic waste / Material recovery",
    summary:
      "Formal collection, refurbishment, and materials recovery from end-of-life electronic equipment " +
      "(computers, phones, appliances). Carbon impact covers: avoided primary metal smelting emissions, " +
      "avoided informal burning, and energy saved through refurbishment vs. new manufacture. Aligned with " +
      "Verra AMS-III.BA. Typical range: 0.5–2 t CO₂e per tonne of e-waste processed. Verification via " +
      "collection logs, refurbishment certificates, and downstream recycler audit trails.",
    bufferPercent: 10,
    monitoringPeriodMonths: 12,
  },
  {
    code: "KCS-IEE-01",
    name: "Industrial Energy Efficiency & Waste Heat Recovery",
    category: "Circular Economy",
    scope: "Manufacturing / Industrial process",
    summary:
      "Reduction of industrial greenhouse gas emissions through energy efficiency upgrades, fuel switching " +
      "(fossil to cleaner alternatives), or waste heat recovery at manufacturing plants (cement, steel, " +
      "food processing). Carbon impact = baseline energy consumption × grid/fuel factor minus post-project " +
      "consumption. Aligned with Verra AMS-III.Q for waste heat and UNFCCC AMS-II.E for energy efficiency. " +
      "Typical range: 0.3–1.5 t CO₂e saved per MWh of efficiency gain. Continuous monitoring via IoT " +
      "energy meters; annual third-party verification required.",
    bufferPercent: 8,
    monitoringPeriodMonths: 12,
  },
];

async function main() {
  console.log(`Seeding ${METHODOLOGIES.length} methodologies…`);
  for (const m of METHODOLOGIES) {
    await prisma.methodology.upsert({
      where:  { code: m.code },
      create: m,
      update: m,
    });
    console.log(`  ✓ ${m.code} — ${m.name}`);
  }

  // Ensure the singleton buffer pool exists.
  const pool = await prisma.bufferPool.findFirst();
  if (!pool) {
    await prisma.bufferPool.create({ data: {} });
    console.log("  ✓ Created buffer pool singleton");
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
