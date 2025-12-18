"use client";
// app/components/gis-map.tsx
import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  RouteData,
  WeatherData,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

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

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038];

const ROUTE_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

// Util: normaliza entrada a [lon, lat] de forma determinista
function normalizeToLonLat(coords: [number, number]): [number, number] {
  const [a, b] = coords;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error("Coordinates must be finite numbers");
  }

  // Si el primer valor está en rango de latitud plausible y el segundo es un valor de longitud válido que supera 90,
  // asumimos [lat, lon] -> devolver [lon, lat]
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && Math.abs(b) > 90) {
    return [b, a];
  }

  // Si el primer valor tiene magnitud > 90 (probablemente longitud en -180..180), asumimos ya [lon, lat]
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return [a, b];
  }

  // heurística para coordenadas europeas (lat ~ 40, lon ~ -3)
  if (Math.abs(a - 40) < 20 && Math.abs(b + 4) < 10) {
    return [b, a];
  }

  // fallback por seguridad: si el primer elemento parece lat (|a| <= 90) asumimos [lat, lon]
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
    return [b, a];
  }

  // si ninguno aplica, devolvemos tal cual (se asume [lon, lat])
  return [a, b];
}

// Hook para manejar estado y operaciones del fleet (agregar/quitar/limpiar/select)
function useFleet(
  initialVehicles: FleetVehicle[] = [],
  initialJobs: FleetJob[] = []
) {
  const [fleetVehicles, setFleetVehicles] =
    useState<FleetVehicle[]>(initialVehicles);
  const [fleetJobs, setFleetJobs] = useState<FleetJob[]>(initialJobs);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [addMode, setAddMode] = useState<"vehicle" | "job" | null>(null);

  const clearFleet = useCallback(() => {
    setFleetVehicles([]);
    setFleetJobs([]);
    setSelectedVehicleId(null);
    setAddMode(null);
  }, []);

  const addVehicleAt = useCallback(
    (coords: [number, number], type: VehicleType) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : `vehicle-${Date.now()}`;
      const newVehicle: FleetVehicle = { id, coords, type };
      setFleetVehicles((prev) => {
        const next = [...prev, newVehicle];
        // seleccionar el nuevo vehículo
        setSelectedVehicleId(newVehicle.id);
        return next;
      });
      setAddMode(null);
    },
    []
  );

  const addJobAt = useCallback((coords: [number, number]) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `job-${Date.now()}`;
    setFleetJobs((prev) => {
      const next = [...prev, { id, coords, label: `Job ${prev.length + 1}` }];
      return next;
    });
    setAddMode(null);
  }, []);

  const removeVehicle = useCallback((vehicleId: string) => {
    setFleetVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId);
      setSelectedVehicleId((curr) =>
        curr === vehicleId ? remaining[0]?.id ?? null : curr
      );
      return remaining;
    });
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setFleetJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  return {
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    addMode,
    setAddMode,
    setSelectedVehicleId,
    clearFleet,
    addVehicleAt,
    addJobAt,
    removeVehicle,
    removeJob,
  };
}

export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: true,
    evStations: true,
    lowEmissionZones: true,
    restrictedZones: true,
    route: true,
  });

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [routePoints, setRoutePoints] = useState<{
    start: [number, number] | null;
    end: [number, number] | null;
  }>({ start: null, end: null });
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    VEHICLE_TYPES[0]
  );
  const [fleetMode, setFleetMode] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const {
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    addMode,
    setAddMode,
    setSelectedVehicleId,
    clearFleet,
    addVehicleAt,
    addJobAt,
    removeVehicle,
    removeJob,
  } = useFleet();

  // AQUÍ defines clearAll - DESPUÉS del hook useFleet
  const clearAll = useCallback(() => {
    clearFleet(); // limpia vehículos y jobs
    setRouteData(null); // limpia rutas
    setRoutePoints({ start: null, end: null }); // limpia puntos
    setDynamicEVStations([]); // limpia estaciones EV
    setDynamicGasStations([]); // limpia gasolineras
    setIsCalculatingRoute(false); // resetea loading
  }, [clearFleet]);

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) =>
      setLayers((prev) => ({ ...prev, [layer]: !prev[layer] })),
    []
  );

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
      if (!fleetMode || !addMode) return;

      if (
        !coords ||
        coords.length !== 2 ||
        coords.some((c) => typeof c !== "number")
      ) {
        console.error("Invalid coordinates clicked:", coords);
        return;
      }

      if (addMode === "vehicle") {
        addVehicleAt(coords, selectedVehicle);
      } else if (addMode === "job") {
        addJobAt(coords);
      }
    },
    [fleetMode, addMode, addVehicleAt, addJobAt, selectedVehicle]
  );

  // --- startRouting: se mantienen las mismas fases pero con helpers locales ---
  const startRouting = useCallback(async () => {
    if (fleetVehicles.length === 0 || fleetJobs.length === 0) {
      alert("Necesitas al menos 1 vehículo y 1 trabajo");
      return;
    }
    setIsCalculatingRoute(true);

    try {
      // 1) todas las ubicaciones en [lon, lat]
      const allLocations: [number, number][] = [
        ...fleetVehicles.map((v) => normalizeToLonLat(v.coords)),
        ...fleetJobs.map((j) => normalizeToLonLat(j.coords)),
      ];

      // 2) ORS matrix espera [lat, lon]
      const coordinatesForMatrix = allLocations.map(([lon, lat]) => [lat, lon]);

      // 3) request matrix
      const matrixRes = await fetch("/api/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coordinatesForMatrix }),
      });
      if (!matrixRes.ok) throw new Error("Error en matrix API");
      const matrixData = await matrixRes.json();
      const cleanedMatrix = matrixData.cost.map((row: number[]) =>
        row.map((val: number) =>
          isFinite(val) && val >= 0 ? Math.round(val) : 999999
        )
      );

      const jobsPerVehicle = Math.ceil(fleetJobs.length / fleetVehicles.length);
      const vroomPayload = {
        vehicles: fleetVehicles.map((v, idx) => ({
          id: idx,
          start_index: idx,
          profile: "car",
          capacity: [jobsPerVehicle + 1],
        })),
        jobs: fleetJobs.map((j, jidx) => ({
          id: fleetVehicles.length + jidx,
          location_index: fleetVehicles.length + jidx,
          service: 300,
          delivery: [1],
        })),
        matrix: cleanedMatrix,
      };

      const vroomRes = await fetch("/api/vroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vroomPayload),
      });
      if (!vroomRes.ok) throw new Error("Error en VROOM");
      const vroomResult = await vroomRes.json();

      if (!vroomResult.routes || vroomResult.routes.length === 0) {
        throw new Error("VROOM no devolvió rutas");
      }

      const vehicleRoutes: Array<{
        vehicleId: number;
        coordinates: [number, number][];
        distance: number;
        duration: number;
        color: string;
        jobsAssigned: number;
      }> = [];

      let totalDistance = 0;
      let totalDuration = 0;

      for (const route of vroomResult.routes) {
        totalDuration += route.duration || 0;

        const waypoints: [number, number][] = [];
        let jobCount = 0;

        for (const step of route.steps || []) {
          if (typeof step.location_index === "number") {
            const [lon, lat] = allLocations[step.location_index];
            waypoints.push([lat, lon]); // [lat, lon] para API de routing
            if (step.type === "job") jobCount++;
          }
        }

        if (waypoints.length >= 2) {
          const routingRes = await fetch("/api/routing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinates: waypoints }),
          });

          if (!routingRes.ok) {
            // fallback a líneas rectas si falla
            vehicleRoutes.push({
              vehicleId: route.vehicle,
              coordinates: waypoints,
              distance: 0,
              duration: route.duration || 0,
              color: ROUTE_COLORS[route.vehicle % ROUTE_COLORS.length],
              jobsAssigned: jobCount,
            });
            continue;
          }

          const routingData = await routingRes.json();
          vehicleRoutes.push({
            vehicleId: route.vehicle,
            coordinates: routingData.coordinates,
            distance: routingData.distance || 0,
            duration: routingData.duration || 0,
            color: ROUTE_COLORS[route.vehicle % ROUTE_COLORS.length],
            jobsAssigned: jobCount,
          });

          totalDistance += routingData.distance || 0;
        }
      }

      const allRouteCoordinates = vehicleRoutes.flatMap((r) => r.coordinates);
      if (allRouteCoordinates.length === 0)
        throw new Error("No se generaron coordenadas de ruta");

      try {
        const weatherRes = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleRoutes }),
        });
        const weatherData = weatherRes.ok
          ? await weatherRes.json()
          : { routes: [] };
        setRouteData({
          coordinates: [],
          distance: totalDistance,
          duration: totalDuration,
          vehicleRoutes,
          weatherRoutes: weatherData.routes || [],
        });
      } catch {
        setRouteData({
          coordinates: [],
          distance: totalDistance,
          duration: totalDuration,
          vehicleRoutes,
          weatherRoutes: [],
        });
      }

      setLayers((prev) => ({ ...prev, route: true }));
    } catch (err) {
      console.error("Error en enrutamiento:", err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [fleetVehicles, fleetJobs, setLayers]);

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        layers={layers}
        setMapCenter={setMapCenter}
        toggleLayer={toggleLayer}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        fleetMode={fleetMode}
        setFleetMode={setFleetMode}
        clearFleet={clearAll}
        fleetVehicles={fleetVehicles}
        fleetJobs={fleetJobs}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        addVehicle={() => setAddMode("vehicle")}
        addJob={() => setAddMode("job")}
        removeVehicle={removeVehicle}
        removeJob={removeJob}
        addMode={addMode}
        cancelAddMode={() => setAddMode(null)}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
          routeData={routeData}
          setRouteData={setRouteData}
          setWeather={setWeather}
          isRouting={isCalculatingRoute}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          dynamicEVStations={dynamicEVStations}
          setDynamicEVStations={setDynamicEVStations}
          dynamicGasStations={dynamicGasStations}
          setDynamicGasStations={setDynamicGasStations}
          mapCenter={mapCenter}
          setMapCenter={setMapCenter}
          selectedVehicle={selectedVehicle}
          fleetVehicles={fleetVehicles}
          fleetJobs={fleetJobs}
          selectedVehicleId={selectedVehicleId}
          onMapClick={fleetMode ? handleMapClick : undefined}
        />
      </div>
    </div>
  );
}