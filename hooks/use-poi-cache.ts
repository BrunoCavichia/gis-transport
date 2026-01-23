import { useRef, useCallback } from "react";
import type { POI } from "@/lib/types";
import { GEO_CACHE_CONFIG, getGeoCacheKey } from "@/lib/geo-utils";

interface CacheEntry {
  stations: POI[];
  timestamp: number;
}


export function usePOICache() {
  const gasStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const evStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<POI[]>>>(new Map());


  const getFromCache = useCallback((type: "ev" | "gas", lat: number, lon: number, radius: number): POI[] | null => {
    const key = getGeoCacheKey(type, lat, lon, radius);
    const cache = type === "ev" ? evStationsCache.current : gasStationsCache.current;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_CONFIG.CLIENT_EXPIRE) {
      return cached.stations;
    }
    // Clean old entries to prevent memory leaks
    if (cached) cache.delete(key);
    return null;
  }, []);

  const setCache = useCallback((type: "ev" | "gas", lat: number, lon: number, radius: number, stations: POI[]) => {
    const key = getGeoCacheKey(type, lat, lon, radius);
    const cache = type === "ev" ? evStationsCache.current : gasStationsCache.current;
    cache.set(key, { stations, timestamp: Date.now() });
  }, []);

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

    const key = getGeoCacheKey(type, lat, lon, distance);

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
      .catch((err) => {
        console.error(`[POI Fetch Error] ${type}:`, err);
        setCache(type, lat, lon, distance, []);
        pendingRequests.current.delete(key);
        return [];
      });

    pendingRequests.current.set(key, promise);
    return promise;
  }, [getFromCache, setCache]);

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
