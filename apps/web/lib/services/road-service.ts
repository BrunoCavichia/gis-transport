import { RoadInfo, OverpassClient } from "@gis/shared";

export class RoadService {
    private static speedCache = new Map<string, { data: RoadInfo; timestamp: number }>();
    private static pendingRequests = new Map<string, Promise<RoadInfo>>();
    private static CACHE_TTL = 3600000; // 1 hour

    /**
     * Gets the max speed for a given location using Overpass API
     */
    static async getMaxSpeed(lat: number, lon: number): Promise<RoadInfo> {
        // Grid-based cache key (approx 110m precision at 3 decimals)
        // This is better for moving vehicles to hit the same cache entry
        const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

        const cached = this.speedCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey)!;
        }

        const promise = OverpassClient.fetchAroundRoadInfo(lat, lon).then(info => {
            this.speedCache.set(cacheKey, { data: info, timestamp: Date.now() });
            this.pendingRequests.delete(cacheKey);
            return info;
        }).catch(err => {
            this.pendingRequests.delete(cacheKey);
            console.error("[RoadService] Failed to fetch speed limit:", err);
            return {};
        });

        this.pendingRequests.set(cacheKey, promise);
        return promise;
    }
}
