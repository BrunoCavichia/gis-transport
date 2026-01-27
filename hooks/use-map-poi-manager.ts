// hooks/use-map-poi-manager.ts
import { useCallback } from "react";
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

        if (willFetchEV) {
            const evStations = await poiCache.fetchPOI(
                "ev",
                snapLat,
                snapLng,
                Math.ceil(radiusMeters),
                selectedVehicle.label,
            );
            setDynamicEVStations(evStations || []);
        }

        if (willFetchGas) {
            const gasRadius = Math.min(radiusMeters, THEME.map.poi.maxGasRadius);
            const gasStations = await poiCache.fetchPOI(
                "gas",
                snapLat,
                snapLng,
                Math.ceil(gasRadius),
                selectedVehicle.label,
            );
            setDynamicGasStations(gasStations || []);
        }
    }, [
        map,
        layers.evStations,
        layers.gasStations,
        selectedVehicle.label,
        setDynamicEVStations,
        setDynamicGasStations,
        poiCache
    ]);

    return { fetchPOIs };
}
