import { type NextRequest, NextResponse } from "next/server";

// Cache en memoria
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 min
const MAX_CACHE_ENTRIES = 100;

// Limita la cache
function clampCacheSize() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKey = Array.from(cache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  )[0][0];
  cache.delete(oldestKey);
}

function getCacheKey(lat: number, lon: number, radius: number) {
  const latB = Math.floor(lat * 100);
  const lonB = Math.floor(lon * 100);
  const radB = Math.floor(radius / 1000);
  return `${latB}:${lonB}:${radB}`;
}

function getFromCache(key: string, allowStale = false) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    if (allowStale) return entry.data;
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  clampCacheSize();
}

// Helper para Overpass
async function queryOverpass(ql: string) {
  const overpassUrl = "https://overpass.private.coffee/api/interpreter";
  const res = await fetch(overpassUrl, {
    method: "POST",
    body: ql,
    headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
  });
  if (!res.ok) throw new Error(`Overpass status ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const radiusStr = searchParams.get("radius") ?? "5000";

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Missing coords" }, { status: 400 });
  }
  const lat = parseFloat(latStr),
    lon = parseFloat(lonStr),
    radius = Math.min(parseInt(radiusStr), 100000);

  const cacheKey = getCacheKey(lat, lon, radius);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  // Reduce radio a 100km si es mayor
  const radiusKm = Math.min(radius / 1000, 100);

  try {
    // Query en dos partes para nodos y ways por separado
    const qNodes = `
      [out:json][timeout:30];
      node["amenity"="fuel"](around:${radiusKm * 1000},${lat},${lon});
      out;
    `;

    const qWays = `
      [out:json][timeout:30];
      way["amenity"="fuel"](around:${radiusKm * 1000},${lat},${lon});
      out center;
    `;

    const [nodesData, waysData] = await Promise.all([
      queryOverpass(qNodes),
      queryOverpass(qWays),
    ]);

    const elements = [
      ...(nodesData.elements || []),
      ...(waysData.elements || []),
    ];

    const stations = elements
      .map((el: any) => {
        const latEl = el.lat ?? el.center?.lat;
        const lonEl = el.lon ?? el.center?.lon;
        if (!latEl || !lonEl) return null;
        return {
          id: `gas-${el.id}`,
          name: el.tags?.name || el.tags?.brand || "Gas Station",
          position: [latEl, lonEl],
          type: "gas",
          brand: el.tags?.brand,
          operator: el.tags?.operator,
          address: el.tags?.["addr:street"],
          fuel_diesel: el.tags?.["fuel:diesel"] === "yes",
          fuel_octane_95: el.tags?.["fuel:octane_95"] === "yes",
          fuel_octane_98: el.tags?.["fuel:octane_98"] === "yes",
          opening_hours: el.tags?.opening_hours,
        };
      })
      .filter((s: any) => s && s.position[0] && s.position[1]);

    const result = { stations };

    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Overpass fetch failed:", err);

    const stale = getFromCache(cacheKey, true);
    if (stale) {
      return NextResponse.json(stale, { headers: { "X-Cache": "STALE" } });
    }
    return NextResponse.json(
      { error: "Overpass unavailable" },
      { status: 503 }
    );
  }
}
