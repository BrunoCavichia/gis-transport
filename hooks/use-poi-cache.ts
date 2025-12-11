import { useRef } from "react";
import type { POI } from "@/lib/types";

interface CacheEntry {
  stations: POI[];
  timestamp: number;
}

export function usePOICache(cacheExpireMs = 5 * 60 * 1000) {
  // Cache for gas and EV stations - expires after 5 minutes
  const gasStationsCache = useRef<Map<string, CacheEntry>>(new Map());
  const evStationsCache = useRef<Map<string, CacheEntry>>(new Map());

  const getCacheKey = (lat: number, lon: number, radius: number) => {
    // Round to avoid too many cache entries for similar locations
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    const roundedRadius = Math.round(radius / 1000);
    return `${roundedLat},${roundedLon},${roundedRadius}`;
  };

  const getGasStations = (
    lat: number,
    lon: number,
    radius: number
  ): POI[] | null => {
    const key = getCacheKey(lat, lon, radius);
    const cached = gasStationsCache.current.get(key);

    if (cached && Date.now() - cached.timestamp < cacheExpireMs) {
      return cached.stations;
    }

    return null;
  };

  const setGasStations = (
    lat: number,
    lon: number,
    radius: number,
    stations: POI[]
  ) => {
    const key = getCacheKey(lat, lon, radius);
    gasStationsCache.current.set(key, {
      stations,
      timestamp: Date.now(),
    });
  };

  const getEVStations = (
    lat: number,
    lon: number,
    distance: number
  ): POI[] | null => {
    const key = getCacheKey(lat, lon, distance * 1000);
    const cached = evStationsCache.current.get(key);

    if (cached && Date.now() - cached.timestamp < cacheExpireMs) {
      return cached.stations;
    }

    return null;
  };

  const setEVStations = (
    lat: number,
    lon: number,
    distance: number,
    stations: POI[]
  ) => {
    const key = getCacheKey(lat, lon, distance * 1000);
    evStationsCache.current.set(key, {
      stations,
      timestamp: Date.now(),
    });
  };

  const clearCache = () => {
    gasStationsCache.current.clear();
    evStationsCache.current.clear();
  };

  return {
    getGasStations,
    setGasStations,
    getEVStations,
    setEVStations,
    clearCache,
  };
}
