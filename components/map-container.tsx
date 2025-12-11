"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Popup,
  Polygon,
  Polyline,
  useMapEvents,
  useMap,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import type {
  RouteData,
  WeatherData,
  LayerVisibility,
  POI,
  VehicleType,
  Zone,
} from "@/lib/types";
import { LeafletMouseEvent } from "leaflet";

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
  zoneKeySuffix?: string;
}

/* Minimal visual tokens: use small circle markers instead of large custom icons */
const MARKER_RADIUS = 5; // small radius
const COLORS = {
  gas: "#f5934dff",
  ev: "#05ce4fff",
  route: "#3b82f6",
  start: "#2563eb",
  end: "#ef4444",
};

function MapEventHandler({
  isRouting,
  routePoints,
  setRoutePoints,
  setRouteData,
  setWeather,
  setDynamicEVStations,
  setDynamicGasStations,
  setDynamicLEZones,
  setDynamicRestrictedZones,
  setMapCenter,
  layers,
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
}) {
  const map = useMap();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchCenter = useRef<string>("");
  const lastZoneFetch = useRef<{ lat: number; lon: number } | null>(null);
  const isLoadingZones = useRef(false);

  const fetchMultipleWeather = useCallback(
    async (
      start: [number, number],
      end: [number, number],
      midpoints: [number, number][]
    ) => {
      try {
        const points = [start, ...midpoints.slice(0, 1), end];
        const weatherPromises = points.map((point) =>
          fetch(`/api/weather?lat=${point[0]}&lon=${point[1]}`).then((r) =>
            r.json()
          )
        );
        const results = await Promise.all(weatherPromises);
        setWeather({
          ...results[0],
          multipleLocations: results,
        } as WeatherData);
      } catch (error) {
        console.error("Error fetching multiple weather:", error);
      }
    },
    [setWeather]
  );

  const fetchRoute = useCallback(
    async (start: [number, number], end: [number, number]) => {
      try {
        const response = await fetch(
          `/api/route?startLat=${start[0]}&startLon=${start[1]}&endLat=${end[0]}&endLon=${end[1]}`
        );
        const data = await response.json();
        if (data.coordinates) {
          setRouteData({
            coordinates: data.coordinates,
            distance: data.distance,
            duration: data.duration,
            instructions: data.instructions,
          });
          const bounds = L.latLngBounds(data.coordinates);
          map.fitBounds(bounds, { padding: [40, 40] });
          const quarterpoint =
            data.coordinates[Math.floor(data.coordinates.length / 4)];
          const midpoint =
            data.coordinates[Math.floor(data.coordinates.length / 2)];
          fetchMultipleWeather(start, end, [quarterpoint, midpoint]);
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    },
    [map, setRouteData, fetchMultipleWeather]
  );

  const fetchZones = useCallback(async () => {
    const center = map.getCenter();

    if (!layers.lowEmissionZones && !layers.restrictedZones) return;
    if (isLoadingZones.current) return;

    isLoadingZones.current = true;
    lastZoneFetch.current = { lat: center.lat, lon: center.lng };
    const radius = 20000;

    try {
      const promises: Promise<void>[] = [];

      if (layers.lowEmissionZones) {
        promises.push(
          fetch(
            `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=${radius}&type=lowEmission`
          )
            .then((r) => r.json())
            .then((data) => setDynamicLEZones(data.zones || []))
            .catch((err) => {
              console.error("Error fetching LEZ zones:", err);
              setDynamicLEZones([]);
            })
        );
      } else {
        setDynamicLEZones([]);
      }

      if (layers.restrictedZones) {
        promises.push(
          fetch(
            `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=${radius}&type=restricted`
          )
            .then((r) => r.json())
            .then((data) => setDynamicRestrictedZones(data.zones || []))
            .catch((err) => {
              console.error("Error fetching restricted zones:", err);
              setDynamicRestrictedZones([]);
            })
        );
      } else {
        setDynamicRestrictedZones([]);
      }

      await Promise.all(promises);
    } finally {
      isLoadingZones.current = false;
    }
  }, [
    map,
    layers.lowEmissionZones,
    layers.restrictedZones,
    setDynamicLEZones,
    setDynamicRestrictedZones,
  ]);

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
    const bounds = map.getBounds();
    const distance = Math.min(
      bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2000,
      25
    );

    if (layers.evStations) {
      try {
        const evResponse = await fetch(
          `/api/ev-stations?lat=${center.lat}&lon=${
            center.lng
          }&distance=${Math.ceil(distance)}`
        );
        const evData = await evResponse.json();
        if (evData.stations) setDynamicEVStations(evData.stations);
      } catch (error) {
        console.error("Error fetching EV stations:", error);
      }
    }

    if (layers.gasStations) {
      try {
        const radius = Math.min(distance * 1000, 10000);
        const gasResponse = await fetch(
          `/api/gas-stations?lat=${center.lat}&lon=${
            center.lng
          }&radius=${Math.ceil(radius)}`
        );
        const gasData = await gasResponse.json();
        if (gasData.stations) setDynamicGasStations(gasData.stations);
      } catch (error) {
        console.error("Error fetching gas stations:", error);
      }
    }
  }, [
    map,
    layers.evStations,
    layers.gasStations,
    setDynamicEVStations,
    setDynamicGasStations,
  ]);

  useEffect(() => {
    if (routePoints.start && routePoints.end)
      fetchRoute(routePoints.start, routePoints.end);
  }, [routePoints.start, routePoints.end, fetchRoute]);

  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (!isRouting) return;
      const point: [number, number] = [e.latlng.lat, e.latlng.lng];
      if (!routePoints.start) setRoutePoints({ start: point, end: null });
      else if (!routePoints.end) setRoutePoints({ ...routePoints, end: point });
    },
    moveend: () => {
      setMapCenter([map.getCenter().lat, map.getCenter().lng]);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchZones();
        fetchPOIs();
      }, 100);
    },
    zoomend: () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchZones();
        fetchPOIs();
      }, 100);
    },
  });

  useEffect(() => {
    fetchZones();
    fetchPOIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchZones();
    }, 0);
    return () => clearTimeout(timer);
  }, [layers.lowEmissionZones, layers.restrictedZones, fetchZones]);

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
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [dynamicLEZones, setDynamicLEZones] = useState<Zone[]>([]);
  const [dynamicRestrictedZones, setDynamicRestrictedZones] = useState<Zone[]>(
    []
  );

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      if (!zone.requiredTags || zone.requiredTags.length === 0) return true;
      return zone.requiredTags.some((tag) =>
        selectedVehicle.tags.includes(tag)
      );
    },
    [selectedVehicle.tags]
  );

  const defaultCenter: [number, number] = [40.4168, -3.7038];
  const defaultZoom = 12;
  const mergedZones = useMemo(() => {
    const allZones = [...dynamicLEZones, ...dynamicRestrictedZones];
    const mapById = new Map<string, Zone>();
    allZones.forEach((z, idx) => {
      const key = `${z.id}-${idx}`; // índice asegura unicidad
      mapById.set(key, z);
    });
    return Array.from(mapById.values());
  }, [dynamicLEZones, dynamicRestrictedZones]);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
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
        layers={layers}
      />

      {mergedZones.map((zone, idx) => {
        const hasAccess = canAccessZone(zone);
        return (
          <Polygon
            key={`${zone.id}-${idx}`}
            positions={zone.coordinates}
            pathOptions={{
              color:
                zone.type === "LEZ"
                  ? hasAccess
                    ? "#10b981"
                    : "#ef4444"
                  : "#ef4444",
              fillColor:
                zone.type === "LEZ"
                  ? hasAccess
                    ? "#10b981"
                    : "#ef4444"
                  : "#ef4444",
              fillOpacity:
                zone.type === "LEZ" ? (hasAccess ? 0.08 : 0.12) : 0.12,
              weight: zone.type === "LEZ" ? 1 : 0.5,
              dashArray: zone.type === "LEZ" ? undefined : "4,4",
            }}
          >
            {!isRouting && (
              <Popup closeButton={false} autoClose={false}>
                <div style={{ fontSize: 12 }}>
                  <strong>{zone.name}</strong>
                  {zone.type === "LEZ" && (
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

      {layers.route && routeData && (
        <Polyline
          positions={routeData.coordinates}
          pathOptions={{ color: COLORS.route, weight: 3, opacity: 0.9 }}
        />
      )}

      {layers.gasStations &&
        dynamicGasStations.map((station) => (
          <CircleMarker
            key={station.id}
            center={station.position as [number, number]}
            radius={MARKER_RADIUS}
            pathOptions={{
              color: COLORS.gas,
              fillColor: COLORS.gas,
              fillOpacity: 1,
              weight: 0,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span style={{ fontSize: 12 }}>{station.name}</span>
            </Tooltip>
            {!isRouting && (
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{station.name}</strong>
                  <div style={{ marginTop: 6 }}>{station.address}</div>
                </div>
              </Popup>
            )}
          </CircleMarker>
        ))}

      {layers.evStations &&
        dynamicEVStations.map((station) => (
          <CircleMarker
            key={station.id}
            center={station.position as [number, number]}
            radius={MARKER_RADIUS}
            pathOptions={{
              color: COLORS.ev,
              fillColor: COLORS.ev,
              fillOpacity: 1,
              weight: 0,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span style={{ fontSize: 12 }}>{station.name}</span>
            </Tooltip>
            {!isRouting && (
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{station.name}</strong>
                  <div style={{ marginTop: 6 }}>
                    {station.connectors
                      ? `${station.connectors} connectors`
                      : "EV station"}
                  </div>
                </div>
              </Popup>
            )}
          </CircleMarker>
        ))}

      {routePoints.start && (
        <CircleMarker
          center={routePoints.start}
          radius={MARKER_RADIUS + 1}
          pathOptions={{
            color: COLORS.start,
            fillColor: COLORS.start,
            fillOpacity: 1,
            weight: 0,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
            <span style={{ fontSize: 12 }}>Start</span>
          </Tooltip>
        </CircleMarker>
      )}

      {routePoints.end && (
        <CircleMarker
          center={routePoints.end}
          radius={MARKER_RADIUS + 1}
          pathOptions={{
            color: COLORS.end,
            fillColor: COLORS.end,
            fillOpacity: 1,
            weight: 0,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
            <span style={{ fontSize: 12 }}>End</span>
          </Tooltip>
        </CircleMarker>
      )}
    </LeafletMap>
  );
}
