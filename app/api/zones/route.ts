import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Zone } from "@/lib/types";

const OVERPASS_URL = "https://overpass.private.coffee/api/interpreter"; // endpoint estable
const cache = new Map<string, { data: Zone[]; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

function getCacheKey(lat: number, lon: number, radius: number, type: string) {
  return `${Math.round(lat * 100) / 100},${
    Math.round(lon * 100) / 100
  },${Math.round(radius / 1000)},${type}`;
}

function getFromCache(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setCache(key: string, data: Zone[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchZonesSafe(query: string): Promise<any[]> {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      body: query,
      headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements || []).filter(
      (el: any) =>
        (el.geometry && el.geometry.length > 2) ||
        (el.members && el.members.some((m: any) => m.geometry?.length > 2))
    );
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  const radius = parseFloat(url.searchParams.get("radius") || "5000");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Missing or invalid coordinates" },
      { status: 400 }
    );
  }

  const radiusKm = Math.min(radius / 1000, 5); // limitar a 5km para evitar sobrecarga

  const zoneTypes: { type: string; filter: string }[] = [
    { type: "LEZ", filter: '["boundary"="low_emission_zone"]' },
    { type: "LimitedTraffic", filter: '["boundary"="limited_traffic_zone"]' },
    { type: "Environmental", filter: '["zone:environmental"]' },
    { type: "Pedestrian", filter: '["highway"="pedestrian"]["area"="yes"]' },
    { type: "Restricted", filter: '["access"="no"]["area"="yes"]' },
  ];

  const allZones: Zone[] = [];

  for (const { type, filter } of zoneTypes) {
    const cacheKey = getCacheKey(lat, lon, radius, type);
    const cached = getFromCache(cacheKey);
    if (cached) {
      allZones.push(...cached);
      continue;
    }

    const query = `[out:json][timeout:60];
      (relation${filter}(around:${radiusKm * 1000},${lat},${lon});
       way${filter}(around:${radiusKm * 1000},${lat},${lon}););
      (._;>;);
      out geom;`;

    const elements = await fetchZonesSafe(query);

    const zones: Zone[] = elements
      .map((el: any) => {
        const coordinates: [number, number][] =
          el.geometry?.map((p: any) => [p.lat, p.lon]) ||
          el.members?.flatMap(
            (m: any) => m.geometry?.map((p: any) => [p.lat, p.lon]) || []
          ) ||
          [];
        if (coordinates.length < 3) return null;

        let zoneName = el.tags?.name || type;
        const requiredTags = type === "LEZ" ? ["eco", "zero_emissions"] : [];

        return {
          id: `${el.type}-${el.id}`,
          name: zoneName,
          type,
          description: el.tags ? JSON.stringify(el.tags) : "",
          coordinates,
          requiredTags,
        } as Zone;
      })
      .filter((z): z is Zone => z !== null);

    setCache(cacheKey, zones);
    allZones.push(...zones);
  }

  return NextResponse.json(
    { zones: allZones },
    { headers: { "X-Cache": "MISS" } }
  );
}
