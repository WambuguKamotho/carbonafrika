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
const ph = (t: string, i = 0) => PHOTOS[t]?.slice(i, i + 2) ?? [];

// ─── 56 Project definitions ────────────────────────────────────────────────
// Fields: [ownerName, ownerEmail, ownerCountry, ownerBio, title, desc, type, subtype, country, region, lat, lng, ha, tons, status, onChain, capKw?, hh?, price, verTons, tokenSuffix]
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

const DEFS: PD[] = [
  // ── EAST AFRICA ────────────────────────────────────────────────────────────
  { on:'James Mwangi',       oe:'james.mwangi@example.com',       oc:'Kenya',       ob:'Third-generation smallholder farmer in the Aberdare highlands managing 850 ha of restored indigenous forest.',
    title:'Aberdare Highland Forest Restoration', desc:'Restoration of 850 ha of degraded indigenous forest in the Aberdare Range. The restored canopy protects Nairobi\'s watershed and supports 320 smallholder families through nursery and patrol jobs.',
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
    title:'Bale Mountains Forest Conservation', desc:'REDD+ protection of 2,800 ha of Afromontane forest in the Bale Mountains — one of Africa\'s highest carbon-density ecosystems. The project employs 60 community scouts and shares revenue with the Oromo communities.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Ethiopia', region:'Oromia Region', lat:6.8, lng:39.9, ha:2800, est:11200, status:'ACTIVE', chain:'CHAIN-005', price:24.00, vtons:10080, tok:'ETH-002' },

  { on:'Bekele Adama',       oe:'bekele.adama@example.com',       oc:'Ethiopia',    ob:'Clean energy entrepreneur bringing solar power to the Afar pastoral communities.',
    title:'Afar Region Solar Electrification', desc:'A 120 kW distributed solar system across 6 pastoral villages in the Afar Depression, replacing kerosene and diesel. Each kilowatt-hour avoids 0.65 kgCO₂ using Ethiopia\'s national grid emission factor.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Ethiopia', region:'Afar Region', lat:11.5, lng:40.6, ha:0.5, est:560, capKw:120, hh:800, status:'ACTIVE', chain:'CHAIN-006', price:13.00, vtons:560, tok:'ETH-003' },

  { on:'Amina Hassan',       oe:'amina.hassan@example.com',       oc:'Tanzania',    ob:'Wildlife conservancy manager in the Selous ecosystem.',
    title:'Selous Savanna Carbon Corridor', desc:'Conservation of 2,400 ha of miombo woodland and savanna within the Greater Selous ecosystem, protecting an elephant migration corridor. Carbon revenue is shared 60% with Mgeta village trust funds.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Tanzania', region:'Morogoro Region', lat:-8.1, lng:36.5, ha:2400, est:4800, status:'VERIFIED', chain:'CHAIN-007', price:14.75, vtons:4560, tok:'TZA-001' },

  { on:'Rashid Kitwana',     oe:'rashid.kitwana@example.com',     oc:'Tanzania',    ob:'Forest ranger and community leader protecting Kilimanjaro\'s montane forest buffer zone.',
    title:'Kilimanjaro Forest Buffer Zone', desc:'Restoration of 740 ha of degraded montane forest on the southern slopes of Kilimanjaro, re-establishing the critical cloud-forest belt that feeds the Pangani River and 1.2 million downstream water users.',
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
    title:'Bwindi Forest REDD+ Protection', desc:'REDD+ conservation of 420 ha of primary Afromontane forest in Bwindi — critical habitat for 459 of the world\'s ~1,000 mountain gorillas. Community benefit-sharing funds school fees for 1,200 children.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Uganda', region:'Southwestern Uganda', lat:-1.0, lng:29.7, ha:420, est:2100, status:'ACTIVE', chain:'CHAIN-012', price:28.00, vtons:1890, tok:'UGA-003' },

  { on:'Grace Uwimana',      oe:'grace.uwimana@example.com',      oc:'Rwanda',      ob:'Hydropower engineer developing run-of-river micro-hydro plants in northern Rwanda.',
    title:'Volcanoes National Park Micro-Hydro', desc:'30 kW run-of-river micro-hydropower plant on the Nyabugogo river powering 420 households and a health centre in the Volcanoes National Park buffer zone, replacing diesel generators.',
    ptype:'CLEAN_ENERGY', energy:'MICRO_HYDRO', country:'Rwanda', region:'Northern Province', lat:-1.4697, lng:29.5269, ha:0.3, est:720, capKw:30, hh:420, status:'ACTIVE', chain:'CHAIN-013', price:15.80, vtons:720, tok:'RWA-001' },

  { on:'Celestin Nkurunziza', oe:'celestin.nkurunziza@example.com', oc:'Rwanda',   ob:'Forest ecologist conserving Afromontane rainforest in southwestern Rwanda.',
    title:'Nyamasheke Afromontane Forest', desc:'Protection of 650 ha of intact Afromontane forest on the Congo-Nile ridge, one of Rwanda\'s highest biodiversity zones. The project supports 380 forest-edge households through NTFP harvesting income.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Rwanda', region:'Western Province', lat:-2.3, lng:29.1, ha:650, est:3250, status:'ACTIVE', chain:'CHAIN-014', price:21.00, vtons:2925, tok:'RWA-002' },

  { on:'Abraham Deng',       oe:'abraham.deng@example.com',       oc:'South Sudan', ob:'Environmental officer managing the Sudd wetland ecosystem in South Sudan.',
    title:'Sudd Wetland Carbon Preservation', desc:'Protection of 4,200 ha of the Sudd floodplain — the world\'s second-largest tropical wetland — preventing drainage for agriculture. Peat carbon stocks measured at 620 tCO₂/ha to 1.5 m depth.',
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'South Sudan', region:'Unity State', lat:7.5, lng:30.5, ha:4200, est:18900, status:'VERIFIED', chain:'CHAIN-015', price:19.00, vtons:16800, tok:'SSD-001' },

  // ── WEST AFRICA ───────────────────────────────────────────────────────────
  { on:'Fatou Diallo',       oe:'fatou.diallo@example.com',       oc:'Senegal',     ob:'Community forest guardian protecting mangroves in the Sine-Saloum delta.',
    title:'Sine-Saloum Mangrove Conservation', desc:'Protection and restoration of 620 ha of mangrove forest in the Sine-Saloum Delta UNESCO Biosphere Reserve. The project trains local women\'s cooperatives as mangrove rangers, halting illegal charcoal cutting.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Senegal', region:'Fatick Region', lat:13.85, lng:-16.55, ha:620, est:5580, status:'ACTIVE', chain:'CHAIN-016', price:24.00, vtons:5200, tok:'SEN-001' },

  { on:'Kwame Asante',       oe:'kwame.asante@example.com',       oc:'Ghana',       ob:'Cocoa farmer transitioning to agroforestry in the Ashanti Region.',
    title:'Ashanti Agroforestry Initiative', desc:'Conversion of 340 ha of monoculture cocoa plantations to diverse agroforestry systems in Ghana\'s Ashanti Region, intercropping cocoa with shade trees and increasing farmer income by 35%.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Ghana', region:'Ashanti Region', lat:6.6885, lng:-1.6244, ha:340, est:850, status:'ACTIVE', chain:'CHAIN-017', price:12.00, vtons:760, tok:'GHA-001' },

  { on:'Chukwuemeka Obi',    oe:'chukwuemeka.obi@example.com',    oc:'Nigeria',     ob:'Solar energy entrepreneur aggregating rooftop installations across Lagos commercial buildings.',
    title:'Lagos Rooftop Solar Programme', desc:'Aggregated 150 kW rooftop solar across 1,200 buildings on Lagos Island via a green REIT model. Building owners lease roof space in exchange for reduced electricity bills under a programmatic CDM approach.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Nigeria', region:'Lagos State', lat:6.4531, lng:3.3958, ha:0.5, est:320, capKw:150, hh:1200, status:'ACTIVE', chain:'CHAIN-018', price:11.50, vtons:290, tok:'NGA-001' },

  { on:'Ngozi Adeyemi',      oe:'ngozi.adeyemi@example.com',      oc:'Nigeria',     ob:'Forest conservation officer protecting Cross River rainforest in southeastern Nigeria.',
    title:'Cross River Rainforest REDD+', desc:'REDD+ protection of 3,100 ha of Cross River rainforest — Nigeria\'s last major tropical forest block — preventing logging and agricultural encroachment through community rangers and benefit-sharing agreements.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Nigeria', region:'Cross River State', lat:5.5, lng:8.8, ha:3100, est:12400, status:'ACTIVE', chain:'CHAIN-019', price:22.00, vtons:11160, tok:'NGA-002' },

  { on:'Moussa Coulibaly',   oe:'moussa.coulibaly@example.com',   oc:'Mali',        ob:'Renewable energy and sustainable charcoal entrepreneur in the Sahel.',
    title:'Sahel Wind Farm — Mopti Region', desc:'200 kW community wind power across 8 turbines in Mali\'s arid Mopti region, displacing approximately 480 tonnes of diesel combustion annually and powering 1,400 households via locally trained technicians.',
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Mali', region:'Mopti Region', lat:14.5, lng:-4.2, ha:12, est:2900, capKw:200, hh:1400, status:'VERIFIED', chain:'CHAIN-020', price:13.40, vtons:2900, tok:'MLI-001' },

  { on:'Aliou Traoré',       oe:'aliou.traore@example.com',       oc:'Mali',        ob:'Biocharcoal producer processing agricultural residues into sustainable fuel near Bamako.',
    title:'Bamako Biocharcoal Production Hub', desc:'Centralised biocharcoal facility near Bamako processing cotton stalks, millet husks and peanut shells into certified briquettes via low-emission retort kilns, replacing wood charcoal for 6,200 urban households.',
    ptype:'CLEAN_ENERGY', energy:'BIOCHARCOAL', country:'Mali', region:'Bamako District', lat:12.6392, lng:-8.0029, ha:0.6, est:880, hh:6200, fuel:440000, status:'ACTIVE', chain:'CHAIN-021', price:11.00, vtons:880, tok:'MLI-002' },

  { on:'Adama Konaté',       oe:'adama.konate@example.com',       oc:"Côte d'Ivoire", ob:"Conservation biologist protecting Taï National Park's primary rainforest.",
    title:"Taï National Park Buffer Zone", desc:'Protection of 1,800 ha of primary rainforest in the buffer zone of Taï National Park — home to the last wild chimpanzees known to use tools. The project employs 45 eco-guards from the adjacent Krou communities.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:"Côte d'Ivoire", region:'Southwestern Region', lat:5.8, lng:-7.5, ha:1800, est:9000, status:'ACTIVE', chain:'CHAIN-022', price:25.00, vtons:8100, tok:'CIV-001' },

  { on:'Jean-Pierre Essomba', oe:'jeanpierre.essomba@example.com', oc:'Cameroon',   ob:'Biologist and community forest manager in the Dja Faunal Reserve.',
    title:'Dja Rainforest Carbon Reserve', desc:'REDD+ conservation of 2,600 ha of dense tropical rainforest inside the Dja Faunal Reserve, Cameroon — a UNESCO World Heritage Site with one of Africa\'s highest mammal densities. Community monitoring via GPS and smartphones.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Cameroon', region:'South Region', lat:3.1, lng:12.8, ha:2600, est:13000, status:'ACTIVE', chain:'CHAIN-023', price:26.00, vtons:11700, tok:'CMR-001' },

  { on:'Hassane Moumouni',   oe:'hassane.moumouni@example.com',   oc:'Niger',       ob:'Agroforestry specialist restoring degraded farmland in the Maradi region.',
    title:'Maradi Farmer-Managed Regreening', desc:'Farmer-managed natural regeneration (FMNR) across 1,200 ha in the Maradi region of Niger, protecting and managing naturally re-sprouting trees on cropland. An estimated 40 trees per hectare re-established, sequestering soil carbon while boosting yields by 25%.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Niger', region:'Maradi Region', lat:13.5, lng:7.1, ha:1200, est:1800, status:'ACTIVE', chain:'CHAIN-024', price:10.00, vtons:1620, tok:'NER-001' },

  { on:'Adama Ouédraogo',    oe:'adama.ouedraogo@example.com',    oc:'Burkina Faso', ob:'Clean cooking entrepreneur distributing improved cookstoves across the Sahel.',
    title:'Ouagadougou Improved Cookstoves', desc:'Distribution of 8,000 ceramic and rocket-type improved cookstoves across 14 peri-urban communes of Ouagadougou, reducing charcoal consumption by 55% per household and indoor air pollution exposure for 40,000 people.',
    ptype:'CLEAN_ENERGY', energy:'COOKSTOVES', country:'Burkina Faso', region:'Centre Region', lat:12.4, lng:-1.5, ha:0.1, est:1760, hh:8000, fuel:2200000, status:'ACTIVE', chain:'CHAIN-025', price:11.00, vtons:1760, tok:'BFA-001' },

  { on:'Isata Kamara',       oe:'isata.kamara@example.com',       oc:'Sierra Leone', ob:'Marine conservation officer protecting the Gola Rainforest National Park coastline.',
    title:'Gola Forest Mangrove Fringe', desc:'Protection and restoration of 310 ha of mangrove fringe forest on the Moa River estuary adjacent to Gola Rainforest National Park. The project supports 24 fishing communities with eco-ranger employment and honey production income.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Sierra Leone', region:'Eastern Province', lat:7.4, lng:-11.2, ha:310, est:2790, status:'ACTIVE', chain:'CHAIN-026', price:20.00, vtons:2510, tok:'SLE-001' },

  { on:'Marcus Kollie',      oe:'marcus.kollie@example.com',      oc:'Liberia',     ob:'Forest guard protecting Nimba County\'s high-biodiversity rainforest remnants.',
    title:'Nimba County Forest Protection', desc:'REDD+ protection of 1,400 ha of lowland rainforest in Nimba County — containing some of West Africa\'s last intact primary forest outside of protected areas. Community benefit fund supports 6 schools.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Liberia', region:'Nimba County', lat:7.5, lng:-8.6, ha:1400, est:7000, status:'ACTIVE', chain:'CHAIN-027', price:21.00, vtons:6300, tok:'LBR-001' },

  { on:'Aminata Sané',       oe:'aminata.sane@example.com',       oc:'Guinea-Bissau', ob:'Marine biologist restoring mangrove forests in the Bijagós Archipelago.',
    title:'Bijagós Archipelago Mangroves', desc:'Restoration of 480 ha of mangrove forest across the UNESCO Biosphere Reserve of the Bijagós Archipelago, supporting artisanal fisheries that feed 90,000 people and protecting the islands from coastal erosion.',
    ptype:'LAND_RESTORATION', land:'MANGROVE', country:'Guinea-Bissau', region:'Bijagós Region', lat:11.2, lng:-16.1, ha:480, est:4320, status:'ACTIVE', chain:'CHAIN-028', price:21.00, vtons:3890, tok:'GNB-001' },

  { on:'Mamadou Diallo',     oe:'mamadou.diallo@example.com',     oc:'Guinea',      ob:'Watershed hydrologist restoring Fouta Djallon highland forests that feed West Africa\'s major rivers.',
    title:'Fouta Djallon Watershed Forest', desc:'Restoration of 920 ha of highland gallery forest in the Fouta Djallon Massif — the "Water Tower of West Africa" feeding the Senegal, Gambia, and Niger rivers. Re-planting Khaya senegalensis and Parkia biglobosa along degraded stream banks.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Guinea', region:'Labé Region', lat:11.0, lng:-12.3, ha:920, est:4600, status:'ACTIVE', chain:'CHAIN-029', price:17.00, vtons:4140, tok:'GIN-001' },

  { on:'Brice Houessou',     oe:'brice.houessou@example.com',     oc:'Benin',       ob:'Wildlife biologist managing the Pendjari National Park buffer zone in northern Benin.',
    title:'Pendjari Savanna Carbon', desc:'Conservation of 3,800 ha of Sudan-Guinean savanna in the Pendjari Biosphere Reserve buffer zone. The project protects the last viable population of lions, elephants, and hippos in West Africa while paying rangers from carbon revenue.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Benin', region:'Atacora Department', lat:11.2, lng:1.5, ha:3800, est:5700, status:'ACTIVE', chain:'CHAIN-030', price:13.00, vtons:5130, tok:'BEN-001' },

  { on:'Koffi Agbeko',       oe:'koffi.agbeko@example.com',       oc:'Togo',        ob:'Forest ranger protecting the Fazao-Malfakassa National Park in central Togo.',
    title:'Fazao-Malfakassa Forest Reserve', desc:'Conservation of 1,100 ha of semi-deciduous forest inside the Fazao-Malfakassa National Park — Togo\'s largest protected area. The project employs 30 community rangers and funds a women\'s income generation cooperative.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Togo', region:'Central Region', lat:8.8, lng:0.9, ha:1100, est:5500, status:'ACTIVE', chain:'CHAIN-031', price:18.00, vtons:4950, tok:'TGO-001' },

  // ── CENTRAL AFRICA ─────────────────────────────────────────────────────────
  { on:'Jean Bosco Bamoninga', oe:'jeanbosco.bamoninga@example.com', oc:'DR Congo', ob:'Community forest monitor in the Équateur province Congo Basin.',
    title:'Congo Basin Intact Forest Preservation', desc:'REDD+ project protecting 3,500 ha of primary Congo Basin rainforest in Équateur province. High-resolution NDVI differencing confirms zero deforestation within the project boundary over 6 years of monitoring.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'DR Congo', region:'Équateur Province', lat:0.45, lng:21.75, ha:3500, est:17500, status:'VERIFIED', chain:'CHAIN-032', price:28.00, vtons:16200, tok:'COD-001' },

  { on:'Olivier Mbemba',     oe:'olivier.mbemba@example.com',     oc:'DR Congo',    ob:'Conservation officer protecting Virunga National Park\'s montane forest.',
    title:'Virunga Montane Forest Carbon', desc:'Protection of 580 ha of montane forest in the buffer zone of Virunga National Park — home to 880 mountain gorillas. Revenue funds 40 community jobs and replaces charcoal income that historically drove deforestation.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'DR Congo', region:'North Kivu', lat:-0.4, lng:29.4, ha:580, est:2900, status:'ACTIVE', chain:'CHAIN-033', price:27.00, vtons:2610, tok:'COD-002' },

  { on:'Marie-Thérèse Loubaki', oe:'mariethérese.loubaki@example.com', oc:'Republic of Congo', ob:'Rainforest conservationist protecting the Odzala-Kokoua ecosystem.',
    title:'Odzala Rainforest Carbon Shield', desc:'Conservation of 2,200 ha of dense equatorial rainforest adjacent to Odzala-Kokoua National Park in northern Congo — Africa\'s oldest national park and home to the world\'s largest remaining forest elephant population.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Republic of Congo', region:'Cuvette-Ouest', lat:1.0, lng:14.9, ha:2200, est:11000, status:'ACTIVE', chain:'CHAIN-034', price:24.00, vtons:9900, tok:'COG-001' },

  { on:'Pascal Nguema',      oe:'pascal.nguema@example.com',      oc:'Gabon',       ob:'Forest ecologist in the Lopé National Park research station.',
    title:'Lopé National Park Forest', desc:'REDD+ conservation of 1,800 ha on the edge of Lopé National Park — a UNESCO World Heritage site spanning savanna and dense forest mosaics in central Gabon. Carbon density is among Africa\'s highest at 165 tC/ha.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Gabon', region:'Ogooué-Ivindo', lat:-0.2, lng:11.6, ha:1800, est:9000, status:'ACTIVE', chain:'CHAIN-035', price:26.00, vtons:8100, tok:'GAB-001' },

  { on:'Léa Moundzegou',     oe:'lea.moundzegou@example.com',     oc:'Central African Republic', ob:'Wildlife ranger at the Dzanga Sangha Protected Area in southwestern CAR.',
    title:'Dzanga Sangha Forest Reserve', desc:'Conservation of 960 ha of dense lowland rainforest adjacent to Dzanga Sangha — home to the world\'s largest population of forest elephants and western lowland gorillas. Community rangers co-manage the project with WWF.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Central African Republic', region:'Sangha-Mbaéré', lat:2.9, lng:16.5, ha:960, est:4800, status:'ACTIVE', chain:'CHAIN-036', price:25.00, vtons:4320, tok:'CAF-001' },

  { on:'Gaston Ngole',       oe:'gaston.ngole@example.com',       oc:'Cameroon',    ob:'Volcanologist and forest manager on the slopes of Mount Cameroon.',
    title:'Mount Cameroon Forest Corridor', desc:'Restoration of 420 ha of degraded montane forest on the southern slopes of Mount Cameroon — Africa\'s highest active volcano and a biodiversity hotspot with 42 endemic plant species. Lava-flow pioneer species are being re-established.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Cameroon', region:'Southwest Region', lat:4.2, lng:9.2, ha:420, est:2100, status:'ACTIVE', chain:'CHAIN-037', price:20.00, vtons:1890, tok:'CMR-002' },

  { on:'Mahamat Zene',       oe:'mahamat.zene@example.com',       oc:'Chad',        ob:'Agropastoralist practising farmer-managed natural regeneration in the Sahel.',
    title:'Lake Chad Basin Regreening', desc:'Farmer-managed natural regeneration across 2,400 ha in the degraded lakeshore zone of Lake Chad, protecting and managing naturally re-sprouting Acacia, Faidherbia, and Balanites trees on cultivated fields.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Chad', region:'Lac Region', lat:12.9, lng:16.4, ha:2400, est:3600, status:'ACTIVE', chain:'CHAIN-038', price:10.00, vtons:3240, tok:'TCD-001' },

  { on:'Manuel Obiang',      oe:'manuel.obiang@example.com',      oc:'Equatorial Guinea', ob:'Marine biologist and forest conservationist on Bioko island.',
    title:'Bioko Island Montane Forest', desc:'Conservation of 380 ha of cloud forest on the volcanic slopes of Bioko island — one of Africa\'s highest biodiversity islands, home to four endemic primate species. The project works with BBPP to monitor drill and chimpanzee populations.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Equatorial Guinea', region:'Bioko Norte', lat:3.7, lng:8.8, ha:380, est:1900, status:'ACTIVE', chain:'CHAIN-039', price:22.00, vtons:1710, tok:'GNQ-001' },

  // ── SOUTHERN AFRICA ────────────────────────────────────────────────────────
  { on:'Lucinda Machava',    oe:'lucinda.machava@example.com',    oc:'Mozambique',  ob:'Wetland hydrologist managing the Zambezi Delta peatland ecosystem.',
    title:'Zambezi Delta Peatland Safeguard', desc:'Protection of 960 ha of peat-rich floodplain wetlands in the Zambezi Delta — one of Africa\'s largest delta systems. PES scheme for Sena communities prevents drainage and conversion to rice cultivation.',
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'Mozambique', region:'Sofala Province', lat:-18.8, lng:36.1, ha:960, est:7680, status:'ACTIVE', chain:'CHAIN-040', price:21.00, vtons:6900, tok:'MOZ-001' },

  { on:'Sipho Zulu',         oe:'sipho.zulu@example.com',         oc:'South Africa', ob:'Wetland ecologist managing the iSimangaliso Wetland Park buffer zone.',
    title:'iSimangaliso Coastal Wetland Carbon', desc:'Protection and restoration of 680 ha of estuarine and coastal wetland in the iSimangaliso Wetland Park World Heritage Site buffer zone, South Africa\'s third largest marine protected area, preventing drainage for sugar cane expansion.',
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'South Africa', region:'KwaZulu-Natal', lat:-28.0, lng:32.5, ha:680, est:4760, status:'ACTIVE', chain:'CHAIN-041', price:18.00, vtons:4284, tok:'ZAF-001' },

  { on:'Tendai Moyo',        oe:'tendai.moyo@example.com',        oc:'Zimbabwe',    ob:'Wildlife conservancy manager protecting savanna ecosystems in Hwange.',
    title:'Hwange Savanna Wildlife Carbon', desc:'Conservation of 5,200 ha of savanna woodland and grassland on a private conservancy adjacent to Hwange National Park, protecting habitat for 106 mammal species including 44,000 elephants — Africa\'s largest terrestrial elephant concentration.',
    ptype:'LAND_RESTORATION', land:'SAVANNA', country:'Zimbabwe', region:'Matabeleland North', lat:-18.4, lng:26.5, ha:5200, est:7800, status:'ACTIVE', chain:'CHAIN-042', price:14.00, vtons:7020, tok:'ZWE-001' },

  { on:'Bwalya Mutale',      oe:'bwalya.mutale@example.com',      oc:'Zambia',      ob:'Pastoralist and grassland manager in the Kafue Flats ecosystem.',
    title:'Kafue Flats Grassland Restoration', desc:'Restoration of 2,800 ha of degraded grassland on the Kafue Flats — Africa\'s largest floodplain grassland ecosystem. Holistic planned grazing mimics the historic lechwe antelope migrations, rebuilding soil organic carbon.',
    ptype:'LAND_RESTORATION', land:'GRASSLAND', country:'Zambia', region:'Central Province', lat:-15.7, lng:27.9, ha:2800, est:4200, status:'ACTIVE', chain:'CHAIN-043', price:11.00, vtons:3780, tok:'ZMB-001' },

  { on:'Naomi Tjikuua',      oe:'naomi.tjikuua@example.com',      oc:'Namibia',     ob:'Solar energy developer bringing utility-scale solar to Namibia\'s remote communities.',
    title:'Namib Desert Solar Farm', desc:'A 250 kW community solar farm in the Khomas Highland near Windhoek, serving 1,800 off-grid households with electricity from one of the world\'s highest solar irradiance zones. Displaces 380 tonnes of diesel combustion per year.',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Namibia', region:'Khomas Region', lat:-22.5, lng:17.0, ha:1.2, est:980, capKw:250, hh:1800, status:'ACTIVE', chain:'CHAIN-044', price:13.50, vtons:980, tok:'NAM-001' },

  { on:'Esperança Cabral',   oe:'esperanca.cabral@example.com',   oc:'Angola',      ob:'Hydrologist protecting the Okavango River headwaters forest in eastern Angola.',
    title:'Okavango Headwaters Forest', desc:'REDD+ protection of 1,600 ha of Miombo woodland in the Okavango River headwaters — the source of the world\'s largest inland delta. Prevents logging that would reduce water flow to downstream Botswana and Namibia.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Angola', region:'Moxico Province', lat:-13.5, lng:19.5, ha:1600, est:8000, status:'ACTIVE', chain:'CHAIN-045', price:18.00, vtons:7200, tok:'AGO-001' },

  { on:'Kefilwe Mphathi',    oe:'kefilwe.mphathi@example.com',    oc:'Botswana',    ob:'Conservation ecologist managing the Okavango Delta wetland buffer zone.',
    title:'Okavango Delta Wetland Carbon', desc:'Protection of 3,400 ha of the Okavango Delta flood plain — UNESCO World Heritage Site and Ramsar wetland of international importance. The project prevents cattle encroachment that would drain and degrade the high-carbon peat soils.',
    ptype:'LAND_RESTORATION', land:'WETLAND', country:'Botswana', region:'North-West District', lat:-19.4, lng:23.0, ha:3400, est:23800, status:'ACTIVE', chain:'CHAIN-046', price:20.00, vtons:21420, tok:'BWA-001' },

  { on:'Hary Rakotondrabe',  oe:'hary.rakotondrabe@example.com',  oc:'Madagascar',  ob:'Forest ecologist at the Ranomafana National Park research station.',
    title:'Ranomafana Rainforest Protection', desc:'REDD+ conservation of 1,200 ha of primary rainforest in the Ranomafana National Park buffer zone — home to 14 lemur species and one of Madagascar\'s richest biodiversity hotspots. Revenue funds 52 community jobs.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Madagascar', region:'Fianarantsoa Province', lat:-21.3, lng:47.4, ha:1200, est:6000, status:'ACTIVE', chain:'CHAIN-047', price:22.00, vtons:5400, tok:'MDG-001' },

  { on:'Limbani Phiri',      oe:'limbani.phiri@example.com',      oc:'Malawi',      ob:'Forest warden protecting the montane forests of Mount Mulanje.',
    title:'Mount Mulanje Forest Biosphere', desc:'Protection and restoration of 560 ha of montane forest on Mount Mulanje — Malawi\'s highest massif and a UNESCO Biosphere Reserve. The project protects Mulanje cedar (Widdringtonia whytei) — Africa\'s rarest conifer — from illegal logging.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Malawi', region:'Southern Region', lat:-16.0, lng:35.5, ha:560, est:2800, status:'ACTIVE', chain:'CHAIN-048', price:20.00, vtons:2520, tok:'MWI-001' },

  { on:'Sifiso Dlamini',     oe:'sifiso.dlamini@example.com',     oc:'eSwatini',    ob:'Biocharcoal entrepreneur processing pine plantation residues in the Usutu forest.',
    title:'Usutu Pine Biocharcoal Project', desc:'Biocharcoal production from pine plantation residues in the Usutu commercial forest, converting sawmill waste and thinnings into high-density briquettes replacing wood charcoal for 4,800 urban households in Manzini.',
    ptype:'CLEAN_ENERGY', energy:'BIOCHARCOAL', country:'eSwatini', region:'Manzini Region', lat:-26.5, lng:31.4, ha:0.4, est:580, hh:4800, fuel:290000, status:'ACTIVE', chain:'CHAIN-049', price:10.00, vtons:580, tok:'SWZ-001' },

  // ── NORTH AFRICA ──────────────────────────────────────────────────────────
  { on:'Youssef El Mansouri', oe:'youssef.elmansouri@example.com', oc:'Morocco',    ob:'Forest engineer leading Atlas cedar reforestation in the Middle Atlas mountains.',
    title:'Middle Atlas Cedar Reforestation', desc:'Restoration of 680 ha of degraded Atlas cedar forest in the Middle Atlas — one of Africa\'s rarest mountain ecosystems — using direct seeding of Cedrus atlantica and protecting natural regeneration from livestock grazing.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Morocco', region:'Azilal Province', lat:31.5, lng:-6.5, ha:680, est:3400, status:'ACTIVE', chain:'CHAIN-050', price:17.00, vtons:3060, tok:'MAR-001' },

  { on:'Leila Ben Salah',    oe:'leila.bensalah@example.com',     oc:'Tunisia',     ob:'Agronomist restoring degraded cork oak farmland in northwestern Tunisia.',
    title:'Northern Tunisia Cork Oak Farmland', desc:'Agroforestry restoration of 480 ha of degraded cork oak (Quercus suber) farmland in the Kroumirie hills, intercropping cork trees with herbs and cereals to rebuild soil carbon and regenerate traditional cork harvesting livelihoods.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Tunisia', region:'Jendouba Governorate', lat:36.5, lng:9.5, ha:480, est:960, status:'ACTIVE', chain:'CHAIN-051', price:11.00, vtons:864, tok:'TUN-001' },

  { on:'Ahmed Hassan Osman', oe:'ahmed.osman@example.com',        oc:'Egypt',       ob:'Solar engineer developing large-scale solar installations in the Sinai Peninsula.',
    title:'East Sinai Utility Solar Plant', desc:'A 400 kW ground-mounted solar farm in the Gulf of Aqaba coastal zone of Sinai, providing clean electricity to 2,400 households previously reliant on expensive diesel imports, with one of the world\'s highest solar irradiance readings (2,800 kWh/m²/year).',
    ptype:'CLEAN_ENERGY', energy:'SOLAR_PV', country:'Egypt', region:'South Sinai Governorate', lat:29.5, lng:34.0, ha:1.8, est:1200, capKw:400, hh:2400, status:'ACTIVE', chain:'CHAIN-052', price:12.00, vtons:1200, tok:'EGY-001' },

  { on:'Karim Bouchama',     oe:'karim.bouchama@example.com',     oc:'Algeria',     ob:'Forest ecologist restoring Tlemcen National Park\'s degraded cedar and oak forest.',
    title:'Tlemcen National Park Reforestation', desc:'Restoration of 540 ha of degraded Aleppo pine and holm oak forest inside Tlemcen National Park using seed-harvested from local parent trees, protecting the watershed feeding 220,000 residents of Tlemcen city.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Algeria', region:'Tlemcen Province', lat:34.9, lng:-1.4, ha:540, est:2700, status:'ACTIVE', chain:'CHAIN-053', price:15.00, vtons:2430, tok:'DZA-001' },

  { on:'Khalid Ibrahim',     oe:'khalid.ibrahim@example.com',     oc:'Sudan',       ob:'Agroforestry extension officer restoring Nile Valley farmland degraded by salinisation.',
    title:'Nile Valley Agroforestry Restoration', desc:'Restoration of 1,400 ha of salinised and degraded farmland along the Nile Valley in central Sudan using date palms, acacias, and irrigated agroforestry systems, sequestering 1.8 tCO₂/ha/year while producing food for 3,200 households.',
    ptype:'LAND_RESTORATION', land:'FARMLAND', country:'Sudan', region:'Khartoum State', lat:15.5, lng:32.5, ha:1400, est:2520, status:'ACTIVE', chain:'CHAIN-054', price:10.00, vtons:2268, tok:'SDN-001' },

  // ── ISLANDS / REMAINING ────────────────────────────────────────────────────
  { on:'Omar Abdallah',      oe:'omar.abdallah@example.com',      oc:'Comoros',     ob:'Forest ranger protecting the remaining cloud forests on Grande Comore island.',
    title:'Njazidja Cloud Forest Conservation', desc:'Protection of 240 ha of cloud forest on the slopes of Karthala volcano on Grande Comore island — one of Africa\'s most threatened island forest ecosystems. The project trains 20 community eco-guides, creating sustainable eco-tourism income.',
    ptype:'LAND_RESTORATION', land:'FOREST', country:'Comoros', region:'Grande Comore', lat:-11.7, lng:43.4, ha:240, est:1200, status:'ACTIVE', chain:'CHAIN-055', price:19.00, vtons:1080, tok:'COM-001' },

  { on:'Lesego Modise',      oe:'lesego.modise@example.com',      oc:'Lesotho',     ob:'Wind energy developer harnessing Lesotho\'s high-altitude wind resources.',
    title:'Drakensberg Escarpment Wind Farm', desc:'A 180 kW community wind installation at 2,800 m elevation on the Lesotho Drakensberg escarpment — one of southern Africa\'s premier wind resources — serving 1,100 highland households and a district health clinic.',
    ptype:'CLEAN_ENERGY', energy:'WIND', country:'Lesotho', region:'Mokhotlong District', lat:-29.5, lng:28.5, ha:8, est:540, capKw:180, hh:1100, status:'ACTIVE', chain:'CHAIN-056', price:12.50, vtons:540, tok:'LSO-001' },
];

// ──────────────────────────────────────────────────────────────────────────────
// IoT reading helpers (for energy projects)
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
  console.log('🌍  Seeding CarbonAfrika — 56 projects across the continent…');

  // 0. Clear
  await prisma.purchase.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.carbonCredit.deleteMany();
  await prisma.deviceReading.deleteMany();
  await prisma.ioTDevice.deleteMany();
  await prisma.satelliteSnapshot.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Database cleared');

  // 1. System accounts
  const [admin, verifier1, verifier2, buyer1, buyer2, buyer3] = await Promise.all([
    prisma.user.create({ data: { email: 'admin@carbonafrika.com',          passwordHash: PW, name: 'Amara Okonkwo',        role: 'ADMIN',    country: 'Nigeria',        kycVerified: true,  bio: 'Platform administrator and carbon markets specialist with 15 years in environmental finance.' } }),
    prisma.user.create({ data: { email: 'verifier@carbonafrika.com',       passwordHash: PW, name: 'Dr. Sipho Dlamini',    role: 'VERIFIER', country: 'South Africa',   kycVerified: true,  bio: 'Environmental scientist. PhD in Ecosystem Carbon Accounting, Wits University.' } }),
    prisma.user.create({ data: { email: 'verifier2@carbonafrika.com',      passwordHash: PW, name: 'Dr. Fatoumata Camara', role: 'VERIFIER', country: 'Guinea',         kycVerified: true,  bio: 'Forest ecologist specialising in West and Central African carbon accounting.' } }),
    prisma.user.create({ data: { email: 'buyer.green@example.com',         passwordHash: PW, name: 'GreenFuture Corp',     role: 'BUYER',    country: 'Germany',        kycVerified: true,  bio: 'European sustainability fund offsetting Scope 3 emissions across the supply chain.' } }),
    prisma.user.create({ data: { email: 'buyer.climate@example.com',       passwordHash: PW, name: 'Climate Ventures Ltd', role: 'BUYER',    country: 'United Kingdom', kycVerified: true,  bio: 'Impact investment firm specialising in nature-based and renewable energy carbon credits.' } }),
    prisma.user.create({ data: { email: 'buyer.africa@example.com',        passwordHash: PW, name: 'AfriESG Capital',      role: 'BUYER',    country: 'Kenya',          kycVerified: true,  bio: 'Pan-African ESG fund sourcing high-integrity credits from African landowners and cooperatives.' } }),
  ]);
  console.log('  ✓ System accounts created (admin, 2 verifiers, 3 buyers)');

  // 2. Create all 56 projects with their owners
  const verifiers = [verifier1.id, verifier2.id];
  const createdListings: { id: string }[] = [];

  for (let i = 0; i < DEFS.length; i++) {
    const d = DEFS[i];
    const typeKey = d.energy ?? d.land ?? 'FOREST';
    const photos = ph(typeKey);

    // Owner
    const owner = await prisma.user.create({ data: {
      email: d.oe, passwordHash: PW, name: d.on, role: 'LANDOWNER', country: d.oc, kycVerified: true, bio: d.ob,
    }});

    // Project
    const project = await prisma.project.create({ data: {
      ownerId: owner.id,
      title: d.title,
      description: d.desc,
      projectType: d.ptype,
      landType: d.land as any ?? undefined,
      energyType: d.energy as any ?? undefined,
      country: d.country,
      region: d.region,
      lat: d.lat, lng: d.lng,
      hectares: d.ha,
      estimatedTons: d.est,
      capacityKw: d.capKw,
      householdsServed: d.hh,
      fuelDisplacedKgY: d.fuel,
      status: d.status as any,
      onChainId: d.chain,
      mediaUrls: photos,
    }});

    // Verification
    const isApproved = d.status === 'ACTIVE' || d.status === 'VERIFIED';
    await prisma.verification.create({ data: {
      projectId: project.id,
      verifierId: isApproved ? verifiers[i % 2] : undefined,
      status: isApproved ? 'APPROVED' : d.status === 'UNDER_REVIEW' ? 'IN_PROGRESS' : 'PENDING',
      carbonTons: isApproved ? d.vtons : undefined,
      notes: isApproved
        ? `Field verification completed. Carbon stocks independently assessed. ${d.ptype === 'CLEAN_ENERGY' ? 'Energy generation logs cross-checked against IoT meter data.' : 'NDVI analysis and permanent sample plots confirm sequestration.'} Recommend credit issuance.`
        : 'Awaiting verifier assignment.',
      txHash: isApproved ? `0xverify${d.tok.replace(/-/g,'').toLowerCase()}` : undefined,
    }});

    // Satellite snapshots for land projects
    if (d.ptype === 'LAND_RESTORATION' && isApproved) {
      await prisma.satelliteSnapshot.createMany({ data: [
        { projectId: project.id, ndvi: +(0.45 + Math.random() * 0.35).toFixed(2), cloudCover: Math.floor(Math.random() * 25), capturedAt: new Date('2024-03-15'), source: 'sentinel-2-l2a' },
        { projectId: project.id, ndvi: +(0.50 + Math.random() * 0.35).toFixed(2), cloudCover: Math.floor(Math.random() * 25), capturedAt: new Date('2024-09-01'), source: 'sentinel-2-l2a' },
        { projectId: project.id, ndvi: +(0.55 + Math.random() * 0.30).toFixed(2), cloudCover: Math.floor(Math.random() * 20), capturedAt: new Date('2025-02-20'), source: 'sentinel-2-l2a' },
      ]});
    }

    // Credits + Listings for approved projects
    if (isApproved) {
      const creditAmt = Math.round(d.vtons * 0.85); // 15% buffer
      const credit = await prisma.carbonCredit.create({ data: {
        projectId: project.id,
        tokenId: `TOKEN-${d.tok}`,
        amount: creditAmt,
        bufferTons: Math.round(d.vtons * 0.15),
        vintageYear: 2024,
        status: 'LISTED',
        mintTxHash: `0xmint${d.tok.replace(/-/g,'').toLowerCase()}`,
      }});

      const listing = await prisma.listing.create({ data: {
        creditId: credit.id,
        pricePerTon: d.price,
        totalTons: creditAmt,
        currency: 'USDC',
        status: 'ACTIVE',
        txHash: `0xlist${d.tok.replace(/-/g,'').toLowerCase()}`,
      }});
      createdListings.push(listing);
    }

    // IoT devices for energy projects
    if (d.ptype === 'CLEAN_ENERGY' && isApproved) {
      const device = await prisma.ioTDevice.create({ data: {
        projectId: project.id,
        deviceKey: `IOT-${d.tok.replace(/-/g,'-')}-001`,
        deviceType: d.energy === 'BIOGAS' ? 'FLOW_METER' : d.energy === 'COOKSTOVES' || d.energy === 'BIOCHARCOAL' ? 'FUEL_SENSOR' : 'ENERGY_METER',
        label: d.energy === 'BIOGAS' ? 'Central Digester Flow Meter' : d.energy === 'COOKSTOVES' ? 'Charcoal Displacement Monitor' : d.energy === 'BIOCHARCOAL' ? 'Kiln Output Scale' : 'Main Inverter / Turbine Meter',
        lat: d.lat, lng: d.lng, active: true,
        lastSeenAt: new Date('2025-05-21T10:00:00Z'),
      }});
      if (d.energy === 'BIOGAS') {
        await prisma.deviceReading.createMany({ data: makeBiogasReadings(device.id, project.id) });
      } else {
        const baseKwh = (d.capKw ?? 50) * 0.8;
        await prisma.deviceReading.createMany({ data: makeEnergyReadings(device.id, project.id, baseKwh, 1 + i * 0.3) });
      }
    }
  }

  console.log('  ✓ 56 projects created (owners, verifications, credits, listings, IoT)');

  // 3. Purchases — spread across buyers and listings
  if (createdListings.length >= 10) {
    await Promise.all([
      prisma.purchase.create({ data: { listingId: createdListings[0].id, buyerId: buyer1.id, totalTons: 500, totalPrice: 9250, feeAmount: 185, buyerTotal: 9435, currency: 'USDC', txHash: '0xpur001', settlementStatus: 'SETTLED', retired: false } }),
      prisma.purchase.create({ data: { listingId: createdListings[1].id, buyerId: buyer2.id, totalTons: 200, totalPrice: 3300, feeAmount: 66,  buyerTotal: 3366, currency: 'USDC', txHash: '0xpur002', settlementStatus: 'SETTLED', retired: true,  retirementTxHash: '0xret002', nftTokenId: 'RET-CERT-001', retirementReason: 'ANNUAL_REPORT', retiredAt: new Date('2025-03-15') } }),
      prisma.purchase.create({ data: { listingId: createdListings[3].id, buyerId: buyer1.id, totalTons: 100, totalPrice: 1400, feeAmount: 28,  buyerTotal: 1428, currency: 'USDC', txHash: '0xpur003', settlementStatus: 'SETTLED', retired: false } }),
      prisma.purchase.create({ data: { listingId: createdListings[5].id, buyerId: buyer3.id, totalTons: 800, totalPrice: 11800, feeAmount: 236, buyerTotal: 12036, currency: 'USDC', txHash: '0xpur004', settlementStatus: 'SETTLED', retired: false } }),
      prisma.purchase.create({ data: { listingId: createdListings[8].id, buyerId: buyer2.id, totalTons: 300, totalPrice: 5730, feeAmount: 114.6, buyerTotal: 5844.6, currency: 'USDC', txHash: '0xpur005', settlementStatus: 'SETTLED', retired: true, retirementTxHash: '0xret005', nftTokenId: 'RET-CERT-002', retirementReason: 'PRODUCT_LAUNCH', retiredAt: new Date('2025-04-01') } }),
      prisma.purchase.create({ data: { listingId: createdListings[12].id, buyerId: buyer1.id, totalTons: 1000, totalPrice: 24000, feeAmount: 480, buyerTotal: 24480, currency: 'USDC', txHash: '0xpur006', settlementStatus: 'SETTLED', retired: false } }),
      prisma.purchase.create({ data: { listingId: createdListings[15].id, buyerId: buyer3.id, totalTons: 250, totalPrice: 6000, feeAmount: 120, buyerTotal: 6120, currency: 'USDC', txHash: '0xpur007', settlementStatus: 'SETTLED', retired: false } }),
      prisma.purchase.create({ data: { listingId: createdListings[20].id, buyerId: buyer2.id, totalTons: 500, totalPrice: 6700, feeAmount: 134, buyerTotal: 6834, currency: 'USDC', txHash: '0xpur008', settlementStatus: 'SETTLED', retired: true, retirementTxHash: '0xret008', nftTokenId: 'RET-CERT-003', retirementReason: 'ANNUAL_REPORT', retiredAt: new Date('2025-05-01') } }),
    ]);
  }
  console.log('  ✓ Sample purchases created');

  console.log(`
✅  Seed complete! 56 active projects across Africa.

Demo accounts (all passwords: "password"):
  admin@carbonafrika.com           → Admin
  verifier@carbonafrika.com        → Verifier (Dr. Sipho Dlamini)
  verifier2@carbonafrika.com       → Verifier (Dr. Fatoumata Camara)
  buyer.green@example.com          → Buyer (GreenFuture Corp)
  buyer.climate@example.com        → Buyer (Climate Ventures Ltd)
  buyer.africa@example.com         → Buyer (AfriESG Capital)

56 landowner accounts — email format: firstname.lastname@example.com (password: "password")
Examples:
  james.mwangi@example.com         → Kenya, Aberdare Forest
  tigist.haile@example.com         → Ethiopia, Bale Mountains
  jean-bosco.bamoninga@example.com → DR Congo, Congo Basin
  sipho.zulu@example.com           → South Africa, iSimangaliso
  youssef.elmansouri@example.com   → Morocco, Atlas Reforestation
  omar.abdallah@example.com        → Comoros, Cloud Forest

Countries covered: Kenya, Ethiopia, Tanzania, Uganda, Rwanda, South Sudan,
  Senegal, Ghana, Nigeria, Mali, Côte d'Ivoire, Cameroon, Niger, Burkina Faso,
  Sierra Leone, Liberia, Guinea-Bissau, Guinea, Benin, Togo,
  DR Congo, Republic of Congo, Gabon, CAR, Chad, Equatorial Guinea,
  Mozambique, South Africa, Zimbabwe, Zambia, Namibia, Angola, Botswana,
  Madagascar, Malawi, eSwatini, Morocco, Tunisia, Egypt, Algeria, Sudan, Comoros, Lesotho
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
