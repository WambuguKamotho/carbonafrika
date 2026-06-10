import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PW = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

const PHOTOS: Record<string, string[]> = {
  FOREST:    ['https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1200&q=80&auto=format&fit=crop'],
  SAVANNA:   ['https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=1200&q=80&auto=format&fit=crop'],
  GRASSLAND: ['https://images.unsplash.com/photo-1502088513349-3ff6482aa816?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1567604949-168979100ac0?w=1200&q=80&auto=format&fit=crop'],
  FARMLAND:  ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80&auto=format&fit=crop'],
  WETLAND:   ['https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=1200&q=80&auto=format&fit=crop'],
  MANGROVE:  ['https://images.unsplash.com/photo-1569275432432-68f16d4a82f7?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1671481690302-12c4e2c6e901?w=1200&q=80&auto=format&fit=crop'],
  SOLAR_PV:  ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&q=80&auto=format&fit=crop'],
  BIOGAS:    ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1592609931095-54a2168ae893?w=1200&q=80&auto=format&fit=crop'],
  WIND:      ['https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1548337138-e87d889cc369?w=1200&q=80&auto=format&fit=crop'],
  MICRO_HYDRO: ['https://images.unsplash.com/photo-1509390874189-d75fd22f19f7?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=1200&q=80&auto=format&fit=crop'],
  COOKSTOVES:  ['https://images.unsplash.com/photo-1551982932-92d213f565a7?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1200&q=80&auto=format&fit=crop'],
  BIOCHARCOAL: ['https://images.unsplash.com/photo-1481660148723-b77ee9184660?w=1200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1607434472257-d9f8e57a643d?w=1200&q=80&auto=format&fit=crop'],
};
const ph = (t: string) => PHOTOS[t]?.slice(0, 2) ?? [];

type PD = {
  on: string; oe: string; oc: string; ob: string;
  title: string; desc: string;
  ptype: 'LAND_RESTORATION' | 'CLEAN_ENERGY';
  land?: string; energy?: string;
  country: string; region: string;
  lat: number; lng: number; ha: number; est: number;
  capKw?: number; hh?: number; fuel?: number;
  status: string; chain: string;
  price: number; vtons: number; tok: string;
};

// ── 25 Buyers ────────────────────────────────────────────────────────────────
const BUYER_DEFS = [
  { email:'buyer.greenfuture@example.com',  name:'GreenFuture Corp',              country:'Germany',        bio:'European sustainability fund offsetting Scope 3 emissions across its supply chain.' },
  { email:'buyer.climate@example.com',      name:'Climate Ventures Ltd',          country:'United Kingdom', bio:'Impact investment firm specialising in nature-based and renewable energy carbon credits.' },
  { email:'buyer.afriesg@example.com',      name:'AfriESG Capital',               country:'Kenya',          bio:'Pan-African ESG fund sourcing high-integrity credits from African landowners and cooperatives.' },
  { email:'buyer.microsoft@example.com',    name:'Microsoft Climate Innovation',  country:'USA',            bio:'Microsoft Carbon Fund targeting high-integrity nature-based solutions across Africa and Asia.' },
  { email:'buyer.amazon@example.com',       name:'Amazon Climate Pledge',         country:'USA',            bio:"Amazon's climate pledge arm, sourcing African carbon credits to meet its 2040 net-zero commitment." },
  { email:'buyer.stripe@example.com',       name:'Stripe Climate',                country:'USA',            bio:"Stripe's climate commitment fund routing 1% of revenue to high-quality carbon removal projects." },
  { email:'buyer.shopify@example.com',      name:'Shopify Sustainability Fund',   country:'Canada',         bio:"Shopify's sustainability initiative sourcing African credits for its merchant-base offset programme." },
  { email:'buyer.volkswagen@example.com',   name:'Volkswagen Green Future',       country:'Germany',        bio:'VW Group climate programme procuring nature-based credits for its decarbonisation roadmap.' },
  { email:'buyer.shell@example.com',        name:'Shell Nature Based Solutions',  country:'Netherlands',    bio:"Shell's portfolio of nature-based carbon credits offsetting legacy oil and gas emissions." },
  { email:'buyer.total@example.com',        name:'TotalEnergies Nature Credits',  country:'France',         bio:'TotalEnergies nature-based solutions portfolio supporting African communities and biodiversity.' },
  { email:'buyer.sgcarbon@example.com',     name:'SG Carbon Impact',              country:'France',         bio:"Société Générale's impact arm procuring high-integrity credits across African ecosystems." },
  { email:'buyer.hsbc@example.com',         name:'HSBC Nature Capital',           country:'United Kingdom', bio:"HSBC's nature capital financing arm, backing African biodiversity and restoration credits." },
  { email:'buyer.stanchart@example.com',    name:'Standard Chartered Sustainability', country:'Singapore',  bio:"StanChart's Africa sustainability portfolio, focusing on East and West African forest credits." },
  { email:'buyer.toyota@example.com',       name:'Toyota Sustainability Corp',    country:'Japan',          bio:'Toyota Environmental Challenge 2050 fund procuring high-quality African carbon credits.' },
  { email:'buyer.samsung@example.com',      name:'Samsung ESG Fund',              country:'South Korea',    bio:'Samsung Electronics ESG arm supporting African reforestation and clean energy projects.' },
  { email:'buyer.tata@example.com',         name:'Tata Sustainability Group',     country:'India',          bio:'Tata group sustainability fund sourcing African credits to offset industrial emissions.' },
  { email:'buyer.mtn@example.com',          name:'MTN Foundation Climate',        country:'South Africa',   bio:"MTN's Pan-African climate fund investing in community-led restoration across its 19 markets." },
  { email:'buyer.safaricom@example.com',    name:'Safaricom Green Pledge',        country:'Kenya',          bio:'Safaricom sustainability arm procuring Kenyan and East African carbon credits locally.' },
  { email:'buyer.equity@example.com',       name:'Equity Climate Fund',           country:'Kenya',          bio:"Equity Bank's green bond-backed fund financing African community carbon projects." },
  { email:'buyer.maroc@example.com',        name:'Maroc Telecom Environment',     country:'Morocco',        bio:'Maroc Telecom environmental offset programme focused on North and West African credits.' },
  { email:'buyer.kering@example.com',       name:'Kering Nature Solutions',       country:'France',         bio:"Kering luxury group's EP&L-aligned fund sourcing African biodiversity and forest credits." },
  { email:'buyer.unilever@example.com',     name:'Unilever Planet Fund',          country:'Netherlands',    bio:"Unilever's Planet & Society fund targeting supply-chain linked African reforestation credits." },
  { email:'buyer.nestle@example.com',       name:'Nestlé Forest Positive',        country:'Switzerland',    bio:"Nestlé's forest-positive commitment fund covering cocoa, palm oil and coffee supply chains." },
  { email:'buyer.airfranceklm@example.com', name:'Air France-KLM Sustainable Aviation', country:'France',  bio:'AF-KLM SAF and carbon offset portfolio for voluntary aviation emissions compensation.' },
  { email:'buyer.patagonia@example.com',    name:'Patagonia Environmental Action', country:'USA',           bio:"Patagonia's 1% for the Planet partner fund backing African grassland and forest restoration." },
];

// ── 56 original projects ──────────────────────────────────────────────────────
const DEFS: PD[] = [
  { on:'James Mwangi',       oe:'james.mwangi@example.com',       oc:'Kenya',       ob:'Third-generation smallholder farmer in the Aberdare highlands managing 850 ha of restored indigenous forest.',
    title:'Aberdare Highland Forest Restoration', desc:"Restoration of 850 ha of degraded indigenous forest in the Aberdare Range. The restored canopy protects Nairobi's watershed and supports 320 smallholder families through nursery and patrol jobs.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Kenya', region:'Central Region', lat:-0.4167, lng:36.7167, ha:850, est:4250, status:'ACTIVE', chain:'CHAIN-001', price:18.50, vtons:3910, tok:'KEN-001' },
  { on:'Grace Wanjiku',      oe:'grace.wanjiku@example.com',      oc:'Kenya',       ob:'Solar energy developer serving off-grid communities in Nairobi.',
    title:'Kibera Solar Mini-Grid', desc:'A 500 kW solar PV mini-grid serving 3,200 households in Kibera, replacing kerosene lamps and diesel generators via a mobile-money pay-as-you-go model.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Kenya', region:'Nairobi County', lat:-1.3144, lng:36.7836, ha:0.8, est:1800, capKw:500, hh:3200, status:'ACTIVE', chain:'CHAIN-002', price:16.50, vtons:1800, tok:'KEN-002' },
  { on:'Samuel Kariuki',     oe:'samuel.kariuki@example.com',     oc:'Kenya',       ob:'Maasai pastoralist and holistic land manager in the Rift Valley ecosystem.',
    title:'Mara Conservancy Savanna Carbon', desc:'Conservation of 1,600 ha of savanna grassland on the Mara River corridor using holistic grazing that mirrors historic wildebeest migrations, rapidly building soil organic carbon while maintaining pastoral livelihoods.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Kenya', region:'Narok County', lat:-1.5, lng:35.1, ha:1600, est:2400, status:'ACTIVE', chain:'CHAIN-003', price:14.00, vtons:2200, tok:'KEN-003' },
  { on:'Yohannes Tesfaye',   oe:'yohannes.tesfaye@example.com',   oc:'Ethiopia',    ob:'Rural energy entrepreneur running community biogas plants in the Tigray highlands.',
    title:'Tigray Highland Biogas Network', desc:'180 domestic biogas digesters serving 900 households in the Tigray highlands, each processing cattle and agricultural waste into clean cooking gas, reducing firewood demand by 3-4 tonnes per unit annually.',
    ptype:'CLEAN_ENERGY', energy:'BIOGAS', country:'Ethiopia', region:'Tigray Region', lat:14.1, lng:38.7, ha:0.4, est:960, capKw:45, hh:900, fuel:162000, status:'ACTIVE', chain:'CHAIN-004', price:14.00, vtons:960, tok:'ETH-001' },
  { on:'Tigist Haile',       oe:'tigist.haile@example.com',       oc:'Ethiopia',    ob:'Conservation biologist protecting Afromontane forests in the Ethiopian highlands.',
    title:'Bale Mountains Forest Conservation', desc:"REDD+ protection of 2,800 ha of Afromontane forest in the Bale Mountains — one of Africa's highest carbon-density ecosystems. The project employs 60 community scouts and shares revenue with the Oromo communities.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Ethiopia', region:'Oromia Region', lat:6.8, lng:39.9, ha:2800, est:11200, status:'ACTIVE', chain:'CHAIN-005', price:24.00, vtons:10080, tok:'ETH-002' },
  { on:'Bekele Adama',       oe:'bekele.adama@example.com',       oc:'Ethiopia',    ob:'Clean energy entrepreneur bringing solar power to the Afar pastoral communities.',
    title:'Afar Region Solar Electrification', desc:'A 120 kW distributed solar system across 6 pastoral villages in the Afar Depression, replacing kerosene and diesel.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Ethiopia', region:'Afar Region', lat:11.5, lng:40.6, ha:0.5, est:560, capKw:120, hh:800, status:'ACTIVE', chain:'CHAIN-006', price:13.00, vtons:560, tok:'ETH-003' },
  { on:'Amina Hassan',       oe:'amina.hassan@example.com',       oc:'Tanzania',    ob:'Wildlife conservancy manager in the Selous ecosystem.',
    title:'Selous Savanna Carbon Corridor', desc:'Conservation of 2,400 ha of miombo woodland and savanna within the Greater Selous ecosystem, protecting an elephant migration corridor. Carbon revenue is shared 60% with Mgeta village trust funds.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Tanzania', region:'Morogoro Region', lat:-8.1, lng:36.5, ha:2400, est:4800, status:'VERIFIED', chain:'CHAIN-007', price:14.75, vtons:4560, tok:'TZA-001' },
  { on:'Rashid Kitwana',     oe:'rashid.kitwana@example.com',     oc:'Tanzania',    ob:"Forest ranger and community leader protecting Kilimanjaro's montane forest buffer zone.",
    title:'Kilimanjaro Forest Buffer Zone', desc:"Restoration of 740 ha of degraded montane forest on the southern slopes of Kilimanjaro, re-establishing the critical cloud-forest belt that feeds the Pangani River and 1.2 million downstream water users.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Tanzania', region:'Kilimanjaro Region', lat:-3.0, lng:37.4, ha:740, est:3700, status:'ACTIVE', chain:'CHAIN-008', price:19.00, vtons:3330, tok:'TZA-002' },
  { on:'Fatuma Salehe',      oe:'fatuma.salehe@example.com',      oc:'Tanzania',    ob:'Marine biologist and mangrove restoration specialist on the Zanzibar coastline.',
    title:'Zanzibar Mangrove Blue Carbon', desc:'Restoration and protection of 280 ha of mangrove forest along the Zanzibar channel, sequestering blue carbon at 4× the rate of tropical forest and sustaining the livelihoods of 800 fishing families.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Tanzania', region:'Zanzibar', lat:-6.2, lng:39.5, ha:280, est:2520, status:'ACTIVE', chain:'CHAIN-009', price:22.00, vtons:2270, tok:'TZA-003' },
  { on:'Josephine Nakayiwa', oe:'josephine.nakayiwa@example.com', oc:'Uganda',      ob:'Grassland restoration specialist in Karamoja and clean cooking advocate.',
    title:'Karamoja Dryland Grassland Revival', desc:'Restoration of 1,800 ha of severely degraded dryland grassland in north-eastern Uganda using Assisted Natural Regeneration and rotational grazing with Karamojong pastoralist communities.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Uganda', region:'Karamoja Sub-region', lat:3.3167, lng:34.6833, ha:1800, est:2700, status:'ACTIVE', chain:'CHAIN-010', price:11.20, vtons:2480, tok:'UGA-001' },
  { on:'Robert Ssekibuule',  oe:'robert.ssekibuule@example.com',  oc:'Uganda',      ob:'Clean cooking entrepreneur serving peri-urban households across greater Kampala.',
    title:'Greater Kampala Improved Cookstoves', desc:'Distribution of 5,000 high-efficiency cookstoves across 23 peri-urban parishes in Kampala, replacing three-stone fires with gasifier stoves that reduce fuel consumption by 65%.',
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Uganda', region:'Central Region', lat:0.3476, lng:32.5825, ha:0.1, est:1200, hh:5000, fuel:1375000, status:'ACTIVE', chain:'CHAIN-011', price:12.50, vtons:1200, tok:'UGA-002' },
  { on:'Henry Kawooya',      oe:'henry.kawooya@example.com',      oc:'Uganda',      ob:'Conservation ranger protecting Bwindi Impenetrable Forest on the DRC border.',
    title:'Bwindi Forest REDD+ Protection', desc:"REDD+ conservation of 420 ha of primary Afromontane forest in Bwindi — critical habitat for 459 of the world's ~1,000 mountain gorillas. Community benefit-sharing funds school fees for 1,200 children.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Uganda', region:'Southwestern Uganda', lat:-1.0, lng:29.7, ha:420, est:2100, status:'ACTIVE', chain:'CHAIN-012', price:28.00, vtons:1890, tok:'UGA-003' },
  { on:'Grace Uwimana',      oe:'grace.uwimana@example.com',      oc:'Rwanda',      ob:'Hydropower engineer developing run-of-river micro-hydro plants in northern Rwanda.',
    title:'Volcanoes National Park Micro-Hydro', desc:'30 kW run-of-river micro-hydropower plant on the Nyabugogo river powering 420 households and a health centre in the Volcanoes National Park buffer zone, replacing diesel generators.',
    ptype:'CLEAN_ENERGY', energy:'MICRO_HYDRO', country:'Rwanda', region:'Northern Province', lat:-1.4697, lng:29.5269, ha:0.3, est:720, capKw:30, hh:420, status:'ACTIVE', chain:'CHAIN-013', price:15.80, vtons:720, tok:'RWA-001' },
  { on:'Celestin Nkurunziza', oe:'celestin.nkurunziza@example.com', oc:'Rwanda',   ob:'Forest ecologist conserving Afromontane rainforest in southwestern Rwanda.',
    title:'Nyamasheke Afromontane Forest', desc:"Protection of 650 ha of intact Afromontane forest on the Congo-Nile ridge, one of Rwanda's highest biodiversity zones. The project supports 380 forest-edge households through NTFP harvesting income.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Rwanda', region:'Western Province', lat:-2.3, lng:29.1, ha:650, est:3250, status:'ACTIVE', chain:'CHAIN-014', price:21.00, vtons:2925, tok:'RWA-002' },
  { on:'Abraham Deng',       oe:'abraham.deng@example.com',       oc:'South Sudan', ob:'Environmental officer managing the Sudd wetland ecosystem in South Sudan.',
    title:'Sudd Wetland Carbon Preservation', desc:"Protection of 4,200 ha of the Sudd floodplain — the world's second-largest tropical wetland — preventing drainage for agriculture. Peat carbon stocks measured at 620 tCO₂/ha to 1.5 m depth.",
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'South Sudan', region:'Unity State', lat:7.5, lng:30.5, ha:4200, est:18900, status:'VERIFIED', chain:'CHAIN-015', price:19.00, vtons:16800, tok:'SSD-001' },
  { on:'Fatou Diallo',       oe:'fatou.diallo@example.com',       oc:'Senegal',     ob:'Community forest guardian protecting mangroves in the Sine-Saloum delta.',
    title:'Sine-Saloum Mangrove Conservation', desc:"Protection and restoration of 620 ha of mangrove forest in the Sine-Saloum Delta UNESCO Biosphere Reserve. The project trains local women's cooperatives as mangrove rangers, halting illegal charcoal cutting.",
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Senegal', region:'Fatick Region', lat:13.85, lng:-16.55, ha:620, est:5580, status:'ACTIVE', chain:'CHAIN-016', price:24.00, vtons:5200, tok:'SEN-001' },
  { on:'Kwame Asante',       oe:'kwame.asante@example.com',       oc:'Ghana',       ob:"Cocoa farmer transitioning to agroforestry in the Ashanti Region.",
    title:'Ashanti Agroforestry Initiative', desc:"Conversion of 340 ha of monoculture cocoa plantations to diverse agroforestry systems in Ghana's Ashanti Region, intercropping cocoa with shade trees and increasing farmer income by 35%.",
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Ghana', region:'Ashanti Region', lat:6.6885, lng:-1.6244, ha:340, est:850, status:'ACTIVE', chain:'CHAIN-017', price:12.00, vtons:760, tok:'GHA-001' },
  { on:'Chukwuemeka Obi',    oe:'chukwuemeka.obi@example.com',    oc:'Nigeria',     ob:'Solar energy entrepreneur aggregating rooftop installations across Lagos commercial buildings.',
    title:'Lagos Rooftop Solar Programme', desc:'Aggregated 150 kW rooftop solar across 1,200 buildings on Lagos Island via a green REIT model.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Nigeria', region:'Lagos State', lat:6.4531, lng:3.3958, ha:0.5, est:320, capKw:150, hh:1200, status:'ACTIVE', chain:'CHAIN-018', price:11.50, vtons:290, tok:'NGA-001' },
  { on:'Ngozi Adeyemi',      oe:'ngozi.adeyemi@example.com',      oc:'Nigeria',     ob:"Forest conservation officer protecting Cross River rainforest in southeastern Nigeria.",
    title:'Cross River Rainforest REDD+', desc:"REDD+ protection of 3,100 ha of Cross River rainforest — Nigeria's last major tropical forest block — preventing logging and agricultural encroachment through community rangers and benefit-sharing agreements.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Nigeria', region:'Cross River State', lat:5.5, lng:8.8, ha:3100, est:12400, status:'ACTIVE', chain:'CHAIN-019', price:22.00, vtons:11160, tok:'NGA-002' },
  { on:'Moussa Coulibaly',   oe:'moussa.coulibaly@example.com',   oc:'Mali',        ob:"Renewable energy and sustainable charcoal entrepreneur in the Sahel.",
    title:'Sahel Wind Farm — Mopti Region', desc:"200 kW community wind power across 8 turbines in Mali's arid Mopti region, displacing approximately 480 tonnes of diesel combustion annually and powering 1,400 households via locally trained technicians.",
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Mali', region:'Mopti Region', lat:14.5, lng:-4.2, ha:12, est:2900, capKw:200, hh:1400, status:'VERIFIED', chain:'CHAIN-020', price:13.40, vtons:2900, tok:'MLI-001' },
  { on:'Aliou Traoré',       oe:'aliou.traore@example.com',       oc:'Mali',        ob:'Biocharcoal producer processing agricultural residues into sustainable fuel near Bamako.',
    title:'Bamako Biocharcoal Production Hub', desc:'Centralised biocharcoal facility near Bamako processing cotton stalks, millet husks and peanut shells into certified briquettes via low-emission retort kilns, replacing wood charcoal for 6,200 urban households.',
    ptype:'CLEAN_ENERGY', energy:'BIOCHARCOAL', country:'Mali', region:'Bamako District', lat:12.6392, lng:-8.0029, ha:0.6, est:880, hh:6200, fuel:440000, status:'ACTIVE', chain:'CHAIN-021', price:11.00, vtons:880, tok:'MLI-002' },
  { on:'Adama Konaté',       oe:'adama.konate@example.com',       oc:"Côte d'Ivoire", ob:"Conservation biologist protecting Taï National Park's primary rainforest.",
    title:"Taï National Park Buffer Zone", desc:"Protection of 1,800 ha of primary rainforest in the buffer zone of Taï National Park — home to the last wild chimpanzees known to use tools. The project employs 45 eco-guards from the adjacent Krou communities.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:"Côte d'Ivoire", region:'Southwestern Region', lat:5.8, lng:-7.5, ha:1800, est:9000, status:'ACTIVE', chain:'CHAIN-022', price:25.00, vtons:8100, tok:'CIV-001' },
  { on:'Jean-Pierre Essomba', oe:'jeanpierre.essomba@example.com', oc:'Cameroon',   ob:'Biologist and community forest manager in the Dja Faunal Reserve.',
    title:'Dja Rainforest Carbon Reserve', desc:"REDD+ conservation of 2,600 ha of dense tropical rainforest inside the Dja Faunal Reserve, Cameroon — a UNESCO World Heritage Site with one of Africa's highest mammal densities.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Cameroon', region:'South Region', lat:3.1, lng:12.8, ha:2600, est:13000, status:'ACTIVE', chain:'CHAIN-023', price:26.00, vtons:11700, tok:'CMR-001' },
  { on:'Hassane Moumouni',   oe:'hassane.moumouni@example.com',   oc:'Niger',       ob:'Agroforestry specialist restoring degraded farmland in the Maradi region.',
    title:'Maradi Farmer-Managed Regreening', desc:'Farmer-managed natural regeneration (FMNR) across 1,200 ha in the Maradi region of Niger, protecting naturally re-sprouting trees on cropland. An estimated 40 trees per hectare re-established, sequestering soil carbon while boosting yields by 25%.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Niger', region:'Maradi Region', lat:13.5, lng:7.1, ha:1200, est:1800, status:'ACTIVE', chain:'CHAIN-024', price:10.00, vtons:1620, tok:'NER-001' },
  { on:'Adama Ouédraogo',    oe:'adama.ouedraogo@example.com',    oc:'Burkina Faso', ob:'Clean cooking entrepreneur distributing improved cookstoves across the Sahel.',
    title:'Ouagadougou Improved Cookstoves', desc:'Distribution of 8,000 ceramic and rocket-type improved cookstoves across 14 peri-urban communes of Ouagadougou, reducing charcoal consumption by 55% per household.',
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Burkina Faso', region:'Centre Region', lat:12.4, lng:-1.5, ha:0.1, est:1760, hh:8000, fuel:2200000, status:'ACTIVE', chain:'CHAIN-025', price:11.00, vtons:1760, tok:'BFA-001' },
  { on:'Isata Kamara',       oe:'isata.kamara@example.com',       oc:'Sierra Leone', ob:'Marine conservation officer protecting the Gola Rainforest National Park coastline.',
    title:'Gola Forest Mangrove Fringe', desc:'Protection and restoration of 310 ha of mangrove fringe forest on the Moa River estuary adjacent to Gola Rainforest National Park. The project supports 24 fishing communities with eco-ranger employment and honey production income.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Sierra Leone', region:'Eastern Province', lat:7.4, lng:-11.2, ha:310, est:2790, status:'ACTIVE', chain:'CHAIN-026', price:20.00, vtons:2510, tok:'SLE-001' },
  { on:'Marcus Kollie',      oe:'marcus.kollie@example.com',      oc:'Liberia',     ob:"Forest guard protecting Nimba County's high-biodiversity rainforest remnants.",
    title:'Nimba County Forest Protection', desc:"REDD+ protection of 1,400 ha of lowland rainforest in Nimba County — containing some of West Africa's last intact primary forest outside of protected areas. Community benefit fund supports 6 schools.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Liberia', region:'Nimba County', lat:7.5, lng:-8.6, ha:1400, est:7000, status:'ACTIVE', chain:'CHAIN-027', price:21.00, vtons:6300, tok:'LBR-001' },
  { on:'Aminata Sané',       oe:'aminata.sane@example.com',       oc:'Guinea-Bissau', ob:'Marine biologist restoring mangrove forests in the Bijagós Archipelago.',
    title:'Bijagós Archipelago Mangroves', desc:'Restoration of 480 ha of mangrove forest across the UNESCO Biosphere Reserve of the Bijagós Archipelago, supporting artisanal fisheries that feed 90,000 people and protecting the islands from coastal erosion.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Guinea-Bissau', region:'Bijagós Region', lat:11.2, lng:-16.1, ha:480, est:4320, status:'ACTIVE', chain:'CHAIN-028', price:21.00, vtons:3890, tok:'GNB-001' },
  { on:'Mamadou Diallo',     oe:'mamadou.diallo@example.com',     oc:'Guinea',      ob:"Watershed hydrologist restoring Fouta Djallon highland forests that feed West Africa's major rivers.",
    title:'Fouta Djallon Watershed Forest', desc:"Restoration of 920 ha of highland gallery forest in the Fouta Djallon Massif — the 'Water Tower of West Africa' feeding the Senegal, Gambia, and Niger rivers.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Guinea', region:'Labé Region', lat:11.0, lng:-12.3, ha:920, est:4600, status:'ACTIVE', chain:'CHAIN-029', price:17.00, vtons:4140, tok:'GIN-001' },
  { on:'Brice Houessou',     oe:'brice.houessou@example.com',     oc:'Benin',       ob:'Wildlife biologist managing the Pendjari National Park buffer zone in northern Benin.',
    title:'Pendjari Savanna Carbon', desc:"Conservation of 3,800 ha of Sudan-Guinean savanna in the Pendjari Biosphere Reserve buffer zone. The project protects the last viable population of lions, elephants, and hippos in West Africa while paying rangers from carbon revenue.",
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Benin', region:'Atacora Department', lat:11.2, lng:1.5, ha:3800, est:5700, status:'ACTIVE', chain:'CHAIN-030', price:13.00, vtons:5130, tok:'BEN-001' },
  { on:'Koffi Agbeko',       oe:'koffi.agbeko@example.com',       oc:'Togo',        ob:"Forest ranger protecting the Fazao-Malfakassa National Park in central Togo.",
    title:'Fazao-Malfakassa Forest Reserve', desc:"Conservation of 1,100 ha of semi-deciduous forest inside the Fazao-Malfakassa National Park — Togo's largest protected area. The project employs 30 community rangers and funds a women's income generation cooperative.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Togo', region:'Central Region', lat:8.8, lng:0.9, ha:1100, est:5500, status:'ACTIVE', chain:'CHAIN-031', price:18.00, vtons:4950, tok:'TGO-001' },
  { on:'Jean Bosco Bamoninga', oe:'jeanbosco.bamoninga@example.com', oc:'DR Congo', ob:'Community forest monitor in the Équateur province Congo Basin.',
    title:'Congo Basin Intact Forest Preservation', desc:'REDD+ project protecting 3,500 ha of primary Congo Basin rainforest in Équateur province. High-resolution NDVI differencing confirms zero deforestation within the project boundary over 6 years of monitoring.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'DR Congo', region:'Équateur Province', lat:0.45, lng:21.75, ha:3500, est:17500, status:'VERIFIED', chain:'CHAIN-032', price:28.00, vtons:16200, tok:'COD-001' },
  { on:'Olivier Mbemba',     oe:'olivier.mbemba@example.com',     oc:'DR Congo',    ob:"Conservation officer protecting Virunga National Park's montane forest.",
    title:'Virunga Montane Forest Carbon', desc:'Protection of 580 ha of montane forest in the buffer zone of Virunga National Park — home to 880 mountain gorillas. Revenue funds 40 community jobs and replaces charcoal income that historically drove deforestation.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'DR Congo', region:'North Kivu', lat:-0.4, lng:29.4, ha:580, est:2900, status:'ACTIVE', chain:'CHAIN-033', price:27.00, vtons:2610, tok:'COD-002' },
  { on:'Marie-Thérèse Loubaki', oe:'mariethrese.loubaki@example.com', oc:'Republic of Congo', ob:'Rainforest conservationist protecting the Odzala-Kokoua ecosystem.',
    title:'Odzala Rainforest Carbon Shield', desc:"Conservation of 2,200 ha of dense equatorial rainforest adjacent to Odzala-Kokoua National Park in northern Congo — Africa's oldest national park and home to the world's largest remaining forest elephant population.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Republic of Congo', region:'Cuvette-Ouest', lat:1.0, lng:14.9, ha:2200, est:11000, status:'ACTIVE', chain:'CHAIN-034', price:24.00, vtons:9900, tok:'COG-001' },
  { on:'Pascal Nguema',      oe:'pascal.nguema@example.com',      oc:'Gabon',       ob:'Forest ecologist in the Lopé National Park research station.',
    title:'Lopé National Park Forest', desc:'REDD+ conservation of 1,800 ha on the edge of Lopé National Park — a UNESCO World Heritage site spanning savanna and dense forest mosaics in central Gabon. Carbon density is among the highest in Africa at 165 tC/ha.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Gabon', region:'Ogooué-Ivindo', lat:-0.2, lng:11.6, ha:1800, est:9000, status:'ACTIVE', chain:'CHAIN-035', price:26.00, vtons:8100, tok:'GAB-001' },
  { on:'Léa Moundzegou',     oe:'lea.moundzegou@example.com',     oc:'Central African Republic', ob:'Wildlife ranger at the Dzanga Sangha Protected Area in southwestern CAR.',
    title:'Dzanga Sangha Forest Reserve', desc:"Conservation of 960 ha of dense lowland rainforest adjacent to Dzanga Sangha — home to the world's largest population of forest elephants and western lowland gorillas. Community rangers co-manage the project with WWF.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Central African Republic', region:'Sangha-Mbaéré', lat:2.9, lng:16.5, ha:960, est:4800, status:'ACTIVE', chain:'CHAIN-036', price:25.00, vtons:4320, tok:'CAF-001' },
  { on:'Gaston Ngole',       oe:'gaston.ngole@example.com',       oc:'Cameroon',    ob:'Volcanologist and forest manager on the slopes of Mount Cameroon.',
    title:'Mount Cameroon Forest Corridor', desc:'Restoration of 420 ha of degraded montane forest on the southern slopes of Mount Cameroon — Africa\'s highest active volcano and a biodiversity hotspot with 42 endemic plant species.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Cameroon', region:'Southwest Region', lat:4.2, lng:9.2, ha:420, est:2100, status:'ACTIVE', chain:'CHAIN-037', price:20.00, vtons:1890, tok:'CMR-002' },
  { on:'Mahamat Zene',       oe:'mahamat.zene@example.com',       oc:'Chad',        ob:'Agropastoralist practising farmer-managed natural regeneration in the Sahel.',
    title:'Lake Chad Basin Regreening', desc:'Farmer-managed natural regeneration across 2,400 ha in the degraded lakeshore zone of Lake Chad, protecting and managing naturally re-sprouting Acacia, Faidherbia, and Balanites trees on cultivated fields.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Chad', region:'Lac Region', lat:12.9, lng:16.4, ha:2400, est:3600, status:'ACTIVE', chain:'CHAIN-038', price:10.00, vtons:3240, tok:'TCD-001' },
  { on:'Manuel Obiang',      oe:'manuel.obiang@example.com',      oc:'Equatorial Guinea', ob:'Marine biologist and forest conservationist on Bioko island.',
    title:'Bioko Island Montane Forest', desc:'Conservation of 380 ha of cloud forest on the volcanic slopes of Bioko island — one of Africa\'s highest biodiversity islands, home to four endemic primate species.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Equatorial Guinea', region:'Bioko Norte', lat:3.7, lng:8.8, ha:380, est:1900, status:'ACTIVE', chain:'CHAIN-039', price:22.00, vtons:1710, tok:'GNQ-001' },
  { on:'Lucinda Machava',    oe:'lucinda.machava@example.com',    oc:'Mozambique',  ob:'Wetland hydrologist managing the Zambezi Delta peatland ecosystem.',
    title:'Zambezi Delta Peatland Safeguard', desc:"Protection of 960 ha of peat-rich floodplain wetlands in the Zambezi Delta — one of Africa's largest delta systems. PES scheme for Sena communities prevents drainage and conversion to rice cultivation.",
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'Mozambique', region:'Sofala Province', lat:-18.8, lng:36.1, ha:960, est:7680, status:'ACTIVE', chain:'CHAIN-040', price:21.00, vtons:6900, tok:'MOZ-001' },
  { on:'Sipho Zulu',         oe:'sipho.zulu@example.com',         oc:'South Africa', ob:'Wetland ecologist managing the iSimangaliso Wetland Park buffer zone.',
    title:'iSimangaliso Coastal Wetland Carbon', desc:"Protection and restoration of 680 ha of estuarine and coastal wetland in the iSimangaliso Wetland Park World Heritage Site buffer zone, preventing drainage for sugar cane expansion.",
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'South Africa', region:'KwaZulu-Natal', lat:-28.0, lng:32.5, ha:680, est:4760, status:'ACTIVE', chain:'CHAIN-041', price:18.00, vtons:4284, tok:'ZAF-001' },
  { on:'Tendai Moyo',        oe:'tendai.moyo@example.com',        oc:'Zimbabwe',    ob:'Wildlife conservancy manager protecting savanna ecosystems in Hwange.',
    title:'Hwange Savanna Wildlife Carbon', desc:'Conservation of 5,200 ha of savanna woodland and grassland on a private conservancy adjacent to Hwange National Park, protecting habitat for 106 mammal species including 44,000 elephants.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Zimbabwe', region:'Matabeleland North', lat:-18.4, lng:26.5, ha:5200, est:7800, status:'ACTIVE', chain:'CHAIN-042', price:14.00, vtons:7020, tok:'ZWE-001' },
  { on:'Bwalya Mutale',      oe:'bwalya.mutale@example.com',      oc:'Zambia',      ob:'Pastoralist and grassland manager in the Kafue Flats ecosystem.',
    title:'Kafue Flats Grassland Restoration', desc:"Restoration of 2,800 ha of degraded grassland on the Kafue Flats — Africa's largest floodplain grassland ecosystem. Holistic planned grazing mimics the historic lechwe antelope migrations, rebuilding soil organic carbon.",
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Zambia', region:'Central Province', lat:-15.7, lng:27.9, ha:2800, est:4200, status:'ACTIVE', chain:'CHAIN-043', price:11.00, vtons:3780, tok:'ZMB-001' },
  { on:'Naomi Tjikuua',      oe:'naomi.tjikuua@example.com',      oc:'Namibia',     ob:"Solar energy developer bringing utility-scale solar to Namibia's remote communities.",
    title:'Namib Desert Solar Farm', desc:'A 250 kW community solar farm in the Khomas Highland near Windhoek, serving 1,800 off-grid households with electricity from one of the world\'s highest solar irradiance zones.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Namibia', region:'Khomas Region', lat:-22.5, lng:17.0, ha:1.2, est:980, capKw:250, hh:1800, status:'ACTIVE', chain:'CHAIN-044', price:13.50, vtons:980, tok:'NAM-001' },
  { on:'Esperança Cabral',   oe:'esperanca.cabral@example.com',   oc:'Angola',      ob:'Hydrologist protecting the Okavango River headwaters forest in eastern Angola.',
    title:'Okavango Headwaters Forest', desc:"REDD+ protection of 1,600 ha of Miombo woodland in the Okavango River headwaters — the source of the world's largest inland delta. Prevents logging that would reduce water flow to downstream Botswana and Namibia.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Angola', region:'Moxico Province', lat:-13.5, lng:19.5, ha:1600, est:8000, status:'ACTIVE', chain:'CHAIN-045', price:18.00, vtons:7200, tok:'AGO-001' },
  { on:'Kefilwe Mphathi',    oe:'kefilwe.mphathi@example.com',    oc:'Botswana',    ob:'Conservation ecologist managing the Okavango Delta wetland buffer zone.',
    title:'Okavango Delta Wetland Carbon', desc:'Protection of 3,400 ha of the Okavango Delta flood plain — UNESCO World Heritage Site and Ramsar wetland of international importance. The project prevents cattle encroachment that would drain and degrade the high-carbon peat soils.',
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'Botswana', region:'North-West District', lat:-19.4, lng:23.0, ha:3400, est:23800, status:'ACTIVE', chain:'CHAIN-046', price:20.00, vtons:21420, tok:'BWA-001' },
  { on:'Hary Rakotondrabe',  oe:'hary.rakotondrabe@example.com',  oc:'Madagascar',  ob:'Forest ecologist at the Ranomafana National Park research station.',
    title:'Ranomafana Rainforest Protection', desc:'REDD+ conservation of 1,200 ha of primary rainforest in the Ranomafana National Park buffer zone — home to 14 lemur species and one of Madagascar\'s richest biodiversity hotspots. Revenue funds 52 community jobs.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Madagascar', region:'Fianarantsoa Province', lat:-21.3, lng:47.4, ha:1200, est:6000, status:'ACTIVE', chain:'CHAIN-047', price:22.00, vtons:5400, tok:'MDG-001' },
  { on:'Limbani Phiri',      oe:'limbani.phiri@example.com',      oc:'Malawi',      ob:'Forest warden protecting the montane forests of Mount Mulanje.',
    title:'Mount Mulanje Forest Biosphere', desc:'Protection and restoration of 560 ha of montane forest on Mount Mulanje — a UNESCO Biosphere Reserve. The project protects Mulanje cedar (Widdringtonia whytei) — Africa\'s rarest conifer — from illegal logging.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Malawi', region:'Southern Region', lat:-16.0, lng:35.5, ha:560, est:2800, status:'ACTIVE', chain:'CHAIN-048', price:20.00, vtons:2520, tok:'MWI-001' },
  { on:'Sifiso Dlamini',     oe:'sifiso.dlamini@example.com',     oc:'eSwatini',    ob:'Biocharcoal entrepreneur processing pine plantation residues in the Usutu forest.',
    title:'Usutu Pine Biocharcoal Project', desc:'Biocharcoal production from pine plantation residues in the Usutu commercial forest, converting sawmill waste and thinnings into high-density briquettes replacing wood charcoal for 4,800 urban households in Manzini.',
    ptype:'CLEAN_ENERGY', energy:'BIOCHARCOAL', country:'eSwatini', region:'Manzini Region', lat:-26.5, lng:31.4, ha:0.4, est:580, hh:4800, fuel:290000, status:'ACTIVE', chain:'CHAIN-049', price:10.00, vtons:580, tok:'SWZ-001' },
  { on:'Youssef El Mansouri', oe:'youssef.elmansouri@example.com', oc:'Morocco',    ob:'Forest engineer leading Atlas cedar reforestation in the Middle Atlas mountains.',
    title:'Middle Atlas Cedar Reforestation', desc:'Restoration of 680 ha of degraded Atlas cedar forest in the Middle Atlas — one of Africa\'s rarest mountain ecosystems — using direct seeding of Cedrus atlantica and protecting natural regeneration from livestock grazing.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Morocco', region:'Azilal Province', lat:31.5, lng:-6.5, ha:680, est:3400, status:'ACTIVE', chain:'CHAIN-050', price:17.00, vtons:3060, tok:'MAR-001' },
  { on:'Leila Ben Salah',    oe:'leila.bensalah@example.com',     oc:'Tunisia',     ob:'Agronomist restoring degraded cork oak farmland in northwestern Tunisia.',
    title:'Northern Tunisia Cork Oak Farmland', desc:'Agroforestry restoration of 480 ha of degraded cork oak (Quercus suber) farmland in the Kroumirie hills, intercropping cork trees with herbs and cereals to rebuild soil carbon and regenerate traditional cork harvesting livelihoods.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Tunisia', region:'Jendouba Governorate', lat:36.5, lng:9.5, ha:480, est:960, status:'ACTIVE', chain:'CHAIN-051', price:11.00, vtons:864, tok:'TUN-001' },
  { on:'Ahmed Hassan Osman', oe:'ahmed.osman@example.com',        oc:'Egypt',       ob:'Solar engineer developing large-scale solar installations in the Sinai Peninsula.',
    title:'East Sinai Utility Solar Plant', desc:'A 400 kW ground-mounted solar farm in the Gulf of Aqaba coastal zone of Sinai, providing clean electricity to 2,400 households previously reliant on expensive diesel imports.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Egypt', region:'South Sinai Governorate', lat:29.5, lng:34.0, ha:1.8, est:1200, capKw:400, hh:2400, status:'ACTIVE', chain:'CHAIN-052', price:12.00, vtons:1200, tok:'EGY-001' },
  { on:'Karim Bouchama',     oe:'karim.bouchama@example.com',     oc:'Algeria',     ob:"Forest ecologist restoring Tlemcen National Park's degraded cedar and oak forest.",
    title:'Tlemcen National Park Reforestation', desc:'Restoration of 540 ha of degraded Aleppo pine and holm oak forest inside Tlemcen National Park using seed-harvested from local parent trees, protecting the watershed feeding 220,000 residents of Tlemcen city.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Algeria', region:'Tlemcen Province', lat:34.9, lng:-1.4, ha:540, est:2700, status:'ACTIVE', chain:'CHAIN-053', price:15.00, vtons:2430, tok:'DZA-001' },
  { on:'Khalid Ibrahim',     oe:'khalid.ibrahim@example.com',     oc:'Sudan',       ob:'Agroforestry extension officer restoring Nile Valley farmland degraded by salinisation.',
    title:'Nile Valley Agroforestry Restoration', desc:'Restoration of 1,400 ha of salinised and degraded farmland along the Nile Valley in central Sudan using date palms, acacias, and irrigated agroforestry systems.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Sudan', region:'Khartoum State', lat:15.5, lng:32.5, ha:1400, est:2520, status:'ACTIVE', chain:'CHAIN-054', price:10.00, vtons:2268, tok:'SDN-001' },
  { on:'Omar Abdallah',      oe:'omar.abdallah@example.com',      oc:'Comoros',     ob:'Forest ranger protecting the remaining cloud forests on Grande Comore island.',
    title:'Njazidja Cloud Forest Conservation', desc:"Protection of 240 ha of cloud forest on the slopes of Karthala volcano on Grande Comore island — one of Africa's most threatened island forest ecosystems. The project trains 20 community eco-guides, creating sustainable eco-tourism income.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Comoros', region:'Grande Comore', lat:-11.7, lng:43.4, ha:240, est:1200, status:'ACTIVE', chain:'CHAIN-055', price:19.00, vtons:1080, tok:'COM-001' },
  { on:'Lesego Modise',      oe:'lesego.modise@example.com',      oc:'Lesotho',     ob:"Wind energy developer harnessing Lesotho's high-altitude wind resources.",
    title:'Drakensberg Escarpment Wind Farm', desc:"A 180 kW community wind installation at 2,800 m elevation on the Lesotho Drakensberg escarpment — one of southern Africa's premier wind resources — serving 1,100 highland households and a district health clinic.",
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Lesotho', region:'Mokhotlong District', lat:-29.5, lng:28.5, ha:8, est:540, capKw:180, hh:1100, status:'ACTIVE', chain:'CHAIN-056', price:12.50, vtons:540, tok:'LSO-001' },
];

// ── 44 additional projects (total = 100) ─────────────────────────────────────
const EXTRA_DEFS: PD[] = [
  { on:'Asha Mwangi',       oe:'asha.mwangi@example.com',       oc:'Kenya',     ob:'Marine biologist restoring coastal mangroves in Kilifi County.',
    title:'Kilifi Coastal Mangrove Belt', desc:'Restoration of 180 ha of degraded mangrove forest along the Kilifi Creek, protecting the coastline from erosion and providing nursery habitat for commercial fish species that sustain 1,200 coastal fishing households.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Kenya', region:'Kilifi County', lat:-3.6, lng:39.8, ha:180, est:1620, status:'ACTIVE', chain:'CHAIN-057', price:21.50, vtons:1450, tok:'KEN-004' },
  { on:'Miriam Njeri',      oe:'miriam.njeri@example.com',      oc:'Kenya',     ob:'Agroforestry extension officer in Meru County.',
    title:'Meru Agroforestry Expansion', desc:'Agroforestry restoration on 560 ha of degraded smallholder farms in Meru County, planting Grevillea, Calliandra, and Macadamia shade trees with coffee and tea intercropping. Participating farmers report 40% income gains.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Kenya', region:'Meru County', lat:0.05, lng:37.65, ha:560, est:840, status:'PENDING', chain:'CHAIN-058', price:12.00, vtons:756, tok:'KEN-005' },
  { on:'Baraka Kimani',     oe:'baraka.kimani@example.com',     oc:'Kenya',     ob:'Clean cooking entrepreneur in Kisumu and the Lake Victoria shore communities.',
    title:'Lake Victoria Basin Cookstoves', desc:"Distribution of 6,500 improved ceramic cookstoves to fishing and farming households around Lake Victoria's Kenyan shore, reducing charcoal demand by 60% per household and cutting indoor air pollutant exposure for 32,500 people.",
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Kenya', region:'Kisumu County', lat:-0.1, lng:34.7, ha:0.1, est:1430, hh:6500, fuel:1787500, status:'ACTIVE', chain:'CHAIN-059', price:12.00, vtons:1430, tok:'KEN-006' },
  { on:'Solomon Girma',     oe:'solomon.girma@example.com',     oc:'Ethiopia',  ob:'Grassland ecologist restoring overgrazed highlands in Amhara Region.',
    title:'Amhara Highland Grassland Restoration', desc:'Assisted natural regeneration and holistic grazing management across 2,200 ha of severely degraded highland grassland in the Amhara Region, rebuilding grass cover and soil organic carbon through seasonal resting and rotational grazing.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Ethiopia', region:'Amhara Region', lat:11.8, lng:39.2, ha:2200, est:3300, status:'ACTIVE', chain:'CHAIN-060', price:11.50, vtons:3000, tok:'ETH-004' },
  { on:'Dagne Bekele',      oe:'dagne.bekele@example.com',      oc:'Ethiopia',  ob:'Clean cooking entrepreneur distributing improved cookstoves in SNNPR.',
    title:'SNNPR Clean Cooking Programme', desc:"Distribution of 12,000 improved biomass cookstoves to rural households across 8 woredas in the Southern Nations, Nationalities and Peoples' Region, reducing firewood consumption by 55% per household.",
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Ethiopia', region:'SNNPR', lat:6.5, lng:37.8, ha:0.1, est:2640, hh:12000, fuel:3300000, status:'UNDER_REVIEW', chain:'CHAIN-061', price:11.00, vtons:2640, tok:'ETH-005' },
  { on:'Elijah Omondi',     oe:'elijah.omondi@example.com',     oc:'Tanzania',  ob:'Solar entrepreneur electrifying rural villages in Mwanza Region.',
    title:'Mwanza Rural Solar Network', desc:"A 200 kW distributed solar network across 12 villages in the Mwanza Region, replacing diesel generators and kerosene lamps for 1,800 households. Mobile-money collection achieves 94% payment rate.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Tanzania', region:'Mwanza Region', lat:-2.5, lng:32.9, ha:0.6, est:820, capKw:200, hh:1800, status:'ACTIVE', chain:'CHAIN-062', price:14.00, vtons:820, tok:'TZA-004' },
  { on:'Agnes Nakato',      oe:'agnes.nakato@example.com',      oc:'Uganda',    ob:'Micro-hydro developer in the Elgon highlands of eastern Uganda.',
    title:'Mount Elgon Micro-Hydro Plant', desc:'A 45 kW run-of-river micro-hydro plant on the Sironko River at 1,800 m elevation, providing 24-hour electricity to 620 highland households and a primary school — replacing diesel generators used since the 1980s.',
    ptype:'CLEAN_ENERGY', energy:'MICRO_HYDRO', country:'Uganda', region:'Eastern Uganda', lat:1.1, lng:34.5, ha:0.2, est:860, capKw:45, hh:620, status:'ACTIVE', chain:'CHAIN-063', price:16.00, vtons:860, tok:'UGA-004' },
  { on:'Pierre Hakizimana', oe:'pierre.hakizimana@example.com', oc:'Rwanda',    ob:'Community biogas technician in the Eastern Province.',
    title:'Eastern Rwanda Biogas Cluster', desc:"Installation of 240 household biogas digesters in the Ngoma and Kayonza districts of Rwanda's Eastern Province, processing crop residues and cow dung into cooking gas that replaces wood and charcoal for 1,200 households.",
    ptype:'CLEAN_ENERGY', energy:'BIOGAS', country:'Rwanda', region:'Eastern Province', lat:-2.2, lng:30.4, ha:0.3, est:1150, capKw:60, hh:1200, fuel:193200, status:'ACTIVE', chain:'CHAIN-064', price:14.50, vtons:1150, tok:'RWA-003' },
  { on:'Ousmane Diallo',    oe:'ousmane.diallo@example.com',    oc:'Senegal',   ob:'Regreening specialist in the Groundnut Basin of central Senegal.',
    title:'Peanut Basin Agroforestry Revival', desc:"Farmer-managed natural regeneration on 1,600 ha of the Senegalese Groundnut Basin. Re-establishing Faidherbia albida trees raises crop yields by 30% while sequestering 1.4 tCO₂/ha/year.",
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Senegal', region:'Diourbel Region', lat:14.6, lng:-16.2, ha:1600, est:2240, status:'ACTIVE', chain:'CHAIN-065', price:10.50, vtons:2000, tok:'SEN-002' },
  { on:'Kumba Jallow',      oe:'kumba.jallow@example.com',      oc:'Gambia',    ob:'Mangrove restoration biologist at the Gambia River estuary.',
    title:'Gambia River Estuary Mangroves', desc:"Restoration of 220 ha of degraded mangrove forest along the Gambia River estuary, one of West Africa's most ecologically significant estuarine systems. Community co-management involves 18 riverside villages.",
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Gambia', region:'Western Division', lat:13.4, lng:-16.6, ha:220, est:1980, status:'ACTIVE', chain:'CHAIN-066', price:22.00, vtons:1780, tok:'GMB-001' },
  { on:'Modou Bah',         oe:'modou.bah@example.com',         oc:'Mauritania', ob:'Desert-edge farmer practising dune stabilisation in the Sahel-Sahara transition zone.',
    title:'Mauritanian Sahel Dune Stabilisation', desc:'Stabilisation of 3,200 ha of active sand dunes at the Sahel-Sahara boundary using traditional zai pits and windbreak plantings of Prosopis, Acacia and Balanites. Project prevents desertification of adjacent farmland supporting 8,000 people.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Mauritania', region:'Hodh Ech Chargui', lat:16.5, lng:-8.3, ha:3200, est:3200, status:'PENDING', chain:'CHAIN-067', price:10.00, vtons:2880, tok:'MRT-001' },
  { on:'Ama Asante',        oe:'ama.asante@example.com',        oc:'Ghana',     ob:"Solar energy developer running community solar systems in Ghana's Northern Region.",
    title:'Northern Ghana Community Solar', desc:"A 180 kW distributed solar network across 9 rural communities in Ghana's Northern Region, ending energy poverty for 1,500 households and enabling refrigeration for a health clinic.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Ghana', region:'Northern Region', lat:9.5, lng:-1.0, ha:0.7, est:680, capKw:180, hh:1500, status:'ACTIVE', chain:'CHAIN-068', price:13.50, vtons:680, tok:'GHA-002' },
  { on:'Chukwu Eze',        oe:'chukwu.eze@example.com',        oc:'Nigeria',   ob:'Community biogas engineer in the Niger Delta wetlands.',
    title:'Niger Delta Biogas Network', desc:'Installation of 300 community biogas digesters across the Niger Delta wetland communities, processing fish-processing waste and cassava peels into clean cooking fuel for 1,500 households.',
    ptype:'CLEAN_ENERGY', energy:'BIOGAS', country:'Nigeria', region:'Rivers State', lat:4.8, lng:6.7, ha:0.4, est:1380, capKw:75, hh:1500, fuel:252000, status:'ACTIVE', chain:'CHAIN-069', price:13.00, vtons:1380, tok:'NGA-003' },
  { on:'Adjoa Mensah',      oe:'adjoa.mensah@example.com',      oc:'Ghana',     ob:'Coastal mangrove conservationist at the Volta River delta.',
    title:'Volta Delta Mangrove Restoration', desc:'Restoration of 260 ha of mangrove forest at the Volta River delta, where dredging and coastal fishing activities have degraded the original mangrove fringe. Project works with 14 fishing communities and trains 60 mangrove nursery workers.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Ghana', region:'Volta Region', lat:5.9, lng:0.5, ha:260, est:2340, status:'ACTIVE', chain:'CHAIN-070', price:21.00, vtons:2100, tok:'GHA-003' },
  { on:'Abdoulaye Kouyaté', oe:'abdoulaye.kouyate@example.com', oc:'Guinea',    ob:"Rural solar entrepreneur in Guinea's Forest Region.",
    title:'Guinée Forestière Solar Access', desc:"A 140 kW distributed solar system across 8 communities in the Forest Region of Guinea, replacing kerosene lamps for 1,200 households. Financed through a PAYG mobile money model requiring only a $10 deposit.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Guinea', region:'Nzérékoré Region', lat:8.0, lng:-9.5, ha:0.5, est:520, capKw:140, hh:1200, status:'PENDING', chain:'CHAIN-071', price:13.00, vtons:520, tok:'GIN-002' },
  { on:'Kouassi Coulibaly', oe:'kouassi.coulibaly@example.com', oc:"Côte d'Ivoire", ob:'Wetland hydrologist at the Sassandra River floodplain.',
    title:'Sassandra River Wetland Carbon', desc:"Protection of 1,400 ha of seasonal floodplain wetlands along the Sassandra River in southwestern Côte d'Ivoire. PES scheme pays riverside communities to maintain natural flood cycles rather than draining for rice cultivation.",
    ptype:'LAND_RESTORATION', land:'WETLAND', country:"Côte d'Ivoire", region:'Bas-Sassandra', lat:5.1, lng:-6.1, ha:1400, est:9800, status:'ACTIVE', chain:'CHAIN-072', price:19.00, vtons:8800, tok:'CIV-002' },
  { on:'Idrissa Baldé',     oe:'idrissa.balde@example.com',     oc:'Guinea-Bissau', ob:'Improved cookstove trainer and distributor in Bissau.',
    title:'Bissau Improved Cookstoves Phase II', desc:'Distribution of 3,500 improved biomass cookstoves in peri-urban Bissau, reducing charcoal consumption by 55% and cutting indoor PM2.5 exposure by 70% for 17,500 people.',
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Guinea-Bissau', region:'Bissau Region', lat:11.8, lng:-15.5, ha:0.1, est:770, hh:3500, fuel:962500, status:'UNDER_REVIEW', chain:'CHAIN-073', price:11.50, vtons:770, tok:'GNB-002' },
  { on:'Serge Mbida',       oe:'serge.mbida@example.com',       oc:'Cameroon',  ob:"Community biogas developer in Cameroon's Western Highlands.",
    title:'Western Cameroon Biogas Programme', desc:"Installation of 350 biogas digesters across 12 cooperatives in the fertile Western Highlands of Cameroon, processing cattle and pig manure into cooking gas. Each digester prevents the harvest of approximately 2.5 tonnes of firewood per year.",
    ptype:'CLEAN_ENERGY', energy:'BIOGAS', country:'Cameroon', region:'West Region', lat:5.5, lng:10.4, ha:0.4, est:1610, capKw:88, hh:1750, fuel:270900, status:'ACTIVE', chain:'CHAIN-074', price:14.00, vtons:1610, tok:'CMR-003' },
  { on:'Bonaventure Moukoko', oe:'bonaventure.moukoko@example.com', oc:'DR Congo', ob:"Solar entrepreneur in Kinshasa's peri-urban communes.",
    title:'Kinshasa Solar Mini-Grid', desc:"A 350 kW solar mini-grid network serving 4 peri-urban communes of Kinshasa — one of Africa's largest cities — replacing expensive diesel fuel with clean electricity at 60% lower cost. Battery storage covers demand through the night.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'DR Congo', region:'Kinshasa Province', lat:-4.3, lng:15.3, ha:1.0, est:1400, capKw:350, hh:2800, status:'ACTIVE', chain:'CHAIN-075', price:14.50, vtons:1400, tok:'COD-003' },
  { on:'Théophile Nkemdirim', oe:'theophile.nkemdirim@example.com', oc:'Gabon',  ob:'Wetland ecologist protecting the Ogooué River floodplain.',
    title:'Ogooué River Floodplain Wetlands', desc:"Protection of 2,800 ha of the Ogooué River floodplain wetlands in central Gabon — a critical breeding habitat for Nile crocodiles, sitatunga antelope, and forest elephant. PES agreement with the Omyène fishing communities.",
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'Gabon', region:'Moyen-Ogooué', lat:-0.8, lng:10.8, ha:2800, est:19600, status:'ACTIVE', chain:'CHAIN-076', price:20.00, vtons:17640, tok:'GAB-002' },
  { on:'Arnauld Motema',    oe:'arnauld.motema@example.com',    oc:'Republic of Congo', ob:"Solar energy entrepreneur in Brazzaville's satellite towns.",
    title:'Brazzaville Peri-Urban Solar', desc:"Distributed solar PV network of 160 kW serving 1,400 households across 6 satellite towns around Brazzaville, reducing dependence on the unreliable SNEL grid and eliminating kerosene use in low-income households.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Republic of Congo', region:'Pool Region', lat:-4.5, lng:15.1, ha:0.6, est:640, capKw:160, hh:1400, status:'UNDER_REVIEW', chain:'CHAIN-077', price:14.00, vtons:640, tok:'COG-002' },
  { on:'Fidèle Ngassam',    oe:'fidele.ngassam@example.com',    oc:'Central African Republic', ob:'Forest conservation ranger in the Lobaye prefecture.',
    title:'Lobaye Forest Fragment Conservation', desc:'Protection of 720 ha of forest fragments in the Lobaye prefecture of CAR — a heavily degraded landscape where less than 30% of original forest cover remains. The project trains 28 community rangers and funds forest boundary mapping.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Central African Republic', region:'Lobaye', lat:3.9, lng:17.4, ha:720, est:3600, status:'PENDING', chain:'CHAIN-078', price:22.00, vtons:3240, tok:'CAF-002' },
  { on:'Ibrahim Adoum',     oe:'ibrahim.adoum@example.com',     oc:'Chad',      ob:"Solar energy developer in N'Djamena's outskirts.",
    title:"N'Djamena Peri-Urban Solar", desc:"A 120 kW ground-mounted solar farm serving 900 households in the peri-urban N'Djamena zone, where erratic STEE grid power forces families to run expensive diesel generators or use kerosene lamps.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Chad', region:"N'Djamena", lat:12.1, lng:15.1, ha:0.5, est:480, capKw:120, hh:900, status:'ACTIVE', chain:'CHAIN-079', price:13.00, vtons:480, tok:'TCD-002' },
  { on:'Alfonso Ela Nvono', oe:'alfonso.nvono@example.com',     oc:'Equatorial Guinea', ob:'Forest ranger protecting the Rio Muni rainforest on mainland Equatorial Guinea.',
    title:'Rio Muni Lowland Rainforest', desc:'Conservation of 640 ha of lowland rainforest in the Rio Muni continental territory — one of the least-studied rainforests in Central Africa. The project establishes the first community-managed conservation zone outside existing national parks.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Equatorial Guinea', region:'Kié-Ntem', lat:2.0, lng:10.5, ha:640, est:3200, status:'ACTIVE', chain:'CHAIN-080', price:23.00, vtons:2880, tok:'GNQ-002' },
  { on:'João Viegas',       oe:'joao.viegas@example.com',       oc:'São Tomé and Príncipe', ob:'Forest biologist protecting the endemic-rich Obo Natural Park on São Tomé.',
    title:'Obo Natural Park Forest Reserve', desc:'Conservation of 480 ha of primary rainforest in the Obo Natural Park — home to 29 endemic bird species and the critically endangered São Tomé shrew. Carbon revenue funds 20 park ranger positions.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'São Tomé and Príncipe', region:'Água Grande', lat:0.2, lng:6.6, ha:480, est:2400, status:'ACTIVE', chain:'CHAIN-081', price:24.00, vtons:2160, tok:'STP-001' },
  { on:'Themba Nkosi',      oe:'themba.nkosi@example.com',      oc:'South Africa', ob:'Solar energy developer in the Eastern Cape rural communities.',
    title:'Eastern Cape Rural Solar Programme', desc:'A 300 kW distributed solar network across 15 rural villages in the Eastern Cape, providing electricity to 2,500 households who had no grid access. System includes smart meters and community-owned revenue models.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'South Africa', region:'Eastern Cape', lat:-31.5, lng:28.5, ha:1.0, est:950, capKw:300, hh:2500, status:'ACTIVE', chain:'CHAIN-082', price:12.50, vtons:950, tok:'ZAF-002' },
  { on:'Rudo Mhango',       oe:'rudo.mhango@example.com',       oc:'Zimbabwe',  ob:"Solar entrepreneur in Matabeleland's semi-arid communities.",
    title:'Matabeleland Solar Electrification', desc:"Off-grid solar for 1,600 households across 11 villages in Matabeleland North, one of Zimbabwe's most energy-poor regions. Each household receives a 100 Wp system with 4 LED lights, a phone charging port, and a DC fan.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Zimbabwe', region:'Matabeleland North', lat:-19.5, lng:27.8, ha:0.6, est:640, capKw:160, hh:1600, status:'ACTIVE', chain:'CHAIN-083', price:13.00, vtons:640, tok:'ZWE-002' },
  { on:'Tumelo Seretse',    oe:'tumelo.seretse@example.com',    oc:'Botswana',  ob:'Solar developer in the Kalahari Desert communities.',
    title:'Kalahari Desert Solar Farm', desc:'A 200 kW ground-mounted solar installation in the Central Kalahari, powering 1,200 Basarwa (San) households who rely on DMSB diesel generators costing 5× grid electricity.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Botswana', region:'Central District', lat:-22.0, lng:23.5, ha:0.9, est:780, capKw:200, hh:1200, status:'ACTIVE', chain:'CHAIN-084', price:12.00, vtons:780, tok:'BWA-002' },
  { on:'Graciano Fumo',     oe:'graciano.fumo@example.com',     oc:'Mozambique', ob:'Forest ranger protecting miombo woodland in Niassa province.',
    title:'Niassa Miombo Forest Protection', desc:"REDD+ protection of 2,600 ha of miombo woodland in Niassa Province — Mozambique's largest and least-populated province. The project prevents charcoal production that supplies Lichinga city, employing 35 rangers from Macua communities.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Mozambique', region:'Niassa Province', lat:-13.2, lng:36.0, ha:2600, est:13000, status:'ACTIVE', chain:'CHAIN-085', price:19.00, vtons:11700, tok:'MOZ-002' },
  { on:'Chimwemwe Phiri',   oe:'chimwemwe.phiri@example.com',   oc:'Malawi',    ob:'Solar energy developer at the shores of Lake Malawi.',
    title:'Lake Malawi Shore Solar Network', desc:"A 150 kW distributed solar system for 18 fishing villages along Lake Malawi's western shore, replacing kerosene lighting and enabling fish-smoking kilns to use electric heaters, reducing both fuel costs and post-harvest losses.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Malawi', region:'Central Region', lat:-13.5, lng:34.0, ha:0.6, est:580, capKw:150, hh:1800, status:'ACTIVE', chain:'CHAIN-086', price:13.50, vtons:580, tok:'MWI-002' },
  { on:'Limakatso Mokone',  oe:'limakatso.mokone@example.com',  oc:'Lesotho',   ob:'Grassland conservation officer at the Maloti-Drakensberg Highlands.',
    title:'Maloti Highlands Grassland Carbon', desc:'Conservation of 4,200 ha of subalpine Afromontane grassland in the Maloti Highlands — one of Africa\'s most threatened grassland ecosystems, home to the Cape vulture and Drakensberg rockjumper. Payments to herders for reduced burning.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Lesotho', region:'Thaba-Tseka District', lat:-29.8, lng:28.9, ha:4200, est:5040, status:'ACTIVE', chain:'CHAIN-087', price:11.00, vtons:4540, tok:'LSO-002' },
  { on:'Beatriz Chilundo',  oe:'beatriz.chilundo@example.com',  oc:'Mozambique', ob:'Wetland conservation officer at the Quirimbas Archipelago.',
    title:'Quirimbas Mangrove Archipelago', desc:"Restoration of 340 ha of mangrove forest across the Quirimbas Archipelago National Park — one of East Africa's most pristine marine protected areas. Blue carbon stacking with artisanal fishery payments to 22 island communities.",
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Mozambique', region:'Cabo Delgado', lat:-11.8, lng:40.7, ha:340, est:3060, status:'UNDER_REVIEW', chain:'CHAIN-088', price:23.00, vtons:2750, tok:'MOZ-003' },
  { on:'Gaopalelwe Molefe', oe:'gaopalelwe.molefe@example.com', oc:'South Africa', ob:'Biogas developer in North West Province.',
    title:'North West Province Biogas Initiative', desc:'Community biogas programme installing 180 digesters on dairy farms in North West Province, converting cow dung into cooking and heating gas for farmworker households and reducing methane emissions from open lagoons.',
    ptype:'CLEAN_ENERGY', energy:'BIOGAS', country:'South Africa', region:'North West Province', lat:-25.5, lng:26.2, ha:0.3, est:830, capKw:45, hh:900, fuel:140400, status:'ACTIVE', chain:'CHAIN-089', price:14.00, vtons:830, tok:'ZAF-003' },
  { on:'Soufiane Belkacem', oe:'soufiane.belkacem@example.com', oc:'Morocco',   ob:'Wind energy developer in the Tarfaya coastal corridor.',
    title:'Tarfaya Coastal Wind Energy', desc:"Community wind power installation of 280 kW in the Tarfaya coastal zone — Morocco's premier wind corridor with average wind speeds of 9.5 m/s. The project provides electricity to 2,000 fishing households previously served only by diesel generators.",
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Morocco', region:'Laâyoune-Sakia El Hamra', lat:27.9, lng:-12.9, ha:15, est:1120, capKw:280, hh:2000, status:'ACTIVE', chain:'CHAIN-090', price:12.50, vtons:1120, tok:'MAR-002' },
  { on:'Imed Ferchichi',    oe:'imed.ferchichi@example.com',    oc:'Tunisia',   ob:'Dryland farmer restoring degraded steppe in the central Tunisian interior.',
    title:'Sidi Bouzid Rangeland Restoration', desc:'Restoration of 1,800 ha of severely degraded steppe rangeland in Sidi Bouzid Governorate using Cactus Opuntia and traditional Jessour water harvesting earthworks, reducing soil erosion by 60%.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Tunisia', region:'Sidi Bouzid Governorate', lat:35.0, lng:9.5, ha:1800, est:1800, status:'ACTIVE', chain:'CHAIN-091', price:10.50, vtons:1620, tok:'TUN-002' },
  { on:'Yusuf Abdelmawla',  oe:'yusuf.abdelmawla@example.com',  oc:'Sudan',     ob:'Grassland conservationist in the Blue Nile savanna corridor.',
    title:'Blue Nile Savanna Conservation', desc:"Conservation of 3,600 ha of Sudan Guinea savanna in the Blue Nile State — a critical wildlife corridor linking Ethiopia's western forests with Sudan's remaining woodland. Community rangers prevent conversion to sesame farming.",
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Sudan', region:'Blue Nile State', lat:11.5, lng:33.5, ha:3600, est:5400, status:'ACTIVE', chain:'CHAIN-092', price:11.00, vtons:4860, tok:'SDN-002' },
  { on:'Amr Khalil',        oe:'amr.khalil@example.com',        oc:'Egypt',     ob:'Wind energy developer in the Gulf of Suez.',
    title:'Gulf of Suez Wind Farm', desc:"A 320 kW wind installation at Ras Gharib on the Gulf of Suez — one of the world's premier wind corridors with consistent winds of 8–10 m/s. Displaces 480 tonnes of heavy oil combustion annually from the national grid.",
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Egypt', region:'Red Sea Governorate', lat:28.3, lng:33.1, ha:18, est:1280, capKw:320, hh:2200, status:'ACTIVE', chain:'CHAIN-093', price:11.50, vtons:1280, tok:'EGY-002' },
  { on:'Lalatiana Rasoloarison', oe:'lalatiana.rasoloarison@example.com', oc:'Madagascar', ob:'Mangrove restoration biologist at the Betsiboka River delta.',
    title:'Betsiboka Delta Mangrove Restoration', desc:'Restoration of 360 ha of the Betsiboka River delta mangroves — severely damaged by upstream deforestation causing massive siltation. The project works with 26 coastal villages to replant Avicennia and Rhizophora species.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Madagascar', region:'Boeny Region', lat:-16.0, lng:46.3, ha:360, est:3240, status:'ACTIVE', chain:'CHAIN-094', price:21.00, vtons:2916, tok:'MDG-002' },
  { on:'Vianny Andriamasy', oe:'vianny.andriamasy@example.com', oc:'Madagascar', ob:'Dry forest conservationist in the Menabe region of western Madagascar.',
    title:'Menabe Dry Forest Conservation', desc:"REDD+ protection of 1,400 ha of the critically endangered Malagasy dry deciduous forest in Menabe — home to the baobab groves immortalised in the 'Avenue of the Baobabs.' Less than 10% of this forest type remains intact.",
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Madagascar', region:'Menabe Region', lat:-20.3, lng:44.4, ha:1400, est:7000, status:'ACTIVE', chain:'CHAIN-095', price:23.00, vtons:6300, tok:'MDG-003' },
  { on:'Riadh Raherimanantsoa', oe:'riadh.raherimanantsoa@example.com', oc:'Comoros', ob:'Solar energy developer on Anjouan island.',
    title:'Anjouan Island Solar Electrification', desc:"A 90 kW distributed solar system on Anjouan island — the most densely populated of the Comoros islands — replacing diesel-only electricity for 800 households and a health centre. Operated via a cooperative with elected village energy committees.",
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Comoros', region:'Anjouan', lat:-12.2, lng:44.4, ha:0.4, est:360, capKw:90, hh:800, status:'ACTIVE', chain:'CHAIN-096', price:14.00, vtons:360, tok:'COM-002' },
  { on:'Désiré Nhancale',   oe:'desire.nhancale@example.com',   oc:'Mozambique', ob:'Blue carbon scientist at the Maputo Bay mangrove coast.',
    title:'Maputo Bay Mangrove Carbon', desc:"Restoration of 280 ha of mangrove forest in Maputo Bay — Mozambique's capital harbour — protecting the city's coastline from storm surge while generating blue carbon credits at 8 tCO₂/ha/year in the high-biomass bay ecosystem.",
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Mozambique', region:'Maputo Province', lat:-25.8, lng:32.8, ha:280, est:2520, status:'ACTIVE', chain:'CHAIN-097', price:22.00, vtons:2268, tok:'MOZ-004' },
  { on:'Hamza Abdi',        oe:'hamza.abdi@example.com',        oc:'Somalia',   ob:'Mangrove restoration coordinator at the Jubba River delta.',
    title:'Jubba River Mangrove Restoration', desc:'Restoration of 400 ha of mangrove forest at the Jubba River delta — one of East Africa\'s largest remaining mangrove systems, severely damaged by charcoal harvesting during conflict years. Community governance committees from 8 coastal clans co-manage the project.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Somalia', region:'Lower Jubba', lat:0.4, lng:42.5, ha:400, est:3600, status:'PENDING', chain:'CHAIN-098', price:20.00, vtons:3240, tok:'SOM-001' },
  { on:'Warsame Mohamed',   oe:'warsame.mohamed@example.com',   oc:'Djibouti',  ob:'Solar energy developer serving remote pastoralist communities.',
    title:'Djibouti Pastoralist Solar Network', desc:'Distributed solar for 600 Afar and Somali pastoralist households in the remote interior of Djibouti, replacing kerosene lamps and enabling mobile phone charging. Each system pairs an 80 Wp panel with a lithium battery and 3 LED bulbs.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Djibouti', region:'Obock Region', lat:11.9, lng:42.8, ha:0.3, est:240, capKw:48, hh:600, status:'ACTIVE', chain:'CHAIN-099', price:13.50, vtons:240, tok:'DJI-001' },
  { on:'Tesfamariam Haile', oe:'tesfamariam.haile@example.com', oc:'Eritrea',   ob:'Agroforestry specialist restoring degraded farmland in the Eritrean highlands.',
    title:'Eritrean Highlands Agroforestry', desc:"Farmer-managed natural regeneration and agroforestry on 2,400 ha of severely degraded highland farms in Eritrea, where decades of conflict and overgrazing stripped tree cover. Re-establishing Olea europaea, Juniperus, and Acacia on terraced farms with 3,800 participating households.",
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Eritrea', region:'Maekel Region', lat:15.3, lng:38.9, ha:2400, est:3600, status:'ACTIVE', chain:'CHAIN-100', price:10.50, vtons:3240, tok:'ERI-001' },
];

// IoT helpers
function makeEnergyReadings(deviceId: string, projectId: string, baseKwh: number, seed: number) {
  const readings = [];
  const now = new Date('2025-05-21T12:00:00Z');
  for (let i = 24; i >= 1; i -= 2) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const kwh = +(baseKwh * (1 + Math.sin(i * seed) * 0.15)).toFixed(2);
    readings.push({ deviceId, projectId, kwhGenerated: kwh, co2AvoidedKg: +(kwh * 0.562).toFixed(2), temperatureC: +(22 + Math.sin(i * 0.5) * 6).toFixed(1), humidityPct: +(55 + Math.cos(i * 0.3) * 15).toFixed(1), recordedAt: d });
  }
  return readings;
}
function makeBiogasReadings(deviceId: string, projectId: string) {
  const readings = [];
  const now = new Date('2025-05-21T12:00:00Z');
  for (let i = 24; i >= 1; i -= 2) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    readings.push({ deviceId, projectId, kwhGenerated: +(1.8 + Math.sin(i * 0.4) * 0.4).toFixed(2), co2AvoidedKg: +(4.2 + Math.cos(i * 0.3) * 0.8).toFixed(2), gasFlowM3h: +(0.8 + Math.sin(i * 0.6) * 0.2).toFixed(2), pressureKpa: +(1.2 + Math.cos(i * 0.2) * 0.1).toFixed(2), fuelDisplacedKg: +(2.1 + Math.sin(i * 0.5) * 0.3).toFixed(2), temperatureC: +(28 + Math.sin(i * 0.4) * 5).toFixed(1), humidityPct: +(62 + Math.cos(i * 0.5) * 12).toFixed(1), recordedAt: d });
  }
  return readings;
}

async function main() {
  console.log('🌍  Seeding Kabon.Africa — 100 projects, 25 buyers…');

  // 0. Clear everything except the production admin account
  await prisma.purchase.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.carbonCredit.deleteMany();
  await prisma.deviceReading.deleteMany();
  await prisma.ioTDevice.deleteMany();
  await prisma.satelliteSnapshot.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany({ where: { email: { not: 'admin@kabon.africa' } } });
  console.log('  ✓ Database cleared (admin@kabon.africa preserved)');

  // 1. Verifiers
  const [verifier1, verifier2] = await Promise.all([
    prisma.user.create({ data: { email:'verifier@kabon.africa', passwordHash:PW, name:'Dr. Sipho Dlamini', role:'VERIFIER', country:'South Africa', kycVerified:true, emailVerified:true, bio:'Environmental scientist. PhD in Ecosystem Carbon Accounting, Wits University.' } }),
    prisma.user.create({ data: { email:'verifier2@kabon.africa', passwordHash:PW, name:'Dr. Fatoumata Camara', role:'VERIFIER', country:'Guinea', kycVerified:true, emailVerified:true, bio:'Forest ecologist specialising in West and Central African carbon accounting.' } }),
  ]);
  console.log('  ✓ Verifiers created');

  // 2. 25 Buyers
  const buyers = await Promise.all(
    BUYER_DEFS.map(b => prisma.user.create({ data: { email:b.email, passwordHash:PW, name:b.name, role:'BUYER', country:b.country, kycVerified:true, emailVerified:true, bio:b.bio } }))
  );
  console.log(`  ✓ ${buyers.length} buyers created`);

  // 3. All 100 projects
  const allDefs = [...DEFS, ...EXTRA_DEFS];
  const verifiers = [verifier1.id, verifier2.id];
  const createdListings: { id: string; pricePerTon: number }[] = [];

  for (let i = 0; i < allDefs.length; i++) {
    const d = allDefs[i];
    const typeKey = d.energy ?? d.land ?? 'FOREST';
    const photos = ph(typeKey);

    const owner = await prisma.user.create({ data: {
      email:d.oe, passwordHash:PW, name:d.on, role:'LANDOWNER', country:d.oc, kycVerified:true, emailVerified:true, bio:d.ob,
    }});

    const project = await prisma.project.create({ data: {
      ownerId:owner.id, title:d.title, description:d.desc,
      projectType:d.ptype, landType:d.land as any ?? undefined, energyType:d.energy as any ?? undefined,
      country:d.country, region:d.region, lat:d.lat, lng:d.lng,
      hectares:d.ha, estimatedTons:d.est, capacityKw:d.capKw, householdsServed:d.hh, fuelDisplacedKgY:d.fuel,
      status:d.status as any, onChainId:d.chain, mediaUrls:photos,
    }});

    const isApproved = d.status === 'ACTIVE' || d.status === 'VERIFIED';
    await prisma.verification.create({ data: {
      projectId:project.id,
      verifierId:isApproved ? verifiers[i % 2] : undefined,
      status:isApproved ? 'APPROVED' : d.status === 'UNDER_REVIEW' ? 'IN_PROGRESS' : 'PENDING',
      carbonTons:isApproved ? d.vtons : undefined,
      notes:isApproved
        ? `Field verification completed. ${d.ptype === 'CLEAN_ENERGY' ? 'Energy generation logs cross-checked against IoT meter data.' : 'NDVI analysis and permanent sample plots confirm sequestration.'} Recommend credit issuance.`
        : 'Awaiting verifier assignment.',
      txHash:isApproved ? `0xverify${d.tok.replace(/-/g,'').toLowerCase()}` : undefined,
    }});

    if (d.ptype === 'LAND_RESTORATION' && isApproved) {
      await prisma.satelliteSnapshot.createMany({ data: [
        { projectId:project.id, ndvi:+(0.45 + Math.random()*0.35).toFixed(2), cloudCover:Math.floor(Math.random()*25), capturedAt:new Date('2024-03-15'), source:'sentinel-2-l2a' },
        { projectId:project.id, ndvi:+(0.50 + Math.random()*0.35).toFixed(2), cloudCover:Math.floor(Math.random()*25), capturedAt:new Date('2024-09-01'), source:'sentinel-2-l2a' },
        { projectId:project.id, ndvi:+(0.55 + Math.random()*0.30).toFixed(2), cloudCover:Math.floor(Math.random()*20), capturedAt:new Date('2025-02-20'), source:'sentinel-2-l2a' },
      ]});
    }

    if (isApproved) {
      const creditAmt = Math.round(d.vtons * 0.85);
      const credit = await prisma.carbonCredit.create({ data: {
        projectId:project.id, tokenId:`TOKEN-${d.tok}`,
        amount:creditAmt, bufferTons:Math.round(d.vtons*0.15),
        vintageYear:2024, status:'LISTED',
        mintTxHash:`0xmint${d.tok.replace(/-/g,'').toLowerCase()}`,
      }});
      const listing = await prisma.listing.create({ data: {
        creditId:credit.id, pricePerTon:d.price, totalTons:creditAmt,
        currency:'USDC', status:'ACTIVE',
        txHash:`0xlist${d.tok.replace(/-/g,'').toLowerCase()}`,
      }});
      createdListings.push({ id:listing.id, pricePerTon:d.price });
    }

    if (d.ptype === 'CLEAN_ENERGY' && isApproved) {
      const device = await prisma.ioTDevice.create({ data: {
        projectId:project.id, deviceKey:`IOT-${d.tok}-001`,
        deviceType:d.energy === 'BIOGAS' ? 'FLOW_METER' : (d.energy === 'COOKSTOVES' || d.energy === 'BIOCHARCOAL') ? 'FUEL_SENSOR' : 'ENERGY_METER',
        label:d.energy === 'BIOGAS' ? 'Central Digester Flow Meter' : d.energy === 'COOKSTOVES' ? 'Charcoal Displacement Monitor' : d.energy === 'BIOCHARCOAL' ? 'Kiln Output Scale' : 'Main Inverter / Turbine Meter',
        lat:d.lat, lng:d.lng, active:true, lastSeenAt:new Date('2025-05-21T10:00:00Z'),
      }});
      if (d.energy === 'BIOGAS') {
        await prisma.deviceReading.createMany({ data:makeBiogasReadings(device.id, project.id) });
      } else {
        await prisma.deviceReading.createMany({ data:makeEnergyReadings(device.id, project.id, (d.capKw ?? 50)*0.8, 1+i*0.3) });
      }
    }

    if ((i + 1) % 20 === 0) console.log(`  … ${i+1} / ${allDefs.length} projects seeded`);
  }
  console.log(`  ✓ ${allDefs.length} projects created`);

  // 4. Purchases — spread across all 25 buyers
  if (createdListings.length >= 20) {
    const purchaseData = [
      { idx:0,  buyerIdx:0,  tons:500 },  { idx:1,  buyerIdx:1,  tons:200 },
      { idx:3,  buyerIdx:2,  tons:100 },  { idx:5,  buyerIdx:3,  tons:800 },
      { idx:8,  buyerIdx:4,  tons:300 },  { idx:12, buyerIdx:5,  tons:1000 },
      { idx:15, buyerIdx:6,  tons:250 },  { idx:20, buyerIdx:7,  tons:500 },
      { idx:23, buyerIdx:8,  tons:400 },  { idx:25, buyerIdx:9,  tons:600 },
      { idx:28, buyerIdx:10, tons:350 },  { idx:30, buyerIdx:11, tons:450 },
      { idx:33, buyerIdx:12, tons:750 },  { idx:35, buyerIdx:13, tons:200 },
      { idx:38, buyerIdx:14, tons:300 },  { idx:40, buyerIdx:15, tons:500 },
      { idx:42, buyerIdx:16, tons:1200 }, { idx:45, buyerIdx:17, tons:400 },
      { idx:48, buyerIdx:18, tons:280 },  { idx:50, buyerIdx:19, tons:600 },
      { idx:53, buyerIdx:20, tons:150 },  { idx:55, buyerIdx:21, tons:900 },
      { idx:58, buyerIdx:22, tons:350 },  { idx:60, buyerIdx:23, tons:500 },
      { idx:63, buyerIdx:24, tons:420 },
    ].filter(p => p.idx < createdListings.length && p.buyerIdx < buyers.length);

    await Promise.all(purchaseData.map((p, n) => {
      const listing = createdListings[p.idx];
      const totalPrice = +(p.tons * listing.pricePerTon).toFixed(2);
      const feeAmount  = +(totalPrice * 0.02).toFixed(2);
      const retired    = n % 5 === 2;
      return prisma.purchase.create({ data: {
        listingId:listing.id, buyerId:buyers[p.buyerIdx].id,
        totalTons:p.tons, totalPrice, feeAmount, buyerTotal:+(totalPrice+feeAmount).toFixed(2),
        currency:'USDC', txHash:`0xpur${String(n+1).padStart(3,'0')}`,
        settlementStatus:'SETTLED',
        retired, retirementTxHash:retired ? `0xret${String(n+1).padStart(3,'0')}` : undefined,
        nftTokenId:retired ? `RET-CERT-${String(n+1).padStart(3,'0')}` : undefined,
        retirementReason:retired ? 'ANNUAL_REPORT' : undefined,
        retiredAt:retired ? new Date('2025-04-15') : undefined,
      }});
    }));
    console.log(`  ✓ ${purchaseData.length} purchases created across ${buyers.length} buyers`);
  }

  console.log(`
✅  Seed complete!

  100 projects across 43 African countries
  25 buyers (international & African corporations)
  2 verifiers
  admin@kabon.africa preserved (existing password unchanged)

Demo accounts (password: "password"):
  verifier@kabon.africa   → Dr. Sipho Dlamini (South Africa)
  verifier2@kabon.africa  → Dr. Fatoumata Camara (Guinea)
  buyer.greenfuture@example.com → GreenFuture Corp (Germany)
  buyer.microsoft@example.com   → Microsoft Climate Innovation (USA)
  buyer.mtn@example.com         → MTN Foundation Climate (South Africa)
  buyer.safaricom@example.com   → Safaricom Green Pledge (Kenya)
  … plus 21 more buyers

100 landowner accounts: firstname.lastname@example.com (password: "password")
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
