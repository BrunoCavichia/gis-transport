import { useRef, useCallback } from "react";
import type { POI } from "@/lib/types";
import { GEO_CACHE_CONFIG, getGeoCacheKey } from "@/lib/geo-utils";
import { buildPOIUrl, type POIType } from "@/lib/config";

interface CacheEntry {
  stations: POI[];
  timestamp: number;
}


export function usePOICache() {
  const gasStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const evStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<POI[]>>>(new Map());


  const getFromCache = useCallback((type: POIType, lat: number, lon: number, radius: number): POI[] | null => {
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

  const setCache = useCallback((type: POIType, lat: number, lon: number, radius: number, stations: POI[]) => {
    const key = getGeoCacheKey(type, lat, lon, radius);
    const cache = type === "ev" ? evStationsCache.current : gasStationsCache.current;
    cache.set(key, { stations, timestamp: Date.now() });
  }, []);

  const fetchPOI = useCallback(async (
    type: POIType,
    lat: number,
    lon: number,
    distance: number,
    vehicleLabel: string
  ): Promise<POI[]> => {
    const cached = getFromCache(type, lat, lon, distance);
    if (cached) return cached;

    const key = getGeoCacheKey(type, lat, lon, distance);

    // Deduplicate in-flight requests
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!;
    }

    const url = buildPOIUrl(type, lat, lon, distance, vehicleLabel);

    const promise = fetch(url)
      .then(res => res.json())
      .then(data => {
        const stations: POI[] = data.stations || [];
        setCache(type, lat, lon, distance, stations);
        pendingRequests.current.delete(key);
        console.log(`[usePOICache] Fetched ${stations.length} ${type} stations for ${lat.toFixed(2)},${lon.toFixed(2)}`);
        return stations;
      })
      .catch((err) => {
        console.error(`[POI Fetch Error] ${type}:`, err);
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
