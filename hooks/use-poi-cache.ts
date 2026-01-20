import { useRef, useCallback } from "react";
import type { POI } from "@/lib/types";

interface CacheEntry {
  stations: POI[];
  timestamp: number;
}

// Longer client-side cache - 15 minutes
const CACHE_EXPIRE_MS = 15 * 60 * 1000;

export function usePOICache() {
  const gasStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const evStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<POI[]>>>(new Map());

  // Larger geo-buckets (every 0.02 degrees ≈ 2km)
  const getCacheKey = useCallback((type: string, lat: number, lon: number, radius: number) => {
    const roundedLat = Math.floor(lat * 50); // ~2km buckets
    const roundedLon = Math.floor(lon * 50);
    const roundedRadius = Math.ceil(radius / 2000);
    return `${type}:${roundedLat},${roundedLon},${roundedRadius}`;
  }, []);

  const getFromCache = useCallback((type: "ev" | "gas", lat: number, lon: number, radius: number): POI[] | null => {
    const key = getCacheKey(type, lat, lon, radius);
    const cache = type === "ev" ? evStationsCache.current : gasStationsCache.current;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_MS) {
      return cached.stations;
    }
    return null;
  }, [getCacheKey]);

  const setCache = useCallback((type: "ev" | "gas", lat: number, lon: number, radius: number, stations: POI[]) => {
    const key = getCacheKey(type, lat, lon, radius);
    const cache = type === "ev" ? evStationsCache.current : gasStationsCache.current;
    cache.set(key, { stations, timestamp: Date.now() });
  }, [getCacheKey]);

  // Unified fetch with deduplication
  const fetchPOI = useCallback(async (
    type: "ev" | "gas",
    lat: number,
    lon: number,
    distance: number,
    vehicleLabel: string
  ): Promise<POI[]> => {
    // Check cache first
    const cached = getFromCache(type, lat, lon, distance);
    if (cached) return cached;

    const key = getCacheKey(type, lat, lon, distance);

    // Deduplicate in-flight requests
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!;
    }

    const url =
      type === "ev"
        ? `/api/ev-stations?lat=${lat}&lon=${lon}&distance=${distance}&vehicle=${vehicleLabel}`
        : `/api/gas-stations?lat=${lat}&lon=${lon}&radius=${distance}&vehicle=${vehicleLabel}`;

    const promise = fetch(url)
      .then(res => res.json())
      .then(data => {
        const stations: POI[] = data.stations || [];
        setCache(type, lat, lon, distance, stations);
        pendingRequests.current.delete(key);
        return stations;
      })
      .catch(() => {
        setCache(type, lat, lon, distance, []);
        pendingRequests.current.delete(key);
        return [];
      });

    pendingRequests.current.set(key, promise);
    return promise;
  }, [getCacheKey, getFromCache, setCache]);

  const clearCache = useCallback(() => {
    gasStationsCache.current.clear();
    evStationsCache.current.clear();
    pendingRequests.current.clear();
  }, []);

  return {
    fetchPOI,
    clearCache,
  };
}
