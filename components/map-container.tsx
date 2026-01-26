"use client";
//map-container.tsx
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
  useRef,
  useMemo,
  Fragment,
} from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Polyline,
  useMapEvents,
  useMap,
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
import L, { LeafletMouseEvent } from "leaflet";
import { createMapIcons, createRouteLabelIcon } from "@/lib/map-icons";
import { Loader } from "@/components/loader";
import { useLoadingLayers } from "@/hooks/use-loading-layers";
import { usePOICache } from "@/hooks/use-poi-cache";
import { useZoneCache } from "@/hooks/use-zone-cache";
import { WeatherPanel } from "./weather-panel";
import { ZoneLayer, WeatherMarkersLayer } from "./map-layers";
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
  onVehicleTypeChange?: (vehicleId: string, type: VehicleType) => void;
  onVehicleSelect?: (vehicleId: string) => void;
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
  setViewportBounds,
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
  setViewportBounds: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();
  const zoneCache = useZoneCache(map, layers, selectedVehicle, wrapAsync);
  useEffect(() => {
    setDynamicZones(zoneCache.zones);
    onZonesUpdate?.(zoneCache.zones);
  }, [zoneCache.zones, setDynamicZones, onZonesUpdate]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLayersStateRef = useRef<{ ev: boolean; gas: boolean }>({
    ev: false,
    gas: false,
  });
  const fetchPOIsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchPOIs = useCallback(async () => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    if (zoom < THEME.map.poi.lod.minZoomForDots) {
      setDynamicEVStations([]);
      setDynamicGasStations([]);
      return;
    }

    const willFetchEV = layers.evStations;
    const willFetchGas = layers.gasStations;

    if (!willFetchEV && !willFetchGas) {
      return;
    }

    const bounds = map.getBounds();
    const diagonalMeters = bounds
      .getNorthEast()
      .distanceTo(bounds.getSouthWest());
    const viewportDistanceKm = diagonalMeters / 1000;

    let fetchRadiusKm = Math.max(
      THEME.map.poi.minFetchRadius,
      viewportDistanceKm / 1.5,
    );

    fetchRadiusKm = Math.ceil(fetchRadiusKm / 2) * 2;
    const radiusMeters = fetchRadiusKm * 1000;


    const GRID_SIZE = 0.02;
    const snapLat = Math.round(center.lat / GRID_SIZE) * GRID_SIZE;
    const snapLng = Math.round(center.lng / GRID_SIZE) * GRID_SIZE;

    // Note: usePOICache handles caching internally, so we always call fetchPOI.
    // It will return cached data immediately if available.


    // EV Stations - API handles limit, cache returns immediately if available
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

    // Gas Stations - API handles limit, cache returns immediately if available
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

      const dist = map
        .getCenter()
        .distanceTo({ lat: mapCenter[0], lng: mapCenter[1] });
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

  // Keep ref in sync with latest fetchPOIs
  useEffect(() => {
    fetchPOIsRef.current = fetchPOIs;
  }, [fetchPOIs]);

  // Trigger fetch when EV or Gas layers are toggled on/off (without adding fetchPOIs to deps)
  useEffect(() => {
    const hasLayerChanged =
      lastLayersStateRef.current.ev !== layers.evStations ||
      lastLayersStateRef.current.gas !== layers.gasStations;

    if (hasLayerChanged) {
      lastLayersStateRef.current = {
        ev: layers.evStations,
        gas: layers.gasStations,
      };

      if (layers.evStations || layers.gasStations) {
        setViewportBounds(map.getBounds());
        // Fetch when layers are enabled
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
          fetchPOIsRef.current?.();
        }, 100);
      }
    }
  }, [layers.evStations, layers.gasStations]);

  return null;
}

function MapCenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const dist = map.getCenter().distanceTo({ lat: center[0], lng: center[1] });
    if (dist > THEME.map.interaction.flyToThreshold) {
      map.flyTo(center, map.getZoom(), {
        animate: true,
        duration: THEME.map.interaction.flyToDuration,
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
      maxZoom: THEME.map.routes.maxZoom,
    });
  }, [routes, map]);
  return null;
}

const formatDistance = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
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
  return zoom < baseScale[0].z
    ? baseScale[0].w
    : baseScale[baseScale.length - 1].w;
}

// Optimization: Handle route weight updates imperatively to avoid React re-renders during zoom/flyTo
function RouteLayer({ vehicleRoutes }: { vehicleRoutes: VehicleRoute[] }) {
  const map = useMap();
  const coreRefs = useRef<Record<string, L.Polyline | null>>({});

  // Initial weight set
  useEffect(() => {
    const zoom = map.getZoom();
    const coreWeight = getDynamicWeight(zoom);

    Object.values(coreRefs.current).forEach((layer) => {
      layer?.setStyle({ weight: coreWeight });
    });
  }, [vehicleRoutes, map]);

  useMapEvents({
    zoom: () => {
      const zoom = map.getZoom();
      const coreWeight = getDynamicWeight(zoom);
      // Directly update Leaflet layers bypassing React render cycle
      Object.values(coreRefs.current).forEach((layer) => {
        layer?.setStyle({ weight: coreWeight });
      });
    },
  });

  return (
    <>
      {vehicleRoutes.map((r: any) => (
        <Fragment key={`route-group-${r.vehicleId}`}>
          {/* Layer 1: The Main Thicker Route */}
          <Polyline
            ref={(el) => {
              if (el) coreRefs.current[r.vehicleId] = el;
            }}
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
    },
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
              r.color,
            )}
            interactive={false}
          />
        );
      })}
    </>
  );
}

export default memo(function MapContainer({
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
  onVehicleTypeChange,
  onVehicleSelect,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [dynamicZones, setDynamicZones] = useState<Zone[]>([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [debouncedZoom, setDebouncedZoom] = useState(DEFAULT_ZOOM);
  const [viewportBounds, setViewportBounds] = useState<L.LatLngBounds | null>(null);
  const [showIcons, setShowIcons] = useState(DEFAULT_ZOOM >= THEME.map.poi.lod.minZoomForIcons);
  const [isExitingIcons, setIsExitingIcons] = useState(false);

  // Debounce zoom for icon transition
  useEffect(() => {
    const isIconZoom = zoom >= THEME.map.poi.lod.minZoomForIcons;

    if (isIconZoom) {
      setIsExitingIcons(false);
      setShowIcons(true);
      setDebouncedZoom(zoom);
    } else if (showIcons) {
      // Start exit animation
      setIsExitingIcons(true);
      const timer = setTimeout(() => {
        setShowIcons(false);
        setIsExitingIcons(false);
        setDebouncedZoom(zoom);
      }, 400); // Duration of fade-out
      return () => clearTimeout(timer);
    } else {
      setDebouncedZoom(zoom);
    }
  }, [zoom, showIcons]);

  const mapIcons = useMemo(() => createMapIcons(), []);

  const {
    job,
    customPOI,
    picking,
    vehicle,
    weather,
    gasStation,
    evStation,
  } = mapIcons;

  const {
    snow,
    rain,
    ice,
    wind,
    fog,
  } = weather;


  const { loading, wrapAsync } = useLoadingLayers();
  const poiCache = usePOICache();

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      if (!zone.requiredTags || zone.requiredTags.length === 0) return true;

      if (selectedVehicleId && fleetVehicles) {
        const selected = fleetVehicles.find((v) => v.id === selectedVehicleId);
        if (selected) {
          return zone.requiredTags.some((tag) =>
            selected.type.tags.includes(tag),
          );
        }
      }

      if (!selectedVehicleId && selectedVehicle?.tags) {
        const hasAccess = zone.requiredTags.some((tag) =>
          selectedVehicle.tags.includes(tag),
        );
        return hasAccess;
      }

      if (fleetVehicles && fleetVehicles.length > 0) {
        return fleetVehicles.some((v) =>
          zone.requiredTags?.some((tag) => v.type.tags.includes(tag)),
        );
      }

      return false;
    },
    [selectedVehicle.tags, fleetVehicles, selectedVehicleId],
  );



  const renderedGasStations = useMemo(() => {
    if (!layers.gasStations || zoom < THEME.map.poi.lod.minZoomForDots) return null;

    // We render icons if we are in icon mode OR if we are currently fading out
    const shouldRenderIcons = showIcons || isExitingIcons;
    const useDots = !shouldRenderIcons;

    let stations = dynamicGasStations;
    if (shouldRenderIcons && viewportBounds && typeof viewportBounds.contains === "function") {
      stations = dynamicGasStations.filter((s) => {
        try {
          return viewportBounds.contains(
            L.latLng(s.position[0], s.position[1]),
          );
        } catch (e) {
          return true;
        }
      });
    }

    return renderPOIs({
      stations,
      icon: gasStation,
      isRouting,
      useDots,
      isEV: false,
      isExiting: isExitingIcons,
    });
  }, [
    layers.gasStations,
    dynamicGasStations,
    gasStation,
    isRouting,
    showIcons,
    isExitingIcons,
    viewportBounds,
    zoom,
  ]);

  const renderedEVStations = useMemo(() => {
    if (!layers.evStations || zoom < THEME.map.poi.lod.minZoomForDots)
      return null;
    const shouldRenderIcons = showIcons || isExitingIcons;
    const useDots = !shouldRenderIcons;

    let stations = dynamicEVStations;
    if (
      shouldRenderIcons &&
      viewportBounds &&
      typeof viewportBounds.contains === "function"
    ) {
      stations = dynamicEVStations.filter((s) => {
        try {
          return viewportBounds.contains(
            L.latLng(s.position[0], s.position[1]),
          );
        } catch (e) {
          return true;
        }
      });
    }

    const result = renderPOIs({
      stations,
      icon: evStation,
      isEV: true,
      isRouting: isRouting,
      useDots,
      isExiting: isExitingIcons,
    });
    return result;
  }, [
    layers.evStations,
    dynamicEVStations,
    evStation,
    isRouting,
    showIcons,
    isExitingIcons,
    viewportBounds,
    zoom,
  ]);

  const renderedCustomPOIs = useMemo(() => {
    return renderCustomPOIs({
      customPOIs: customPOIs || [],
      isRouting: isRouting,
      icon: customPOI,
    });
  }, [customPOIs, isRouting, customPOI]);

  const renderedVehicles = useMemo(() => {
    return renderVehicleMarkers({
      vehicles: fleetVehicles || [],
      selectedVehicleId,
      createVehicleIcon: vehicle,
      isRouting,
      onUpdateType: onVehicleTypeChange,
      onSelect: onVehicleSelect,
    });
  }, [
    fleetVehicles,
    selectedVehicleId,
    vehicle,
    isRouting,
    onVehicleTypeChange,
    onVehicleSelect,
  ]);


  const renderedJobs = useMemo(() => {
    return renderJobMarkers({
      jobs: fleetJobs || [],
      isRouting,
      icon: job,
    });
  }, [fleetJobs, isRouting, job]);



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
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />

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

        {renderedGasStations && (
          <Fragment key="gas-stations">{renderedGasStations}</Fragment>
        )}
        {renderedEVStations && (
          <Fragment key="ev-stations">{renderedEVStations}</Fragment>
        )}
        {renderedCustomPOIs && (
          <Fragment key="custom-pois">{renderedCustomPOIs}</Fragment>
        )}
        {renderedVehicles && (
          <Fragment key="vehicles">{renderedVehicles}</Fragment>
        )}
        {renderedJobs && <Fragment key="jobs">{renderedJobs}</Fragment>}
        {routeData?.weatherRoutes && (
          <WeatherPanel routes={routeData.weatherRoutes} />
        )}
        <WeatherMarkersLayer
          weatherRoutes={routeData?.weatherRoutes || []}
          icons={{ snow, rain, ice, wind, fog }}
        />
        {pickedPOICoords && (
          <>
            <Marker position={pickedPOICoords} icon={picking} />
          </>
        )}
        {pickedJobCoords && (
          <>

            <Marker position={pickedJobCoords} icon={picking} />
          </>
        )}
      </LeafletMap>
    </div>
  );
});
