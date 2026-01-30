import type { POI } from "@/lib/types";
import { TIMEOUTS } from "@/lib/config";
import { GEO_CACHE_CONFIG, getGeoCacheKey } from "@/lib/geo-utils";
import { OverpassElement, OverpassClient } from "@gis/shared";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<string, { data: POI[]; timestamp: number }>();

    // In-flight request deduplication
    private static pendingRequests = new Map<string, Promise<POI[]>>();


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

        const promise = OverpassClient.fetchAroundPOIs(lat, lon, radiusMeters, "charging_station")
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

        const promise = OverpassClient.fetchAroundPOIs(lat, lon, radius, "fuel")
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
