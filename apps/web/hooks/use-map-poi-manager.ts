// hooks/use-map-poi-manager.ts
import { useCallback, useMemo } from "react";
import L from "leaflet";
import { THEME } from "@/lib/theme";
import { snapToGrid, calculateFetchRadius } from "@/lib/map-utils";
import { POI, VehicleType } from "@/lib/types";
import { usePOICache } from "./use-poi-cache";

interface POIManagerProps {
    map: L.Map;
    selectedVehicle: VehicleType;
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
    selectedVehicle,
    poiCache,
    layers,
    setDynamicEVStations,
    setDynamicGasStations,
}: POIManagerProps) {
    // Memoize the vehicle label to prevent unnecessary re-renders
    const vehicleLabel = useMemo(() => selectedVehicle.label, [selectedVehicle.label]);

    const fetchPOIs = useCallback(async () => {
        const center = map.getCenter();
        const zoom = map.getZoom();

        // LOD logic check
        if (zoom < THEME.map.poi.lod.minZoomForDots) {
            setDynamicEVStations([]);
            setDynamicGasStations([]);
            return;
        }

        const { evStations: willFetchEV, gasStations: willFetchGas } = layers;
        if (!willFetchEV && !willFetchGas) return;

        const bounds = map.getBounds();
        const diagonalMeters = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
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
            setDynamicGasStations(gasStations || []);
        }
    }, [
        map,
        layers.evStations,
        layers.gasStations,
        vehicleLabel,
        setDynamicEVStations,
        setDynamicGasStations,
        poiCache
    ]);

    return { fetchPOIs };
}
