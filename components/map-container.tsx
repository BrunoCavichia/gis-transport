"use client";
//map-container.tsx
import { MAP_CENTER, DEFAULT_ZOOM, MAP_TILE_URL, MAP_ATTRIBUTION } from "@/lib/config";
import { THEME } from "@/lib/theme";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Popup,
  Polygon,
  Polyline,
  useMapEvents,
  useMap,
  Tooltip,
  Marker,
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
} from "@/lib/types";
import { LeafletMouseEvent } from "leaflet";
import { createWeatherIcons } from "@/lib/map-icons";
import { Loader } from "@/components/loader";
import { useLoadingLayers } from "@/hooks/use-loading-layers";
import { usePOICache } from "@/hooks/use-poi-cache";
import { useZoneCache } from "@/hooks/use-zone-cache";
import { WeatherPanel } from "./weather-panel";
import {
  renderPOIs,
  renderVehicleMarkers,
  renderJobMarkers,
  renderCustomPOIs,
} from "@/app/helpers/map-render-helpers";

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
  zoneKeySuffix?: string;
  onMapClick?: (coords: [number, number]) => void;
  fleetVehicles?: FleetVehicle[];
  fleetJobs?: FleetJob[];
  selectedVehicleId?: string | null;
  pickedPOICoords?: [number, number] | null;
  pickedJobCoords?: [number, number] | null;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  onZonesUpdate?: (zones: Zone[]) => void;
  isInteracting?: boolean;
}

function MapEventHandler({
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
}: {
  isRouting: boolean;
  routePoints: { start: [number, number] | null; end: [number, number] | null };
  setRoutePoints: (points: {
    start: [number, number] | null;
    end: [number, number] | null;
  }) => void;
  setRouteData: (data: RouteData | null) => void;
  setWeather: (data: WeatherData | null) => void;
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
}) {
  const map = useMap();
  const zoneCache = useZoneCache(map, layers, selectedVehicle, wrapAsync);
  useEffect(() => {
    setDynamicZones(zoneCache.zones);
    onZonesUpdate?.(zoneCache.zones);
  }, [zoneCache.zones, setDynamicZones, onZonesUpdate]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchCenter = useRef<string>("");

  const fetchPOIs = useCallback(async () => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const centerKey = `${center.lat.toFixed(2)},${center.lng.toFixed(
      2
    )},${zoom}`;

    if (centerKey === lastFetchCenter.current) return;
    lastFetchCenter.current = centerKey;

    if (zoom < 12 || !layers.gasStations || !layers.evStations) {
      setDynamicEVStations([]);
      setDynamicGasStations([]);
      return;
    }

    const willFetchEV = layers.evStations;
    const willFetchGas = layers.gasStations;

    if (!willFetchEV && !willFetchGas) {
      setDynamicEVStations([]);
      setDynamicGasStations([]);
      return;
    }

    const bounds = map.getBounds();
    const distance = Math.min(
      bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / THEME.map.poi.fetchDistanceRatio,
      THEME.map.poi.maxFetchDistance
    );

    await wrapAsync(async () => {
      // EV Stations Fetch
      if (layers.evStations) {
        const distanceCeil = Math.ceil(distance);
        const evStations = await poiCache.fetchPOI(
          "ev",
          center.lat,
          center.lng,
          distanceCeil,
          selectedVehicle.label
        );
        // Double check layer status before committing to state
        if (layers.evStations) {
          setDynamicEVStations(evStations);
        }
      } else {
        setDynamicEVStations([]);
      }

      // Gas Stations Fetch
      if (layers.gasStations) {
        const radius = Math.min(distance * THEME.map.poi.gasRadiusMultiplier, THEME.map.poi.maxGasRadius);
        const radiusCeil = Math.ceil(radius);
        const gasStations = await poiCache.fetchPOI(
          "gas",
          center.lat,
          center.lng,
          radiusCeil,
          selectedVehicle.label
        );
        // Double check layer status before committing to state
        if (layers.gasStations) {
          setDynamicGasStations(gasStations);
        }
      } else {
        setDynamicGasStations([]);
      }
    });
  }, [
    map,
    layers.evStations,
    layers.gasStations,
    setDynamicEVStations,
    setDynamicGasStations,
    selectedVehicle.label,
    wrapAsync,
    poiCache,
  ]);

  useMapEvents({
    click: (e: LeafletMouseEvent) => {
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

      const dist = map.getCenter().distanceTo({ lat: mapCenter[0], lng: mapCenter[1] });
      if (dist > THEME.map.interaction.moveThreshold) {
        setMapCenter([newCenter.lat, newCenter.lng]);
      }

      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        zoneCache.fetchZones();
        fetchPOIs();
      }, THEME.map.interaction.fetchDebounce);
    },
    zoomend: () => {
      setZoom(map.getZoom());
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
  }, []);

  return null;
}

function MapCenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const dist = map.getCenter().distanceTo({ lat: center[0], lng: center[1] });
    if (dist > THEME.map.interaction.flyToThreshold) {
      map.flyTo(center, map.getZoom(), {
        animate: true,
        duration: THEME.map.interaction.flyToDuration
      });
    }
  }, [center, map]);
  return null;
}

function FitBounds({
  routes,
}: {
  routes: { coordinates: [number, number][] }[];
}) {
  const map = useMap();
  useEffect(() => {
    const all = routes.flatMap((r) => r.coordinates || []);
    if (all.length === 0) return;
    map.flyToBounds(all as [number, number][], {
      padding: THEME.map.routes.padding,
      duration: THEME.map.routes.duration,
      easeLinearity: 0.35,
      animate: true,
      maxZoom: THEME.map.routes.maxZoom
    });
  }, [routes, map]);
  return null;
}

export default function MapContainer({
  layers,
  routeData,
  setRouteData,
  setWeather,
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
  fleetVehicles,
  fleetJobs,
  selectedVehicleId,
  onMapClick,
  pickedPOICoords,
  pickedJobCoords,
  onZonesUpdate,
  isInteracting = false,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [dynamicZones, setDynamicZones] = useState<Zone[]>([]);


  const weatherIcons = useMemo(() => createWeatherIcons(), []);
  const {
    jobIcon,
    customPOIIcon,
    pickingIcon,
    createVehicleIcon,
    createMinimalIcon,
    gasStationIcon,
    gasStationIconMinimal,
    evStationIcon,
    evStationIconMinimal,
    snowIcon,
    rainIcon,
    iceIcon,
    windIcon,
    fogIcon,
  } = weatherIcons;

  const { loading, wrapAsync } = useLoadingLayers();
  const poiCache = usePOICache();

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      if (!zone.requiredTags || zone.requiredTags.length === 0) return true;

      if (selectedVehicleId && fleetVehicles) {
        const selected = fleetVehicles.find(v => v.id === selectedVehicleId);
        if (selected) {
          return zone.requiredTags.some(tag => selected.type.tags.includes(tag));
        }
      }

      if (!selectedVehicleId && selectedVehicle?.tags) {
        const hasAccess = zone.requiredTags.some(tag => selectedVehicle.tags.includes(tag));
        return hasAccess;
      }

      if (fleetVehicles && fleetVehicles.length > 0) {
        return fleetVehicles.some(v =>
          zone.requiredTags?.some(tag => v.type.tags.includes(tag))
        );
      }

      return false;
    },
    [selectedVehicle.tags, fleetVehicles, selectedVehicleId]
  );

  // --- Memoized Rendering Layers ---

  const renderedGasStations = useMemo(() => {
    if (!layers.gasStations) return null;
    return renderPOIs({
      stations: dynamicGasStations,
      icon: gasStationIcon,
      minimalIcon: gasStationIconMinimal,
      zoom: zoom,
      isRouting: isRouting,
    });
  }, [layers.gasStations, dynamicGasStations, gasStationIcon, gasStationIconMinimal, zoom, isRouting]);

  const renderedEVStations = useMemo(() => {
    if (!layers.evStations) return null;
    return renderPOIs({
      stations: dynamicEVStations,
      icon: evStationIcon,
      minimalIcon: evStationIconMinimal,
      zoom: zoom,
      isEV: true,
      isRouting: isRouting,
    });
  }, [layers.evStations, dynamicEVStations, evStationIcon, evStationIconMinimal, zoom, isRouting]);

  const renderedCustomPOIs = useMemo(() => {
    return renderCustomPOIs({
      customPOIs: customPOIs || [],
      isRouting: isRouting,
      icon: customPOIIcon,
      zoom: zoom,
    });
  }, [customPOIs, isRouting, customPOIIcon, zoom]);

  const renderedVehicles = useMemo(() => {
    return renderVehicleMarkers({
      vehicles: fleetVehicles || [],
      selectedVehicleId,
      createVehicleIcon,
      createMinimalIcon,
      zoom,
      isRouting,
    });
  }, [fleetVehicles, selectedVehicleId, createVehicleIcon, createMinimalIcon, zoom, isRouting]);

  const renderedJobs = useMemo(() => {
    return renderJobMarkers({
      jobs: fleetJobs || [],
      isRouting,
      icon: jobIcon,
      zoom: zoom,
    });
  }, [fleetJobs, isRouting, jobIcon, zoom]);

  const renderedZones = useMemo(() => {
    if (!layers.cityZones) return null;
    return dynamicZones.map((zone, idx) => {
      const hasAccess = canAccessZone(zone);
      const isLEZ = zone.type?.toUpperCase() === "LEZ" || zone.type === "Environmental";
      const zType = isLEZ ? "LEZ" : "RESTRICTED";

      const style = isLEZ
        ? {
          color: hasAccess ? THEME.colors.success : THEME.colors.danger,
          fillColor: hasAccess ? THEME.colors.success : THEME.colors.danger,
          fillOpacity: hasAccess ? THEME.map.polygons.lez.fillOpacity.allowed : THEME.map.polygons.lez.fillOpacity.restricted,
          weight: THEME.map.polygons.lez.weight,
          dashArray: undefined
        }
        : {
          color: THEME.colors.danger,
          fillColor: THEME.colors.danger,
          fillOpacity: THEME.map.polygons.restricted.fillOpacity,
          weight: THEME.map.polygons.restricted.weight,
          dashArray: THEME.map.polygons.restricted.dashArray
        };

      return (
        <Polygon
          key={`${zone.id}-${idx}`}
          positions={zone.coordinates}
          pathOptions={style}
          interactive={!isInteracting}
          bubblingMouseEvents={false}
        >
          {!isInteracting && (
            <Popup closeButton={false} autoClose={false} className="zone-popup">
              <div style={{ fontSize: THEME.map.popups.fontSize }}>
                <strong>{zone.name}</strong>
                {zType === "LEZ" && (
                  <div
                    style={{
                      color: hasAccess ? THEME.colors.success : THEME.colors.danger,
                      marginTop: 4,
                    }}
                  >
                    {hasAccess ? "Access OK" : "Restricted"}
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Polygon>
      );
    });
  }, [layers.cityZones, dynamicZones, canAccessZone, isInteracting]);

  const renderedWeatherMarkers = useMemo(() => {
    if (!routeData?.weatherRoutes) return null;
    return routeData.weatherRoutes.flatMap((wr, wrIdx) =>
      wr.alerts?.map((alert, idx) => {
        if (alert.lat == null || alert.lon == null) return null;

        let icon;
        switch (alert.event) {
          case "SNOW": icon = snowIcon; break;
          case "RAIN": icon = rainIcon; break;
          case "ICE": icon = iceIcon; break;
          case "WIND": icon = windIcon; break;
          case "FOG": icon = fogIcon; break;
          default: return null;
        }

        return (
          <Marker
            key={`weather-${wrIdx}-${idx}`}
            position={[alert.lat, alert.lon]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span style={{ fontSize: 12 }}>{alert.message}</span>
            </Tooltip>
          </Marker>
        );
      })
    );
  }, [routeData?.weatherRoutes, snowIcon, rainIcon, iceIcon, windIcon, fogIcon]);

  useEffect(() => {
    if (fleetJobs && fleetJobs.length > 0) {
      console.log("MapContainer rendering jobs:", fleetJobs.length, fleetJobs);
    }
  }, [fleetJobs]);

  useEffect(() => setMounted(true), []);


  const defaultCenter: [number, number] = MAP_CENTER;
  const defaultZoom = DEFAULT_ZOOM;

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {loading && <Loader />}
      <LeafletMap
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl
        minZoom={5}
        maxZoom={19}
      >
        <TileLayer
          attribution={MAP_ATTRIBUTION}
          url={MAP_TILE_URL}
        />

        <MapCenterHandler center={mapCenter} />
        <MapEventHandler
          isRouting={isRouting}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          setRouteData={setRouteData}
          setWeather={setWeather}
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
        />

        {renderedZones}

        {layers.route && routeData?.vehicleRoutes?.length ? (
          <>
            {/* Shadow/border layer for premium route effect */}
            {routeData.vehicleRoutes.map((r) => (
              <Polyline
                key={`vehicle-route-shadow-${r.vehicleId}`}
                positions={r.coordinates}
                pathOptions={{
                  color: THEME.colors.routeShadow,
                  weight: THEME.map.routes.shadowWeight,
                  opacity: THEME.map.routes.shadowOpacity,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            ))}
            {/* Main route line - dashed for premium effect */}
            {routeData.vehicleRoutes.map((r) => (
              <Polyline
                key={`vehicle-route-${r.vehicleId}`}
                positions={r.coordinates}
                pathOptions={{
                  color: r.color,
                  weight: THEME.map.routes.mainWeight,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: THEME.map.routes.dashArray,
                }}
              />
            ))}

            {routeData.vehicleRoutes.map((r) =>
              r.coordinates && r.coordinates.length > 0 ? (
                <Marker
                  key={`start-${r.vehicleId}`}
                  position={r.coordinates[0]}
                >
                  <Tooltip direction="top" offset={[0, -12]} permanent={false}>
                    <span
                      style={{ fontSize: 12 }}
                    >{`Vehículo ${r.vehicleId}`}</span>
                  </Tooltip>
                </Marker>
              ) : null
            )}

            <FitBounds routes={routeData.vehicleRoutes} />
          </>
        ) : null}

        {renderedGasStations}
        {renderedEVStations}
        {renderedCustomPOIs}
        {renderedVehicles}
        {renderedJobs}
        {routeData?.weatherRoutes && (
          <WeatherPanel
            routes={routeData.weatherRoutes}
          />
        )}
        {renderedWeatherMarkers}
        {pickedPOICoords && (
          <Marker position={pickedPOICoords} icon={pickingIcon} />
        )}
        {pickedJobCoords && (
          <Marker position={pickedJobCoords} icon={pickingIcon} />
        )}
      </LeafletMap>
    </div>
  );
}
