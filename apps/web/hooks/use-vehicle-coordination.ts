"use client";
import { useCallback } from "react";
import type { VehicleType, VehicleMetrics, FleetVehicle, Driver } from "@gis/shared";

interface UseVehicleCoordinationProps {
  dispatch: any;
  clearFleet: () => void;
  clearRoute: () => void;
  setSelectedVehicleId: (id: string | null) => void;
  updateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
  updateVehicleMetrics: (vehicleId: string, metrics: VehicleMetrics) => void;
  updateVehicleType: (vehicleId: string | number, type: VehicleType) => void;
  removeVehicle: (id: string) => void;
  fleetVehicles: FleetVehicle[] | null;
  drivers: Driver[];
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
  VEHICLE_TYPES: VehicleType[];
}

export function useVehicleCoordination({
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
}: UseVehicleCoordinationProps) {
  // Clear all vehicles and routes
  const handleClearAll = useCallback(async () => {
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
  }, [clearFleet, clearRoute, setSelectedVehicleId, dispatch, VEHICLE_TYPES]);

  // Enter add vehicle mode
  const handleAddVehicle = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "add-vehicle" });
  }, [dispatch]);

  // Update vehicle position
  const handleUpdateVehiclePosition = useCallback(
    (vehicleId: string | number, newCoords: [number, number]) => {
      updateVehiclePosition(String(vehicleId), newCoords);
    },
    [updateVehiclePosition],
  );

  // Update vehicle metrics
  const handleUpdateVehicleMetrics = useCallback(
    (vehicleId: string | number, metrics: VehicleMetrics) => {
      updateVehicleMetrics(String(vehicleId), metrics);
    },
    [updateVehicleMetrics],
  );

  // Change environmental tag (vehicle type)
  const handleChangeEnvironmentalTag = useCallback(
    (vehicleId: string | number, tagId: string) => {
      const vehicleTypeId = tagId === "none" ? "noLabel" : tagId;
      const vehicleType = VEHICLE_TYPES.find((t) => t.id === vehicleTypeId);
      if (vehicleType) {
        updateVehicleType(vehicleId, vehicleType);
      }
    },
    [updateVehicleType, VEHICLE_TYPES],
  );

  // Remove vehicle with confirmation
  const handleRemoveVehicle = useCallback(
    (id: string | number) => {
      if (!fleetVehicles) return;

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

  // Set selected vehicle type for adding
  const handleSetSelectedVehicle = useCallback(
    (vehicle: VehicleType) => {
      dispatch({ type: "SET_SELECTED_VEHICLE", payload: vehicle });
    },
    [dispatch],
  );

  return {
    handleClearAll,
    handleAddVehicle,
    handleChangeEnvironmentalTag,
    handleRemoveVehicle,
    handleSetSelectedVehicle,
  };
}
