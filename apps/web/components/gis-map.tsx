"use client";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Sidebar, type SidebarTab } from "@/components/sidebar";
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
import { generateVehicleAlerts, cn } from "@/lib/utils";
import type { Alert } from "@/lib/utils";
import { Truck } from "lucide-react";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { useRouting } from "@/hooks/use-routing";
import { useLiveTracking } from "@/hooks/use-live-tracking";
import { useAlertLogs } from "@/hooks/use-alert-logs";
import { RouteErrorAlert } from "@/components/route-error-alert";
import { MAP_CENTER } from "@/lib/config";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialogV2 } from "@/components/add-custom-poi-dialog-v2";
import { useDrivers } from "@/hooks/use-drivers";
import { useDriverManagement } from "@/hooks/use-driver-management";
import { useGISState } from "@/hooks/use-gis-state";
import { DriverDetailsSheet } from "@/components/driver-details-sheet";
import { VehicleDetailSheet } from "@/components/vehicle-detail-sheet";
import { VehicleDetailsPanel } from "@/components/vehicle-details-panel";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

const DEFAULT_CENTER: [number, number] = MAP_CENTER;
export function GISMap() {
  const { state, dispatch } = useGISState();

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

  const { handleAssignDriver } = useDriverManagement({
    fleetVehicles,
    drivers,
    isLoadingVehicles,
    isLoadingDrivers,
    assignDriverToVehicle,
    updateDriver,
    optimisticUpdateDriver,
    fetchDrivers,
  });

  const setLayers = useCallback(
    (
      updater: LayerVisibility | ((prev: LayerVisibility) => LayerVisibility),
    ) => {
      if (typeof updater === "function") {
        dispatch({ type: "SET_LAYERS", payload: updater(state.layers) });
      } else {
        dispatch({ type: "SET_LAYERS", payload: updater });
      }
    },
    [dispatch, state.layers],
  );

  // Popup data for vehicle hover
  const [vehiclePopupData, setVehiclePopupData] = useState<{
    vehicleId: string;
    vehicleName: string;
    licensePlate: string;
    status: string;
    speed: number;
    vehicleType: string;
    driverName: string | null;
    pixelPosition: { x: number; y: number };
  } | null>(null);

  // Zone drawing mode state
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [zoneIsClosed, setZoneIsClosed] = useState(false);
  const [editingZoneData, setEditingZoneData] = useState<{
    id: string;
    name: string;
    description?: string;
    zoneType?: string;
    requiredTags?: string[];
  } | null>(null);

  // Ref for hover timeout to prevent flickering
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for stable map click handler
  const interactionModeRef = useRef(state.interactionMode);
  const isDrawingZoneRef = useRef(isDrawingZone);
  const selectedVehicleRef = useRef(state.selectedVehicle);
  const selectedVehicleIdRef = useRef(selectedVehicleId);
  const addVehicleAtRef = useRef(addVehicleAt);
  const addJobAtRef = useRef(addJobAt);

  // Handle vehicle hover - show popup
  const handleVehicleHover = useCallback(
    (vehicleId: string, pixelPosition: { x: number; y: number }) => {
      // Don't show popup if panel is already open
      if (state.isVehicleDetailsOpen) return;

      // Clear any pending hide timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      const vehicle = fleetVehicles.find((v) => String(v.id) === vehicleId);
      if (vehicle) {
        const vehicleName =
          vehicle.label || vehicle.type.label || `Vehículo ${vehicle.id}`;
        const metrics = vehicle.metrics;
        setVehiclePopupData({
          vehicleId,
          vehicleName,
          licensePlate: vehicle.licensePlate || "",
          status: metrics?.movementState || "stopped",
          speed: metrics?.speed || 0,
          vehicleType:
            vehicle.type.id.includes("electric") || vehicle.type.id === "zero"
              ? "EV"
              : "ICE",
          driverName: vehicle.driver?.name || null,
          pixelPosition,
        });
      }
    },
    [fleetVehicles, state.isVehicleDetailsOpen],
  );

  // Handle vehicle hover out - hide popup with delay
  const handleVehicleHoverOut = useCallback(() => {
    // Use a small delay to allow mouse to move to popup
    hoverTimeoutRef.current = setTimeout(() => {
      setVehiclePopupData(null);
    }, 150);
  }, []);

  // Handle vehicle click - select and open panel
  const handleVehicleClick = useCallback(
    (vehicleId: string) => {
      setVehiclePopupData(null); // Close popup
      setSelectedVehicleId(vehicleId);
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: true });
    },
    [setSelectedVehicleId],
  );

  useEffect(() => {
    interactionModeRef.current = state.interactionMode;
  }, [state.interactionMode]);
  useEffect(() => {
    isDrawingZoneRef.current = isDrawingZone;
  }, [isDrawingZone]);
  useEffect(() => {
    selectedVehicleRef.current = state.selectedVehicle;
  }, [state.selectedVehicle]);
  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);
  useEffect(() => {
    addVehicleAtRef.current = addVehicleAt;
  }, [addVehicleAt]);
  useEffect(() => {
    addJobAtRef.current = addJobAt;
  }, [addJobAt]);

  const {
    customPOIs,
    addCustomPOI,
    addCustomZone,
    removeCustomPOI,
    clearAllCustomPOIs,
    updateCustomPOI,
  } = useCustomPOI();

  // Combine API zones with custom zones for routing
  const combinedActiveZones = useMemo(() => {
    const customZones = customPOIs
      .filter((poi) => poi.entityType === "zone" && poi.coordinates)
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        coordinates: zone.coordinates,
        type: zone.zoneType || "LEZ",
        description: zone.description,
        requiredTags: zone.requiredTags,
      }));
    return [...state.activeZones, ...customZones];
  }, [state.activeZones, customPOIs]);

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
    activeZones: combinedActiveZones,
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
    return (
      fleetVehicles.find((v) => String(v.id) === String(selectedVehicleId)) ||
      null
    );
  }, [selectedVehicleId, fleetVehicles]);

  // Save new alerts to logs
  useEffect(() => {
    Object.values(vehicleAlerts).forEach((alerts) => {
      alerts.forEach((alert) => {
        addAlertLog(alert);
      });
    });
  }, [vehicleAlerts, addAlertLog]);

  // Persist speeding events to DB for driver profiles
  const loggedSpeedingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isTracking) return;
    Object.entries(vehicleAlerts).forEach(([vehicleId, alerts]) => {
      const speedingAlert = alerts.find((a) => a.type === "speeding");
      if (!speedingAlert) return;

      const vehicle = fleetVehicles.find(
        (v) => String(v.id) === String(vehicleId),
      );
      if (!vehicle?.driver?.id) return;

      // Debounce: don't log same driver+vehicle combo within 60 seconds
      const dedupeKey = `${vehicle.driver.id}-${vehicleId}`;
      if (loggedSpeedingRef.current.has(dedupeKey)) return;
      loggedSpeedingRef.current.add(dedupeKey);
      setTimeout(() => loggedSpeedingRef.current.delete(dedupeKey), 60_000);

      const data = speedingAlert.data as {
        currentSpeed: number;
        speedLimit: number;
      };
      const [lat, lon] = vehicle.position;

      fetch("/api/drivers/speeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: vehicle.driver.id,
          speed: data.currentSpeed,
          limit: data.speedLimit,
          latitude: lat,
          longitude: lon,
        }),
      }).catch((err) => console.error("Failed to log speeding event:", err));
    });
  }, [vehicleAlerts, fleetVehicles, isTracking]);

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
    dispatch({ type: "SET_INTERACTION_MODE", payload: null });
    dispatch({ type: "SET_PICKED_POI_COORDS", payload: null });
    dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
    dispatch({ type: "SET_SELECTED_VEHICLE", payload: VEHICLE_TYPES[0] });
  }, [clearFleet, clearRoute, setSelectedVehicleId]);

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) => {
      const newLayers = { ...state.layers, [layer]: !state.layers[layer] };
      dispatch({ type: "SET_LAYERS", payload: newLayers });
      if (layer === "evStations" && !newLayers.evStations)
        dispatch({ type: "SET_DYNAMIC_EV_STATIONS", payload: [] });
      if (layer === "gasStations" && !newLayers.gasStations)
        dispatch({ type: "SET_DYNAMIC_GAS_STATIONS", payload: [] });
    },
    [state.layers],
  );

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
        dispatch({ type: "SET_PICKED_POI_COORDS", payload: coords });
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: true });
        break;
      case "pick-zone":
        // Add point to zone and keep picking mode active
        dispatch({ type: "ADD_ZONE_POINT", payload: coords });
        // Don't reopen dialog when actively drawing - let toolbar handle UI
        if (!isDrawingZoneRef.current) {
          dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: true });
        }
        // Don't clear interaction mode - keep picking points
        break;
      case "pick-job":
        dispatch({ type: "SET_PICKED_JOB_COORDS", payload: coords });
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: true });
        break;
      case "add-vehicle":
        doAddVehicle(coords, vehicle);
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        break;
      case "add-job":
        doAddJob(coords); // No vehicle assignment for regular jobs
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        break;
      case "pick-stop":
        dispatch({ type: "SET_PICKED_STOP_COORDS", payload: coords });
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: true });
        break;
      default:
        break;
    }
  }, []);

  const handleAddVehicle = useCallback(
    () => dispatch({ type: "SET_INTERACTION_MODE", payload: "add-vehicle" }),
    [],
  );

  const handleAddJob = useCallback(() => {
    dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
    dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: true });
  }, []);

  const handleAddJobDirectly = useCallback(
    (coords: [number, number], label: string) => {
      dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
      addJobAt(coords, label); // No vehicle assignment
    },
    [addJobAt],
  );

  const handleStartPicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-poi" });
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
  }, []);

  const handleStartZonePicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });
    dispatch({ type: "CLEAR_ZONE_POINTS" });
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false }); // Close dialog to allow map clicks
    setIsDrawingZone(true); // Enter dedicated drawing mode
    setZoneIsClosed(false); // Reset closed state when starting a new zone
  }, []);

  const handleContinueZonePicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });
    // Don't clear points - just close dialog to continue picking
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
    setIsDrawingZone(true); // Enter drawing mode
  }, []);

  const handleCloseZoneShape = useCallback(() => {
    setZoneIsClosed(true);
  }, []);

  const handleStartPickingJob = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-job" });
    dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: false });
  }, []);

  const handleStartPickingStop = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-stop" });
    dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: false });
  }, []);

  const handleSelectVehicleIdOnly = useCallback(
    (id: string | number | null) => {
      setSelectedVehicleId(id ? String(id) : null);
      // Close the route management panel when selecting from sidebar
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      // Open properties panel when selecting from sidebar
      dispatch({
        type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL",
        payload: id !== null,
      });
    },
    [setSelectedVehicleId],
  );

  // Highlight vehicle without opening properties panel (for dashboard)
  const handleHighlightVehicleOnly = useCallback(
    (id: string | number | null) => {
      setSelectedVehicleId(id ? String(id) : null);
      // Close panels but don't open properties panel
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: false });
    },
    [setSelectedVehicleId],
  );

  // Open panel from popup
  const handleOpenVehiclePanel = useCallback(() => {
    if (vehiclePopupData) {
      setSelectedVehicleId(vehiclePopupData.vehicleId);
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      // Open properties panel when clicking "Ver detalles" in popup
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: true });
      setVehiclePopupData(null);
    }
  }, [vehiclePopupData, setSelectedVehicleId]);

  // Handle environmental tag change from vehicle details panel
  const handleChangeEnvironmentalTag = useCallback(
    (vehicleId: string | number, tagId: string) => {
      const vehicleTypeId = tagId === "none" ? "noLabel" : tagId;
      const vehicleType = VEHICLE_TYPES.find((t) => t.id === vehicleTypeId);
      if (vehicleType) {
        updateVehicleType(vehicleId, vehicleType);
      }
    },
    [updateVehicleType],
  );

  // Cross-navigation state: vehicle panel → drivers tab, drivers tab → vehicle panel
  const [sidebarNavigateTab, setSidebarNavigateTab] =
    useState<SidebarTab | null>(null);
  const [sidebarNavigateDriverId, setSidebarNavigateDriverId] = useState<
    string | null
  >(null);

  // From vehicle panel: "Ver ficha conductor" → open drivers tab and select the driver
  const handleViewDriverProfile = useCallback(
    (driverId: string) => {
      setSelectedVehicleId(null); // close vehicle panel
      setSidebarNavigateTab("drivers");
      setSidebarNavigateDriverId(driverId);
    },
    [setSelectedVehicleId],
  );

  // From drivers tab: "Monitorear vehiculo en dashboard" → open vehicle panel
  const handleVehicleSelectFromDrivers = useCallback(
    (vehicleId: string) => {
      setSelectedVehicleId(vehicleId);
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
    },
    [setSelectedVehicleId, dispatch],
  );

  // Reset navigation request after sidebar consumes it
  const handleNavigateConsumed = useCallback(() => {
    setSidebarNavigateTab(null);
    setSidebarNavigateDriverId(null);
  }, []);

  const handleZonesUpdate = useCallback(
    (zones: Zone[]) => dispatch({ type: "SET_ACTIVE_ZONES", payload: zones }),
    [dispatch],
  );

  const handleEditZone = useCallback(
    (zoneId: string) => {
      const zoneToEdit = customPOIs.find(
        (poi) => poi.id === zoneId && poi.entityType === "zone",
      );
      if (!zoneToEdit || !zoneToEdit.coordinates) return;

      // Load zone points into drawing state
      dispatch({ type: "CLEAR_ZONE_POINTS" });

      // Convert coordinates to [lat, lon] format if needed
      const coords = zoneToEdit.coordinates;
      let points: [number, number][] = [];

      if (Array.isArray(coords) && coords.length > 0) {
        const firstCoord = coords[0];
        if (Array.isArray(firstCoord) && Array.isArray(firstCoord[0])) {
          // Could be 3D or 4D, need to check depth of firstCoord[0]
          const secondLevelCoord = firstCoord[0];
          if (
            Array.isArray(secondLevelCoord) &&
            Array.isArray(secondLevelCoord[0])
          ) {
            // 4D coords format (MultiPolygon): [[[[lat, lon], ...], ...]]]
            // coords[0] = 3D, coords[0][0] = 2D (the actual points array)
            points = coords[0][0] as [number, number][];
          } else {
            // 3D coords format: [[[lat, lon], ...], ...]
            points = coords[0] as [number, number][];
          }
        } else if (Array.isArray(firstCoord)) {
          // 2D coords format: [[lat, lon], ...]
          points = coords as [number, number][];
        }
      }

      // Dispatch points to state
      points.forEach((point) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });

      // Set interaction mode to pick-zone so the preview is visible
      dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });

      // Save all zone data for editing
      setEditingZoneData({
        id: zoneToEdit.id,
        name: zoneToEdit.name,
        description: zoneToEdit.description,
        zoneType: zoneToEdit.zoneType,
        requiredTags: zoneToEdit.requiredTags,
      });

      // Enter editing mode
      setIsEditingZone(true);
      setIsDrawingZone(true);
      // Dialog will open after user finishes editing in handleConfirmZoneDrawing
    },
    [customPOIs, dispatch],
  );

  const handleSetMapCenter = useCallback(
    (center: [number, number]) =>
      dispatch({ type: "SET_MAP_CENTER", payload: center }),
    [dispatch],
  );

  const handleSetWeather = useCallback(
    (weather: WeatherData | null) =>
      dispatch({ type: "SET_WEATHER", payload: weather }),
    [dispatch],
  );

  const handleSetDynamicEVStations = useCallback(
    (stations: POI[]) =>
      dispatch({ type: "SET_DYNAMIC_EV_STATIONS", payload: stations }),
    [dispatch],
  );

  const handleSetDynamicGasStations = useCallback(
    (stations: POI[]) =>
      dispatch({ type: "SET_DYNAMIC_GAS_STATIONS", payload: stations }),
    [dispatch],
  );

  const handleSetSelectedVehicle = useCallback(
    (vehicle: VehicleType) =>
      dispatch({ type: "SET_SELECTED_VEHICLE", payload: vehicle }),
    [dispatch],
  );

  const handleSetFleetMode = useCallback(
    (mode: boolean) => dispatch({ type: "SET_FLEET_MODE", payload: mode }),
    [dispatch],
  );

  const handleSetShowCustomPOIs = useCallback(
    (show: boolean) =>
      dispatch({ type: "SET_SHOW_CUSTOM_POIS", payload: show }),
    [dispatch],
  );

  const handleSetIsAddCustomPOIOpen = useCallback(
    (open: boolean) =>
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: open }),
    [dispatch],
  );

  const handleSetIsAddJobOpen = useCallback(
    (open: boolean) => dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: open }),
    [dispatch],
  );

  const handleRemoveVehicle = useCallback(
    (id: string | number) => {
      // Find vehicle to check if it has a driver
      const vehicle = fleetVehicles.find((v) => String(v.id) === String(id));
      const hasDriver =
        vehicle?.driver ||
        drivers.some((d) => String(d.currentVehicleId) === String(id));

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
    dispatch({ type: "SET_INTERACTION_MODE", payload: null });
  }, []);

  const handleAddJobSubmit = useCallback(
    (coords: [number, number], label: string) => {
      addJobAt(coords, label); // No vehicle assignment
      dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: false });
      dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
    },
    [addJobAt],
  );

  const handleAddCustomPOISubmit = useCallback(
    (name: string, coords: [number, number], desc?: string) => {
      addCustomPOI(name, coords, desc);
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
      dispatch({ type: "SET_PICKED_POI_COORDS", payload: null });
    },
    [addCustomPOI],
  );

  const handleAddCustomZoneSubmit = useCallback(
    (
      name: string,
      coordinates: any,
      desc?: string,
      zoneType?: string,
      requiredTags?: string[],
    ) => {
      if (editingZoneData) {
        // Update existing zone
        updateCustomPOI(editingZoneData.id, {
          name,
          coordinates,
          description: desc,
          zoneType,
          requiredTags,
        });
      } else {
        // Create new zone
        addCustomZone(name, coordinates, desc, zoneType, requiredTags);
      }

      // Clean up state
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      dispatch({ type: "SET_INTERACTION_MODE", payload: null });
      setIsDrawingZone(false);
      setZoneIsClosed(false);
      setEditingZoneData(null);
    },
    [addCustomZone, updateCustomPOI, editingZoneData, dispatch],
  );

  const handleConfirmZoneDrawing = useCallback(() => {
    if (state.zonePoints.length >= 3) {
      setIsDrawingZone(false);
      // Reopen dialog for metadata entry with points preserved
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: true });
    }
  }, [state.zonePoints.length, dispatch]);

  const handleUndoZonePoint = useCallback(() => {
    if (state.zonePoints.length > 0) {
      const newPoints = state.zonePoints.slice(0, -1);
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
    }
  }, [state.zonePoints, dispatch]);

  const handleRemoveZonePoint = useCallback(
    (index: number) => {
      const newPoints = state.zonePoints.filter((_, i) => i !== index);
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
      // Exit editing mode if less than 3 points
      if (newPoints.length < 3) {
        setIsEditingZone(false);
      }
    },
    [state.zonePoints, dispatch],
  );

  const handleUpdateZonePoint = useCallback(
    (index: number, newCoords: [number, number]) => {
      const newPoints = [...state.zonePoints];
      newPoints[index] = newCoords;
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
    },
    [state.zonePoints, dispatch],
  );

  const handleCancelZoneDrawing = useCallback(() => {
    if (state.zonePoints.length > 0) {
      const confirmCancel = window.confirm(
        "¿Descartar los puntos dibujados y cancelar la zona?",
      );
      if (!confirmCancel) return;
    }
    setIsDrawingZone(false);
    setZoneIsClosed(false);
    setEditingZoneData(null);
    dispatch({ type: "CLEAR_ZONE_POINTS" });
    dispatch({ type: "SET_INTERACTION_MODE", payload: null });
  }, [state.zonePoints.length, dispatch]);

  const handleOpenAddJobChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: open });
      if (!open) {
        dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
        if (state.interactionMode === "pick-job")
          dispatch({ type: "SET_INTERACTION_MODE", payload: null });
      }
    },
    [state.interactionMode],
  );

  const handleOpenAddCustomPOIChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: open });
      if (!open) {
        // Only clear points and mode if not actively drawing
        if (!isDrawingZone) {
          dispatch({ type: "SET_PICKED_POI_COORDS", payload: null });
          dispatch({ type: "CLEAR_ZONE_POINTS" });
          setEditingZoneData(null);
          if (
            state.interactionMode === "pick-poi" ||
            state.interactionMode === "pick-zone"
          )
            dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        }
      }
    },
    [state.interactionMode, isDrawingZone, dispatch],
  );

  const handleOpenAddStopChange = useCallback((open: boolean) => {
    dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: open });
    if (!open) {
      dispatch({ type: "SET_PICKED_STOP_COORDS", payload: null });
      if (interactionModeRef.current === "pick-stop")
        dispatch({ type: "SET_INTERACTION_MODE", payload: null });
    }
  }, []);

  const handleAddStopSubmit = useCallback(
    (coords: [number, number], label: string) => {
      if (selectedVehicleId) {
        addStopToVehicle(selectedVehicleId, coords, label);
        // Recalculate route after adding stop
        // If tracking is active, the useEffect in use-live-tracking will auto-update with new routes
        // The setTimeout allows state updates to complete before routing
        setTimeout(() => startRouting(), 500);
      }
      dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: false });
      dispatch({ type: "SET_PICKED_STOP_COORDS", payload: null });
    },
    [addStopToVehicle, selectedVehicleId, startRouting],
  );

  // Memoize computed addMode to prevent object recreation
  const computedAddMode =
    state.interactionMode === "add-vehicle"
      ? "vehicle"
      : state.interactionMode === "add-job"
        ? "job"
        : null;

  // Memoize customPOIs list to send to MapContainer (only non-empty if showCustomPOIs)
  const displayedCustomPOIs = useMemo(
    () => (state.showCustomPOIs ? customPOIs : []),
    [state.showCustomPOIs, customPOIs],
  );

  // Memoize hasRoute to avoid object recreation
  const hasRoute = useMemo(() => !!routeData, [routeData]);

  // Keyboard shortcuts for zone drawing
  useEffect(() => {
    if (!isDrawingZone) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: Cancel drawing
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancelZoneDrawing();
      }
      // Ctrl+Z: Undo last point
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndoZonePoint();
      }
      // Enter: Confirm drawing (if >= 3 points)
      if (e.key === "Enter" && state.zonePoints.length >= 3) {
        e.preventDefault();
        handleConfirmZoneDrawing();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isDrawingZone,
    state.zonePoints.length,
    handleConfirmZoneDrawing,
    handleUndoZonePoint,
    handleCancelZoneDrawing,
  ]);

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        layers={state.layers}
        setMapCenter={handleSetMapCenter}
        toggleLayer={toggleLayer}
        selectedVehicle={state.selectedVehicle}
        setSelectedVehicle={handleSetSelectedVehicle}
        fleetMode={state.fleetMode}
        setFleetMode={handleSetFleetMode}
        clearFleet={clearAll}
        fleetVehicles={fleetVehicles}
        fleetJobs={fleetJobs}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={handleSelectVehicleIdOnly}
        highlightVehicleOnly={handleHighlightVehicleOnly}
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
        showCustomPOIs={state.showCustomPOIs}
        setShowCustomPOIs={handleSetShowCustomPOIs}
        onEditZone={handleEditZone}
        isAddCustomPOIOpen={state.isAddCustomPOIOpen}
        setIsAddCustomPOIOpen={handleSetIsAddCustomPOIOpen}
        isAddJobOpen={state.isAddJobOpen}
        drivers={drivers}
        isLoadingDrivers={isLoadingDrivers}
        fetchDrivers={fetchDrivers}
        addDriver={addDriver}
        onAssignDriver={handleAssignDriver}
        setIsAddJobOpen={handleSetIsAddJobOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        isTracking={isTracking}
        toggleTracking={toggleTracking}
        hasRoute={hasRoute}
        isAddStopOpen={state.isAddStopOpen}
        setIsAddStopOpen={handleOpenAddStopChange}
        onStartPickingStop={handleStartPickingStop}
        pickedStopCoords={state.pickedStopCoords}
        onAddStopSubmit={handleAddStopSubmit}
        gasStations={state.dynamicGasStations}
        isGasStationLayerVisible={state.layers.gasStations}
        onToggleGasStationLayer={() => toggleLayer("gasStations")}
        onVehicleSelectFromDrivers={handleVehicleSelectFromDrivers}
        navigateToTab={sidebarNavigateTab}
        navigateToDriverId={sidebarNavigateDriverId}
        onNavigateConsumed={handleNavigateConsumed}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={state.layers}
          toggleLayer={toggleLayer}
          routeData={routeData}
          setRouteData={setRouteData}
          setWeather={handleSetWeather}
          isRouting={isCalculatingRoute}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          dynamicEVStations={state.dynamicEVStations}
          setDynamicEVStations={handleSetDynamicEVStations}
          dynamicGasStations={state.dynamicGasStations}
          setDynamicGasStations={handleSetDynamicGasStations}
          mapCenter={state.mapCenter}
          setMapCenter={handleSetMapCenter}
          selectedVehicle={state.selectedVehicle}
          customPOIs={displayedCustomPOIs}
          fleetVehicles={fleetVehicles}
          fleetJobs={fleetJobs}
          selectedVehicleId={selectedVehicleId}
          vehicleAlerts={vehicleAlerts}
          onMapClick={handleMapClick}
          pickedPOICoords={state.pickedPOICoords}
          pickedJobCoords={state.pickedJobCoords}
          zonePoints={state.zonePoints}
          zoneIsClosed={zoneIsClosed}
          interactionMode={state.interactionMode}
          isEditingZone={isEditingZone}
          onRemoveZonePoint={handleRemoveZonePoint}
          onUpdateZonePoint={handleUpdateZonePoint}
          onZonesUpdate={handleZonesUpdate}
          onEditZone={handleEditZone}
          isInteracting={!!state.interactionMode || isCalculatingRoute}
          onVehicleTypeChange={updateVehicleType}
          onVehicleLabelUpdate={updateVehicleLabel}
          onVehicleSelect={handleVehicleClick}
          onVehicleHover={handleVehicleHover}
          onVehicleHoverOut={handleVehicleHoverOut}
        />

        {/* Zone Drawing Toolbar - Minimal */}
        {isDrawingZone && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-card/90 border border-border/40 rounded-lg shadow-md px-3 py-2 backdrop-blur-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Compact Counter */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded">
              <div
                className={`h-2 w-2 rounded-full ${state.zonePoints.length >= 3 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`}
              />
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {state.zonePoints.length}
              </span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border/30" />

            {/* Action Buttons */}
            <button
              onClick={handleUndoZonePoint}
              disabled={state.zonePoints.length === 0}
              className="p-1.5 rounded hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs text-foreground"
              title="Deshacer (Ctrl+Z)"
            >
              ↶
            </button>

            <button
              onClick={() => setIsEditingZone(!isEditingZone)}
              disabled={state.zonePoints.length < 3}
              className={`p-1.5 rounded text-xs transition-colors ${
                isEditingZone
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
              title="Ajustar puntos"
            >
              ✎
            </button>

            <button
              onClick={handleCancelZoneDrawing}
              className="p-1.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors text-xs"
              title="Cancelar (Esc)"
            >
              ✕
            </button>

            <button
              onClick={handleConfirmZoneDrawing}
              disabled={state.zonePoints.length < 3}
              className="px-2 py-1.5 rounded bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white text-xs font-semibold"
              title="Confirmar (Enter)"
            >
              ✓
            </button>
          </div>
        )}

        <AddJobDialog
          isOpen={state.isAddJobOpen}
          onOpenChange={handleOpenAddJobChange}
          onSubmit={handleAddJobSubmit}
          mapCenter={state.mapCenter}
          onStartPicking={handleStartPickingJob}
          pickedCoords={state.pickedJobCoords}
        />
        <AddCustomPOIDialogV2
          isOpen={state.isAddCustomPOIOpen}
          onOpenChange={handleOpenAddCustomPOIChange}
          onSubmitPOI={handleAddCustomPOISubmit}
          onSubmitZone={handleAddCustomZoneSubmit}
          mapCenter={state.mapCenter}
          onStartPicking={handleStartPicking}
          onStartZonePicking={handleStartZonePicking}
          onContinueZonePicking={handleContinueZonePicking}
          onCloseShape={handleCloseZoneShape}
          pickedCoords={state.pickedPOICoords}
          zonePoints={state.zonePoints}
          zoneIsClosed={zoneIsClosed}
          isDrawingZone={isDrawingZone}
          isEditingZone={isEditingZone}
          editingZoneData={editingZoneData}
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
          driver={state.selectedDriver}
          isOpen={state.isDriverDetailsOpen}
          onOpenChange={(open) =>
            dispatch({ type: "SET_IS_DRIVER_DETAILS_OPEN", payload: open })
          }
          onClose={() =>
            dispatch({ type: "SET_IS_DRIVER_DETAILS_OPEN", payload: false })
          }
        />

        {/* Vehicle Properties Panel - opens explicitly from sidebar or popup */}
        {state.showVehiclePropertiesPanel &&
          selectedVehicleId &&
          !state.isVehicleDetailsOpen && (
            <VehicleDetailsPanel
              vehicle={selectedVehicleObject}
              isOpen={true}
              onClose={() => {
                dispatch({
                  type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL",
                  payload: false,
                });
                setSelectedVehicleId(null);
              }}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              onChangeEnvironmentalTag={handleChangeEnvironmentalTag}
              onUpdateLabel={updateVehicleLabel}
              onUpdateLicensePlate={updateVehicleLicensePlate}
              onViewDriverProfile={handleViewDriverProfile}
            />
          )}

        {/* Vehicle Route Management Panel - opens from map popup "Ver detalles" */}
        {state.isVehicleDetailsOpen && (
          <div className="fixed inset-0 right-0 left-auto w-72 h-full z-40 bg-background border-l border-border/40 shadow-lg overflow-hidden">
            <VehicleDetailSheet
              vehicle={selectedVehicleObject}
              metrics={selectedVehicleObject?.metrics || null}
              onClose={() => {
                dispatch({
                  type: "SET_IS_VEHICLE_DETAILS_OPEN",
                  payload: false,
                });
                setSelectedVehicleId(null);
              }}
              drivers={drivers}
              onAssignDriver={handleAssignDriver}
              jobs={fleetJobs}
              addStopToVehicle={addStopToVehicle}
              startRouting={startRouting}
              isAddStopOpen={state.isAddStopOpen}
              setIsAddStopOpen={handleOpenAddStopChange}
              onStartPickingStop={handleStartPickingStop}
              pickedStopCoords={state.pickedStopCoords}
              onAddStopSubmit={handleAddStopSubmit}
            />
          </div>
        )}

        {/* Vehicle Hover Popup */}
        {vehiclePopupData && (
          <div
            className="fixed z-50 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              left: `${vehiclePopupData.pixelPosition.x}px`,
              top: `${vehiclePopupData.pixelPosition.y - 8}px`,
              transform: "translate(-50%, -100%)",
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setVehiclePopupData(null);
            }}
          >
            <div className="bg-card/95 backdrop-blur-sm rounded-md shadow-lg border border-border/30 overflow-hidden min-w-[140px] max-w-[180px]">
              {/* Header */}
              <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-foreground truncate leading-tight">
                    {vehiclePopupData.vehicleName}
                  </p>
                  {vehiclePopupData.licensePlate && (
                    <p className="text-[7px] font-mono text-muted-foreground/50 uppercase tracking-wide">
                      {vehiclePopupData.licensePlate}
                    </p>
                  )}
                </div>
                <div
                  className={`shrink-0 px-1 py-px rounded text-[6px] font-bold uppercase ${
                    vehiclePopupData.status === "on_route"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : vehiclePopupData.status === "moving"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {vehiclePopupData.status === "on_route"
                    ? "Ruta"
                    : vehiclePopupData.status === "moving"
                      ? "Moviendo"
                      : "Sin movimiento"}
                </div>
              </div>

              {/* Compact info row */}
              <div className="px-2.5 py-1 border-t border-border/20 flex items-center gap-2 text-[8px] text-muted-foreground">
                <span className="font-medium">
                  {vehiclePopupData.vehicleType === "EV"
                    ? "Vehiculo de tipo eléctrico"
                    : "Vehiculo de tipo combustión"}
                </span>
                {vehiclePopupData.driverName && (
                  <span className="text black">
                    Conductor:{" "}
                    <span className="truncate inline-block max-w-[70px]">
                      {vehiclePopupData.driverName.split(" ")[0]}
                    </span>
                  </span>
                )}
              </div>

              {/* Action */}
              <button
                onClick={handleOpenVehiclePanel}
                className="w-full px-2.5 py-1 border-t border-border/20 text-[8px] font-semibold text-primary hover:bg-primary/5 transition-colors text-center"
              >
                Ver detalles →
              </button>
            </div>

            {/* Pointer triangle */}
            <div className="flex justify-center -mt-px">
              <div className="w-1.5 h-1.5 bg-card/95 border-b border-r border-border/30 rotate-45 -translate-y-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
