import { RoadInfo, OverpassClient } from "@gis/shared";

export class RoadService {
  private static speedCache = new Map<
    string,
    { data: RoadInfo; timestamp: number }
  >();
  private static pendingRequests = new Map<string, Promise<RoadInfo>>();
  private static failedRequests = new Map<string, number>(); // Track failed requests to implement backoff
  private static CACHE_TTL = 3600000; // 1 hour
  private static FAILURE_BACKOFF = 60000; // 1 minute before retrying a failed location
  private static MAX_FAILURES = 3; // Max failures before giving up temporarily

  /**
   * Gets the max speed for a given location using Overpass API
   * With smart caching, deduplication, and failure backoff to prevent API overload
   */
  static async getMaxSpeed(lat: number, lon: number): Promise<RoadInfo> {
    // Grid-based cache key (approx 110m precision at 3 decimals)
    // This is better for moving vehicles to hit the same cache entry
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

    // Check cache
    const cached = this.speedCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Check if this location recently failed - implement backoff
    const lastFailure = this.failedRequests.get(cacheKey);
    if (lastFailure && Date.now() - lastFailure < this.FAILURE_BACKOFF) {
      // Return empty response without making API call (prevent hammering)
      return {};
    }

    // Deduplicate pending requests (don't fire the same query twice)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const promise = OverpassClient.fetchAroundRoadInfo(lat, lon)
      .then((info) => {
        // Clear failure backoff on success
        this.failedRequests.delete(cacheKey);
        this.speedCache.set(cacheKey, { data: info, timestamp: Date.now() });
        this.pendingRequests.delete(cacheKey);
        return info;
      })
      .catch((err) => {
        // Track failure and implement backoff
        const failureCount = (this.failedRequests.get(cacheKey) || 0) as any;
        if (typeof failureCount === "number") {
          if (failureCount >= this.MAX_FAILURES) {
            // Give up for a while after max failures
            this.failedRequests.set(cacheKey, Date.now());
          }
        }
        this.failedRequests.set(cacheKey, Date.now());
        this.pendingRequests.delete(cacheKey);
        console.error("[RoadService] Failed to fetch speed limit:", err);
        return {};
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }
}
