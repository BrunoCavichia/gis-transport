import { type NextRequest, NextResponse } from "next/server";

// Cache simple en memoria: clave espacial -> { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_ENTRIES = 200;

function clampCacheSize() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const oldest = Array.from(cache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  )[0][0];
  cache.delete(oldest);
}

/**
 * Genera una clave espacial agrupando coordenadas en una rejilla según el radio (km).
 * Esto asegura que peticiones cercanas (mismo "tile") compartan cache.
 */
function getCacheKey(lat: number, lon: number, radiusKm: number): string {
  // Convertir km a grados aproximados: 1 deg lat ~ 111.32 km
  const latDegPerKm = 1 / 111.32;
  const latBucketSize = Math.max(radiusKm * latDegPerKm, 0.0001);

  // Lon degrees depend on latitude
  const latRad = (lat * Math.PI) / 180;
  const lonDegPerKm = 1 / (111.32 * Math.cos(latRad) || 1);
  const lonBucketSize = Math.max(radiusKm * lonDegPerKm, 0.0001);

  const latBucket = Math.round(lat / latBucketSize);
  const lonBucket = Math.round(lon / lonBucketSize);

  return `${latBucket}:${lonBucket}:${Math.round(radiusKm)}`;
}

function getFromCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  clampCacheSize();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const distanceStr = searchParams.get("distance") || "1"; // km

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const distanceKm = Math.max(0.1, Math.min(parseFloat(distanceStr) || 1, 50));

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const cacheKey = getCacheKey(lat, lon, distanceKm);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  // No hay cache válida: realizar fetch a Open Charge Map
  const apiKey =
    process.env.OPENCHARGEMAP_API_KEY || "92a14a07-d941-41c6-aa71-97c9adf0b01c";
  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("distance", String(distanceKm));
  url.searchParams.set("distanceunit", "km");
  url.searchParams.set("maxresults", "100");
  url.searchParams.set("compact", "true");
  url.searchParams.set("verbose", "false");
  url.searchParams.set("key", apiKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": "GIS-Transport-Demo/1.0" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      // Si la API responde mal, devolver cache si existe (ya comprobado arriba) o error controlado
      console.error("Open Charge Map returned status", resp.status);
      return NextResponse.json(
        { error: "Open Charge Map unavailable" },
        { status: 503 }
      );
    }

    const data = await resp.json();

    const stations = (data || [])
      .map((station: any) => ({
        id: `ev-${station.ID}`,
        name: station.AddressInfo?.Title || "EV Charging Station",
        position: [
          station.AddressInfo?.Latitude || null,
          station.AddressInfo?.Longitude || null,
        ],
        type: "ev",
        operator: station.OperatorInfo?.Title || "Unknown",
        address: station.AddressInfo?.AddressLine1,
        town: station.AddressInfo?.Town,
        postcode: station.AddressInfo?.Postcode,
        connectors: station.Connections?.length || 0,
        connectionTypes: (station.Connections || [])
          .map((c: any) => c.ConnectionType?.Title)
          .filter(Boolean),
        powerKW: station.Connections?.[0]?.PowerKW,
        status: station.StatusType?.Title || "Unknown",
        isOperational: station.StatusType?.IsOperational ?? true,
      }))
      .filter((s: any) => s.position[0] !== null && s.position[1] !== null);

    const result = { stations };
    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    // Si hay error de fetch (timeout, network, etc.), intenta devolver cache si existe
    console.error(
      "EV stations fetch error:",
      err instanceof Error ? err.message : err
    );
    const fallback = getFromCache(cacheKey);
    if (fallback) {
      return NextResponse.json(fallback, { headers: { "X-Cache": "HIT" } });
    }

    return NextResponse.json({ error: "EV data unavailable" }, { status: 503 });
  }
}
