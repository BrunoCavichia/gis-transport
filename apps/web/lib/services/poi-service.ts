import type { POI } from "@/lib/types";
import { OVERPASS_URL, TIMEOUTS } from "@/lib/config";
import { GEO_CACHE_CONFIG, getGeoCacheKey } from "@/lib/geo-utils";
import type { OverpassElement } from "@/lib/types";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<string, { data: POI[]; timestamp: number }>();

    // In-flight request deduplication
    private static pendingRequests = new Map<string, Promise<POI[]>>();

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
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.OVERPASS); // 15s timeout

            const res = await fetch(OVERPASS_URL, {
                method: "POST",
                body: query,
                headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Overpass API responded with status ${res.status}`);
            }
            const data = await res.json();

            return (data.elements || []).map((element: OverpassElement) => {
                const latEl = element.lat ?? element.center?.lat;
                const lonEl = element.lon ?? element.center?.lon;
                if (!latEl || !lonEl) return null;

                const type = amenity === "fuel" ? "gas" : "ev";

                return {
                    id: `${type}-${element.id}`,
                    name: element.tags?.name || element.tags?.brand || (type === "gas" ? "Gas Station" : "EV Charging Station"),
                    position: [latEl, lonEl] as [number, number],
                    type: type,
                    brand: element.tags?.brand,
                    operator: element.tags?.operator,
                    address: element.tags?.["addr:street"]
                        ? `${element.tags["addr:street"]}${element.tags["addr:housenumber"] ? " " + element.tags["addr:housenumber"] : ""}`
                        : undefined,
                    connectors: type === "ev" ? (element.tags?.capacity || 1) : undefined,
                };
            }).filter((poi: POI) => poi !== null) as POI[];
        } catch (e) {
            if ((e as Error).name === 'AbortError') {
                console.warn(`POIService: Overpass timeout for ${amenity}`);
            } else {
                console.error(`POIService: Overpass fetch failed for ${amenity}`, e);
            }
            throw e;
        }
    }

    /**
     * Fetches EV charging stations around a point using Overpass.
     */
    static async getEVStations(lat: number, lon: number, distanceKm: number = 1): Promise<POI[]> {
        const radiusMeters = distanceKm * 1000;
        const key = getGeoCacheKey("ev", lat, lon, radiusMeters);

        // Check cache
        const cached = this.evCache.get(key);
        if (cached && Date.now() - cached.timestamp < GEO_CACHE_CONFIG.SERVER_EXPIRE) {
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
            .catch((e: Error) => {
                console.error(`POIService: Overpass fetch failed for EV`, e);
                this.pendingRequests.delete(key);
                // Return stale data if available, even if expired
                if (cached) {
                    console.log(`[POIService] Returning stale EV data for ${key} due to fetch error`);
                    return cached.data;
                }
                return [];
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Fetches gas stations around a point using Overpass.
     */
    static async getGasStations(lat: number, lon: number, radius: number = 5000): Promise<POI[]> {
        const key = getGeoCacheKey("gas", lat, lon, radius);

        // Check cache
        const cached = this.gasCache.get(key);
        if (cached && Date.now() - cached.timestamp < GEO_CACHE_CONFIG.SERVER_EXPIRE) {
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
                // Return stale data if available, even if expired
                if (cached) {
                    console.log(`[POIService] Returning stale Gas data for ${key} due to fetch error`);
                    return cached.data;
                }
                return [];
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }
}
