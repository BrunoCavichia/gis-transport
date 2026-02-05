// hooks/use-zone-cache.ts
import { useState, useRef, useCallback } from "react";
import type { Zone, LayerVisibility } from "@/lib/types";
import type { Map } from "leaflet";
import { haversineDistance } from "@/app/helpers/api-helpers";

export function useZoneCache(
  map: Map,
  layers: LayerVisibility,
  wrapAsync: (fn: () => Promise<void>) => Promise<void>,
) {
  const [zones, setZones] = useState<Zone[]>([]);
  const lastZoneFetch = useRef<{ lat: number; lon: number } | null>(null);
  const isLoading = useRef(false);

  const haversineMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => haversineDistance(lat1, lon1, lat2, lon2, "m");

  const fetchZones = useCallback(async () => {
    if (!map) return;

    if (!layers.cityZones) {
      setZones([]);
      return;
    }

    // Minimum zoom for zones - prevents unnecessary fetches when zoomed out
    const MIN_ZOOM_FOR_ZONES = 8;
    if (map.getZoom() < MIN_ZOOM_FOR_ZONES) {
      return;
    }

    const center = map.getCenter();
    const last = lastZoneFetch.current;

    // Only refetch if moved more than 5km (increased for better stability)
    const MIN_DISTANCE_METERS = 5000;
    if (
      last &&
      haversineMeters(last.lat, last.lon, center.lat, center.lng) <
        MIN_DISTANCE_METERS
    ) {
      return;
    }

    // Don't start a new fetch if one is in progress
    if (isLoading.current) {
      return;
    }

    isLoading.current = true;
    lastZoneFetch.current = { lat: center.lat, lon: center.lng };
    console.log(
      `[useZoneCache] Fetching zones at ${center.lat.toFixed(4)},${center.lng.toFixed(4)} radius:50km zoom:${map.getZoom()}`,
    );

    await wrapAsync(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(
          `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=50000&vehicle=all`,
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        const data = await res.json();
        const fetchedZones: Zone[] = data.zones || [];
        setZones(fetchedZones);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch zones:", err);
        }
      } finally {
        isLoading.current = false;
      }
    });
  }, [map, layers.cityZones, wrapAsync]);

  return { zones, fetchZones };
}
