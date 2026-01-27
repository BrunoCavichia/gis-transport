// components/map/MapEventHandler.tsx
"use client";
import { useEffect, useCallback, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { THEME } from "@/lib/theme";
import { useZoneCache } from "@/hooks/use-zone-cache";
import { useMapPOIManager } from "@/hooks/use-map-poi-manager";
import {
    LayerVisibility,
    VehicleType,
    POI,
    Zone,
    RouteData,
    WeatherData
} from "@/lib/types";
import { usePOICache } from "@/hooks/use-poi-cache";

interface MapEventHandlerProps {
    isRouting: boolean;
    routePoints: { start: [number, number] | null; end: [number, number] | null };
    setRoutePoints: (points: {
        start: [number, number] | null;
        end: [number, number] | null;
    }) => void;
    setDynamicEVStations: (stations: POI[]) => void;
    setDynamicGasStations: (stations: POI[]) => void;
    setDynamicZones: (zones: Zone[]) => void;
    setMapCenter: (center: [number, number]) => void;
    layers: LayerVisibility;
    selectedVehicle: VehicleType;
    onMapClick?: (coords: [number, number]) => void;
    wrapAsync: (fn: () => Promise<void>) => Promise<void>;
    poiCache: ReturnType<typeof usePOICache>;
    mapCenter: [number, number];
    onZonesUpdate?: (zones: Zone[]) => void;
    setZoom: (zoom: number) => void;
    setViewportBounds: (bounds: L.LatLngBounds) => void;
}

export function MapEventHandler({
    isRouting,
    routePoints,
    setRoutePoints,
    setDynamicEVStations,
    setDynamicGasStations,
    setDynamicZones,
    setMapCenter,
    layers,
    selectedVehicle,
    onMapClick,
    wrapAsync,
    poiCache,
    mapCenter,
    onZonesUpdate,
    setZoom,
    setViewportBounds,
}: MapEventHandlerProps) {
    const map = useMap();
    const zoneCache = useZoneCache(map, layers, selectedVehicle, wrapAsync);
    const { fetchPOIs } = useMapPOIManager({
        map,
        selectedVehicle,
        poiCache,
        layers,
        setDynamicEVStations,
        setDynamicGasStations,
    });

    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastLayersStateRef = useRef({ ev: layers.evStations, gas: layers.gasStations });

    useEffect(() => {
        setDynamicZones(zoneCache.zones);
        onZonesUpdate?.(zoneCache.zones);
    }, [zoneCache.zones, setDynamicZones, onZonesUpdate]);

    useMapEvents({
        click: (e) => {
            const point: [number, number] = [e.latlng.lat, e.latlng.lng];
            if (onMapClick) {
                onMapClick(point);
                return;
            }
            if (!isRouting) return;
            if (!routePoints.start) setRoutePoints({ start: point, end: null });
            else if (!routePoints.end) setRoutePoints({ ...routePoints, end: point });
        },
        moveend: () => {
            const newCenter = map.getCenter();
            const dist = newCenter.distanceTo({ lat: mapCenter[0], lng: mapCenter[1] });

            if (dist > THEME.map.interaction.moveThreshold) {
                setMapCenter([newCenter.lat, newCenter.lng]);
                setViewportBounds(map.getBounds());
            }

            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(() => {
                zoneCache.fetchZones();
                fetchPOIs();
            }, THEME.map.interaction.fetchDebounce);
        },
        zoomend: () => {
            setZoom(map.getZoom());
            setViewportBounds(map.getBounds());
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(() => {
                zoneCache.fetchZones();
                fetchPOIs();
            }, THEME.map.interaction.zoomDebounce);
        },
    });

    useEffect(() => {
        zoneCache.fetchZones();
        fetchPOIs();
        setViewportBounds(map.getBounds());
    }, []);

    // Trigger fetch when layers toggle
    useEffect(() => {
        const hasChanged = lastLayersStateRef.current.ev !== layers.evStations ||
            lastLayersStateRef.current.gas !== layers.gasStations;

        if (hasChanged) {
            lastLayersStateRef.current = { ev: layers.evStations, gas: layers.gasStations };
            if (layers.evStations || layers.gasStations) {
                if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
                fetchTimeoutRef.current = setTimeout(() => fetchPOIs(), 100);
            }
        }
    }, [layers.evStations, layers.gasStations, fetchPOIs]);

    return null;
}
