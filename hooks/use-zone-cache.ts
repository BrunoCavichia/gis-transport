// hooks/use-zone-cache.ts
import { useState, useRef, useCallback } from "react";
import type { Zone, VehicleType, LayerVisibility } from "@/lib/types";
import type { Map } from "leaflet";

export function useZoneCache(
  map: Map,
  layers: LayerVisibility,
  selectedVehicle: VehicleType,
  wrapAsync: (fn: () => Promise<void>) => Promise<void>
) {
  const [LEZones, setLEZones] = useState<Zone[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<Zone[]>([]);
  const lastZoneFetch = useRef<{ lat: number; lon: number } | null>(null);
  const isLoading = useRef(false);

  const haversineMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchZones = useCallback(async () => {
    if (!map) return;

    const center = map.getCenter();
    const shouldFetchLE = layers.lowEmissionZones;
    const shouldFetchRestricted = layers.restrictedZones;

    if (!shouldFetchLE && !shouldFetchRestricted) {
      setLEZones([]);
      setRestrictedZones([]);
      return;
    }

    const MIN_ZOOM_FOR_ZONES = 12;
    if (map.getZoom() < MIN_ZOOM_FOR_ZONES) {
      // Keep existing zones for routing context
      return;
    }

    const last = lastZoneFetch.current;
    const MIN_DISTANCE_METERS = 500;
    if (
      last &&
      haversineMeters(last.lat, last.lon, center.lat, center.lng) <
      MIN_DISTANCE_METERS
    ) {
      return;
    }

    if (isLoading.current) return;
    isLoading.current = true;
    lastZoneFetch.current = { lat: center.lat, lon: center.lng };

    await wrapAsync(async () => {
      try {
        const res = await fetch(
          `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=20000&vehicle=${selectedVehicle.label}`
        );
        const data = await res.json();
        const zones: Zone[] = data.zones || [];

        // Distribute zones to their respective states
        const lez = zones.filter(z => z.type === "LEZ" || z.type === "Environmental");
        const restricted = zones.filter(z => z.type !== "LEZ" && z.type !== "Environmental");

        setLEZones(lez);
        setRestrictedZones(restricted);
      } catch (err) {
        console.error("Failed to fetch zones:", err);
        setLEZones([]);
        setRestrictedZones([]);
      } finally {
        isLoading.current = false;
      }
    });
  }, [
    map,
    layers.lowEmissionZones,
    layers.restrictedZones,
    selectedVehicle.label,
    wrapAsync,
  ]);

  return { LEZones, restrictedZones, fetchZones };
}
