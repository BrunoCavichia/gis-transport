// lib/services/zone-service.ts
import type { Zone } from "@/lib/types";

const OVERPASS_URL = "https://overpass.private.coffee/api/interpreter";

export class ZoneService {
    private static cache = new Map<string, { data: Zone[]; timestamp: number }>();
    private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    private static getCacheKey(lat: number, lon: number, radius: number, type: string) {
        return `${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100},${Math.round(radius / 1000)},${type}`;
    }

    private static getFromCache(key: string) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }

    private static setCache(key: string, data: Zone[]) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    private static async fetchFromOverpass(query: string): Promise<any[]> {
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
        } catch (e) {
            console.error("ZoneService: Overpass fetch failed", e);
            return [];
        }
    }

    /**
     * Fetches zones (LEZ, Restricted, etc.) around a point.
     */
    static async getZones(lat: number, lon: number, radius: number = 5000): Promise<Zone[]> {
        const radiusKm = Math.min(radius / 1000, 15);
        const cacheKey = this.getCacheKey(lat, lon, radius, "combined");

        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const query = `[out:json][timeout:60];
            (
                relation["boundary"="low_emission_zone"](around:${radiusKm * 1000},${lat},${lon});
                way["boundary"="low_emission_zone"](around:${radiusKm * 1000},${lat},${lon});
                relation["boundary"="limited_traffic_zone"](around:${radiusKm * 1000},${lat},${lon});
                way["boundary"="limited_traffic_zone"](around:${radiusKm * 1000},${lat},${lon});
                relation["zone:environmental"](around:${radiusKm * 1000},${lat},${lon});
                way["zone:environmental"](around:${radiusKm * 1000},${lat},${lon});
                relation["highway"="pedestrian"]["area"="yes"](around:${radiusKm * 1000},${lat},${lon});
                way["highway"="pedestrian"]["area"="yes"](around:${radiusKm * 1000},${lat},${lon});
                relation["access"="no"]["area"="yes"](around:${radiusKm * 1000},${lat},${lon});
                way["access"="no"]["area"="yes"](around:${radiusKm * 1000},${lat},${lon});
            );
            (._;>;);
            out geom;`;

        const elements = await this.fetchFromOverpass(query);

        const zones: Zone[] = elements
            .map((el: any) => {
                const coordinates: [number, number][] =
                    el.geometry?.map((p: any) => [p.lat, p.lon]) ||
                    el.members?.flatMap(
                        (m: any) => m.geometry?.map((p: any) => [p.lat, p.lon]) || []
                    ) ||
                    [];
                if (coordinates.length < 3) return null;

                // Determine type based on tags
                let type = "Restricted";
                if (el.tags?.boundary === "low_emission_zone" || el.tags?.["zone:environmental"]) {
                    type = "LEZ";
                } else if (el.tags?.boundary === "limited_traffic_zone") {
                    type = "LimitedTraffic";
                } else if (el.tags?.highway === "pedestrian") {
                    type = "Pedestrian";
                }

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

        this.setCache(cacheKey, zones);
        return zones;
    }
}
