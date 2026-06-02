import { NextRequest, NextResponse } from "next/server";

/**
 * Reverse-geocode lat/lng → human-readable place (country / state / city).
 * Server-side proxy to Nominatim (OpenStreetMap) so we can:
 *   - send the required User-Agent (Nominatim policy)
 *   - cache results so we don't hammer their free public endpoint
 *   - keep the User-Agent out of the browser
 *
 * Nominatim's usage policy caps us at ~1 req/sec for public users — fine for
 * project-registration volume. If we ever push this hard, swap to Mapbox or
 * Google Geocoding (still works, just better latency + higher quotas).
 */

interface GeocodeResult {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  display: string;
}

// In-memory cache lives for the lifetime of the Next.js server process.
// Keyed by ~1km granularity (2 decimals) so nearby clicks all hit the same row.
const cache = new Map<string, GeocodeResult>();
const MAX_CACHE = 2000;

function evictOldestIfFull() {
  if (cache.size < MAX_CACHE) return;
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    // zoom=10 = "city level" — enough for country + region without over-fetching.
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "Kabon.Africa/1.0 (hello@kabon.africa)",
        "Accept-Language": "en",
      },
      // Nominatim's free tier can be slow; cap so the form doesn't hang forever.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim ${res.status}` }, { status: 502 });
    }

    const j = await res.json() as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = j.address ?? {};
    const result: GeocodeResult = {
      country:     a.country,
      countryCode: a.country_code?.toUpperCase(),
      region:      a.state ?? a.region ?? a.county ?? a.state_district,
      city:        a.city ?? a.town ?? a.village ?? a.suburb,
      display:     j.display_name ?? "",
    };

    evictOldestIfFull();
    cache.set(key, result);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Geocode error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
