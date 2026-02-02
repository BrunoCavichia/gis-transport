"use client";
import {
  MAP_CENTER,
  DEFAULT_ZOOM,
  MAP_TILE_URL,
  MAP_ATTRIBUTION,
} from "@/lib/config";
import { THEME } from "@/lib/theme";
import {
  memo,
  useEffect,
  useState,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Marker,
  ZoomControl,
} from "react-leaflet";
import type {
  RouteData,
  WeatherData,
  RouteWeather,
  LayerVisibility,
  POI,
  CustomPOI,
  VehicleType,
  Zone,
  FleetVehicle,
  FleetJob,
} from "@gis/shared";
import type { Alert } from "@/lib/utils";
import L from "leaflet";
import { createMapIcons } from "@/lib/map-icons";
import { Loader } from "@/components/loader";
import { useLoadingLayers } from "@/hooks/use-loading-layers";
import { usePOICache } from "@/hooks/use-poi-cache";
import { WeatherPanel } from "./weather-panel";
import { ZoneLayer, WeatherMarkersLayer } from "./map-layers";
import {
  renderPOIs,
  renderJobMarkers,
  renderCustomPOIs,
} from "@/app/helpers/map-render-helpers";

// Modular Imports
import { FitBounds } from "./map/FitBounds";
import { MapCenterHandler } from "./map/MapCenterHandler";
import { MapEventHandler } from "./map/MapEventHandler";
import { RouteLayer, RouteLabelsLayer } from "./map/RouteLayer";
import { VehiclesLayer } from "./map/VehiclesLayer";
import { useMapLOD } from "@/hooks/use-map-lod";

interface MapContainerProps {
  layers: LayerVisibility;
  routeData: RouteData | null;
  setRouteData: (data: RouteData | null) => void;
  setWeather: (data: WeatherData | null) => void;
  isRouting: boolean;
  routePoints: { start: [number, number] | null; end: [number, number] | null };
  setRoutePoints: (points: {
    start: [number, number] | null;
    end: [number, number] | null;
  }) => void;
  dynamicEVStations: POI[];
  setDynamicEVStations: (stations: POI[]) => void;
  dynamicGasStations: POI[];
  setDynamicGasStations: (stations: POI[]) => void;
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  selectedVehicle: VehicleType;
  customPOIs?: CustomPOI[];
  vehicleAlerts?: Record<string | number, Alert[]>;
  onMapClick?: (coords: [number, number]) => void;
  fleetVehicles?: FleetVehicle[];
  fleetJobs?: FleetJob[];
  selectedVehicleId?: string | null;
  pickedPOICoords?: [number, number] | null;
  pickedJobCoords?: [number, number] | null;
  onZonesUpdate?: (zones: Zone[]) => void;
  isInteracting?: boolean;
  onVehicleTypeChange?: (vehicleId: string, type: VehicleType) => void;
  onVehicleSelect?: (vehicleId: string) => void;
  toggleLayer?: (layer: keyof LayerVisibility) => void;
}

export default memo(
  function MapContainer({
    layers,
    routeData,
    isRouting,
    routePoints,
    setRoutePoints,
    dynamicEVStations,
    setDynamicEVStations,
    dynamicGasStations,
    setDynamicGasStations,
    mapCenter,
    setMapCenter,
    selectedVehicle,
    customPOIs,
    vehicleAlerts = {},
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    onMapClick,
    pickedPOICoords,
    pickedJobCoords,
    onZonesUpdate,
    isInteracting = false,
    onVehicleTypeChange,
    onVehicleSelect,
  }: MapContainerProps) {
    const [mounted, setMounted] = useState(false);
    const [dynamicZones, setDynamicZones] = useState<Zone[]>([]);
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [_viewportBounds, setViewportBounds] =
      useState<L.LatLngBounds | null>(null);

    const { loading, wrapAsync } = useLoadingLayers();
    const poiCache = usePOICache();

    // Memoized boolean to avoid re-rendering on every zoom change
    const shouldShowZoomLevelPOIs = useMemo(
      () => zoom >= THEME.map.poi.lod.minZoomForDots,
      [zoom],
    );

    const mapIcons = useMemo(() => createMapIcons(), []);
    const { job, customPOI, picking, vehicle, weather } = mapIcons;
    const { snow, rain, ice, wind, fog } = weather;

    const canAccessZone = useCallback(
      (zone: Zone): boolean => {
        if (!zone.requiredTags || zone.requiredTags.length === 0) return true;
        const vehicleToUse = selectedVehicleId
          ? fleetVehicles?.find((v) => v.id === selectedVehicleId)
          : { type: selectedVehicle };

        return zone.requiredTags.some((tag) =>
          vehicleToUse?.type.tags.includes(tag),
        );
      },
      [selectedVehicle, fleetVehicles, selectedVehicleId],
    );

    const renderedGasStations = useMemo(() => {
      if (!layers.gasStations || !shouldShowZoomLevelPOIs) return null;
      return renderPOIs({
        stations: dynamicGasStations,
        isEV: false,
      });
    }, [
      layers.gasStations,
      dynamicGasStations,
      isRouting,
      shouldShowZoomLevelPOIs,
    ]);

    const renderedEVStations = useMemo(() => {
      if (!layers.evStations || !shouldShowZoomLevelPOIs) return null;
      return renderPOIs({
        stations: dynamicEVStations,
        isEV: true,
      });
    }, [
      layers.evStations,
      dynamicEVStations,
      isRouting,
      shouldShowZoomLevelPOIs,
    ]);

    const renderedCustomPOIs = useMemo(() => {
      return renderCustomPOIs({
        customPOIs: customPOIs || [],
        icon: customPOI,
      });
    }, [customPOIs, isRouting, customPOI]);

    const renderedJobs = useMemo(() => {
      return renderJobMarkers({ jobs: fleetJobs || [], icon: job });
    }, [fleetJobs, isRouting, job]);

    useEffect(() => setMounted(true), []);

    if (!mounted)
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          Loading map...
        </div>
      );

    return (
      <div className="relative h-full w-full">
        {loading && <Loader />}
        <LeafletMap
          center={MAP_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full z-0 outline-none"
          zoomControl={false}
          minZoom={5}
          maxZoom={19}
          preferCanvas={true}
        >
          <ZoomControl position="topright" />
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />

          <MapCenterHandler center={mapCenter} />
          <MapEventHandler
            isRouting={isRouting}
            routePoints={routePoints}
            setRoutePoints={setRoutePoints}
            setDynamicEVStations={setDynamicEVStations}
            setDynamicGasStations={setDynamicGasStations}
            setDynamicZones={setDynamicZones}
            setMapCenter={setMapCenter}
            onMapClick={onMapClick}
            wrapAsync={wrapAsync}
            poiCache={poiCache}
            mapCenter={mapCenter}
            layers={layers}
            selectedVehicle={selectedVehicle}
            onZonesUpdate={onZonesUpdate}
            setZoom={setZoom}
            setViewportBounds={setViewportBounds}
          />

          <ZoneLayer
            zones={dynamicZones}
            visible={!!layers.cityZones}
            isInteracting={isInteracting}
            canAccessZone={canAccessZone}
          />

          {layers.route && routeData?.vehicleRoutes?.length ? (
            <>
              <RouteLayer vehicleRoutes={routeData.vehicleRoutes} />
              <RouteLabelsLayer vehicleRoutes={routeData.vehicleRoutes} />
              <FitBounds routes={routeData.vehicleRoutes} />
            </>
          ) : null}

          {renderedGasStations}
          {renderedEVStations}
          {renderedCustomPOIs}

          <VehiclesLayer
            vehicles={fleetVehicles || []}
            selectedVehicleId={selectedVehicleId}
            createVehicleIcon={vehicle}
            vehicleAlerts={vehicleAlerts}
            onUpdateType={onVehicleTypeChange}
            onSelect={onVehicleSelect}
          />

          {renderedJobs}

          {routeData?.weatherRoutes && (
            <WeatherPanel routes={routeData.weatherRoutes} />
          )}
          <WeatherMarkersLayer
            weatherRoutes={routeData?.weatherRoutes || []}
            icons={{ snow, rain, ice, wind, fog }}
          />

          {pickedPOICoords && (
            <Marker position={pickedPOICoords} icon={picking} />
          )}
          {pickedJobCoords && (
            <Marker position={pickedJobCoords} icon={picking} />
          )}
        </LeafletMap>
      </div>
    );
  },
  (prev: MapContainerProps, next: MapContainerProps) => {
    return (
      prev.layers === next.layers &&
      prev.routeData === next.routeData &&
      prev.isRouting === next.isRouting &&
      prev.routePoints === next.routePoints &&
      prev.dynamicEVStations === next.dynamicEVStations &&
      prev.dynamicGasStations === next.dynamicGasStations &&
      prev.mapCenter === next.mapCenter &&
      prev.selectedVehicle === next.selectedVehicle &&
      prev.customPOIs === next.customPOIs &&
      prev.fleetVehicles === next.fleetVehicles &&
      prev.fleetJobs === next.fleetJobs &&
      prev.selectedVehicleId === next.selectedVehicleId &&
      prev.pickedPOICoords === next.pickedPOICoords &&
      prev.pickedJobCoords === next.pickedJobCoords &&
      prev.isInteracting === next.isInteracting &&
      prev.toggleLayer === next.toggleLayer &&
      prev.onMapClick === next.onMapClick &&
      prev.onZonesUpdate === next.onZonesUpdate &&
      prev.onVehicleTypeChange === next.onVehicleTypeChange &&
      prev.onVehicleSelect === next.onVehicleSelect
    );
  },
);
