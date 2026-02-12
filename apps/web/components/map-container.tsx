"use client";
import {
  MAP_CENTER,
  DEFAULT_ZOOM,
  MAP_TILE_URL,
  MAP_ATTRIBUTION,
} from "@/lib/config";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Marker,
  ZoomControl,
} from "react-leaflet";
import type {
  RouteData,
  WeatherData,
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
import { ZoneLayer, WeatherMarkersLayer } from "./map-layers";
import {
  renderPOIs,
  renderJobMarkers,
  renderCustomPOIs,
} from "@/app/helpers/map-render-helpers";
import { canVehicleTypeAccessZone } from "@/lib/helpers/zone-access-helper";
// Modular Imports
import { FitBounds } from "./map/FitBounds";
import { MapCenterHandler } from "./map/MapCenterHandler";
import { MapEventHandler } from "./map/MapEventHandler";
import { RouteLayer } from "./map/RouteLayer";
import { VehiclesLayer } from "./map/VehiclesLayer";
import { ZoneDrawingPreview } from "./map/ZoneDrawingPreview";

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
  zonePoints?: [number, number][]; // For zone drawing preview
  zoneIsClosed?: boolean; // Whether zone polygon has been explicitly closed
  interactionMode?: string | null; // To know when in zone picking mode
  isEditingZone?: boolean; // For zone editing mode
  onRemoveZonePoint?: (index: number) => void; // Callback to remove a specific zone point
  onUpdateZonePoint?: (index: number, newCoords: [number, number]) => void; // Callback to update a zone point position
  onZonesUpdate?: (zones: Zone[]) => void;
  onEditZone?: (zoneId: string) => void; // Callback to edit a zone
  isInteracting?: boolean;
  onVehicleTypeChange?: (vehicleId: string, type: VehicleType) => void;
  onVehicleLabelUpdate?: (vehicleId: string, label: string) => void;
  onVehicleSelect?: (vehicleId: string) => void;
  onVehicleHover?: (
    vehicleId: string,
    pixelPosition: { x: number; y: number },
  ) => void;
  onVehicleHoverOut?: () => void;
  toggleLayer?: (layer: keyof LayerVisibility) => void;
}

export default function MapContainer({
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
  zonePoints = [],
  zoneIsClosed = false,
  interactionMode,
  isEditingZone = false,
  onRemoveZonePoint,
  onUpdateZonePoint,
  onZonesUpdate,
  onEditZone,
  isInteracting = false,
  onVehicleTypeChange,
  onVehicleLabelUpdate,
  onVehicleSelect,
  onVehicleHover,
  onVehicleHoverOut,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [dynamicZones, setDynamicZones] = useState<Zone[]>([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // viewportBounds is only written, never read — use a ref to avoid re-renders
  const viewportBoundsRef = useRef<L.LatLngBounds | null>(null);
  const setViewportBounds = useCallback((bounds: L.LatLngBounds) => {
    viewportBoundsRef.current = bounds;
  }, []);

  const { loading, wrapAsync } = useLoadingLayers();
  const poiCache = usePOICache();
  const mapIcons = useMemo(() => createMapIcons(), []);
  const { job, customPOI, picking, vehicle, weather, gasStation, evStation } =
    mapIcons;
  const { snow, rain, ice, wind, fog } = weather;

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      const vehicleToUse = selectedVehicleId
        ? fleetVehicles?.find((v) => v.id === selectedVehicleId)?.type
        : selectedVehicle;

      if (!vehicleToUse) return false;
      return canVehicleTypeAccessZone(vehicleToUse, zone);
    },
    [selectedVehicle, fleetVehicles, selectedVehicleId],
  );

  const renderedGasStations = useMemo(() => {
    if (!layers.gasStations) return null;

    return renderPOIs({
      stations: dynamicGasStations,
      isEV: false,
      zoom,
      icon: gasStation,
    });
  }, [layers.gasStations, dynamicGasStations, zoom, gasStation]);

  const renderedEVStations = useMemo(() => {
    if (!layers.evStations) return null;
    return renderPOIs({
      stations: dynamicEVStations,
      isEV: true,
      zoom,
      icon: evStation,
    });
  }, [layers.evStations, dynamicEVStations, zoom, evStation]);

  const renderedCustomPOIs = useMemo(() => {
    return renderCustomPOIs({
      customPOIs:
        customPOIs?.filter(
          (poi) => !poi.entityType || poi.entityType === "point",
        ) || [],
      icon: customPOI,
      zoom,
    });
  }, [customPOIs, customPOI, zoom]);

  // Convert custom zones to Zone format for rendering
  const customZonesAsZones = useMemo(() => {
    if (!customPOIs) return [];
    return customPOIs
      .filter((poi) => poi.entityType === "zone" && poi.coordinates)
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        coordinates: zone.coordinates,
        type: zone.zoneType || "LEZ",
        description: zone.description,
        requiredTags: zone.requiredTags,
        isCustom: true,
      }));
  }, [customPOIs]);

  const renderedJobs = useMemo(() => {
    return renderJobMarkers({
      jobs: fleetJobs || [],
      icon: job,
      routeData,
      vehicles: fleetVehicles,
      zoom,
      selectedVehicleId,
    });
  }, [fleetJobs, job, routeData, fleetVehicles, zoom, selectedVehicleId]);

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
        maxZoom={16}
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
          onZonesUpdate={onZonesUpdate}
          setZoom={setZoom}
          setViewportBounds={setViewportBounds}
        />

        <ZoneLayer
          zones={dynamicZones}
          visible={!!layers.cityZones}
          isInteracting={isInteracting}
          canAccessZone={canAccessZone}
          onEditZone={onEditZone}
        />

        {/* Custom Zones Layer - renders custom zones with same behavior as LEZ */}
        <ZoneLayer
          zones={customZonesAsZones}
          visible={true}
          isInteracting={isInteracting}
          canAccessZone={canAccessZone}
          onEditZone={onEditZone}
        />

        {/* Zone Drawing Preview - shows polygon being created */}
        <ZoneDrawingPreview
          points={zonePoints}
          visible={interactionMode === "pick-zone"}
          isEditing={isEditingZone}
          isClosed={zoneIsClosed}
          onRemovePoint={onRemoveZonePoint}
          onUpdatePoint={onUpdateZonePoint}
        />

        {layers.route && routeData?.vehicleRoutes?.length ? (
          <>
            <RouteLayer
              vehicleRoutes={routeData.vehicleRoutes}
              selectedVehicleId={selectedVehicleId}
            />
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
          onUpdateLabel={onVehicleLabelUpdate}
          onSelect={onVehicleSelect}
          onHover={onVehicleHover}
          onHoverOut={onVehicleHoverOut}
          zoom={zoom}
        />

        {renderedJobs}

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
}
