// Emissions.dev API integration
// Provides country-specific CO₂ emission factors for IoT readings.
// Results are cached in memory (24h TTL) — at most one API call per country per day.

const API_BASE = 'https://api.emissions.dev/v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── Country name → ISO 3166-1 alpha-2 ────────────────────────────────────────

const ISO_CODES: Record<string, string> = {
  Angola: 'AO', Benin: 'BJ', Botswana: 'BW', 'Burkina Faso': 'BF',
  Burundi: 'BI', Cameroon: 'CM', 'Cape Verde': 'CV', 'Central African Republic': 'CF',
  "Côte d'Ivoire": 'CI', 'Ivory Coast': 'CI', Chad: 'TD',
  'DR Congo': 'CD', DRC: 'CD', 'Democratic Republic of Congo': 'CD',
  Djibouti: 'DJ', Egypt: 'EG', 'Equatorial Guinea': 'GQ', Eritrea: 'ER',
  Eswatini: 'SZ', Ethiopia: 'ET', Gabon: 'GA', Gambia: 'GM', Ghana: 'GH',
  Guinea: 'GN', 'Guinea-Bissau': 'GW', Kenya: 'KE', Lesotho: 'LS',
  Liberia: 'LR', Libya: 'LY', Madagascar: 'MG', Malawi: 'MW', Mali: 'ML',
  Mauritania: 'MR', Mauritius: 'MU', Morocco: 'MA', Mozambique: 'MZ',
  Namibia: 'NA', Niger: 'NE', Nigeria: 'NG', Rwanda: 'RW', Senegal: 'SN',
  'Sierra Leone': 'SL', Somalia: 'SO', 'South Africa': 'ZA',
  'South Sudan': 'SS', Sudan: 'SD', Tanzania: 'TZ', Togo: 'TG',
  Tunisia: 'TN', Uganda: 'UG', Zambia: 'ZM', Zimbabwe: 'ZW',
};

function toIso(country: string): string {
  return ISO_CODES[country] ?? 'KE'; // default to Kenya if unmapped
}

// ── In-memory caches ──────────────────────────────────────────────────────────

const electricityCache = new Map<string, { gPerKwh: number; at: number }>();
const fuelCache = new Map<string, { kgPerKg: number; at: number }>();

function authHeader(): Record<string, string> {
  const key = process.env.EMISSIONS_DEV_API_KEY;
  if (!key) throw new Error('EMISSIONS_DEV_API_KEY not set');
  return { Authorization: `Bearer ${key}` };
}

// ── Electricity grid intensity ────────────────────────────────────────────────

async function fetchGridIntensity(iso: string): Promise<number> {
  const cached = electricityCache.get(iso);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.gPerKwh;

  const url = `${API_BASE}/electricity/emissions?kwh=1&country=${iso}&include_wtt=true`;
  const res = await fetch(url, { headers: authHeader() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`emissions.dev electricity [${iso}] ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    data: { attributes: { electricity: { grid_intensity: number } } };
  };

  const gPerKwh = json.data.attributes.electricity.grid_intensity;
  electricityCache.set(iso, { gPerKwh, at: Date.now() });
  console.log(`[emissions] Grid intensity cached: ${iso} = ${gPerKwh} gCO₂e/kWh`);
  return gPerKwh;
}

// ── Fuel emission factors ─────────────────────────────────────────────────────

async function fetchFuelFactor(fuelType: string): Promise<number> {
  const cached = fuelCache.get(fuelType);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.kgPerKg;

  const url = `${API_BASE}/fuel/emissions?fuel_type=${fuelType}&amount=1&unit=kg&include_wtt=true`;
  const res = await fetch(url, { headers: authHeader() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`emissions.dev fuel [${fuelType}] ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    data: { attributes: { emissions: { co2e: number; co2e_unit: string } } };
  };

  const { co2e, co2e_unit } = json.data.attributes.emissions;
  const kgPerKg = co2e_unit === 'kg' ? co2e : co2e / 1000;
  fuelCache.set(fuelType, { kgPerKg, at: Date.now() });
  console.log(`[emissions] Fuel factor cached: ${fuelType} = ${kgPerKg} kgCO₂e/kg`);
  return kgPerKg;
}

// ── Fallback constants (used when API key missing or call fails) ───────────────

const FALLBACK_KWH_FACTOR  = 0.498; // kg CO₂e/kWh — East Africa grid average
const FALLBACK_FUEL_FACTOR = 1.83;  // kg CO₂e/kg  — generic solid fuel (wood/charcoal)

// ── Travel cache ──────────────────────────────────────────────────────────────

const travelCache = new Map<string, { co2eKg: number; at: number }>();

// ── Freight cache ─────────────────────────────────────────────────────────────

const freightCache = new Map<string, { co2eKg: number; at: number }>();

// ── Public API ────────────────────────────────────────────────────────────────

export async function co2ForKwh(kwh: number, country: string): Promise<number> {
  if (!process.env.EMISSIONS_DEV_API_KEY) {
    return kwh * FALLBACK_KWH_FACTOR;
  }
  try {
    const iso     = toIso(country);
    const gPerKwh = await fetchGridIntensity(iso);
    return kwh * (gPerKwh / 1000); // g → kg
  } catch (err) {
    console.warn(`[emissions] Falling back to default factor for ${country}:`, (err as Error).message);
    return kwh * FALLBACK_KWH_FACTOR;
  }
}

export async function co2ForFuelDisplaced(amountKg: number, fuelType = 'wood_logs'): Promise<number> {
  if (!process.env.EMISSIONS_DEV_API_KEY) {
    return amountKg * FALLBACK_FUEL_FACTOR;
  }
  try {
    const kgPerKg = await fetchFuelFactor(fuelType);
    return amountKg * kgPerKg;
  } catch (err) {
    console.warn(`[emissions] Falling back to default fuel factor:`, (err as Error).message);
    return amountKg * FALLBACK_FUEL_FACTOR;
  }
}

export async function co2ForTravel(params: {
  originCountry: string;
  destinationCountry: string;
  passengers?: number;
  transportMode?: string;
  cabinClass?: string;
  returnTrip?: boolean;
}): Promise<number> {
  const key = JSON.stringify(params);
  const cached = travelCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.co2eKg;

  if (!process.env.EMISSIONS_DEV_API_KEY) {
    // Rough fallback: ~0.115 kgCO2e per km per passenger, ~1500km average trip
    return (params.passengers ?? 1) * 0.115 * 1500 * (params.returnTrip ? 2 : 1);
  }

  try {
    const qs = new URLSearchParams({
      origin_country: params.originCountry,
      destination_country: params.destinationCountry,
      passengers: String(params.passengers ?? 1),
      ...(params.transportMode && { transport_mode: params.transportMode }),
      ...(params.cabinClass && { cabin_class: params.cabinClass }),
      ...(params.returnTrip && { return_trip: 'true' }),
    });
    const res = await fetch(`${API_BASE}/travel/emissions?${qs}`, { headers: authHeader() });
    if (!res.ok) throw new Error(`travel [${res.status}]`);
    const json = await res.json() as { data: { attributes: { emissions: { co2e: number } } } };
    const co2eKg = json.data.attributes.emissions.co2e;
    travelCache.set(key, { co2eKg, at: Date.now() });
    return co2eKg;
  } catch (err) {
    console.warn('[emissions] Travel fallback:', (err as Error).message);
    return (params.passengers ?? 1) * 0.115 * 1500 * (params.returnTrip ? 2 : 1);
  }
}

export async function co2ForFreight(params: {
  originCountry: string;
  destinationCountry: string;
  weightKg: number;
  transportMode?: string;
}): Promise<number> {
  const key = JSON.stringify(params);
  const cached = freightCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.co2eKg;

  if (!process.env.EMISSIONS_DEV_API_KEY) {
    // Rough fallback: ~0.1 kgCO2e per tonne-km, ~2000km average
    return (params.weightKg / 1000) * 0.1 * 2000;
  }

  try {
    const qs = new URLSearchParams({
      origin_country: params.originCountry,
      destination_country: params.destinationCountry,
      weight: String(params.weightKg),
      unit: 'kg',
      ...(params.transportMode && { transport_mode: params.transportMode }),
    });
    const res = await fetch(`${API_BASE}/freight/emissions?${qs}`, { headers: authHeader() });
    if (!res.ok) throw new Error(`freight [${res.status}]`);
    const json = await res.json() as { data: { attributes: { emissions: { co2e: number } } } };
    const co2eKg = json.data.attributes.emissions.co2e;
    freightCache.set(key, { co2eKg, at: Date.now() });
    return co2eKg;
  } catch (err) {
    console.warn('[emissions] Freight fallback:', (err as Error).message);
    return (params.weightKg / 1000) * 0.1 * 2000;
  }
}
