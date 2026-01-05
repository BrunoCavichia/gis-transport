"use client";
// app/components/gis-map.tsx
import dynamic from "next/dynamic";
import { useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  CustomPOI,
  VehicleType,
  RouteData,
  WeatherData,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

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

  if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && Math.abs(b) > 90) {
    return [b, a];
  }

  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return [a, b];
  }

  if (Math.abs(a - 40) < 20 && Math.abs(b + 4) < 10) {
    return [b, a];
  }

  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
    return [b, a];
  }

  return [a, b];
}

export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: false,
    evStations: false,
    lowEmissionZones: false,
    restrictedZones: false,
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
  const [showCustomPOIs, setShowCustomPOIs] = useState(true);
  const [addingCustomPOI, setAddingCustomPOI] = useState(false);
  // Después de los otros estados, añade:
  const [pickingPOILocation, setPickingPOILocation] = useState(false);
  const [pickedPOICoords, setPickedPOICoords] = useState<
    [number, number] | null
  >(null);
  const [isAddCustomPOIOpen, setIsAddCustomPOIOpen] = useState(false);

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
    isLoadingVehicles,
    fetchVehicles,
  } = useFleet();

  const {
    customPOIs,
    addCustomPOI,
    removeCustomPOI,
    updateCustomPOI,
    clearAllCustomPOIs,
    togglePOISelectionForFleet,
  } = useCustomPOI();

  const clearAll = useCallback(() => {
    clearFleet();
    setRouteData(null);
    setRoutePoints({ start: null, end: null });
    setDynamicEVStations([]);
    setDynamicGasStations([]);
    setIsCalculatingRoute(false);
    setShowCustomPOIs(false);
    setAddingCustomPOI(false);
  }, [clearFleet]);

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) =>
      setLayers((prev) => ({ ...prev, [layer]: !prev[layer] })),
    []
  );

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
      // Primero manejar picking de POI
      if (pickingPOILocation) {
        setPickedPOICoords(coords);
        setPickingPOILocation(false);
        setIsAddCustomPOIOpen(true);
        return;
      }

      // Resto del código existente para fleet mode
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
    [
      fleetMode,
      addMode,
      addVehicleAt,
      addJobAt,
      selectedVehicle,
      pickingPOILocation,
    ]
  );

  const lastRoutingKeyRef = useRef<string>("");
  const startRouting = useCallback(async () => {
    const key = JSON.stringify({
      vehicles: fleetVehicles.map((v) => ({ id: v.id, coords: v.coords })),
      jobs: fleetJobs.map((j) => ({ id: j.id, coords: j.coords })),
      selectedPOIs: customPOIs
        .filter((poi) => poi.selectedForFleet)
        .map((p) => ({ id: p.id, coords: p.position })),
    });

    if (key === lastRoutingKeyRef.current) {
      return;
    }

    lastRoutingKeyRef.current = key;
    const selectedPOIsAsJobs = customPOIs
      .filter((poi) => poi.selectedForFleet)
      .map((poi) => ({
        id: poi.id,
        coords: poi.position,
        label: `POI: ${poi.name}`,
      }));

    const allFleetJobs = [...fleetJobs, ...selectedPOIsAsJobs];

    const totalLocations = fleetVehicles.length + allFleetJobs.length;

    if (totalLocations > 50) {
      alert(
        `Too many locations (${totalLocations}). The maximum is 50 (vehicles + jobs).`
      );
      return;
    }

    if (fleetVehicles.length === 0 || allFleetJobs.length === 0) {
      alert("You need at least 1 vehicle and 1 job or selected POI");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      // Recopilar todas las coordenadas
      const allCoords = [
        ...fleetVehicles.map((v) => v.coords),
        ...allFleetJobs.map((j) => j.coords),
      ];

      let correctedLocations = allCoords;

      // Intentar snap de todas las coordenadas ANTES de routing
      try {
        const snapResponse = await fetch("/api/snap-to-road", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: allCoords }),
        });

        if (snapResponse.ok) {
          const snapData = await snapResponse.json();
          correctedLocations = snapData.snapped.map((s: any) => s.location);

          const snappedCount = snapData.snapped.filter(
            (s: any) => s.snapped
          ).length;
          if (snappedCount > 0) {
          }
        }
      } catch (snapError) {
        console.warn("Snap validation failed, using original coordinates");
      }

      // Normalizar coordenadas a [lon, lat] para ORS
      const allLocations: [number, number][] =
        correctedLocations.map(normalizeToLonLat);

      // ORS matrix espera [lat, lon]
      const coordinatesForMatrix = allLocations.map(([lon, lat]) => [lat, lon]);

      // Request matrix
      const matrixRes = await fetch("/api/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coordinatesForMatrix }),
      });
      if (!matrixRes.ok) throw new Error("Error in matrix API");
      const matrixData = await matrixRes.json();
      const cleanedMatrix = matrixData.cost.map((row: number[]) =>
        row.map((val: number) =>
          isFinite(val) && val >= 0 ? Math.round(val) : 999999
        )
      );

      const jobsPerVehicle = Math.ceil(
        allFleetJobs.length / fleetVehicles.length
      );
      const vroomPayload = {
        vehicles: fleetVehicles.map((v, idx) => ({
          id: idx,
          start_index: idx,
          profile: "car",
          capacity: [jobsPerVehicle + 1],
        })),
        jobs: allFleetJobs.map((j, jidx) => ({
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
      if (!vroomRes.ok) throw new Error("Error in VROOM");
      const vroomResult = await vroomRes.json();

      if (!vroomResult.routes || vroomResult.routes.length === 0) {
        throw new Error("VROOM did not return any routes");
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
            waypoints.push([lat, lon]);
            if (step.type === "job") jobCount++;
          }
        }

        if (waypoints.length >= 2) {
          const routingRes = await fetch("/api/routing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinates: waypoints }),
          });

          // Si el routing falla (502), intentar con las coordenadas del fallback
          if (!routingRes.ok) {
            const errorData = await routingRes.json().catch(() => ({}));

            // Si tiene fallback coordinates, usar esas
            const fallbackCoords = errorData.coordinates || waypoints;

            console.warn(
              `⚠️ Routing failed for vehicle ${route.vehicle}, using straight line`
            );

            vehicleRoutes.push({
              vehicleId: route.vehicle,
              coordinates: fallbackCoords,
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
        throw new Error("No route coordinates were generated");

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
      console.error("Routing error:", err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [fleetVehicles, fleetJobs, customPOIs, setLayers]);

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
        customPOIs={customPOIs}
        addCustomPOI={addCustomPOI}
        removeCustomPOI={removeCustomPOI}
        updateCustomPOI={updateCustomPOI}
        clearAllCustomPOIs={clearAllCustomPOIs}
        showCustomPOIs={showCustomPOIs}
        setShowCustomPOIs={setShowCustomPOIs}
        mapCenter={mapCenter}
        onStartPicking={() => {
          setPickingPOILocation(true);
          setIsAddCustomPOIOpen(false);
        }}
        pickedCoords={pickedPOICoords}
        isAddCustomPOIOpen={isAddCustomPOIOpen}
        setIsAddCustomPOIOpen={setIsAddCustomPOIOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        togglePOISelectionForFleet={togglePOISelectionForFleet}
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
          customPOIs={showCustomPOIs ? customPOIs : []}
          fleetVehicles={fleetVehicles}
          fleetJobs={fleetJobs}
          selectedVehicleId={selectedVehicleId}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
}
