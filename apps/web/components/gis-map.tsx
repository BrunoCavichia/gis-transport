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
  Driver,
  VehicleMetrics,
} from "@gis/shared";
import { InteractionMode as LocalInteractionMode } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { generateVehicleAlerts } from "@/lib/utils";
import type { Alert } from "@/lib/utils";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { useRouting } from "@/hooks/use-routing";
import { useLiveTracking } from "@/hooks/use-live-tracking";
import { useAlertLogs } from "@/hooks/use-alert-logs";
import { RouteErrorAlert } from "@/components/route-error-alert";
import { MAP_CENTER } from "@/lib/config";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";
import { useDrivers } from "@/hooks/use-drivers";
import { DriverDetailsSheet } from "@/components/driver-details-sheet";
import { VehicleDetailSheet as VehicleDetailSheetOld } from "@/components/vehicle-detail-sheet";
import { VehicleDetailSheet } from "@/components/vehicle-details-panel";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

const DEFAULT_CENTER: [number, number] = MAP_CENTER;
export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: false,
    evStations: false,
    cityZones: true,
    route: true,
  });

  const [, setWeather] = useState<WeatherData | null>(null);
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);

  // Log when gas stations update
  useEffect(() => {
    console.log(
      "[GISMap] dynamicGasStations updated:",
      dynamicGasStations.length,
    );
  }, [dynamicGasStations]);
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
  const [selectedDriver, _setSelectedDriver] = useState<Driver | null>(null);
  const [isDriverDetailsOpen, setIsDriverDetailsOpen] = useState(false);
  const [isVehicleDetailsOpen, setIsVehicleDetailsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Efecto para cerrar sidebar cuando se abre el panel de detalles
  useEffect(() => {
    if (isVehicleDetailsOpen) {
      setIsSidebarExpanded(false);
    }
  }, [isVehicleDetailsOpen]);

  const { addAlertLog } = useAlertLogs();

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
    updateVehicleLabel,
    updateVehicleLicensePlate,
    assignDriverToVehicle,
  } = useFleet();

  const {
    drivers,
    isLoading: isLoadingDrivers,
    updateDriver,
    fetchDrivers,
    addDriver,
    optimisticUpdateDriver,
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
    async (vehicleId: string | number, newDriver: Driver | null) => {
      try {
        const vehicleExists = fleetVehicles.some(
          (v) => String(v.id) === String(vehicleId),
        );
        if (!vehicleExists) {
          await fetchDrivers(); // Refresh to get latest state
          return;
        }

        // VALIDATION: If assigning a new driver, verify they are marked as available
        // The database persists the driver state; we only check the availability flag
        if (newDriver) {
          if (!newDriver.isAvailable) {
            console.error("Cannot assign driver: driver is not available", {
              driverId: newDriver.id,
              driverName: newDriver.name,
              isAvailable: newDriver.isAvailable,
              currentVehicleId: newDriver.currentVehicleId,
            });
            await fetchDrivers(); // Refresh to get latest state
            return;
          }
        }

        // Optimistic update: Update frontend fleet state immediately
        assignDriverToVehicle(vehicleId, newDriver);

        // 1. First, unassign the old driver if one exists
        const oldDriver = drivers.find(
          (d) => d.currentVehicleId === String(vehicleId),
        );
        if (oldDriver) {
          optimisticUpdateDriver(oldDriver.id, {
            isAvailable: true,
            currentVehicleId: undefined,
          });

          await updateDriver(oldDriver.id, {
            isAvailable: true,
            currentVehicleId: undefined,
          });
        }

        // 2. Then assign the new driver if provided
        if (newDriver) {
          optimisticUpdateDriver(newDriver.id, {
            isAvailable: false,
            currentVehicleId: String(vehicleId),
          });

          await updateDriver(newDriver.id, {
            isAvailable: false,
            currentVehicleId: String(vehicleId),
          });
        }

        // Final sync with server to ensure data consistency
        await fetchDrivers();
      } catch (error) {
        console.error("Error assigning driver:", error);
        // Ideally we should revert the optimistic update here
      }
    },
    [
      assignDriverToVehicle,
      updateDriver,
      drivers,
      optimisticUpdateDriver,
      fetchDrivers,
      fleetVehicles,
    ],
  );

  // Reconciliation: Auto-release drivers assigned to non-existent vehicles
  // Using useRef to track previous driver/vehicle IDs to avoid unnecessary reconciliation
  const prevOhpanedCheckRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run if data is loaded
    if (isLoadingVehicles || isLoadingDrivers || !drivers.length) return;

    // Create set of valid vehicle IDs for O(1) lookup
    const validVehicleIds = new Set(fleetVehicles.map((v) => String(v.id)));

    const orphanedDrivers = drivers.filter(
      (d) =>
        !d.isAvailable && // Currently marked as busy
        d.currentVehicleId && // Has a vehicle assignment
        !validVehicleIds.has(String(d.currentVehicleId)), // But vehicle doesn't exist in current fleet
    );

    // Get IDs of current orphaned drivers
    const currentOrphanedIds = new Set(orphanedDrivers.map((d) => d.id));

    // Only process if there are NEW orphaned drivers (not in previous check)
    const newOrphanedDrivers = orphanedDrivers.filter(
      (d) => !prevOhpanedCheckRef.current.has(d.id),
    );

    if (newOrphanedDrivers.length > 0) {
      newOrphanedDrivers.forEach((driver) => {
        // 1. Optimistic local update
        optimisticUpdateDriver(driver.id, {
          isAvailable: true,

          currentVehicleId: undefined,
        });

        // 2. Persistent server update
        updateDriver(driver.id, {
          isAvailable: true,
          currentVehicleId: undefined,
        }).catch((err) =>
          console.error("Failed to reconcile driver:", driver.id, err),
        );
      });
    }

    // Update the ref for next check
    prevOhpanedCheckRef.current = currentOrphanedIds;
  }, [
    fleetVehicles,
    drivers,
    isLoadingVehicles,
    isLoadingDrivers,
    optimisticUpdateDriver,
    updateDriver,
  ]);
  const interactionModeRef = useRef(interactionMode);
  const selectedVehicleRef = useRef(selectedVehicle);
  const selectedVehicleIdRef = useRef(selectedVehicleId);
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
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);
  useEffect(() => {
    addVehicleAtRef.current = addVehicleAt;
  }, [addVehicleAt]);
  useEffect(() => {
    addJobAtRef.current = addJobAt;
  }, [addJobAt]);

  const { customPOIs, addCustomPOI, removeCustomPOI, clearAllCustomPOIs } =
    useCustomPOI();

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
    (vehicleId: string | number, metrics: VehicleMetrics) =>
      updateVehicleMetrics(String(vehicleId), metrics),
    [updateVehicleMetrics],
  );

  const { isTracking, toggleTracking, setIsTracking } = useLiveTracking({
    routeData,
    selectedVehicleId,
    updateVehiclePosition: handleUpdateVehiclePosition,
    updateVehicleMetrics: handleUpdateVehicleMetrics,
    fleetVehicles, // Added
  });

  // Generate alerts for all vehicles based on their metrics
  const vehicleAlerts = useMemo(() => {
    const alerts: Record<string | number, Alert[]> = {};
    fleetVehicles.forEach((vehicle) => {
      // Find weather route for this vehicle
      const weatherRoute = routeData?.weatherRoutes?.find(
        (wr) => String(wr.vehicle) === String(vehicle.id),
      );

      alerts[vehicle.id] = generateVehicleAlerts(
        vehicle.id,
        vehicle.metrics || null,
        vehicle.metrics?.maxSpeed,
        weatherRoute,
      );
    });
    return alerts;
  }, [fleetVehicles, routeData?.weatherRoutes]);

  // Get selected vehicle object
  const selectedVehicleObject = useMemo(() => {
    if (!selectedVehicleId || !fleetVehicles) return null;
    return fleetVehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null;
  }, [selectedVehicleId, fleetVehicles]);

  // Save new alerts to logs
  useEffect(() => {
    Object.values(vehicleAlerts).forEach((alerts) => {
      alerts.forEach((alert) => {
        addAlertLog(alert);
      });
    });
  }, [vehicleAlerts, addAlertLog]);

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
        doAddJob(coords); // No vehicle assignment for regular jobs
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
      addJobAt(coords, label); // No vehicle assignment
    },
    [addJobAt],
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
      setIsVehicleDetailsOpen(!!id);
    },
    [setSelectedVehicleId],
  );

  const handleRemoveVehicle = useCallback(
    (id: string | number) => {
      // Find vehicle to check if it has a driver
      const vehicle = fleetVehicles.find((v) => String(v.id) === String(id));
      const hasDriver = vehicle?.driver || drivers.some((d) => String(d.currentVehicleId) === String(id));
      
      // Show confirmation dialog
      const confirmMessage = hasDriver
        ? "Si eliminas el vehículo se desvinculará al conductor y estará disponible para un nuevo vehículo. ¿Continuar?"
        : "¿Estás seguro de que deseas eliminar este vehículo?";
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      removeVehicle(String(id));
      // Clean up drivers assigned to this vehicle
      drivers.forEach((driver) => {
        if (String(driver.currentVehicleId) === String(id)) {
          updateDriver(driver.id, {
            isAvailable: true,
            currentVehicleId: null as any,
          }).catch((err) =>
            console.error("Failed to clean up driver assignment:", err),
          );
        }
      });
    },
    [removeVehicle, drivers, updateDriver, fleetVehicles],
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
      addJobAt(coords, label); // No vehicle assignment
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
        vehicleAlerts={vehicleAlerts}
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
        drivers={drivers}
        isLoadingDrivers={isLoadingDrivers}
        fetchDrivers={fetchDrivers}
        addDriver={addDriver}
        onAssignDriver={handleAssignDriver}
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
        gasStations={dynamicGasStations}
        isGasStationLayerVisible={layers.gasStations}
        onToggleGasStationLayer={() => toggleLayer("gasStations")}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
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
          vehicleAlerts={vehicleAlerts}
          onMapClick={handleMapClick}
          pickedPOICoords={pickedPOICoords}
          pickedJobCoords={pickedJobCoords}
          onZonesUpdate={setActiveZones}
          isInteracting={!!interactionMode || isCalculatingRoute}
          onVehicleTypeChange={updateVehicleType}
          onVehicleLabelUpdate={updateVehicleLabel}
          onVehicleSelect={handleSetSelectedVehicleId}
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

        <VehicleDetailSheet
          vehicle={selectedVehicleObject}
          isOpen={isVehicleDetailsOpen}
          onClose={() => {
            setIsVehicleDetailsOpen(false);
            setSelectedVehicleId(null);
          }}
          drivers={drivers}
          onAssignDriver={handleAssignDriver}
          onUpdateLabel={updateVehicleLabel}
          onUpdateLicensePlate={updateVehicleLicensePlate}
          onChangeEnvironmentalTag={(vehicleId, tagId) => {
            // Map tag ID to VehicleType from VEHICLE_TYPES
            // "none" maps to "noLabel" in VEHICLE_TYPES
            const mappedId = tagId === "none" ? "noLabel" : tagId;
            const vehicleType = VEHICLE_TYPES.find((vt) => vt.id === mappedId) || VEHICLE_TYPES[4];
            updateVehicleType(vehicleId, vehicleType);
          }}
        />
      </div>
    </div>
  );
}
