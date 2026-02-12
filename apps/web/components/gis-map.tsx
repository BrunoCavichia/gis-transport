"use client";
// React & Next.js
import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// Third-party components
import { Truck } from "lucide-react";

// UI Components
import { Sidebar } from "@/components/sidebar";

import { GISMapToolbar } from "@/components/gis-map-toolbar";
import { GISMapDialogs } from "@/components/gis-map-dialogs";
import { GISMapPanels } from "@/components/gis-map-panels";
import { GISMapPopup } from "@/components/gis-map-popup";

// Custom Hooks
import { useGISState } from "@/hooks/use-gis-state";
import { useFleet } from "@/hooks/use-fleet";
import { useDrivers } from "@/hooks/use-drivers";
import { useDriverManagement } from "@/hooks/use-driver-management";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { useRouting } from "@/hooks/use-routing";
import { useLiveTracking } from "@/hooks/use-live-tracking";
import { useAlertLogs } from "@/hooks/use-alert-logs";
import { useVehiclePopup } from "@/hooks/use-vehicle-popup";
import { useMapLayers } from "@/hooks/use-map-layers";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { useVehicleSelection } from "@/hooks/use-vehicle-selection";
import { useAlertMonitoring } from "@/hooks/use-alert-monitoring";
import { useVehicleCoordination } from "@/hooks/use-vehicle-coordination";
import { useJobCoordination } from "@/hooks/use-job-coordination";
import { useMapCoordination } from "@/hooks/use-map-coordination";
import { useDialogCoordination } from "@/hooks/use-dialog-coordination";
import { useZoneDrawing } from "@/hooks/use-zone-drawing";

// Types
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
import type { Alert } from "@/lib/utils";

// Utils & Config
import { generateVehicleAlerts, cn } from "@/lib/utils";
import { MAP_CENTER } from "@/lib/config";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

// Constants
const DEFAULT_CENTER: [number, number] = MAP_CENTER;

/**
 * GISMap - Main component for the GIS Transport & Logistics application
 *
 * Responsibilities:
 * - Orchestrates state management across multiple domain concerns
 * - Coordinates vehicle fleet management and driver assignments
 * - Handles route planning and optimization
 * - Manages custom POIs and zone drawing
 * - Provides live tracking and alert monitoring
 *
 * Architecture:
 * - Uses custom hooks for separation of concerns
 * - Delegates UI to specialized sub-components
 * - Maintains global state via useGISState reducer
 */
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

  // Map layers management
  const { layers, setLayers, toggleLayer } = useMapLayers();

  // Vehicle popup management
  const {
    vehiclePopupData,
    hoverTimeoutRef,
    handleVehicleHover,
    handleVehicleHoverOut,
    clearPopup,
    clearHoverTimeout,
  } = useVehiclePopup(fleetVehicles, state.isVehicleDetailsOpen);

  // Vehicle selection management
  const {
    handleVehicleClick,
    handleSelectVehicleIdOnly,
    handleHighlightVehicleOnly,
    handleOpenVehiclePanel: handleOpenVehiclePanelFromSelection,
  } = useVehicleSelection(selectedVehicleId, setSelectedVehicleId, clearPopup);

  // Sidebar navigation state
  const {
    sidebarNavigateTab,
    sidebarNavigateDriverId,
    handleViewDriverProfile,
    handleVehicleSelectFromDrivers,
    handleNavigateConsumed,
  } = useSidebarNavigation(setSelectedVehicleId);

  const {
    customPOIs,
    addCustomPOI,
    addCustomZone,
    removeCustomPOI,
    clearAllCustomPOIs,
    updateCustomPOI,
  } = useCustomPOI();

  // Zone drawing coordination (state + handlers)
  const {
    isDrawingZone,
    isEditingZone,
    zoneIsClosed,
    editingZoneData,
    handleStartZonePicking,
    handleContinueZonePicking,
    handleCloseZoneShape,
    handleConfirmZoneDrawing,
    handleUndoZonePoint,
    handleRemoveZonePoint,
    handleUpdateZonePoint,
    handleCancelZoneDrawing,
    handleEditZone,
    handleAddCustomZoneSubmit,
    toggleEditingMode,
  } = useZoneDrawing({
    dispatch,
    zonePoints: state.zonePoints,
    customPOIs,
    addCustomZone,
    updateCustomPOI,
  });

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
    fleetVehicles,
  });

  // Alert monitoring (includes speeding persistence)
  const { vehicleAlerts } = useAlertMonitoring(
    fleetVehicles,
    routeData,
    isTracking,
  );

  // Vehicle coordination (add, remove, update, clear)
  const {
    handleClearAll,
    handleAddVehicle,
    handleChangeEnvironmentalTag,
    handleRemoveVehicle,
    handleSetSelectedVehicle,
  } = useVehicleCoordination({
    dispatch,
    clearFleet,
    clearRoute,
    setSelectedVehicleId,
    updateVehiclePosition,
    updateVehicleMetrics,
    updateVehicleType,
    removeVehicle,
    fleetVehicles,
    drivers,
    updateDriver,
    VEHICLE_TYPES,
  });

  // Job coordination (add, remove, pick)
  const {
    handleAddJob,
    handleAddJobDirectly,
    handleAddJobSubmit,
    handleRemoveJob,
    handleStartPickingJob,
    handleOpenAddJobChange,
  } = useJobCoordination({
    dispatch,
    addJobAt,
    removeJob,
    interactionMode: state.interactionMode,
  });

  // Map coordination (clicks, weather, stations)
  const {
    handleMapClick,
    handleSetMapCenter,
    handleSetWeather,
    handleSetDynamicEVStations,
    handleSetDynamicGasStations,
    handleCancelAddMode,
  } = useMapCoordination({
    dispatch,
    interactionMode: state.interactionMode,
    selectedVehicle: state.selectedVehicle,
    addVehicleAt,
    addJobAt,
    isDrawingZone,
  });

  // Dialog coordination (open/close dialogs)
  const {
    handleSetFleetMode,
    handleSetShowCustomPOIs,
    handleSetIsAddCustomPOIOpen,
    handleOpenAddCustomPOIChange,
    handleSetIsAddJobOpen,
  } = useDialogCoordination({
    dispatch,
    interactionMode: state.interactionMode,
    isDrawingZone,
  });

  // Get selected vehicle object
  const selectedVehicleObject = useMemo(() => {
    if (!selectedVehicleId || !fleetVehicles) return null;
    return (
      fleetVehicles.find((v) => String(v.id) === String(selectedVehicleId)) ||
      null
    );
  }, [selectedVehicleId, fleetVehicles]);

  const handleStartPicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-poi" });
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
  }, []);

  const handleStartPickingStop = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-stop" });
    dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: false });
  }, []);

  // Wrapper for vehicle panel opening from popup - opens VehicleDetailsPanel (properties)
  const handleOpenVehiclePanel = useCallback(() => {
    if (vehiclePopupData) {
      setSelectedVehicleId(vehiclePopupData.vehicleId);
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: true });
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      clearPopup();
    }
  }, [vehiclePopupData, setSelectedVehicleId, dispatch, clearPopup]);

  // Wrapper for vehicle select from drivers (needs dispatch)
  const handleVehicleSelectFromDriversWithDispatch = useCallback(
    (vehicleId: string) => {
      handleVehicleSelectFromDrivers(vehicleId);
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
    },
    [handleVehicleSelectFromDrivers, dispatch],
  );

  const handleZonesUpdate = useCallback(
    (zones: Zone[]) => dispatch({ type: "SET_ACTIVE_ZONES", payload: zones }),
    [dispatch],
  );

  const handleAddCustomPOISubmit = useCallback(
    (name: string, coords: [number, number], desc?: string) => {
      addCustomPOI(name, coords, desc);
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
      dispatch({ type: "SET_PICKED_POI_COORDS", payload: null });
    },
    [addCustomPOI],
  );

  const handleOpenAddStopChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_STOP_OPEN", payload: open });
      if (!open) {
        dispatch({ type: "SET_PICKED_STOP_COORDS", payload: null });
        if (state.interactionMode === "pick-stop") {
          dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        }
      }
    },
    [state.interactionMode, dispatch],
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

  // Memoized callbacks to prevent inline function recreation
  const handleToggleGasStationLayer = useCallback(
    () => toggleLayer("gasStations"),
    [toggleLayer],
  );

  const handleClearRouteErrors = useCallback(() => {
    setRouteErrors([]);
    setRouteNotices([]);
  }, []);

  const handleDriverDetailsOpenChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_DRIVER_DETAILS_OPEN", payload: open });
    },
    [dispatch],
  );

  const handleDriverDetailsClose = useCallback(() => {
    dispatch({ type: "SET_IS_DRIVER_DETAILS_OPEN", payload: false });
  }, [dispatch]);

  const handleCloseVehiclePropertiesPanel = useCallback(() => {
    dispatch({
      type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL",
      payload: false,
    });
    setSelectedVehicleId(null);
  }, [dispatch, setSelectedVehicleId]);

  const handleCloseVehicleDetails = useCallback(() => {
    dispatch({
      type: "SET_IS_VEHICLE_DETAILS_OPEN",
      payload: false,
    });
    setSelectedVehicleId(null);
  }, [dispatch, setSelectedVehicleId]);

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
        layers={layers}
        setMapCenter={handleSetMapCenter}
        toggleLayer={toggleLayer}
        selectedVehicle={state.selectedVehicle}
        setSelectedVehicle={handleSetSelectedVehicle}
        fleetMode={state.fleetMode}
        setFleetMode={handleSetFleetMode}
        clearFleet={handleClearAll}
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
        isGasStationLayerVisible={layers.gasStations}
        onToggleGasStationLayer={handleToggleGasStationLayer}
        onVehicleSelectFromDrivers={handleVehicleSelectFromDriversWithDispatch}
        navigateToTab={sidebarNavigateTab}
        navigateToDriverId={sidebarNavigateDriverId}
        onNavigateConsumed={handleNavigateConsumed}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
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

        <GISMapToolbar
          isDrawingZone={isDrawingZone}
          zonePointsCount={state.zonePoints.length}
          isEditingZone={isEditingZone}
          onUndoZonePoint={handleUndoZonePoint}
          onToggleEditingMode={toggleEditingMode}
          onCancelZoneDrawing={handleCancelZoneDrawing}
          onConfirmZoneDrawing={handleConfirmZoneDrawing}
        />

        <GISMapDialogs
          isAddJobOpen={state.isAddJobOpen}
          onOpenAddJobChange={handleOpenAddJobChange}
          onAddJobSubmit={handleAddJobSubmit}
          mapCenter={state.mapCenter}
          onStartPickingJob={handleStartPickingJob}
          pickedJobCoords={state.pickedJobCoords}
          isAddCustomPOIOpen={state.isAddCustomPOIOpen}
          onOpenAddCustomPOIChange={handleOpenAddCustomPOIChange}
          onSubmitPOI={handleAddCustomPOISubmit}
          onSubmitZone={handleAddCustomZoneSubmit}
          onStartPicking={handleStartPicking}
          onStartZonePicking={handleStartZonePicking}
          onContinueZonePicking={handleContinueZonePicking}
          onCloseShape={handleCloseZoneShape}
          pickedPOICoords={state.pickedPOICoords}
          zonePoints={state.zonePoints}
          zoneIsClosed={zoneIsClosed}
          isDrawingZone={isDrawingZone}
          isEditingZone={isEditingZone}
          editingZoneData={editingZoneData}
          routeErrors={routeErrors}
          routeNotices={routeNotices}
          onClearRouteErrors={handleClearRouteErrors}
        />

        <GISMapPanels
          selectedDriver={state.selectedDriver}
          isDriverDetailsOpen={state.isDriverDetailsOpen}
          onDriverDetailsOpenChange={handleDriverDetailsOpenChange}
          onDriverDetailsClose={handleDriverDetailsClose}
          showVehiclePropertiesPanel={state.showVehiclePropertiesPanel}
          selectedVehicleId={selectedVehicleId}
          isVehicleDetailsOpen={state.isVehicleDetailsOpen}
          selectedVehicleObject={selectedVehicleObject}
          onCloseVehiclePropertiesPanel={handleCloseVehiclePropertiesPanel}
          drivers={drivers}
          onAssignDriver={handleAssignDriver}
          onChangeEnvironmentalTag={handleChangeEnvironmentalTag}
          onUpdateLabel={updateVehicleLabel}
          onUpdateLicensePlate={updateVehicleLicensePlate}
          onViewDriverProfile={handleViewDriverProfile}
          onCloseVehicleDetails={handleCloseVehicleDetails}
          fleetJobs={fleetJobs}
          addStopToVehicle={addStopToVehicle}
          startRouting={startRouting}
          isAddStopOpen={state.isAddStopOpen}
          setIsAddStopOpen={handleOpenAddStopChange}
          onStartPickingStop={handleStartPickingStop}
          pickedStopCoords={state.pickedStopCoords}
          onAddStopSubmit={handleAddStopSubmit}
        />

        <GISMapPopup
          vehiclePopupData={vehiclePopupData}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={clearPopup}
          onOpenVehiclePanel={handleOpenVehiclePanel}
        />
      </div>
    </div>
  );
}
