import type { Zone } from "@/lib/types";
import { OVERPASS_URL } from "@/lib/config";

export class ZoneService {
    private static cache = new Map<string, { data: Zone[]; timestamp: number }>();
    private static pendingRequests = new Map<string, Promise<Zone[]>>();

    // Zones rarely change - cache for 1 hour
    private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    // Larger geo-buckets for zones (every 0.05 degrees ≈ 5km)
    private static readonly GEO_BUCKET_SIZE = 20;

    private static getCacheKey(lat: number, lon: number, radius: number) {
        const latB = Math.floor(lat * this.GEO_BUCKET_SIZE);
        const lonB = Math.floor(lon * this.GEO_BUCKET_SIZE);
        const radB = Math.ceil(radius / 5000); // bucket by 5km
        return `zone:${latB}:${lonB}:${radB}`;
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const res = await fetch(OVERPASS_URL, {
                method: "POST",
                body: query,
                headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) return [];
            const data = await res.json();
            return (data.elements || []).filter(
                (el: any) =>
                    (el.geometry && el.geometry.length > 2) ||
                    (el.members && el.members.some((m: any) => m.geometry?.length > 2))
            );
        } catch (e) {
            if ((e as Error).name === 'AbortError') {
                console.warn("ZoneService: Overpass timeout");
            } else {
                console.error("ZoneService: Overpass fetch failed", e);
            }
            return [];
        }
    }

    /**
     * Fetches zones (LEZ, Restricted, etc.) around a point.
     */
    static async getZones(lat: number, lon: number, radius: number = 5000): Promise<Zone[]> {
        const radiusKm = Math.min(radius / 1000, 20); // Cap at 20km
        const cacheKey = this.getCacheKey(lat, lon, radius);

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // Deduplicate in-flight requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey)!;
        }

        // Optimized query: shorter timeout, simplified structure
        const query = `[out:json][timeout:20];
            (
                relation["boundary"="low_emission_zone"](around:${radiusKm * 1000},${lat},${lon});
                way["boundary"="low_emission_zone"](around:${radiusKm * 1000},${lat},${lon});
            );
            out geom;`;

        const promise = this.fetchFromOverpass(query)
            .then(elements => {
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
                        let type = "RESTRICTED";
                        const tags = el.tags || {};
                        if (tags.boundary === "low_emission_zone" || tags["zone:environmental"]) {
                            type = "LEZ";
                        } else if (tags.boundary === "limited_traffic_zone") {
                            type = "RESTRICTED";
                        } else if (tags.highway === "pedestrian") {
                            type = "PEDESTRIAN";
                        }

                        let zoneName = tags.name || type;
                        const isRestriction = type === "LEZ" || type === "RESTRICTED" || tags["zone:environmental"];
                        const requiredTags = isRestriction ? ["eco", "zero"] : [];

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
                this.pendingRequests.delete(cacheKey);
                return zones;
            })
            .catch(e => {
                this.pendingRequests.delete(cacheKey);
                return [];
            });

        this.pendingRequests.set(cacheKey, promise);
        return promise;
    }
}
