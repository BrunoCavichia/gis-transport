import { RoadInfo, OverpassClient } from "@gis/shared";

export class RoadService {
  private static speedCache = new Map<
    string,
    { data: RoadInfo; timestamp: number }
  >();
  private static pendingRequests = new Map<string, Promise<RoadInfo>>();
  private static failureCount = new Map<string, number>();
  private static failureBackoffUntil = new Map<string, number>(); // timestamp when backoff expires
  private static CACHE_TTL = 3600000; // 1 hour
  private static FAILURE_BACKOFF = 60000; // 1 minute before retrying a failed location
  private static MAX_FAILURES = 2; // Max failures before backing off

  /**
   * Gets the max speed for a given location using Overpass API
   * With smart caching, deduplication, and failure backoff to prevent API overload
   */
  static async getMaxSpeed(lat: number, lon: number): Promise<RoadInfo> {
    // Grid-based cache key (approx 110m precision at 3 decimals)
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

    // Check cache
    const cached = this.speedCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Check if this location is in backoff period
    const backoffUntil = this.failureBackoffUntil.get(cacheKey);
    if (backoffUntil && Date.now() < backoffUntil) {
      return {};
    }

    // Deduplicate pending requests (don't fire the same query twice)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const promise = OverpassClient.fetchAroundRoadInfo(lat, lon)
      .then((info) => {
        // Clear failure tracking on success
        this.failureCount.delete(cacheKey);
        this.failureBackoffUntil.delete(cacheKey);
        this.speedCache.set(cacheKey, { data: info, timestamp: Date.now() });
        this.pendingRequests.delete(cacheKey);
        return info;
      })
      .catch((err) => {
        this.pendingRequests.delete(cacheKey);

        // Track consecutive failures
        const count = (this.failureCount.get(cacheKey) || 0) + 1;
        this.failureCount.set(cacheKey, count);

        if (count >= this.MAX_FAILURES) {
          // Enter backoff period
          this.failureBackoffUntil.set(
            cacheKey,
            Date.now() + this.FAILURE_BACKOFF,
          );
          this.failureCount.delete(cacheKey);
        }

        // Only log non-abort errors (aborts are expected under load)
        const isAbort = err?.name === "AbortError" || err?.code === 20;
        if (!isAbort) {
          console.error("[RoadService] Failed to fetch speed limit:", err);
        }
        return {} as RoadInfo;
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }
}
