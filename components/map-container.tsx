"use client";

//map-container.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

const weatherIcons = createWeatherIcons();
const {
  gasStationIcon,
  evStationIcon,
  createVehicleIcon,
  snowIcon,
  rainIcon,
  iceIcon,
  windIcon,
  fogIcon,
  jobIcon,
  customPOIIcon,
  pickingIcon,
} = weatherIcons;

function FitBounds({
  routes,
}: {
  routes: { coordinates: [number, number][] }[];
}) {
  const map = useMap();
  useEffect(() => {
    const all = routes.flatMap((r) => r.coordinates || []);
    if (all.length === 0) return;
    map.fitBounds(all as [number, number][], { padding: [40, 40] });
  }, [routes, map]);
  return null;
}

interface FleetJob {
  id: string;
  coords: [number, number];
  label: string;
}

interface FleetVehicle {
  id: string;
  coords: [number, number];
  type: VehicleType;
}

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
  onLEZonesUpdate?: (zones: Zone[]) => void;
  onRestrictedZonesUpdate?: (zones: Zone[]) => void;
  isInteracting?: boolean;
}

const COLORS = {
  gas: "#f5934dff",
  ev: "#05ce4fff",
  route: "#3b82f6",
  vehicle: "#facc15",
  job: "#8b5cf6",
};

function MapEventHandler({
  isRouting,
  routePoints,
  setRoutePoints,
  setDynamicEVStations,
  setDynamicGasStations,
  setDynamicLEZones,
  setDynamicRestrictedZones,
  setMapCenter,
  layers,
  selectedVehicle,
  onMapClick,
  wrapAsync,
  poiCache,
  mapCenter,
  onLEZonesUpdate,
  onRestrictedZonesUpdate,
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
  setDynamicLEZones: (zones: Zone[]) => void;
  setDynamicRestrictedZones: (zones: Zone[]) => void;
  setMapCenter: (center: [number, number]) => void;
  layers: LayerVisibility;
  selectedVehicle: VehicleType;
  onMapClick?: (coords: [number, number]) => void;
  wrapAsync: (fn: () => Promise<void>) => Promise<void>;
  poiCache: ReturnType<typeof usePOICache>;
  mapCenter: [number, number];
  onLEZonesUpdate?: (zones: Zone[]) => void;
  onRestrictedZonesUpdate?: (zones: Zone[]) => void;
}) {
  const map = useMap();
  const zoneCache = useZoneCache(map, layers, selectedVehicle, wrapAsync);
  useEffect(() => {
    setDynamicLEZones(zoneCache.LEZones);
    setDynamicRestrictedZones(zoneCache.restrictedZones);
    onLEZonesUpdate?.(zoneCache.LEZones);
    onRestrictedZonesUpdate?.(zoneCache.restrictedZones);
  }, [zoneCache.LEZones, zoneCache.restrictedZones, setDynamicLEZones, setDynamicRestrictedZones, onLEZonesUpdate, onRestrictedZonesUpdate]);
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

    if (zoom < 13) {
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
      bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2000,
      25
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
        const radius = Math.min(distance * 1000, 10000);
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
      // Only update if moved more than ~1 meter to avoid infinite loops with programmatic pans
      const dist = map.getCenter().distanceTo({ lat: mapCenter[0], lng: mapCenter[1] });
      if (dist > 1) {
        setMapCenter([newCenter.lat, newCenter.lng]);
      }

      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        zoneCache.fetchZones();
        fetchPOIs();
      }, 100);
    },
    zoomend: () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        zoneCache.fetchZones();
        fetchPOIs();
      }, 100);
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
  const prevCenter = useRef<string>("");
  useEffect(() => {
    const centerKey = `${center[0]},${center[1]}`;
    if (centerKey !== prevCenter.current) {
      prevCenter.current = centerKey;
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
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
  toggleLayer,
  onLEZonesUpdate,
  onRestrictedZonesUpdate,
  isInteracting = false,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [dynamicLEZones, setDynamicLEZones] = useState<Zone[]>([]);
  const [dynamicRestrictedZones, setDynamicRestrictedZones] = useState<Zone[]>(
    []
  );

  const { loading, wrapAsync } = useLoadingLayers();
  const poiCache = usePOICache();

  useEffect(() => setMounted(true), []);

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      if (!zone.requiredTags || zone.requiredTags.length === 0) return true;

      // 1. If a specific vehicle is selected (either from fleet or base type), use IT for color
      if (selectedVehicleId && fleetVehicles) {
        const selected = fleetVehicles.find(v => v.id === selectedVehicleId);
        if (selected) {
          return zone.requiredTags.some(tag => selected.type.tags.includes(tag));
        }
      }

      // If no fleet selection but we have a base selected vehicle (from dropdown)
      if (!selectedVehicleId && selectedVehicle?.tags) {
        const hasAccess = zone.requiredTags.some(tag => selectedVehicle.tags.includes(tag));

        // If the base selection has NO access, BUT we are in fleet mode, check if ANYONE in fleet has access
        // to avoid "perma-red" zones if a Zero vehicle is present in the background.
        // Actually, user explicitly asked to change color when selecting No-Label, so we prioritize the selection.
        return hasAccess;
      }

      // 2. Default: Fleet Mode (if no selection, check if ANY vehicle can access)
      if (fleetVehicles && fleetVehicles.length > 0) {
        return fleetVehicles.some(v =>
          zone.requiredTags?.some(tag => v.type.tags.includes(tag))
        );
      }

      return false;
    },
    [selectedVehicle.tags, fleetVehicles, selectedVehicleId]
  );

  const defaultCenter: [number, number] = [40.4168, -3.7038];
  const defaultZoom = 12;
  const mergedZones = useMemo(() => {
    const allZones = [...dynamicLEZones, ...dynamicRestrictedZones];
    const mapById = new Map<string, Zone>();
    allZones.forEach((z, idx) => {
      const key = `${z.id}-${idx}`;
      mapById.set(key, z);
    });
    return Array.from(mapById.values());
  }, [dynamicLEZones, dynamicRestrictedZones]);

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          setDynamicLEZones={setDynamicLEZones}
          setDynamicRestrictedZones={setDynamicRestrictedZones}
          setMapCenter={setMapCenter}
          onMapClick={onMapClick}
          wrapAsync={wrapAsync}
          poiCache={poiCache}
          mapCenter={mapCenter}
          layers={layers}
          selectedVehicle={selectedVehicle}
          onLEZonesUpdate={onLEZonesUpdate}
          onRestrictedZonesUpdate={onRestrictedZonesUpdate}
        />

        {mergedZones
          .filter(
            (zone) =>
              (zone.type?.toUpperCase() === "LEZ" && layers.lowEmissionZones) ||
              (zone.type?.toUpperCase() === "RESTRICTED" && layers.restrictedZones)
          )
          .map((zone, idx) => {
            const hasAccess = canAccessZone(zone);
            const zType = zone.type?.toUpperCase();
            return (
              <Polygon
                key={`${zone.id}-${idx}`}
                positions={zone.coordinates}
                pathOptions={{
                  color:
                    zType === "LEZ"
                      ? hasAccess
                        ? "#10b981"
                        : "#ef4444"
                      : "#ef4444",
                  fillColor:
                    zType === "LEZ"
                      ? hasAccess
                        ? "#10b981"
                        : "#ef4444"
                      : "#ef4444",
                  fillOpacity:
                    zType === "LEZ" ? (hasAccess ? 0.08 : 0.12) : 0.12,
                  weight: zType === "LEZ" ? 1 : 0.5,
                  dashArray: zType === "LEZ" ? undefined : "4,4",
                }}
                interactive={!isInteracting}
                bubblingMouseEvents={false}
              >
                {!isInteracting && (
                  <Popup closeButton={false} autoClose={false} className="zone-popup">
                    <div style={{ fontSize: 12 }}>
                      <strong>{zone.name}</strong>
                      {zType === "LEZ" && (
                        <div
                          style={{
                            color: hasAccess ? "#10b981" : "#ef4444",
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
          })}

        {layers.route && routeData?.vehicleRoutes?.length ? (
          <>
            {routeData.vehicleRoutes.map((r) => (
              <Polyline
                key={`vehicle-route-${r.vehicleId}`}
                positions={r.coordinates}
                pathOptions={{
                  color: r.color ?? COLORS.route,
                  weight: 5,
                  opacity: 1,
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

        {layers.gasStations && renderPOIs({
          stations: dynamicGasStations,
          icon: gasStationIcon,
          isRouting: isRouting,
        })}

        {layers.evStations && renderPOIs({
          stations: dynamicEVStations,
          icon: evStationIcon,
          isEV: true,
          isRouting: isRouting,
        })}

        {renderCustomPOIs({
          customPOIs: customPOIs || [],
          isRouting: isRouting,
          icon: customPOIIcon,
        })}

        {renderVehicleMarkers({
          vehicles: fleetVehicles || [],
          selectedVehicleId,
          createVehicleIcon,
          isRouting,
        })}

        {renderJobMarkers({
          jobs: fleetJobs || [],
          isRouting,
          icon: jobIcon,
        })}
        {routeData?.weatherRoutes && (
          <WeatherPanel
            routes={routeData.weatherRoutes}
          />
        )}
        {routeData?.weatherRoutes?.map((wr, wrIdx) =>
          wr.alerts?.map((alert, idx) => {
            if (alert.lat == null || alert.lon == null) return null;

            let icon;
            switch (alert.event) {
              case "SNOW":
                icon = snowIcon;
                break;
              case "RAIN":
                icon = rainIcon;
                break;
              case "ICE":
                icon = iceIcon;
                break;
              case "WIND":
                icon = windIcon;
                break;
              case "FOG":
                icon = fogIcon;
                break;
              default:
                return null;
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
        )}
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
