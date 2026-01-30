"use client";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  WeatherData,
  Zone,
} from "@gis/shared";
import { InteractionMode as LocalInteractionMode } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { useRouting } from "@/hooks/use-routing";
import { useLiveTracking } from "@/hooks/use-live-tracking";
import { RouteErrorAlert } from "@/components/route-error-alert";
import { MAP_CENTER } from "@/lib/config";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";
import { useDrivers } from "@/hooks/use-drivers";
import { DriverDetailsSheet } from "@/components/driver-details-sheet";

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
  const [interactionMode, setInteractionMode] =
    useState<LocalInteractionMode>(null);

  const [pickedPOICoords, setPickedPOICoords] = useState<
    [number, number] | null
  >(null);
  const [isAddCustomPOIOpen, setIsAddCustomPOIOpen] = useState(false);
  const [pickedJobCoords, setPickedJobCoords] = useState<
    [number, number] | null
  >(null);
  const [pickedStopCoords, setPickedStopCoords] = useState<
    [number, number] | null
  >(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [activeZones, setActiveZones] = useState<Zone[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isDriverDetailsOpen, setIsDriverDetailsOpen] = useState(false);

  const {
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    setSelectedVehicleId,
    clearFleet,
    addVehicleAt,
    addJobAt,
    addStopToVehicle,
    removeVehicle,
    removeJob,
    isLoadingVehicles,
    fetchVehicles,
    updateVehiclePosition,
    updateVehicleMetrics,
    updateVehicleType,
    assignDriverToVehicle,
  } = useFleet();

  const {
    drivers,
    isLoading: isLoadingDrivers,
    updateDriver,
    fetchDrivers,
    addDriver,
  } = useDrivers();

  // Fetch drivers SOLO UNA VEZ al mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDrivers();
    }
  }, []); // VACÍO - solo corre UNA VEZ

  const handleAssignDriver = useCallback(
    async (vehicleId: string | number, newDriver: any) => {
      try {
        // 1. First, unassign the old driver if one exists
        const oldDriver = drivers.find(
          (d) => d.currentVehicleId === String(vehicleId),
        );
        if (oldDriver) {
          await updateDriver(oldDriver.id, {
            isAvailable: true,
            currentVehicleId: null,
          });
        }

        // 2. Then assign the new driver if provided
        if (newDriver) {
          await updateDriver(newDriver.id, {
            isAvailable: false,
            currentVehicleId: String(vehicleId),
          });
        }

        // 3. Update frontend fleet state
        assignDriverToVehicle(vehicleId, newDriver);
      } catch (error) {
        console.error("Error assigning driver:", error);
      }
    },
    [assignDriverToVehicle, updateDriver, drivers],
  );

  // Refs for stable map click handler
  const interactionModeRef = useRef(interactionMode);
  const selectedVehicleRef = useRef(selectedVehicle);
  const addVehicleAtRef = useRef(addVehicleAt);
  const addJobAtRef = useRef(addJobAt);

  // Sync refs for stable map click handler
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);
  useEffect(() => {
    selectedVehicleRef.current = selectedVehicle;
  }, [selectedVehicle]);
  useEffect(() => {
    addVehicleAtRef.current = addVehicleAt;
  }, [addVehicleAt]);
  useEffect(() => {
    addJobAtRef.current = addJobAt;
  }, [addJobAt]);

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

  const handleUpdateVehiclePosition = useCallback(
    (vehicleId: string | number, newCoords: [number, number]) =>
      updateVehiclePosition(String(vehicleId), newCoords),
    [updateVehiclePosition],
  );

  const handleUpdateVehicleMetrics = useCallback(
    (vehicleId: string | number, metrics: any) =>
      updateVehicleMetrics(String(vehicleId), metrics),
    [updateVehicleMetrics],
  );

  const { isTracking, toggleTracking } = useLiveTracking({
    routeData,
    selectedVehicleId,
    updateVehiclePosition: handleUpdateVehiclePosition,
    updateVehicleMetrics: handleUpdateVehicleMetrics,
  });
  const clearAll = useCallback(async () => {
    // Clear driver assignments in the database
    try {
      await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-assignments" }),
      });
    } catch (err) {
      console.error("Failed to clear driver assignments:", err);
    }

    // Clear fleet and routes from local state
    clearFleet();
    clearRoute();
    setSelectedVehicleId(null);
    setInteractionMode(null);
    setPickedPOICoords(null);
    setPickedJobCoords(null);
    setSelectedVehicle(VEHICLE_TYPES[0]);
  }, [clearFleet, clearRoute, setSelectedVehicleId]);

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

  const handleMapClick = useCallback((coords: [number, number]) => {
    if (
      !coords ||
      coords.length !== 2 ||
      coords.some((c) => typeof c !== "number")
    ) {
      console.error("Invalid coordinates clicked:", coords);
      return;
    }

    const mode = interactionModeRef.current;
    const vehicle = selectedVehicleRef.current;
    const doAddVehicle = addVehicleAtRef.current;
    const doAddJob = addJobAtRef.current;

    switch (mode) {
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
        doAddVehicle(coords, vehicle);
        setInteractionMode(null);
        break;
      case "add-job":
        doAddJob(coords);
        setInteractionMode(null);
        break;
      case "pick-stop":
        setPickedStopCoords(coords);
        setInteractionMode(null);
        setIsAddStopOpen(true);
        break;
      default:
        break;
    }
  }, []);

  const handleAddVehicle = useCallback(
    () => setInteractionMode("add-vehicle"),
    [],
  );

  const handleAddJob = useCallback(() => {
    setPickedJobCoords(null);
    setIsAddJobOpen(true);
  }, []);

  const handleAddJobDirectly = useCallback(
    (coords: [number, number], label: string) => {
      setPickedJobCoords(null);
      addJobAt(coords, label);
    },
    [addJobAt],
  );

  const handleAddCustomPOI = useCallback(
    (name: string, coords: [number, number], desc?: string) => {
      setPickedPOICoords(null);
      return addCustomPOI(name, coords, desc);
    },
    [addCustomPOI],
  );

  const handleStartPicking = useCallback(() => {
    setInteractionMode("pick-poi");
    setIsAddCustomPOIOpen(false);
  }, []);

  const handleStartPickingJob = useCallback(() => {
    setInteractionMode("pick-job");
    setIsAddJobOpen(false);
  }, []);

  const handleStartPickingStop = useCallback(() => {
    setInteractionMode("pick-stop");
    setIsAddStopOpen(false);
  }, []);

  const handleSetSelectedVehicleId = useCallback(
    (id: string | number | null) => {
      setSelectedVehicleId(id ? String(id) : null);
    },
    [setSelectedVehicleId],
  );

  const handleRemoveVehicle = useCallback(
    (id: string | number) => {
      removeVehicle(String(id));
    },
    [removeVehicle],
  );

  const handleRemoveJob = useCallback(
    (id: string | number) => {
      removeJob(id);
    },
    [removeJob],
  );

  const handleCancelAddMode = useCallback(() => {
    setInteractionMode(null);
  }, []);

  const handleAddJobSubmit = useCallback(
    (coords: [number, number], label: string) => {
      addJobAt(coords, label);
      setIsAddJobOpen(false);
      setPickedJobCoords(null);
    },
    [addJobAt],
  );

  const handleAddCustomPOISubmit = useCallback(
    (name: string, coords: [number, number], desc?: string) => {
      addCustomPOI(name, coords, desc);
      setIsAddCustomPOIOpen(false);
      setPickedPOICoords(null);
    },
    [addCustomPOI],
  );

  const handleOpenAddJobChange = useCallback(
    (open: boolean) => {
      setIsAddJobOpen(open);
      if (!open) {
        setPickedJobCoords(null);
        if (interactionMode === "pick-job") setInteractionMode(null);
      }
    },
    [interactionMode],
  );

  const handleOpenAddCustomPOIChange = useCallback(
    (open: boolean) => {
      setIsAddCustomPOIOpen(open);
      if (!open) {
        setPickedPOICoords(null);
        if (interactionMode === "pick-poi") setInteractionMode(null);
      }
    },
    [interactionMode],
  );

  const handleOpenAddStopChange = useCallback(
    (open: boolean) => {
      setIsAddStopOpen(open);
      if (!open) {
        setPickedStopCoords(null);
        if (interactionMode === "pick-stop") setInteractionMode(null);
      }
    },
    [interactionMode],
  );

  const handleAddStopSubmit = useCallback(
    (coords: [number, number], label: string) => {
      if (selectedVehicleId) {
        addStopToVehicle(selectedVehicleId, coords, label);
        // Recalculate route after adding stop
        // If tracking is active, the useEffect in use-live-tracking will auto-update with new routes
        // The setTimeout allows state updates to complete before routing
        setTimeout(() => startRouting(), 500);
      }
      setIsAddStopOpen(false);
      setPickedStopCoords(null);
    },
    [addStopToVehicle, selectedVehicleId, startRouting],
  );

  // Memoize computed addMode to prevent object recreation
  const computedAddMode =
    interactionMode === "add-vehicle"
      ? "vehicle"
      : interactionMode === "add-job"
        ? "job"
        : null;

  // Memoize customPOIs list to send to MapContainer (only non-empty if showCustomPOIs)
  const displayedCustomPOIs = useMemo(
    () => (showCustomPOIs ? customPOIs : []),
    [showCustomPOIs, customPOIs],
  );

  // Memoize hasRoute to avoid object recreation
  const hasRoute = useMemo(() => !!routeData, [routeData]);

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
        setSelectedVehicleId={handleSetSelectedVehicleId}
        addVehicle={handleAddVehicle}
        addJob={handleAddJob}
        addStopToVehicle={addStopToVehicle}
        addJobDirectly={handleAddJobDirectly}
        removeVehicle={handleRemoveVehicle}
        removeJob={handleRemoveJob}
        addMode={computedAddMode}
        cancelAddMode={handleCancelAddMode}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
        customPOIs={customPOIs}
        removeCustomPOI={removeCustomPOI}
        clearAllCustomPOIs={clearAllCustomPOIs}
        showCustomPOIs={showCustomPOIs}
        setShowCustomPOIs={setShowCustomPOIs}
        isAddCustomPOIOpen={isAddCustomPOIOpen}
        setIsAddCustomPOIOpen={setIsAddCustomPOIOpen}
        isAddJobOpen={isAddJobOpen}
        setIsAddJobOpen={setIsAddJobOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        isTracking={isTracking}
        toggleTracking={toggleTracking}
        hasRoute={hasRoute}
        isAddStopOpen={isAddStopOpen}
        setIsAddStopOpen={handleOpenAddStopChange}
        onStartPickingStop={handleStartPickingStop}
        pickedStopCoords={pickedStopCoords}
        onAddStopSubmit={handleAddStopSubmit}
        drivers={drivers}
        onAssignDriver={handleAssignDriver}
        isLoadingDrivers={isLoadingDrivers}
        fetchDriversFromParent={fetchDrivers}
        addDriverFromParent={addDriver}
        onDriverSelect={(driver) => {
          setSelectedDriver(driver);
          setIsDriverDetailsOpen(true);
        }}
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
          customPOIs={displayedCustomPOIs}
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

        <AddJobDialog
          isOpen={isAddJobOpen}
          onOpenChange={handleOpenAddJobChange}
          onSubmit={handleAddJobSubmit}
          mapCenter={mapCenter}
          onStartPicking={handleStartPickingJob}
          pickedCoords={pickedJobCoords}
        />
        <AddCustomPOIDialog
          isOpen={isAddCustomPOIOpen}
          onOpenChange={handleOpenAddCustomPOIChange}
          onSubmit={handleAddCustomPOISubmit}
          mapCenter={mapCenter}
          onStartPicking={handleStartPicking}
          pickedCoords={pickedPOICoords}
        />

        <RouteErrorAlert
          errors={routeErrors}
          notices={routeNotices}
          onClear={() => {
            setRouteErrors([]);
            setRouteNotices([]);
          }}
        />

        <DriverDetailsSheet
          driver={selectedDriver}
          isOpen={isDriverDetailsOpen}
          onOpenChange={setIsDriverDetailsOpen}
          onClose={() => setIsDriverDetailsOpen(false)}
        />
      </div>
    </div>
  );
}
