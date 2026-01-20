// lib/services/poi-service.ts
import type { POI } from "@/lib/types";
import { OVERPASS_URL } from "@/lib/config";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<string, { data: POI[]; timestamp: number }>();

    // In-flight request deduplication
    private static pendingRequests = new Map<string, Promise<POI[]>>();

    // Longer cache durations - POIs don't change often
    private static readonly EV_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    private static readonly GAS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

    // Larger geo-buckets to reduce redundant fetches
    private static readonly GEO_BUCKET_SIZE = 50; // ~0.02 degrees = ~2km

    private static getCacheKey(type: string, lat: number, lon: number, radius: number): string {
        // Larger geo-buckets (every 0.02 degrees ≈ 2km)
        const latB = Math.floor(lat * this.GEO_BUCKET_SIZE);
        const lonB = Math.floor(lon * this.GEO_BUCKET_SIZE);
        const radB = Math.ceil(radius / 2000); // bucket by 2km
        return `${type}:${latB}:${lonB}:${radB}`;
    }

    /**
     * Internal helper to fetch POIs from Overpass with optimized query
     */
    private static async fetchFromOverpass(
        lat: number,
        lon: number,
        radiusMeters: number,
        amenity: "fuel" | "charging_station"
    ): Promise<POI[]> {
        // Optimized query: only nodes (faster), shorter timeout, limit results
        const maxRadius = Math.min(radiusMeters, 10000); // Cap at 10km
        const query = `[out:json][timeout:15];
            node["amenity"="${amenity}"](around:${maxRadius},${lat},${lon});
            out 100;`; // Limit to 100 results

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

            const res = await fetch(OVERPASS_URL, {
                method: "POST",
                body: query,
                headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) return [];
            const data = await res.json();

            return (data.elements || []).map((el: any) => {
                const latEl = el.lat ?? el.center?.lat;
                const lonEl = el.lon ?? el.center?.lon;
                if (!latEl || !lonEl) return null;

                const type = amenity === "fuel" ? "gas" : "ev";

                return {
                    id: `${type}-${el.id}`,
                    name: el.tags?.name || el.tags?.brand || (type === "gas" ? "Gas Station" : "EV Charging Station"),
                    position: [latEl, lonEl] as [number, number],
                    type: type,
                    brand: el.tags?.brand,
                    operator: el.tags?.operator,
                    address: el.tags?.["addr:street"]
                        ? `${el.tags["addr:street"]}${el.tags["addr:housenumber"] ? " " + el.tags["addr:housenumber"] : ""}`
                        : undefined,
                    connectors: type === "ev" ? (el.tags?.capacity || 1) : undefined,
                };
            }).filter((s: any) => s !== null) as POI[];
        } catch (e) {
            if ((e as Error).name === 'AbortError') {
                console.warn(`POIService: Overpass timeout for ${amenity}`);
            } else {
                console.error(`POIService: Overpass fetch failed for ${amenity}`, e);
            }
            return [];
        }
    }

    /**
     * Fetches EV charging stations around a point using Overpass.
     */
    static async getEVStations(lat: number, lon: number, distanceKm: number = 1): Promise<POI[]> {
        const radiusMeters = distanceKm * 1000;
        const key = this.getCacheKey("ev", lat, lon, radiusMeters);

        // Check cache
        const cached = this.evCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.EV_CACHE_DURATION) {
            return cached.data;
        }

        // Deduplicate in-flight requests
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key)!;
        }

        const promise = this.fetchFromOverpass(lat, lon, radiusMeters, "charging_station")
            .then(stations => {
                this.evCache.set(key, { data: stations, timestamp: Date.now() });
                this.pendingRequests.delete(key);
                return stations;
            })
            .catch(e => {
                this.pendingRequests.delete(key);
                return [];
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Fetches gas stations around a point using Overpass.
     */
    static async getGasStations(lat: number, lon: number, radius: number = 5000): Promise<POI[]> {
        const key = this.getCacheKey("gas", lat, lon, radius);

        // Check cache
        const cached = this.gasCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.GAS_CACHE_DURATION) {
            return cached.data;
        }

        // Deduplicate in-flight requests
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key)!;
        }

        const promise = this.fetchFromOverpass(lat, lon, radius, "fuel")
            .then(stations => {
                this.gasCache.set(key, { data: stations, timestamp: Date.now() });
                this.pendingRequests.delete(key);
                return stations;
            })
            .catch(e => {
                this.pendingRequests.delete(key);
                return [];
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }
}
