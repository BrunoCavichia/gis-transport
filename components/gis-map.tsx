"use client";
import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  WeatherData,
  Zone,
  InteractionMode,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { useRouting } from "@/hooks/use-routing";
import { useLiveTracking } from "@/hooks/use-live-tracking";
import { RouteErrorAlert } from "@/components/route-error-alert";
import { MAP_CENTER } from "@/lib/config";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

const DEFAULT_CENTER: [number, number] = MAP_CENTER;

export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: false,
    evStations: false,
    cityZones: false,
    route: true,
  });

  const [, setWeather] = useState<WeatherData | null>(null);
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    VEHICLE_TYPES[0],
  );
  const [fleetMode, setFleetMode] = useState(false);
  const [showCustomPOIs, setShowCustomPOIs] = useState(true);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);

  const [pickedPOICoords, setPickedPOICoords] = useState<
    [number, number] | null
  >(null);
  const [isAddCustomPOIOpen, setIsAddCustomPOIOpen] = useState(false);
  const [pickedJobCoords, setPickedJobCoords] = useState<
    [number, number] | null
  >(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [activeZones, setActiveZones] = useState<Zone[]>([]);

  const {
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    setSelectedVehicleId,
    clearFleet,
    addVehicleAt,
    addJobAt,
    removeVehicle,
    removeJob,
    isLoadingVehicles,
    fetchVehicles,
    updateVehiclePosition,
    updateVehicleType,
  } = useFleet();

  const {
    customPOIs,
    addCustomPOI,
    removeCustomPOI,
    updateCustomPOI,
    clearAllCustomPOIs,
    togglePOISelectionForFleet,
  } = useCustomPOI();

  const {
    routeData,
    setRouteData,
    routeErrors,
    setRouteErrors,
    routeNotices,
    setRouteNotices,
    isCalculatingRoute,
    routePoints,
    setRoutePoints,
    startRouting,
    clearRoute,
  } = useRouting({
    fleetVehicles,
    fleetJobs,
    customPOIs,
    activeZones,
    removeJob,
    setLayers,
  });

  const { isTracking, toggleTracking } = useLiveTracking({
    routeData,
    updateVehiclePosition: (vehicleId: string | number, newCoords: [number, number]) =>
      updateVehiclePosition(String(vehicleId), newCoords),
  });

  const clearAll = useCallback(() => {
    clearFleet();
    clearRoute();
    setInteractionMode(null);
    setPickedPOICoords(null);
    setPickedJobCoords(null);
    setSelectedVehicle(VEHICLE_TYPES[0]);
  }, [clearFleet, clearRoute]);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayers((prev) => {
      const newState = { ...prev, [layer]: !prev[layer] };
      if (layer === "evStations" && !newState.evStations)
        setDynamicEVStations([]);
      if (layer === "gasStations" && !newState.gasStations)
        setDynamicGasStations([]);
      return newState;
    });
  }, []);

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
      if (
        !coords ||
        coords.length !== 2 ||
        coords.some((c) => typeof c !== "number")
      ) {
        console.error("Invalid coordinates clicked:", coords);
        return;
      }

      switch (interactionMode) {
        case "pick-poi":
          setPickedPOICoords(coords);
          setInteractionMode(null);
          setIsAddCustomPOIOpen(true);
          break;
        case "pick-job":
          setPickedJobCoords(coords);
          setInteractionMode(null);
          setIsAddJobOpen(true);
          break;
        case "add-vehicle":
          addVehicleAt(coords, selectedVehicle);
          setInteractionMode(null);
          break;
        case "add-job":
          addJobAt(coords);
          setInteractionMode(null);
          break;
        default:
          break;
      }
    },
    [interactionMode, addVehicleAt, addJobAt, selectedVehicle],
  );

  const handleAddVehicle = useCallback(() => setInteractionMode("add-vehicle"), []);

  const handleAddJob = useCallback(() => {
    setPickedJobCoords(null);
    setIsAddJobOpen(true);
  }, []);

  const handleAddJobDirectly = useCallback((coords: [number, number], label: string) => {
    setPickedJobCoords(null);
    addJobAt(coords, label);
  }, [addJobAt]);

  const handleAddCustomPOI = useCallback((name: string, coords: [number, number], desc?: string) => {
    setPickedPOICoords(null);
    return addCustomPOI(name, coords, desc);
  }, [addCustomPOI]);

  const handleStartPicking = useCallback(() => {
    setInteractionMode("pick-poi");
    setIsAddCustomPOIOpen(false);
  }, []);

  const handleStartPickingJob = useCallback(() => {
    setInteractionMode("pick-job");
    setIsAddJobOpen(false);
  }, []);

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
        setSelectedVehicleId={(id) => setSelectedVehicleId(id ? String(id) : null)}
        addVehicle={handleAddVehicle}
        addJob={handleAddJob}
        addJobDirectly={handleAddJobDirectly}
        removeVehicle={(id) => removeVehicle(String(id))}
        removeJob={(id) => removeJob(String(id))}
        addMode={
          interactionMode === "add-vehicle"
            ? "vehicle"
            : interactionMode === "add-job"
              ? "job"
              : null
        }
        cancelAddMode={() => setInteractionMode(null)}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
        customPOIs={customPOIs}
        addCustomPOI={handleAddCustomPOI}
        removeCustomPOI={removeCustomPOI}
        updateCustomPOI={updateCustomPOI}
        clearAllCustomPOIs={clearAllCustomPOIs}
        showCustomPOIs={showCustomPOIs}
        setShowCustomPOIs={setShowCustomPOIs}
        mapCenter={mapCenter}
        onStartPicking={handleStartPicking}
        pickedCoords={pickedPOICoords}
        isAddCustomPOIOpen={isAddCustomPOIOpen}
        setIsAddCustomPOIOpen={setIsAddCustomPOIOpen}
        onStartPickingJob={handleStartPickingJob}
        pickedJobCoords={pickedJobCoords}
        isAddJobOpen={isAddJobOpen}
        setIsAddJobOpen={setIsAddJobOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        togglePOISelectionForFleet={togglePOISelectionForFleet}
        isTracking={isTracking}
        toggleTracking={toggleTracking}
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
          onZonesUpdate={setActiveZones}
          isInteracting={!!interactionMode || isCalculatingRoute}
          onVehicleTypeChange={updateVehicleType}
          onVehicleSelect={setSelectedVehicleId}
        />

        <RouteErrorAlert
          errors={routeErrors}
          notices={routeNotices}
          onClear={() => {
            setRouteErrors([]);
            setRouteNotices([]);
          }}
        />
      </div>
    </div>
  );
}
