/**
 * Seed script: energy projects + IoT devices + 60 days of realistic readings
 * Run: npx ts-node --project packages/db/tsconfig.json packages/db/prisma/seed-energy-iot.ts
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const db = new PrismaClient();
const PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

function deviceKey() { return `ca_iot_${randomBytes(24).toString('hex')}`; }

// ── Realistic time-series generators ─────────────────────────────────────────

function solarKwh(hour: number, capacityKw: number, cloudFactor: number): number {
  // Bell curve centred at 12:30, zero outside 6-18h
  if (hour < 6 || hour > 18) return 0;
  const peak = Math.sin(((hour - 6) / 12) * Math.PI);
  return parseFloat((peak * capacityKw * cloudFactor * 0.85 * (0.85 + Math.random() * 0.15)).toFixed(2));
}

function biogasM3h(hour: number): number {
  // Slightly higher at morning/evening cooking times
  const base = 1.8 + Math.sin((hour / 24) * 2 * Math.PI) * 0.4;
  return parseFloat((base + Math.random() * 0.3).toFixed(2));
}

function cookstoveFuel(households: number): number {
  // Each household displaces ~1.2 kg/day; randomise slightly
  return parseFloat(((households * 1.2 + Math.random() * households * 0.1) / 24).toFixed(3));
}

function temperature(lat: number, month: number, hour: number): number {
  // Tropics: 20-35°C, diurnal swing, slight seasonal variation
  const base = 27 - Math.abs(lat) * 0.4 + Math.sin((month / 12) * 2 * Math.PI) * 2;
  const diurnal = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 6;
  return parseFloat((base + diurnal + (Math.random() * 2 - 1)).toFixed(1));
}

function humidity(hour: number, lat: number): number {
  const base = 65 - Math.abs(lat) * 0.5;
  const diurnal = -Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 15;
  return Math.min(100, Math.max(20, parseFloat((base + diurnal + (Math.random() * 8 - 4)).toFixed(1))));
}

function rainfall(month: number): number {
  // Rainy season signal for equatorial Africa
  const r = Math.sin(((month - 3) / 12) * 2 * Math.PI);
  return Math.random() < 0.3 ? parseFloat((r > 0 ? r * 8 + Math.random() * 4 : Math.random() * 2).toFixed(1)) : 0;
}

function windSpeed(): number {
  return parseFloat((3 + Math.random() * 8).toFixed(1));
}

function windKwh(capacityKw: number, ws: number): number {
  // Simplified: linear above cut-in 3 m/s, rated at 12 m/s
  if (ws < 3) return 0;
  const frac = Math.min((ws - 3) / 9, 1);
  return parseFloat((frac * capacityKw * 0.9).toFixed(2));
}

// ── Days back helper ─────────────────────────────────────────────────────────

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱  Seeding energy projects + IoT data…');

  // ── 1. Extra landowners for energy projects ──────────────────────────────

  const [ownerCam, ownerDji, ownerEng] = await Promise.all([
    db.user.upsert({
      where: { email: 'pierre.mvondo@example.com' },
      update: {},
      create: { email: 'pierre.mvondo@example.com', passwordHash: PASSWORD_HASH, name: 'Pierre Mvondo', role: 'LANDOWNER', country: 'Cameroon', kycVerified: true, bio: 'Micro-hydro developer in the Adamawa highlands.' },
    }),
    db.user.upsert({
      where: { email: 'hodan.farah@example.com' },
      update: {},
      create: { email: 'hodan.farah@example.com', passwordHash: PASSWORD_HASH, name: 'Hodan Farah', role: 'LANDOWNER', country: 'Djibouti', kycVerified: true, bio: 'Wind energy cooperative leader in the Arta Plateau.' },
    }),
    db.user.upsert({
      where: { email: 'chidi.obi@example.com' },
      update: {},
      create: { email: 'chidi.obi@example.com', passwordHash: PASSWORD_HASH, name: 'Chidi Obi', role: 'LANDOWNER', country: 'Nigeria', kycVerified: true, bio: 'Solar entrepreneur serving off-grid communities in Kano State.' },
    }),
  ]);

  // Re-fetch existing owners
  const [ownerRwa, ownerUga, ownerTza, ownerGha] = await Promise.all([
    db.user.findUnique({ where: { email: 'alice.uwimana@example.com' } }),
    db.user.findUnique({ where: { email: 'sarah.nakato@example.com' } }),
    db.user.findUnique({ where: { email: 'amina.hassan@example.com' } }),
    db.user.findUnique({ where: { email: 'kwame.asante@example.com' } }),
  ]);

  const verifier = await db.user.findUnique({ where: { email: 'verifier@carbonafrika.com' } });
  if (!verifier) throw new Error('Run main seed first');

  console.log('  ✓ Energy owners ready');

  // ── 2. Energy projects ───────────────────────────────────────────────────

  const [solar1, biogas1, cookstoves1, hydro1, wind1, biochar1] = await Promise.all([

    db.project.upsert({
      where: { onChainId: 'ENERGY-001' },
      update: {},
      create: {
        ownerId: ownerEng!.id, onChainId: 'ENERGY-001',
        projectType: 'CLEAN_ENERGY', energyType: 'SOLAR_PV',
        title: 'Kano State Off-Grid Solar Cluster',
        description: 'A 60 kWp distributed solar PV system across 3 off-grid villages in Kano State, Nigeria, providing clean electricity to 420 households. The system uses lithium iron phosphate batteries for 8-hour overnight storage. Revenue from a PAYG token model covers maintenance while carbon credits provide additional income for the cooperative.',
        country: 'Nigeria', region: 'Kano State',
        lat: 12.0022, lng: 8.5920,
        hectares: 0.6, estimatedTons: 98,
        capacityKw: 60, householdsServed: 420,
        status: 'ACTIVE',
      },
    }),

    db.project.upsert({
      where: { onChainId: 'ENERGY-002' },
      update: {},
      create: {
        ownerId: ownerUga!.id, onChainId: 'ENERGY-002',
        projectType: 'CLEAN_ENERGY', energyType: 'BIOGAS',
        title: 'Kampala Urban Biogas Network',
        description: 'A network of 8 community biogas digesters serving 180 households in peri-urban Kampala. Organic market waste and household scraps feed the digesters, producing cooking gas that replaces charcoal. Each digester is monitored by a flow meter and pressure sensor posting real-time data to the platform. Digestate is sold as organic fertiliser.',
        country: 'Uganda', region: 'Kampala District',
        lat: 0.3136, lng: 32.5811,
        hectares: 0.2, estimatedTons: 210,
        capacityKw: 18, householdsServed: 180,
        fuelDisplacedKgY: 54000,
        status: 'ACTIVE',
      },
    }),

    db.project.upsert({
      where: { onChainId: 'ENERGY-003' },
      update: {},
      create: {
        ownerId: ownerTza!.id, onChainId: 'ENERGY-003',
        projectType: 'CLEAN_ENERGY', energyType: 'COOKSTOVES',
        title: 'Selous Improved Cookstove Programme',
        description: 'Distribution and monitoring of 800 TLUD gasifier cookstoves to households in 12 villages bordering the Selous Game Reserve in Tanzania. The stoves burn biomass 70% more efficiently than traditional three-stone fires, reducing fuel wood consumption and indoor air pollution. Smart fuel sensors track consumption and report via LoRa to a local gateway.',
        country: 'Tanzania', region: 'Morogoro Region',
        lat: -7.8500, lng: 36.8000,
        hectares: 0.1, estimatedTons: 1920,
        householdsServed: 800,
        fuelDisplacedKgY: 576000,
        status: 'ACTIVE',
      },
    }),

    db.project.upsert({
      where: { onChainId: 'ENERGY-004' },
      update: {},
      create: {
        ownerId: ownerCam!.id, onChainId: 'ENERGY-004',
        projectType: 'CLEAN_ENERGY', energyType: 'MICRO_HYDRO',
        title: 'Adamawa Highlands Run-of-River Hydro',
        description: 'A 35 kW run-of-river micro-hydro installation on the Faro river headwaters in the Adamawa highlands of Cameroon. The plant runs 24/7 (except flood season) providing baseload power to 260 households and a health centre. River flow is monitored continuously; output is metered and telemetered daily to verify generation against climate baselines.',
        country: 'Cameroon', region: 'Adamawa Region',
        lat: 7.3200, lng: 12.8800,
        hectares: 0.5, estimatedTons: 145,
        capacityKw: 35, householdsServed: 260,
        status: 'VERIFIED',
      },
    }),

    db.project.upsert({
      where: { onChainId: 'ENERGY-005' },
      update: {},
      create: {
        ownerId: ownerDji!.id, onChainId: 'ENERGY-005',
        projectType: 'CLEAN_ENERGY', energyType: 'WIND',
        title: 'Arta Plateau Wind Cooperative',
        description: 'Six 5 kW small wind turbines installed on the Arta Plateau above Djibouti City, supplying a cooperative of 120 households with clean electricity. The site benefits from consistent northeast trade winds averaging 7–9 m/s year-round. Individual turbines are instrumented with anemometers and energy meters reporting hourly via 4G.',
        country: 'Djibouti', region: 'Arta Region',
        lat: 11.5300, lng: 42.8500,
        hectares: 0.8, estimatedTons: 78,
        capacityKw: 30, householdsServed: 120,
        status: 'ACTIVE',
      },
    }),

    db.project.upsert({
      where: { onChainId: 'ENERGY-006' },
      update: {},
      create: {
        ownerId: ownerGha!.id, onChainId: 'ENERGY-006',
        projectType: 'CLEAN_ENERGY', energyType: 'BIOCHARCOAL',
        title: 'Ashanti Biochar Carbon Sink',
        description: 'A retort kiln biochar production facility processing agricultural waste (cocoa husks, corn cobs) from Ashanti Region cooperatives. The biochar is applied to degraded soils, improving crop yields by 20–40% while permanently locking carbon underground. The kiln is instrumented with temperature sensors and a weighing scale tracking biomass input and biochar output.',
        country: 'Ghana', region: 'Ashanti Region',
        lat: 6.7200, lng: -1.5900,
        hectares: 0.3, estimatedTons: 840,
        fuelDisplacedKgY: 120000,
        status: 'VERIFIED',
      },
    }),
  ]);

  console.log('  ✓ Energy projects created');

  // ── 3. Verifications ─────────────────────────────────────────────────────

  await Promise.all([
    db.verification.create({ data: { projectId: solar1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 91, notes: 'Generation logs verified against DNI data from NASA POWER. System audit confirmed 58.4 kWp installed. PV output metered at 89,200 kWh/year. Emission factor applied: NERC Nigeria 0.487 kgCO₂/kWh.' } }),
    db.verification.create({ data: { projectId: biogas1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 196, notes: 'Flow meter calibration verified on-site. Annual gas production: 38,400 m³ displacing 96 t charcoal. Gold Standard TPDDTEC methodology applied. Participant survey confirmed 178 active households.' } }),
    db.verification.create({ data: { projectId: cookstoves1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 1800, notes: 'Kitchen performance test conducted on 60 sample stoves. Fuel consumption reduction 68% vs baseline. 794 stoves confirmed active via sensor uptime logs. CDM AMS-II.G methodology.' } }),
    db.verification.create({ data: { projectId: hydro1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 138, notes: 'Revenue meter verified against SCADA flow data. Annual generation 284 MWh. Grid emission factor DRC/CAF sub-region 0.486 kgCO₂/kWh. No seasonality correction required — river perennial.' } }),
    db.verification.create({ data: { projectId: wind1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 72, notes: 'Anemometer calibration certificates on file. Mean annual wind speed 7.8 m/s at hub height. Annual generation 148 MWh. Djibouti grid emission factor 0.487 kgCO₂/kWh.' } }),
    db.verification.create({ data: { projectId: biochar1.id, verifierId: verifier.id, status: 'APPROVED', carbonTons: 780, notes: 'Biochar yield ratio 28% of input biomass by mass. Permanence factor 0.85 applied per IBI protocol. Soil application maps submitted and verified. Temperature logs confirm pyrolysis >450°C throughout.' } }),
  ]);

  // ── 4. Credits + Listings ────────────────────────────────────────────────

  const [cSolar, cBiogas, cStoves, cHydro, cWind, cBiochar] = await Promise.all([
    db.carbonCredit.create({ data: { projectId: solar1.id,      tokenId: 'TOKEN-NGA-E001', amount: 91,   status: 'LISTED', mintTxHash: '0xenergy001aaa111bbb222ccc333ddd444eee555fff' } }),
    db.carbonCredit.create({ data: { projectId: biogas1.id,     tokenId: 'TOKEN-UGA-E002', amount: 196,  status: 'LISTED', mintTxHash: '0xenergy002bbb222ccc333ddd444eee555fff666aaa' } }),
    db.carbonCredit.create({ data: { projectId: cookstoves1.id, tokenId: 'TOKEN-TZA-E003', amount: 1800, status: 'LISTED', mintTxHash: '0xenergy003ccc333ddd444eee555fff666aaa111bbb' } }),
    db.carbonCredit.create({ data: { projectId: hydro1.id,      tokenId: 'TOKEN-CAM-E004', amount: 138,  status: 'LISTED', mintTxHash: '0xenergy004ddd444eee555fff666aaa111bbb222ccc' } }),
    db.carbonCredit.create({ data: { projectId: wind1.id,       tokenId: 'TOKEN-DJI-E005', amount: 72,   status: 'LISTED', mintTxHash: '0xenergy005eee555fff666aaa111bbb222ccc333ddd' } }),
    db.carbonCredit.create({ data: { projectId: biochar1.id,    tokenId: 'TOKEN-GHA-E006', amount: 780,  status: 'LISTED', mintTxHash: '0xenergy006fff666aaa111bbb222ccc333ddd444eee' } }),
  ]);

  await db.listing.createMany({ data: [
    { creditId: cSolar.id,  pricePerTon: 17.20, totalTons: 91,   currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e001' },
    { creditId: cBiogas.id, pricePerTon: 20.50, totalTons: 196,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e002' },
    { creditId: cStoves.id, pricePerTon: 12.80, totalTons: 1800, currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e003' },
    { creditId: cHydro.id,  pricePerTon: 22.00, totalTons: 138,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e004' },
    { creditId: cWind.id,   pricePerTon: 18.90, totalTons: 72,   currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e005' },
    { creditId: cBiochar.id,pricePerTon: 25.00, totalTons: 780,  currency: 'USDC', status: 'ACTIVE', txHash: '0xlist-e006' },
  ]});

  console.log('  ✓ Energy credits + listings created');

  // ── 5. IoT Devices ───────────────────────────────────────────────────────

  const [
    devSolarMeter, devSolarWeather,
    devBiogasFlow, devBiogasWeather,
    devStoveFuel,  devStoveWeather,
    devHydroMeter, devHydroFlow,
    devWindMeter,  devWindWeather,
    devBiocharTemp,
    // Land project climate sensors
    devAberdareWeather, devSineSoil,
  ] = await Promise.all([
    // Solar — Nigeria
    db.ioTDevice.create({ data: { projectId: solar1.id,      deviceType: 'ENERGY_METER',   label: 'Main Inverter Array',   lat: 12.0022, lng: 8.5920,  deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: solar1.id,      deviceType: 'WEATHER_STATION', label: 'Site Weather Station',  lat: 12.0025, lng: 8.5918,  deviceKey: deviceKey() } }),
    // Biogas — Uganda
    db.ioTDevice.create({ data: { projectId: biogas1.id,     deviceType: 'FLOW_METER',      label: 'Biogas Outlet Meter',   lat: 0.3136,  lng: 32.5811, deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: biogas1.id,     deviceType: 'WEATHER_STATION', label: 'Digester Weather',      lat: 0.3140,  lng: 32.5815, deviceKey: deviceKey() } }),
    // Cookstoves — Tanzania
    db.ioTDevice.create({ data: { projectId: cookstoves1.id, deviceType: 'FUEL_SENSOR',     label: 'Village Cluster A (200 stoves)', lat: -7.8500, lng: 36.8000, deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: cookstoves1.id, deviceType: 'WEATHER_STATION', label: 'Field Weather Station', lat: -7.8510, lng: 36.8010, deviceKey: deviceKey() } }),
    // Micro-Hydro — Cameroon
    db.ioTDevice.create({ data: { projectId: hydro1.id,      deviceType: 'ENERGY_METER',    label: 'Turbine Output Meter',  lat: 7.3200,  lng: 12.8800, deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: hydro1.id,      deviceType: 'FLOW_METER',      label: 'River Flow Gauge',      lat: 7.3195,  lng: 12.8795, deviceKey: deviceKey() } }),
    // Wind — Djibouti
    db.ioTDevice.create({ data: { projectId: wind1.id,       deviceType: 'ENERGY_METER',    label: 'Turbine Array Meter',   lat: 11.5300, lng: 42.8500, deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: wind1.id,       deviceType: 'WEATHER_STATION', label: 'Anemometer Station',    lat: 11.5305, lng: 42.8505, deviceKey: deviceKey() } }),
    // Biochar — Ghana
    db.ioTDevice.create({ data: { projectId: biochar1.id,    deviceType: 'SOIL_SENSOR',     label: 'Kiln Temperature Array',lat: 6.7200,  lng: -1.5900, deviceKey: deviceKey() } }),
    // Land project climate sensors
    db.ioTDevice.create({ data: { projectId: (await db.project.findUnique({ where: { onChainId: 'CHAIN-001' } }))!.id, deviceType: 'WEATHER_STATION', label: 'Forest Weather Station', lat: -0.4167, lng: 36.7167, deviceKey: deviceKey() } }),
    db.ioTDevice.create({ data: { projectId: (await db.project.findUnique({ where: { onChainId: 'CHAIN-002' } }))!.id, deviceType: 'SOIL_SENSOR',     label: 'Mangrove Soil & Salinity', lat: 13.85, lng: -16.55, deviceKey: deviceKey() } }),
  ]);

  console.log('  ✓ IoT devices registered');

  // ── 6. Device readings — 60 days of hourly / 6-hourly data ──────────────

  const DAYS = 60;
  const now  = new Date();

  const solarReadings:    object[] = [];
  const biogasReadings:   object[] = [];
  const stoveReadings:    object[] = [];
  const hydroReadings:    object[] = [];
  const windReadings:     object[] = [];
  const biocharReadings:  object[] = [];
  const landReadings:     object[] = [];

  for (let day = DAYS; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const month = date.getMonth() + 1;

    // Solar — hourly 6h-19h
    for (let h = 6; h <= 19; h++) {
      const cloudFactor = 0.6 + Math.random() * 0.4;
      const kwh = solarKwh(h, 60, cloudFactor);
      if (kwh <= 0) continue;
      const co2 = parseFloat((kwh * 0.487).toFixed(3));
      const ts  = new Date(date); ts.setHours(h, 0, 0, 0);
      solarReadings.push({ deviceId: devSolarMeter.id, projectId: solar1.id, kwhGenerated: kwh, co2AvoidedKg: co2, householdsServed: 420, recordedAt: ts });
    }
    // Solar weather — every 3h
    for (let h = 0; h < 24; h += 3) {
      const ts = new Date(date); ts.setHours(h, 0, 0, 0);
      solarReadings.push({ deviceId: devSolarWeather.id, projectId: solar1.id, temperatureC: temperature(12, month, h), humidityPct: humidity(h, 12), rainfallMm: h === 15 ? rainfall(month) : 0, recordedAt: ts });
    }

    // Biogas — every 6h
    for (let h = 0; h < 24; h += 6) {
      const flow = biogasM3h(h);
      const kwh  = parseFloat((flow * 1.8 * 6).toFixed(2)); // kWh per 6h period
      const co2  = parseFloat((kwh * 0.487 + flow * 6 * 2.2).toFixed(2));
      const ts   = new Date(date); ts.setHours(h, 0, 0, 0);
      biogasReadings.push({ deviceId: devBiogasFlow.id, projectId: biogas1.id, gasFlowM3h: flow, pressureKpa: parseFloat((8 + Math.random() * 4).toFixed(1)), co2AvoidedKg: co2, householdsServed: 180, recordedAt: ts });
      biogasReadings.push({ deviceId: devBiogasWeather.id, projectId: biogas1.id, temperatureC: temperature(0.3, month, h), humidityPct: humidity(h, 0.3), recordedAt: ts });
    }

    // Cookstoves — daily aggregate
    const fuelKg = cookstoveFuel(800) * 24;
    const stoveCo2 = parseFloat((fuelKg * 1.83).toFixed(2));
    stoveReadings.push({ deviceId: devStoveFuel.id, projectId: cookstoves1.id, fuelDisplacedKg: parseFloat(fuelKg.toFixed(2)), co2AvoidedKg: stoveCo2, householdsServed: 800, recordedAt: daysAgo(day, 8) });
    stoveReadings.push({ deviceId: devStoveWeather.id, projectId: cookstoves1.id, temperatureC: temperature(-7.85, month, 12), humidityPct: humidity(12, -7.85), rainfallMm: rainfall(month), soilMoisturePct: parseFloat((30 + Math.random() * 25).toFixed(1)), recordedAt: daysAgo(day, 12) });

    // Micro-hydro — every 4h
    for (let h = 0; h < 24; h += 4) {
      const kwh  = parseFloat((35 * 4 * (0.82 + Math.random() * 0.12)).toFixed(2));
      const co2  = parseFloat((kwh * 0.486).toFixed(2));
      const flow = parseFloat((0.8 + Math.random() * 0.4).toFixed(2));
      const ts   = new Date(date); ts.setHours(h, 0, 0, 0);
      hydroReadings.push({ deviceId: devHydroMeter.id, projectId: hydro1.id, kwhGenerated: kwh, co2AvoidedKg: co2, householdsServed: 260, recordedAt: ts });
      hydroReadings.push({ deviceId: devHydroFlow.id, projectId: hydro1.id, gasFlowM3h: flow, temperatureC: temperature(7.32, month, h), recordedAt: ts });
    }

    // Wind — every 2h
    for (let h = 0; h < 24; h += 2) {
      const ws  = windSpeed();
      const kwh = windKwh(30, ws);
      const co2 = parseFloat((kwh * 2 * 0.487).toFixed(2));
      const ts  = new Date(date); ts.setHours(h, 0, 0, 0);
      windReadings.push({ deviceId: devWindMeter.id, projectId: wind1.id, kwhGenerated: kwh, co2AvoidedKg: co2, householdsServed: 120, recordedAt: ts });
      windReadings.push({ deviceId: devWindWeather.id, projectId: wind1.id, windSpeedMs: ws, temperatureC: temperature(11.53, month, h), humidityPct: humidity(h, 11.53), recordedAt: ts });
    }

    // Biochar — daily kiln temperature
    for (let h = 8; h <= 20; h += 4) {
      const ts = new Date(date); ts.setHours(h, 0, 0, 0);
      biocharReadings.push({ deviceId: devBiocharTemp.id, projectId: biochar1.id, temperatureC: parseFloat((420 + Math.random() * 80).toFixed(1)), soilMoisturePct: parseFloat((8 + Math.random() * 6).toFixed(1)), recordedAt: ts });
    }

    // Land climate sensors — daily
    landReadings.push({ deviceId: devAberdareWeather.id, projectId: (await db.project.findUnique({ where: { onChainId: 'CHAIN-001' } }))!.id, temperatureC: temperature(-0.42, month, 12), humidityPct: humidity(12, -0.42), rainfallMm: rainfall(month), soilMoisturePct: parseFloat((45 + Math.random() * 20).toFixed(1)), recordedAt: daysAgo(day, 12) });
    landReadings.push({ deviceId: devSineSoil.id, projectId: (await db.project.findUnique({ where: { onChainId: 'CHAIN-002' } }))!.id, temperatureC: temperature(13.85, month, 12), humidityPct: humidity(12, 13.85), soilMoisturePct: parseFloat((60 + Math.random() * 25).toFixed(1)), recordedAt: daysAgo(day, 12) });
  }

  // Batch insert in chunks of 500
  const allReadings = [...solarReadings, ...biogasReadings, ...stoveReadings, ...hydroReadings, ...windReadings, ...biocharReadings, ...landReadings];
  const CHUNK = 500;
  for (let i = 0; i < allReadings.length; i += CHUNK) {
    await db.deviceReading.createMany({ data: allReadings.slice(i, i + CHUNK) as any });
  }

  // Mark devices as recently seen
  const allDeviceIds = [devSolarMeter.id, devSolarWeather.id, devBiogasFlow.id, devBiogasWeather.id, devStoveFuel.id, devStoveWeather.id, devHydroMeter.id, devHydroFlow.id, devWindMeter.id, devWindWeather.id, devBiocharTemp.id, devAberdareWeather.id, devSineSoil.id];
  await db.ioTDevice.updateMany({ where: { id: { in: allDeviceIds } }, data: { lastSeenAt: new Date() } });

  console.log(`  ✓ ${allReadings.length} IoT readings inserted across ${allDeviceIds.length} devices`);

  // ── 7. More purchases for buyer dashboards ───────────────────────────────

  const buyer1 = await db.user.findUnique({ where: { email: 'buyer.green@example.com' } });
  const buyer2 = await db.user.findUnique({ where: { email: 'buyer.climate@example.com' } });
  const listings = await db.listing.findMany({ where: { status: 'ACTIVE' }, take: 8 });

  const purchaseData = [
    { listingId: listings[0]?.id, buyerId: buyer1!.id, totalTons: 30,  totalPrice: 516,   currency: 'USDC', txHash: '0xpurchase-e001', retired: false },
    { listingId: listings[1]?.id, buyerId: buyer2!.id, totalTons: 50,  totalPrice: 1025,  currency: 'USDC', txHash: '0xpurchase-e002', retired: true,  retirementTxHash: '0xretire-e002', nftTokenId: 'RET-CERT-003' },
    { listingId: listings[2]?.id, buyerId: buyer1!.id, totalTons: 200, totalPrice: 2560,  currency: 'USDC', txHash: '0xpurchase-e003', retired: false },
    { listingId: listings[3]?.id, buyerId: buyer2!.id, totalTons: 80,  totalPrice: 1760,  currency: 'USDC', txHash: '0xpurchase-e004', retired: true,  retirementTxHash: '0xretire-e004', nftTokenId: 'RET-CERT-004' },
    { listingId: listings[4]?.id, buyerId: buyer1!.id, totalTons: 40,  totalPrice: 756,   currency: 'USDC', txHash: '0xpurchase-e005', retired: false },
    { listingId: listings[5]?.id, buyerId: buyer2!.id, totalTons: 600, totalPrice: 15000, currency: 'USDC', txHash: '0xpurchase-e006', retired: true,  retirementTxHash: '0xretire-e006', nftTokenId: 'RET-CERT-005' },
  ].filter(p => p.listingId);

  for (const p of purchaseData) {
    await db.purchase.create({ data: p as any });
  }

  console.log(`  ✓ ${purchaseData.length} additional purchases created`);

  // ── Summary ──────────────────────────────────────────────────────────────

  const totalDevices  = await db.ioTDevice.count();
  const totalReadings = await db.deviceReading.count();
  const totalListings = await db.listing.count({ where: { status: 'ACTIVE' } });

  console.log(`
✅  Energy & IoT seed complete!

Energy Projects (6 new):
  ☀️  Kano Solar 60kW (Nigeria)          → ACTIVE · $17.20/t
  🔥  Kampala Biogas 18kW (Uganda)        → ACTIVE · $20.50/t
  🍳  Selous Cookstoves 800HH (Tanzania)  → ACTIVE · $12.80/t
  💧  Adamawa Micro-Hydro 35kW (Cameroon) → VERIFIED · $22.00/t
  💨  Arta Wind 30kW (Djibouti)           → ACTIVE · $18.90/t
  ⚫  Ashanti Biochar (Ghana)             → VERIFIED · $25.00/t

IoT Summary:
  Devices:  ${totalDevices}
  Readings: ${totalReadings.toLocaleString()} (60 days historical data)

Marketplace: ${totalListings} active listings (11 land + 6 energy)

Admin credentials:
  URL:      http://localhost:3000/admin
  Email:    admin@carbonafrika.com
  Password: password
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
