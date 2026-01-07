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
  const [, setWeather] = useState<WeatherData | null>(null);
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

  // Después de los otros estados, añade:
  const [pickingPOILocation, setPickingPOILocation] = useState(false);
  const [pickedPOICoords, setPickedPOICoords] = useState<
    [number, number] | null
  >(null);
  const [isAddCustomPOIOpen, setIsAddCustomPOIOpen] = useState(false);

  const [pickingJobLocation, setPickingJobLocation] = useState(false);
  const [pickedJobCoords, setPickedJobCoords] = useState<
    [number, number] | null
  >(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);

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

    setPickedPOICoords(null);
    setPickedJobCoords(null);
    setPickingPOILocation(false);
    setPickingJobLocation(false);
    setLayers({
      gasStations: false,
      evStations: false,
      lowEmissionZones: false,
      restrictedZones: false,
      route: true,
    });
    setSelectedVehicle(VEHICLE_TYPES[0]);
  }, [clearFleet]);

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) => {
      setLayers((prev) => {
        const newState = { ...prev, [layer]: !prev[layer] };

        // Cleanup immediately if toggled OFF
        if (layer === "evStations" && !newState.evStations) {
          setDynamicEVStations([]);
        }
        if (layer === "gasStations" && !newState.gasStations) {
          setDynamicGasStations([]);
        }

        return newState;
      });
    },
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

      // Handle picking for JOB
      if (pickingJobLocation) {
        setPickedJobCoords(coords);
        setPickingJobLocation(false);
        setIsAddJobOpen(true);
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
      pickingJobLocation,
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

    if (key === lastRoutingKeyRef.current) return;
    lastRoutingKeyRef.current = key;

    const selectedPOIsAsJobs = customPOIs
      .filter((poi) => poi.selectedForFleet)
      .map((poi) => ({
        id: poi.id,
        coords: poi.position,
        label: `POI: ${poi.name}`,
      }));

    const allFleetJobs = [...fleetJobs, ...selectedPOIsAsJobs];
    if (fleetVehicles.length === 0 || allFleetJobs.length === 0) {
      alert("You need at least 1 vehicle and 1 job or selected POI");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      const res = await fetch("/api/gis/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: fleetVehicles,
          jobs: allFleetJobs,
          startTime: new Date().toISOString()
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Optimization failed");
      }

      const routeData: RouteData = await res.json();
      setRouteData(routeData);
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
        addJob={() => {
          setPickedJobCoords(null);
          setIsAddJobOpen(true);
        }}
        addJobDirectly={(coords, label) => {
          setPickedJobCoords(null);
          addJobAt(coords, label);
        }}
        removeVehicle={removeVehicle}
        removeJob={removeJob}
        addMode={addMode}
        cancelAddMode={() => setAddMode(null)}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
        customPOIs={customPOIs}
        addCustomPOI={(name, coords, desc) => {
          setPickedPOICoords(null);
          return addCustomPOI(name, coords, desc);
        }}
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
        onStartPickingJob={() => {
          setPickingJobLocation(true);
          setIsAddJobOpen(false);
        }}
        pickedJobCoords={pickedJobCoords}
        isAddJobOpen={isAddJobOpen}
        setIsAddJobOpen={setIsAddJobOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        togglePOISelectionForFleet={togglePOISelectionForFleet}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
          toggleLayer={toggleLayer}
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
          pickedPOICoords={pickedPOICoords}
          pickedJobCoords={pickedJobCoords}
        />
      </div>
    </div>
  );
}
