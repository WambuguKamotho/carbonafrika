/**
 * Seed realistic dummy IoT data for every CLEAN_ENERGY project that has no
 * device yet. Each project gets:
 *   - 1–2 IoTDevice rows shaped by its energyType
 *   - 30 days of daily DeviceReadings with realistic diurnal patterns
 *
 * Idempotent: skips projects that already have devices.
 * Run with: DATABASE_URL=... npx tsx packages/db/prisma/seed-iot.ts
 */
import { prisma } from "../src";
import { randomBytes } from "node:crypto";

interface DevicePlan {
  deviceType: "ENERGY_METER" | "WEATHER_STATION" | "SOIL_SENSOR" | "FLOW_METER" | "FUEL_SENSOR";
  label: string;
}

// Realistic per-day baselines for East Africa for each energy type.
// Approximate ranges tuned so the dashboards render sensible numbers.
const ENERGY_PROFILES: Record<string, {
  devices: DevicePlan[];
  // Returns the per-day reading values; `t` is days-ago (0 = today)
  pattern: (t: number) => Partial<{
    kwhGenerated: number;
    co2AvoidedKg: number;
    householdsServed: number;
    fuelDisplacedKg: number;
    temperatureC: number;
    humidityPct: number;
    rainfallMm: number;
    windSpeedMs: number;
    gasFlowM3h: number;
    pressureKpa: number;
  }>;
}> = {
  SOLAR_PV: {
    devices: [
      { deviceType: "ENERGY_METER",    label: "Main inverter — east array" },
      { deviceType: "WEATHER_STATION", label: "Site weather station" },
    ],
    pattern: (t) => {
      // Bright-sun baseline ~85 kWh/day for a ~20 kWp array, modulated by clouds.
      const cloudy = Math.sin(t / 4) * 12 + (Math.random() - 0.5) * 18;
      return {
        kwhGenerated:     Math.max(20, 85 + cloudy),
        co2AvoidedKg:     Math.max(10, 38 + cloudy * 0.45),  // EAPP grid factor
        temperatureC:     22 + Math.sin(t / 6) * 4 + Math.random() * 2,
        humidityPct:      55 + Math.cos(t / 5) * 12,
        rainfallMm:       Math.random() < 0.2 ? Math.random() * 8 : 0,
      };
    },
  },
  BIOGAS: {
    devices: [
      { deviceType: "FLOW_METER",      label: "Digester flow + pressure" },
      { deviceType: "ENERGY_METER",    label: "Gas-to-electric meter" },
    ],
    pattern: (t) => {
      const flow = 0.9 + Math.sin(t / 3) * 0.15 + (Math.random() - 0.5) * 0.1;
      const kwh  = flow * 22;  // ~22 kWh per m³ biogas heating equivalent
      return {
        gasFlowM3h:       Math.max(0.3, flow),
        pressureKpa:      3.8 + Math.sin(t / 4) * 0.3,
        kwhGenerated:     Math.max(8, kwh),
        co2AvoidedKg:     Math.max(4, kwh * 0.45),
        householdsServed: 5 + Math.floor(Math.random() * 3),
      };
    },
  },
  COOKSTOVES: {
    devices: [
      { deviceType: "FUEL_SENSOR", label: "Cookstove fuel use sampler" },
    ],
    pattern: (t) => {
      // Per-household daily wood displacement vs traditional 3-stone
      const householdsActive = 320 + Math.floor(Math.sin(t / 10) * 30 + Math.random() * 20);
      const fuelKgPerHh      = 1.8 + Math.random() * 0.6;
      const fuelTotal        = householdsActive * fuelKgPerHh;
      return {
        householdsServed: householdsActive,
        fuelDisplacedKg:  Math.round(fuelTotal),
        // Sustainable wood factor for sub-Saharan Africa: ~1.4 kg CO₂ per kg fuelwood saved
        co2AvoidedKg:     Math.round(fuelTotal * 1.4),
      };
    },
  },
  BIOCHARCOAL: {
    devices: [
      { deviceType: "FUEL_SENSOR",     label: "Pyrolysis feedstock sensor" },
      { deviceType: "ENERGY_METER",    label: "Kiln output meter" },
    ],
    pattern: (t) => {
      const feedstock = 480 + Math.sin(t / 5) * 40 + Math.random() * 30;
      return {
        fuelDisplacedKg: Math.round(feedstock),
        co2AvoidedKg:    Math.round(feedstock * 2.8),  // ~2.8 kg CO₂/kg biochar
        kwhGenerated:    Math.round(feedstock * 0.2),  // recovered heat
        temperatureC:    24 + Math.random() * 3,
      };
    },
  },
  MICRO_HYDRO: {
    devices: [
      { deviceType: "ENERGY_METER", label: "Turbine output meter" },
      { deviceType: "FLOW_METER",   label: "Penstock flow meter" },
    ],
    pattern: (t) => {
      // Wetter pattern with a soft seasonal rain bump
      const seasonal = Math.sin((t / 30) * Math.PI) * 0.2 + 1;
      const kwh = (140 + Math.sin(t / 3) * 12) * seasonal;
      return {
        kwhGenerated:     Math.max(40, kwh),
        co2AvoidedKg:     Math.max(20, kwh * 0.45),
        gasFlowM3h:       (0.85 + Math.random() * 0.2) * seasonal,  // hijack for water flow rate
        rainfallMm:       Math.random() < 0.4 ? Math.random() * 14 : 0,
      };
    },
  },
  WIND: {
    devices: [
      { deviceType: "ENERGY_METER",    label: "Turbine output" },
      { deviceType: "WEATHER_STATION", label: "Wind mast" },
    ],
    pattern: (t) => {
      const windSpeed = 5.5 + Math.sin(t / 2) * 1.2 + Math.random() * 1.5;
      const kwh       = Math.max(0, Math.pow(windSpeed, 2.5) * 1.3);
      return {
        windSpeedMs:    windSpeed,
        kwhGenerated:   kwh,
        co2AvoidedKg:   kwh * 0.45,
        temperatureC:   18 + Math.sin(t / 6) * 4,
        humidityPct:    62 + Math.cos(t / 4) * 8,
      };
    },
  },
};

// How many days of recent dummy data each project should have on hand.
const TARGET_DAYS = 30;

async function main() {
  // Includes projects that already have some devices/readings — we'll top them
  // up so the dashboard has a meaningful 30-day window.
  const energyProjects = await prisma.project.findMany({
    where: { projectType: "CLEAN_ENERGY" },
    select: {
      id: true, title: true, energyType: true, lat: true, lng: true,
      devices: { select: { id: true, deviceType: true, label: true } },
      _count:  { select: { deviceReadings: true } },
    },
  });

  console.log(`Found ${energyProjects.length} energy project(s). Topping each up to ${TARGET_DAYS} days of readings.`);

  for (const p of energyProjects) {
    if (!p.energyType) {
      console.log(`  · ${p.title}: no energyType set, skipping`);
      continue;
    }
    const profile = ENERGY_PROFILES[p.energyType];
    if (!profile) {
      console.log(`  · ${p.title}: no profile for ${p.energyType}, skipping`);
      continue;
    }

    // Make sure we have one device of each desired type. Re-use existing ones
    // where labels/types match; create only what's missing.
    const created = [] as { id: string; label: string }[];
    for (const d of profile.devices) {
      const existing = p.devices.find(dev => dev.deviceType === d.deviceType);
      if (existing) {
        created.push({ id: existing.id, label: existing.label ?? d.label });
        continue;
      }
      const device = await prisma.ioTDevice.create({
        data: {
          projectId:  p.id,
          deviceKey:  randomBytes(20).toString("hex"),
          deviceType: d.deviceType,
          label:      d.label,
          lat:        p.lat,
          lng:        p.lng,
          active:     true,
          lastSeenAt: new Date(),
        },
      });
      created.push({ id: device.id, label: device.label! });
    }

    // Wipe existing recent readings (last TARGET_DAYS) so we don't double up.
    const since = new Date(Date.now() - TARGET_DAYS * 24 * 60 * 60 * 1000);
    await prisma.deviceReading.deleteMany({
      where: { projectId: p.id, recordedAt: { gte: since } },
    });

    const energyDevice  = created[0];
    const weatherDevice = created.find(c => c.label.toLowerCase().includes("weather") || c.label.toLowerCase().includes("wind")) ?? energyDevice;

    const rows = [] as Array<{ deviceId: string; data: ReturnType<typeof profile.pattern>; ts: Date }>;
    for (let t = TARGET_DAYS - 1; t >= 0; t--) {
      const ts = new Date(Date.now() - t * 24 * 60 * 60 * 1000);
      const vals = profile.pattern(t);
      // Energy-ish vs weather-ish split
      const weatherKeys = ["temperatureC", "humidityPct", "rainfallMm", "windSpeedMs"];
      const energyVals  = { ...vals };
      const weatherVals: Record<string, number> = {};
      for (const k of weatherKeys) {
        if (k in energyVals) {
          weatherVals[k] = (energyVals as Record<string, number>)[k];
          delete (energyVals as Record<string, number>)[k];
        }
      }
      rows.push({ deviceId: energyDevice.id, data: energyVals, ts });
      if (Object.keys(weatherVals).length > 0) {
        rows.push({ deviceId: weatherDevice.id, data: weatherVals as ReturnType<typeof profile.pattern>, ts });
      }
    }

    await prisma.deviceReading.createMany({
      data: rows.map(r => ({
        deviceId:   r.deviceId,
        projectId:  p.id,
        recordedAt: r.ts,
        ...r.data,
      })),
    });

    // Touch each device's lastSeenAt to the most recent reading
    for (const c of created) {
      await prisma.ioTDevice.update({
        where: { id: c.id },
        data:  { lastSeenAt: new Date() },
      });
    }

    console.log(`  ✓ ${p.title} (${p.energyType}): ${created.length} device(s) + ${rows.length} readings`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
