interface NdviResult {
  ndvi: number;
  cloudCover: number;
  capturedAt: Date;
  imageUrl: string | null;
  source: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getCopernicusToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.COPERNICUS_CLIENT_ID!,
        client_secret: process.env.COPERNICUS_CLIENT_SECRET!,
      }),
    }
  );

  if (!res.ok) throw new Error(`Copernicus auth failed: ${res.status}`);

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function buildBbox(lat: number, lng: number, hectares: number): [number, number, number, number] {
  // Cap at 5 km half-side so the bbox stays within Copernicus's sample-size limit
  // for large projects.
  const naive  = Math.sqrt(hectares) * 0.1;
  const sideKm = Math.min(naive, 5);
  const latDelta = sideKm / 111;
  const lngDelta = sideKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

function pickResolution(hectares: number): number {
  if (hectares <= 100)  return 10;
  if (hectares <= 2500) return 20;
  return 30;
}

export async function fetchNdviCopernicus(lat: number, lng: number, hectares: number): Promise<NdviResult> {
  const token = await getCopernicusToken();
  const bbox = buildBbox(lat, lng, hectares);

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 60);
  const toDate = today.toISOString().split('T')[0];
  const fromStr = fromDate.toISOString().split('T')[0];

  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"], units: "DN" }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(samples) {
  const ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.0001);
  const valid = samples.SCL >= 4 && samples.SCL <= 6 ? 1 : 0;
  return { ndvi: [ndvi], dataMask: [valid] };
}`;

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { timeRange: { from: `${fromStr}T00:00:00Z`, to: `${toDate}T23:59:59Z` }, maxCloudCoverage: 80 },
      }],
    },
    aggregation: {
      timeRange: { from: `${fromStr}T00:00:00Z`, to: `${toDate}T23:59:59Z` },
      aggregationInterval: { of: 'P1D' },
      evalscript,
      // EPSG:4326 bbox → resx/resy must be in DEGREES, not metres.
      resx: pickResolution(hectares) / 111_000,
      resy: pickResolution(hectares) / 111_000,
    },
    calculations: { ndvi: { statistics: { default: { percentiles: { k: [25, 50, 75] } } } } },
  };

  const res = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copernicus Statistics API failed: ${res.status} ${text}`);
  }

  const data = await res.json() as {
    data: Array<{
      interval: { from: string };
      outputs: { ndvi: { bands: { B0: { stats: { mean: number; sampleCount: number; noDataCount: number } } } } };
    }>;
  };

  const intervals = data.data.filter(
    (d) => d.outputs?.ndvi?.bands?.B0?.stats?.mean !== undefined &&
            d.outputs.ndvi.bands.B0.stats.noDataCount < d.outputs.ndvi.bands.B0.stats.sampleCount
  );

  if (!intervals.length) throw new Error('No valid NDVI intervals returned from Copernicus');

  const latest = intervals[intervals.length - 1];
  const ndvi = latest.outputs.ndvi.bands.B0.stats.mean;
  const total = latest.outputs.ndvi.bands.B0.stats.sampleCount;
  const noData = latest.outputs.ndvi.bands.B0.stats.noDataCount;
  const cloudCover = total > 0 ? Math.round((noData / total) * 100) : 0;

  return {
    ndvi: Math.max(-1, Math.min(1, ndvi)),
    cloudCover,
    capturedAt: new Date(latest.interval.from),
    imageUrl: null,
    source: 'sentinel-2-l2a',
  };
}

export async function fetchNdviFallback(lat: number, lng: number): Promise<NdviResult> {
  const apiKey = process.env.AGROMONITORING_API_KEY;
  if (!apiKey) throw new Error('AGROMONITORING_API_KEY not set');

  const today = new Date();
  const dtEnd = Math.floor(today.getTime() / 1000);
  const dtStart = dtEnd - 60 * 24 * 60 * 60;

  const url = `https://agromonitoring.com/api/v1/ndvi/history?appid=${apiKey}&lat=${lat}&lon=${lng}&dt_start=${dtStart}&dt_end=${dtEnd}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Agromonitoring API failed: ${res.status}`);

  const records = await res.json() as Array<{ dt: number; data: { mean: number } }>;
  if (!records.length) throw new Error('No NDVI records from Agromonitoring');

  const latest = records[records.length - 1];
  return {
    ndvi: Math.max(-1, Math.min(1, latest.data.mean)),
    cloudCover: 0,
    capturedAt: new Date(latest.dt * 1000),
    imageUrl: null,
    source: 'agromonitoring',
  };
}

export async function fetchNdvi(lat: number, lng: number, hectares: number): Promise<NdviResult> {
  try {
    return await fetchNdviCopernicus(lat, lng, hectares);
  } catch (err) {
    console.warn('[satellite] Copernicus failed:', (err as Error).message);
  }
  try {
    return await fetchNdviFallback(lat, lng);
  } catch (err) {
    console.warn('[satellite] Agromonitoring failed:', (err as Error).message);
    throw new Error('All NDVI sources exhausted');
  }
}
