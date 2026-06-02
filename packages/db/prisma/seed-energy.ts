import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

async function main() {
  console.log('⚡  Seeding CLEAN_ENERGY projects…');

  const verifier = await prisma.user.findUnique({ where: { email: 'verifier@carbonafrika.com' } });
  if (!verifier) throw new Error('Run the main seed (seed.ts) first.');

  // ── Energy project owners ─────────────────────────────────────────────────
  const [ownerKe2, ownerNg, ownerEt2, ownerZm, ownerGh2, ownerMw, ownerTz2, ownerBf] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'david.njoroge@example.com' },
      update: {},
      create: {
        email: 'david.njoroge@example.com', passwordHash: PASSWORD_HASH,
        name: 'David Njoroge', role: 'LANDOWNER', country: 'Kenya', kycVerified: true,
        bio: 'Solar cooperative founder supplying clean energy to off-grid schools in Turkana County.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'chidi.okafor@example.com' },
      update: {},
      create: {
        email: 'chidi.okafor@example.com', passwordHash: PASSWORD_HASH,
        name: 'Chidi Okafor', role: 'LANDOWNER', country: 'Nigeria', kycVerified: true,
        bio: 'Biogas engineer scaling domestic biodigesters across rural Anambra State.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'mekdes.alemu@example.com' },
      update: {},
      create: {
        email: 'mekdes.alemu@example.com', passwordHash: PASSWORD_HASH,
        name: 'Mekdes Alemu', role: 'LANDOWNER', country: 'Ethiopia', kycVerified: true,
        bio: 'Rural energy access advocate deploying improved cookstoves in Oromia.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'grace.mutale@example.com' },
      update: {},
      create: {
        email: 'grace.mutale@example.com', passwordHash: PASSWORD_HASH,
        name: 'Grace Mutale', role: 'LANDOWNER', country: 'Zambia', kycVerified: true,
        bio: 'Run-of-river hydro developer powering mining communities in the Copperbelt.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'abena.mensah@example.com' },
      update: {},
      create: {
        email: 'abena.mensah@example.com', passwordHash: PASSWORD_HASH,
        name: 'Abena Mensah', role: 'LANDOWNER', country: 'Ghana', kycVerified: true,
        bio: 'Biocharcoal enterprise converting agricultural waste into clean cooking fuel in Brong-Ahafo.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'felix.banda@example.com' },
      update: {},
      create: {
        email: 'felix.banda@example.com', passwordHash: PASSWORD_HASH,
        name: 'Felix Banda', role: 'LANDOWNER', country: 'Malawi', kycVerified: true,
        bio: 'Improved cookstove distributor reaching 12,000 households in the Shire Valley.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'neema.wangari@example.com' },
      update: {},
      create: {
        email: 'neema.wangari@example.com', passwordHash: PASSWORD_HASH,
        name: 'Neema Wangari', role: 'LANDOWNER', country: 'Tanzania', kycVerified: true,
        bio: 'Wind energy developer on the Makambako Escarpment in the Southern Highlands.',
      },
    }),
    prisma.user.upsert({
      where: { email: 'seydou.traore@example.com' },
      update: {},
      create: {
        email: 'seydou.traore@example.com', passwordHash: PASSWORD_HASH,
        name: 'Seydou Traoré', role: 'LANDOWNER', country: 'Burkina Faso', kycVerified: true,
        bio: 'Solar mini-grid operator bringing electricity to 5 Sahel villages for the first time.',
      },
    }),
  ]);

  console.log('  ✓ Owners created');

  // ── Projects ─────────────────────────────────────────────────────────────
  const [pSolar1, pBiogas1, pBiogas2, pCooks1, pCooks2, pHydro, pBiochar, pWind, pSolar2] = await Promise.all([

    // SOLAR_PV — Kenya
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E001' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'SOLAR_PV', landType: null },
      create: {
        ownerId: ownerKe2.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'SOLAR_PV',
        title: 'Turkana Off-Grid Solar Cooperative',
        description: 'A 450 kW community-owned solar mini-grid serving 3,200 households and 18 schools in Turkana County — one of Kenya\'s most energy-poor regions. The cooperative structure means 100% of revenues stay local. Each household displaced an average of 94 litres of kerosene per year, eliminating indoor air pollution and saving families 22% of their monthly income.',
        country: 'Kenya', region: 'Turkana County',
        lat: 3.1167, lng: 35.5833,
        hectares: 12, estimatedTons: 3600,
        capacityKw: 450, householdsServed: 3200,
        status: 'ACTIVE', onChainId: 'CHAIN-E001',
      },
    }),

    // BIOGAS — Nigeria
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E002' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'BIOGAS', landType: null },
      create: {
        ownerId: ownerNg.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'BIOGAS',
        title: 'Anambra Household Biodigester Programme',
        description: 'Installation and monitoring of 4,800 fixed-dome biodigesters across rural households in Anambra State, converting livestock waste and kitchen scraps into clean cooking gas and bio-slurry fertiliser. Each 6m³ digester replaces 2.1 tonnes of firewood per year. The programme trains local masons to build and maintain digesters, creating 240 permanent jobs.',
        country: 'Nigeria', region: 'Anambra State',
        lat: 6.2209, lng: 7.0669,
        hectares: 0, estimatedTons: 28800,
        householdsServed: 4800,
        status: 'ACTIVE', onChainId: 'CHAIN-E002',
      },
    }),

    // BIOGAS — Ethiopia
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E003' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'BIOGAS', landType: null },
      create: {
        ownerId: ownerEt2.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'BIOGAS',
        title: 'Oromia Institutional Biogas Network',
        description: 'Large-scale biogas plants installed at 35 schools and health centres across Oromia Region, using student and institutional food waste as feedstock. Combined capacity of 2,800 m³/day eliminates the need for 680 tonnes of charcoal annually. Effluent slurry is distributed to 1,200 nearby smallholder farms as organic fertiliser, closing the nutrient loop.',
        country: 'Ethiopia', region: 'Oromia Region',
        lat: 8.0, lng: 38.5,
        hectares: 0, estimatedTons: 8500,
        capacityKw: 210,
        status: 'VERIFIED', onChainId: 'CHAIN-E003',
      },
    }),

    // COOKSTOVES — Ethiopia (Mekdes)
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E004' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'COOKSTOVES', landType: null },
      create: {
        ownerId: ownerEt2.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'COOKSTOVES',
        title: 'Oromia Improved Cookstove Rollout',
        description: 'Distribution and monitoring of 22,000 fuel-efficient rocket stoves across rural Oromia, reducing fuelwood consumption by 60% per household versus traditional three-stone fires. Each stove is tracked via a QR-coded ceramic liner photographed at quarterly field visits. The project is designed under the Gold Standard AMS-II.G methodology.',
        country: 'Ethiopia', region: 'Oromia Region',
        lat: 7.5, lng: 39.2,
        hectares: 0, estimatedTons: 44000,
        householdsServed: 22000, fuelDisplacedKgY: 3300000,
        status: 'ACTIVE', onChainId: 'CHAIN-E004',
      },
    }),

    // COOKSTOVES — Malawi
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E005' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'COOKSTOVES', landType: null },
      create: {
        ownerId: ownerMw.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'COOKSTOVES',
        title: 'Shire Valley Rocket Stove Initiative',
        description: 'Mass deployment of locally manufactured clay rocket stoves to 12,000 households in the Shire Valley. Malawi loses 2.8% of its forest cover annually to charcoal and fuelwood — this project targets the most charcoal-intensive cooking corridor in the country. Stoves are manufactured by women\'s groups in Blantyre, creating 180 local jobs.',
        country: 'Malawi', region: 'Shire Valley',
        lat: -16.0, lng: 35.0,
        hectares: 0, estimatedTons: 14400,
        householdsServed: 12000, fuelDisplacedKgY: 1440000,
        status: 'ACTIVE', onChainId: 'CHAIN-E005',
      },
    }),

    // MICRO_HYDRO — Zambia
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E006' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'MICRO_HYDRO', landType: null },
      create: {
        ownerId: ownerZm.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'MICRO_HYDRO',
        title: 'Copperbelt Run-of-River Hydro',
        description: 'Three run-of-river micro-hydro turbines (combined 680 kW) on the Kafue tributaries supplying clean power to 4,100 households, a health clinic, and a cold storage facility for local farmers. No dam or reservoir — water diverted from the river, passed through penstocks, and returned downstream. The cold storage facility reduces post-harvest losses by an estimated 35%.',
        country: 'Zambia', region: 'Copperbelt Province',
        lat: -13.0, lng: 27.8,
        hectares: 2, estimatedTons: 9600,
        capacityKw: 680, householdsServed: 4100,
        status: 'VERIFIED', onChainId: 'CHAIN-E006',
      },
    }),

    // BIOCHARCOAL — Ghana
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E007' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'BIOCHARCOAL', landType: null },
      create: {
        ownerId: ownerGh2.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'BIOCHARCOAL',
        title: 'Brong-Ahafo Agricultural Waste Biochar',
        description: 'Conversion of 18,000 tonnes/year of maize cobs, groundnut shells, and rice husks into biochar cooking fuel via continuous pyrolysis kilns. The biochar burns 40% cleaner than wood charcoal and produces char-ash that improves soil fertility when used as a cooking fuel by-product. Displaces an estimated 11,200 tonnes of traditional charcoal annually across urban Sunyani households.',
        country: 'Ghana', region: 'Bono Region',
        lat: 7.34, lng: -2.33,
        hectares: 4, estimatedTons: 6700,
        fuelDisplacedKgY: 11200000,
        status: 'ACTIVE', onChainId: 'CHAIN-E007',
      },
    }),

    // WIND — Tanzania
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E008' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'WIND', landType: null },
      create: {
        ownerId: ownerTz2.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'WIND',
        title: 'Makambako Escarpment Wind Farm',
        description: 'Eight 100 kW wind turbines on the Makambako Escarpment in Tanzania\'s Southern Highlands — one of East Africa\'s highest-resource wind corridors (mean wind speed 8.4 m/s at hub height). Combined 800 kW capacity feeds a rural mini-grid powering 5,600 households and two tea processing factories. The project displaced a diesel generator consuming 1.2 million litres of fuel annually.',
        country: 'Tanzania', region: 'Iringa Region',
        lat: -8.65, lng: 34.82,
        hectares: 25, estimatedTons: 7200,
        capacityKw: 800, householdsServed: 5600,
        status: 'ACTIVE', onChainId: 'CHAIN-E008',
      },
    }),

    // SOLAR_PV — Burkina Faso
    prisma.project.upsert({
      where: { onChainId: 'CHAIN-E009' },
      update: { projectType: 'CLEAN_ENERGY', energyType: 'SOLAR_PV', landType: null },
      create: {
        ownerId: ownerBf.id,
        projectType: 'CLEAN_ENERGY',
        energyType: 'SOLAR_PV',
        title: 'Sahel Solar Mini-Grid — 5 Villages',
        description: 'Solar mini-grids (combined 360 kW) bringing grid-quality electricity to five villages in northern Burkina Faso for the first time. Each village has a battery storage bank sized for 48-hour autonomy. The project is entirely privately financed through a pay-as-you-go mobile-money model — households pay via Orange Money in daily micro-installments until they own their connection outright.',
        country: 'Burkina Faso', region: 'Sahel Region',
        lat: 14.0, lng: -1.5,
        hectares: 8, estimatedTons: 2880,
        capacityKw: 360, householdsServed: 2800,
        status: 'ACTIVE', onChainId: 'CHAIN-E009',
      },
    }),
  ]);

  console.log('  ✓ Energy projects created');

  // ── Verifications ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.verification.create({ data: {
      projectId: pSolar1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 3240,
      notes: 'Smart meter data validated for 12 months. Baseline established using Kenya grid emission factor (0.498 kgCO₂/kWh). Kerosene displacement cross-checked against household surveys (n=320). Approved under GS-TPDDTEC methodology.',
    }}),
    prisma.verification.create({ data: {
      projectId: pBiogas1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 25920,
      notes: 'Digester census confirmed 4,623 functional units (96.3% of installed). Gas output sampled via portable flow meters at 180 units. Fuelwood displacement factor 2.1 twood/digester/yr confirmed by household cooking surveys. CDM AMS-I.E approved.',
    }}),
    prisma.verification.create({ data: {
      projectId: pBiogas2.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 7650,
      notes: 'Continuous gas flow logging from 35 institutional digesters. Charcoal displacement confirmed via fuel procurement records from each institution. Slurry distribution verified against farmer cooperative records. Ethiopia grid factor applied for electricity co-generation.',
    }}),
    prisma.verification.create({ data: {
      projectId: pCooks1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 39600,
      notes: 'QR-code field audit of 19,840 stoves (90.2% verified active). Kitchen Performance Tests conducted on random 5% sample — mean fuel saving 61.4%. Non-renewable biomass fraction 0.82 for project area. Additionality confirmed via barrier analysis. Gold Standard AMS-II.G.',
    }}),
    prisma.verification.create({ data: {
      projectId: pCooks2.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 12960,
      notes: 'Household surveys (n=240) confirm mean fuel saving of 58% vs baseline three-stone fire. Stove usage rate 87% at 12-month follow-up. Malawi non-renewable biomass fraction 0.91. Approved under CDM AMS-II.G.',
    }}),
    prisma.verification.create({ data: {
      projectId: pHydro.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 8640,
      notes: 'Energy meter data validated for 24 months of operation. ZESCO displaced electricity factor 0.812 kgCO₂/kWh applied (Zambia grid, high hydro share). River flow gauging confirmed design-flow availability 94% of operational hours. IFC Performance Standards compliance confirmed.',
    }}),
    prisma.verification.create({ data: {
      projectId: pBiochar.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 6030,
      notes: 'Pyrolysis kiln throughput logged via continuous weight sensors. Biochar yield 28% of feedstock dry mass confirmed. Wood charcoal displacement factor 1.83 kgCO₂/kg applied. Stable carbon fraction of biochar measured at 82%. AMS-III.E additionality confirmed.',
    }}),
    prisma.verification.create({ data: {
      projectId: pWind.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 6480,
      notes: 'SCADA data downloaded for 18 months confirming mean capacity factor 34.2%. Diesel generator fuel records cross-checked against purchase orders. Tanzania grid emission factor 0.558 kgCO₂/kWh applied for mini-grid displacing both diesel and TANESCO imports.',
    }}),
    prisma.verification.create({ data: {
      projectId: pSolar2.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 2592,
      notes: 'Smart meter PAYG data validated. Burkina Faso grid factor 0.431 kgCO₂/kWh. Kerosene lamp displacement calculated from pre-project household surveys. All five village sites inspected. Approved under Gold Standard TPDDTEC.',
    }}),
  ]);

  console.log('  ✓ Verifications approved');

  // ── Carbon credits ────────────────────────────────────────────────────────
  const [cSolar1, cBiogas1, cBiogas2, cCooks1, cCooks2, cHydro, cBiochar, cWind, cSolar2] = await Promise.all([
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-KE-E001-A' }, update: {}, create: { projectId: pSolar1.id,  tokenId: 'TOKEN-KE-E001-A', amount: 3240,  status: 'LISTED', mintTxHash: '0xe001aaa111bbb222ccc333ddd444eee555fff666777888999000aaabbb111ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-NG-E002-A' }, update: {}, create: { projectId: pBiogas1.id, tokenId: 'TOKEN-NG-E002-A', amount: 12000, status: 'LISTED', mintTxHash: '0xe002bbb222ccc333ddd444eee555fff666aaa777888999000111aaabbb222ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-ET-E003-A' }, update: {}, create: { projectId: pBiogas2.id, tokenId: 'TOKEN-ET-E003-A', amount: 7650,  status: 'LISTED', mintTxHash: '0xe003ccc333ddd444eee555fff666aaa111bbb888999000111222aaabbb333ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-ET-E004-A' }, update: {}, create: { projectId: pCooks1.id,  tokenId: 'TOKEN-ET-E004-A', amount: 20000, status: 'LISTED', mintTxHash: '0xe004ddd444eee555fff666aaa111bbb222ccc999000111222333aaabbb444ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-MW-E005-A' }, update: {}, create: { projectId: pCooks2.id,  tokenId: 'TOKEN-MW-E005-A', amount: 12960, status: 'LISTED', mintTxHash: '0xe005eee555fff666aaa111bbb222ccc333ddd000111222333444aaabbb555ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-ZM-E006-A' }, update: {}, create: { projectId: pHydro.id,   tokenId: 'TOKEN-ZM-E006-A', amount: 8640,  status: 'LISTED', mintTxHash: '0xe006fff666aaa111bbb222ccc333ddd444eee111222333444555aaabbb666ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-GH-E007-A' }, update: {}, create: { projectId: pBiochar.id, tokenId: 'TOKEN-GH-E007-A', amount: 6030,  status: 'LISTED', mintTxHash: '0xe007aaa777bbb222ccc333ddd444eee555fff111222333444555666bbb777ccc' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-TZ-E008-A' }, update: {}, create: { projectId: pWind.id,    tokenId: 'TOKEN-TZ-E008-A', amount: 6480,  status: 'LISTED', mintTxHash: '0xe008bbb888ccc333ddd444eee555fff666aaa111222333444555666777ccc888' } }),
    prisma.carbonCredit.upsert({ where: { tokenId: 'TOKEN-BF-E009-A' }, update: {}, create: { projectId: pSolar2.id,  tokenId: 'TOKEN-BF-E009-A', amount: 2592,  status: 'LISTED', mintTxHash: '0xe009ccc999ddd444eee555fff666aaa111bbb222333444555666777888ddd999' } }),
  ]);

  console.log('  ✓ Credits minted');

  // ── Marketplace listings ──────────────────────────────────────────────────
  // Check if listings already exist before creating (safe to re-run)
  const existingListings = await prisma.listing.findMany({
    where: { creditId: { in: [cSolar1.id, cBiogas1.id, cBiogas2.id, cCooks1.id, cCooks2.id, cHydro.id, cBiochar.id, cWind.id, cSolar2.id] } },
    select: { creditId: true },
  });
  const listedCreditIds = new Set(existingListings.map(l => l.creditId));

  const toCreate = [
    { creditId: cSolar1.id,  pricePerTon: 22.00, totalTons: 3240,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE001aaa' },
    { creditId: cBiogas1.id, pricePerTon: 17.50, totalTons: 12000, currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE002bbb' },
    { creditId: cBiogas2.id, pricePerTon: 19.00, totalTons: 7650,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE003ccc' },
    { creditId: cCooks1.id,  pricePerTon: 12.00, totalTons: 20000, currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE004ddd' },
    { creditId: cCooks2.id,  pricePerTon: 11.50, totalTons: 12960, currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE005eee' },
    { creditId: cHydro.id,   pricePerTon: 25.00, totalTons: 8640,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE006fff' },
    { creditId: cBiochar.id, pricePerTon: 14.50, totalTons: 6030,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE007ggg' },
    { creditId: cWind.id,    pricePerTon: 23.50, totalTons: 6480,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE008hhh' },
    { creditId: cSolar2.id,  pricePerTon: 20.00, totalTons: 2592,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlistE009iii' },
  ].filter(l => !listedCreditIds.has(l.creditId));

  if (toCreate.length > 0) {
    await prisma.listing.createMany({ data: toCreate as any });
  }

  console.log('  ✓ Listings created');
  console.log(`
⚡  Energy seed complete! (${toCreate.length} new listings added)

Energy listings now available:
  SOLAR_PV    — Turkana Off-Grid Solar (Kenya)              → $22.00/t  · 3,240 t
  BIOGAS      — Anambra Household Biodigesters (Nigeria)    → $17.50/t  · 12,000 t
  BIOGAS      — Oromia Institutional Biogas (Ethiopia)      → $19.00/t  · 7,650 t
  COOKSTOVES  — Oromia Improved Cookstoves (Ethiopia)       → $12.00/t  · 20,000 t
  COOKSTOVES  — Shire Valley Rocket Stoves (Malawi)         → $11.50/t  · 12,960 t
  MICRO_HYDRO — Copperbelt Run-of-River Hydro (Zambia)      → $25.00/t  · 8,640 t
  BIOCHARCOAL — Brong-Ahafo Agricultural Waste (Ghana)      → $14.50/t  · 6,030 t
  WIND        — Makambako Escarpment Wind Farm (Tanzania)   → $23.50/t  · 6,480 t
  SOLAR_PV    — Sahel Mini-Grid 5 Villages (Burkina Faso)   → $20.00/t  · 2,592 t
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
