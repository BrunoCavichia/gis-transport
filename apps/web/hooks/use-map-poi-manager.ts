// hooks/use-map-poi-manager.ts
import { useCallback } from "react";
import L from "leaflet";
import { THEME } from "@/lib/theme";
import { snapToGrid, calculateFetchRadius } from "@/lib/map-utils";
import { POI } from "@/lib/types";
import { usePOICache } from "./use-poi-cache";

interface POIManagerProps {
  map: L.Map;
  poiCache: ReturnType<typeof usePOICache>;
  layers: {
    evStations: boolean;
    gasStations: boolean;
  };
  setDynamicEVStations: (stations: POI[]) => void;
  setDynamicGasStations: (stations: POI[]) => void;
}

export function useMapPOIManager({
  map,
  poiCache,
  layers,
  setDynamicEVStations,
  setDynamicGasStations,
}: POIManagerProps) {
  // Use a constant default vehicle label - POI fetching should be vehicle-independent
  const vehicleLabel = "all";

  const fetchPOIs = useCallback(async () => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    // LOD logic check
    if (zoom < THEME.map.poi.lod.poi.hidden) {
      setDynamicEVStations([]);
      setDynamicGasStations([]);
      return;
    }

    const { evStations: willFetchEV, gasStations: willFetchGas } = layers;
    if (!willFetchEV && !willFetchGas) return;

    const bounds = map.getBounds();
    const diagonalMeters = bounds
      .getNorthEast()
      .distanceTo(bounds.getSouthWest());
    const viewportDistanceKm = diagonalMeters / 1000;

    const fetchRadiusKm = calculateFetchRadius(viewportDistanceKm);
    const radiusMeters = fetchRadiusKm * 1000;

    // Grid snapping to avoid excessive calls
    const snapLat = snapToGrid(center.lat);
    const snapLng = snapToGrid(center.lng);

    // Fetch both in parallel to avoid race conditions
    const [evStations, gasStations] = await Promise.all([
      willFetchEV
        ? poiCache.fetchPOI(
            "ev",
            snapLat,
            snapLng,
            Math.ceil(radiusMeters),
            vehicleLabel,
          )
        : Promise.resolve(null),
      willFetchGas
        ? poiCache.fetchPOI(
            "gas",
            snapLat,
            snapLng,
            Math.ceil(Math.min(radiusMeters, THEME.map.poi.maxGasRadius)),
            vehicleLabel,
          )
        : Promise.resolve(null),
    ]);

    // Update state for fetched stations
    if (willFetchEV) {
      setDynamicEVStations(evStations || []);
    }
    if (willFetchGas) {
      console.log(
        "[useMapPOIManager] Setting gas stations:",
        gasStations?.length || 0,
      );
      setDynamicGasStations(gasStations || []);
    }
  }, [
    map,
    layers.evStations,
    layers.gasStations,
    vehicleLabel,
    setDynamicEVStations,
    setDynamicGasStations,
    poiCache,
  ]);

  return { fetchPOIs };
}
