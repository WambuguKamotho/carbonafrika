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

// Side-length of the half-bbox in km. Capped at 5 km to stay within Copernicus
// Statistics API's per-request sample-size limit. For large projects we sample
// a representative 10×10 km area around the project centroid rather than the
// full extent — fine for NDVI monitoring; full-coverage analysis is a separate
// Earth-Engine workflow we don't need here.
function buildBbox(lat: number, lng: number, hectares: number): [number, number, number, number] {
  const naive  = Math.sqrt(hectares) * 0.1;
  const sideKm = Math.min(naive, 5);
  const latDelta = sideKm / 111;
  const lngDelta = sideKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

// Choose a pixel resolution that fits the Statistics API's max sample budget.
// Native Sentinel-2 is 10 m/pixel — only safe for small bboxes. For larger areas
// we coarsen to 30 m so the total pixel count stays manageable.
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
      // We're using EPSG:4326 (degrees) for the bbox, so resx/resy must also
      // be in degrees. 1° latitude ≈ 111 km, so convert metres to degrees.
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

export async function fetchNdviModis(lat: number, lng: number): Promise<NdviResult> {
  const token = process.env.NASA_EARTHDATA_TOKEN;
  if (!token) throw new Error('NASA_EARTHDATA_TOKEN not set');

  // CMR STAC search for MODIS MOD13A3 (monthly NDVI, 1km resolution)
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 90);
  const temporal = `${fromDate.toISOString().split('T')[0]}T00:00:00Z,${today.toISOString().split('T')[0]}T23:59:59Z`;

  // Small bounding box around the point (0.05 deg ~ 5 km)
  const bbox = `${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}`;
  const url = `https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search?collections=MOD13A3.061&temporal=${temporal}&bbox=${bbox}&limit=5`;

  const searchRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!searchRes.ok) throw new Error(`NASA CMR search failed: ${searchRes.status}`);

  const searchData = await searchRes.json() as {
    features: Array<{
      properties: {
        datetime: string;
        'eo:cloud_cover'?: number;
      };
      assets: Record<string, { href: string; title?: string }>;
    }>;
  };

  if (!searchData.features?.length) throw new Error('No MODIS granules found');

  // COG pixel extraction requires server-side GDAL (AppEEARS async job).
  // Confirm granule exists then fall back so caller can use Agromonitoring.
  throw new Error('MODIS granule found but COG pixel extraction not yet implemented — using fallback');
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
  // Try Copernicus (Sentinel-2, 10m) → Agromonitoring fallback
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
