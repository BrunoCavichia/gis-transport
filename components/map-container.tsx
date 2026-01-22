"use client";
//map-container.tsx
import { MAP_CENTER, DEFAULT_ZOOM, MAP_TILE_URL, MAP_ATTRIBUTION } from "@/lib/config";
import { THEME } from "@/lib/theme";
import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from "react";
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
  VehicleRoute,
} from "@/lib/types";
import { LeafletMouseEvent } from "leaflet";
import { createWeatherIcons, createRouteLabelIcon } from "@/lib/map-icons";
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
  updateVehicleType?: (vehicleId: string, newType: VehicleType) => void;
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
  const lastFetchPosRef = useRef<L.LatLng | null>(null);
  const lastFetchZoomRef = useRef<number | null>(null);
  const lastFetchRadiusRef = useRef<number>(0);

  const fetchPOIs = useCallback(async () => {
    const willFetchEV = layers.evStations;
    const willFetchGas = layers.gasStations;

    if (!willFetchEV && !willFetchGas) {
      setDynamicEVStations([]);
      setDynamicGasStations([]);
      return;
    }

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const bounds = map.getBounds();
    const diagonalMeters = bounds.getNorthEast().distanceTo(bounds.getSouthWest());

    // Coverage: diagonal / fetchDistanceRatio. 
    // If Ratio is 800, and diag is 4000m, diag/800 = 5km.
    // We add a minimum radius of 10km to ensure we cover a large area even when zoomed in.
    const distanceKm = Math.max(10, Math.min(
      diagonalMeters / THEME.map.poi.fetchDistanceRatio,
      THEME.map.poi.maxFetchDistance
    ));
    const radiusMeters = distanceKm * 1000;

    // Skip if move is too small to justify a new fetch (prevents UI flicker)
    // Threshold: 60% of the radius covered by the LAST fetch
    if (lastFetchPosRef.current && lastFetchZoomRef.current !== null) {
      const distFromLast = currentCenter.distanceTo(lastFetchPosRef.current);
      const isZoomMuchDifferent = Math.abs(currentZoom - lastFetchZoomRef.current) >= 1;

      if (distFromLast < lastFetchRadiusRef.current * 0.6 && !isZoomMuchDifferent) {
        return;
      }
    }

    lastFetchPosRef.current = currentCenter;
    lastFetchZoomRef.current = currentZoom;
    lastFetchRadiusRef.current = radiusMeters;

    await wrapAsync(async () => {
      // EV Stations Fetch
      if (layers.evStations) {
        const evStations = await poiCache.fetchPOI(
          "ev",
          currentCenter.lat,
          currentCenter.lng,
          Math.ceil(distanceKm),
          selectedVehicle.label
        );
        if (layers.evStations) setDynamicEVStations(evStations);
      } else {
        setDynamicEVStations([]);
      }

      // Gas Stations Fetch
      if (layers.gasStations) {
        const gasRadius = Math.min(radiusMeters, THEME.map.poi.maxGasRadius);
        const gasStations = await poiCache.fetchPOI(
          "gas",
          currentCenter.lat,
          currentCenter.lng,
          Math.ceil(gasRadius),
          selectedVehicle.label
        );
        if (layers.gasStations) setDynamicGasStations(gasStations);
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

const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
const formatDuration = (s: number) => {
  const mins = Math.round(s / 60);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}min`;
};

// Google-style dynamic weighting that updates in real-time during zoom/flyTo
// Google-style dynamic weighting that updates in real-time during zoom/flyTo
// Google-style dynamic weighting that updates in real-time during zoom/flyTo
function getDynamicWeight(zoom: number) {
  const baseScale = [
    { z: 0, w: 1 },
    { z: 5, w: 1.5 },
    { z: 8, w: 2.5 },
    { z: 10, w: 3.5 },
    { z: 12, w: 4.5 }, // Slightly thinner to compensate for Canvas anti-aliasing
    { z: 13, w: 5.5 },
    { z: 14, w: 6.5 },
    { z: 15, w: 7.5 },
    { z: 16, w: 9 },
    { z: 18, w: 11 },
  ];

  // Logic for smooth interpolation (no "steps")
  for (let i = 0; i < baseScale.length - 1; i++) {
    const lower = baseScale[i];
    const upper = baseScale[i + 1];

    if (zoom >= lower.z && zoom <= upper.z) {
      // Linear interpolation: w = w1 + (w2 - w1) * ((z - z1) / (z2 - z1))
      const range = upper.z - lower.z;
      const progress = (zoom - lower.z) / range;
      return lower.w + (upper.w - lower.w) * progress;
    }
  }

  // Fallback if out of bounds
  return zoom < baseScale[0].z ? baseScale[0].w : baseScale[baseScale.length - 1].w;
}

// Optimization: Handle route weight updates imperatively to avoid React re-renders during zoom/flyTo
function RouteLayer({ vehicleRoutes }: { vehicleRoutes: VehicleRoute[] }) {
  const map = useMap();
  const coreRefs = useRef<Record<string, L.Polyline | null>>({});

  useEffect(() => {
    return () => {
      Object.values(coreRefs.current).forEach(layer => layer?.remove());
      coreRefs.current = {};
    };
  }, [])

  // Initial weight set
  useEffect(() => {
    const zoom = map.getZoom();
    const coreWeight = getDynamicWeight(zoom);

    Object.values(coreRefs.current).forEach(layer => {
      layer?.setStyle({ weight: coreWeight });
    });
  }, [vehicleRoutes, map]);

  useMapEvents({
    zoom: () => {
      const zoom = map.getZoom();
      const coreWeight = getDynamicWeight(zoom);

      // Directly update Leaflet layers bypassing React render cycle
      Object.values(coreRefs.current).forEach(layer => {
        layer?.setStyle({ weight: coreWeight });
      });
    }
  });

  return (
    <>
      {vehicleRoutes.map((r: any) => (
        <Fragment key={`route-group-${r.vehicleId}`}>
          {/* Layer 1: The Main Thicker Route */}
          <Polyline
            ref={(el) => { if (el) coreRefs.current[r.vehicleId] = el; }}
            positions={r.coordinates}
            pathOptions={{
              color: r.color,
              weight: getDynamicWeight(map.getZoom()), // Initial only
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

// Separate component for Labels to handle visibility without re-rendering the heavy Polylines
function RouteLabelsLayer({ vehicleRoutes }: { vehicleRoutes: any[] }) {
  const map = useMap();
  const [showLabels, setShowLabels] = useState(map.getZoom() >= 12);

  useMapEvents({
    zoomend: () => {
      const shouldShow = map.getZoom() >= 12;
      if (shouldShow !== showLabels) setShowLabels(shouldShow);
    }
  });

  if (!showLabels) return null;

  return (
    <>
      {vehicleRoutes.map((r: any) => {
        if (!r.coordinates || r.coordinates.length < 2) return null;
        return (
          <Marker
            key={`route-label-${r.vehicleId}`}
            position={r.coordinates[Math.floor(r.coordinates.length / 3)]}
            icon={createRouteLabelIcon(
              formatDistance(r.distance),
              formatDuration(r.duration),
              r.color
            )}
            interactive={false}
          />
        );
      })}
    </>
  );
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
  updateVehicleType,
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
    gasStationIcon,
    evStationIcon,
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
      if (!zone.requiredTags?.length) return true;

      const getVehicleTags = (): string[] => {
        if (selectedVehicleId && fleetVehicles) {
          return fleetVehicles.find(v => v.id === selectedVehicleId)?.type.tags ?? [];
        }
        return selectedVehicle?.tags ?? [];
      };

      const tags = getVehicleTags();
      return zone.requiredTags.some(tag => tags.includes(tag));
    },
    [selectedVehicle?.tags, fleetVehicles, selectedVehicleId]
  );

  // --- Memoized Rendering Layers ---

  const renderedGasStations = useMemo(() => {
    if (!layers.gasStations) return null;
    return renderPOIs({
      stations: dynamicGasStations,
      icon: gasStationIcon,
      isRouting: isRouting,
    });
  }, [layers.gasStations, dynamicGasStations, gasStationIcon, isRouting]);

  const renderedEVStations = useMemo(() => {
    if (!layers.evStations) return null;
    return renderPOIs({
      stations: dynamicEVStations,
      icon: evStationIcon,
      isEV: true,
      isRouting: isRouting,
    });
  }, [layers.evStations, dynamicEVStations, evStationIcon, zoom, isRouting]);

  const renderedCustomPOIs = useMemo(() => {
    return renderCustomPOIs({
      customPOIs: customPOIs || [],
      isRouting: isRouting,
      icon: customPOIIcon,
    });
  }, [customPOIs, isRouting, customPOIIcon, zoom]);

  const renderedVehicles = useMemo(() => {
    return renderVehicleMarkers({
      vehicles: fleetVehicles || [],
      selectedVehicleId,
      createVehicleIcon,
      isRouting,
      updateVehicleType,
    });
  }, [fleetVehicles, selectedVehicleId, createVehicleIcon, zoom, isRouting, updateVehicleType]);

  const renderedJobs = useMemo(() => {
    return renderJobMarkers({
      jobs: fleetJobs || [],
      isRouting,
      icon: jobIcon,
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
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full z-0 outline-none"
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
        minZoom={5}
        maxZoom={19}
        preferCanvas={true} // Use Canvas renderer for high-performance, non-glitchy routes
      >
        <ZoomControl position="topright" />
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
            <RouteLayer vehicleRoutes={routeData.vehicleRoutes} />
            <RouteLabelsLayer vehicleRoutes={routeData.vehicleRoutes} />

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
