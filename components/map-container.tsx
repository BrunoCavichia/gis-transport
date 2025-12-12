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
  Marker,
} from "react-leaflet";
import type {
  RouteData,
  WeatherData,
  LayerVisibility,
  POI,
  VehicleType,
  Zone,
} from "@/lib/types";
import { LeafletMouseEvent } from "leaflet";
import { createVehicleIcon } from "@/lib/map-icons";

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
  zoneKeySuffix?: string;
  onMapClick?: (coords: [number, number]) => void;
  fleetVehicles?: FleetVehicle[];
  fleetJobs?: FleetJob[];
  selectedVehicleId?: string | null;
}

const MARKER_RADIUS = 5;
const COLORS = {
  gas: "#f5934dff",
  ev: "#05ce4fff",
  route: "#3b82f6",
  vehicle: "#facc15",
  job: "#8b5cf6",
};

function normalizeCoords(coords: [number, number]): [number, number] {
  const [a, b] = coords;
  if (a < -90 || a > 90) {
    return [b, a];
  }
  return [a, b];
}

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
}) {
  const map = useMap();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchCenter = useRef<string>("");
  const lastZoneFetch = useRef<{ lat: number; lon: number } | null>(null);
  const isLoadingZones = useRef(false);

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
            `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=${radius}&type=lowEmission&vehicle=${selectedVehicle.label}`
          )
            .then((r) => r.json())
            .then((data) => setDynamicLEZones(data.zones || []))
            .catch(() => setDynamicLEZones([]))
        );
      } else {
        setDynamicLEZones([]);
      }

      if (layers.restrictedZones) {
        promises.push(
          fetch(
            `/api/zones?lat=${center.lat}&lon=${center.lng}&radius=${radius}&type=restricted&vehicle=${selectedVehicle.label}`
          )
            .then((r) => r.json())
            .then((data) => setDynamicRestrictedZones(data.zones || []))
            .catch(() => setDynamicRestrictedZones([]))
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
    selectedVehicle.label,
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
          }&distance=${Math.ceil(distance)}&vehicle=${selectedVehicle.label}`
        );
        const evData = await evResponse.json();
        if (evData.stations) setDynamicEVStations(evData.stations);
      } catch {
        setDynamicEVStations([]);
      }
    }

    if (layers.gasStations) {
      try {
        const radius = Math.min(distance * 1000, 10000);
        const gasResponse = await fetch(
          `/api/gas-stations?lat=${center.lat}&lon=${
            center.lng
          }&radius=${Math.ceil(radius)}&vehicle=${selectedVehicle.label}`
        );
        const gasData = await gasResponse.json();
        if (gasData.stations) setDynamicGasStations(gasData.stations);
      } catch {
        setDynamicGasStations([]);
      }
    }
  }, [
    map,
    layers.evStations,
    layers.gasStations,
    setDynamicEVStations,
    setDynamicGasStations,
    selectedVehicle.label,
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchZones();
    }, 0);
    return () => clearTimeout(timer);
  }, [
    layers.lowEmissionZones,
    layers.restrictedZones,
    selectedVehicle.id,
    selectedVehicle,
    fetchZones,
  ]);

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
  fleetVehicles,
  fleetJobs,
  selectedVehicleId,
  onMapClick,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [dynamicLEZones, setDynamicLEZones] = useState<Zone[]>([]);
  const [dynamicRestrictedZones, setDynamicRestrictedZones] = useState<Zone[]>(
    []
  );

  const canAccessZone = useCallback(
    (zone: Zone): boolean => {
      if (!zone.requiredTags || zone.requiredTags.length === 0) return true;

      // Use the selected fleet vehicle's tags, not the vehicle type selector
      if (fleetVehicles && selectedVehicleId) {
        const selectedFleetVehicle = fleetVehicles.find(
          (v) => v.id === selectedVehicleId
        );
        if (selectedFleetVehicle) {
          return zone.requiredTags.some((tag) =>
            selectedFleetVehicle.type.tags.includes(tag)
          );
        }
      }

      // Fallback to general vehicle type selector
      return zone.requiredTags.some((tag) =>
        selectedVehicle.tags.includes(tag)
      );
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
        selectedVehicle={selectedVehicle}
        onMapClick={onMapClick}
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
      {/* Fleet Vehicles - Independent */}
      {fleetVehicles &&
        fleetVehicles.map((vehicle) => {
          const center = normalizeCoords(vehicle.coords);
          const color = "#ffa616ff";
          const isSelected = selectedVehicleId === vehicle.id;

          return (
            <Marker
              key={`vehicle-${vehicle.id}`}
              position={center}
              icon={createVehicleIcon(isSelected ? color : "#94a3b8")}
            >
              <Tooltip
                direction="top"
                offset={[0, -18]}
                opacity={0.95}
                permanent={isSelected}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? "bold" : "normal",
                  }}
                >
                  {vehicle.type.label}
                </span>
              </Tooltip>
              {!isRouting && (
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <strong>{vehicle.type.label}</strong>
                    <div
                      style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}
                    >
                      {`Lat: ${center[0].toFixed(5)}, Lon: ${center[1].toFixed(
                        5
                      )}`}
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}

      {/* Fleet Jobs - Independent */}
      {fleetJobs &&
        fleetJobs.map((job) => {
          const center = normalizeCoords(job.coords);

          return (
            <CircleMarker
              key={`job-${job.id}`}
              center={center}
              radius={MARKER_RADIUS + 2}
              pathOptions={{
                color: COLORS.job,
                fillColor: COLORS.job,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <span style={{ fontSize: 12 }}>{job.label}</span>
              </Tooltip>
              {!isRouting && (
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <strong>{job.label}</strong>
                    <div
                      style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}
                    >
                      {`Lat: ${center[0].toFixed(5)}, Lon: ${center[1].toFixed(
                        5
                      )}`}
                    </div>
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}
    </LeafletMap>
  );
}
