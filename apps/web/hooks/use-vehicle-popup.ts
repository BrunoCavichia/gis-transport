"use client";
import { useState, useCallback, useRef } from "react";
import type { FleetVehicle } from "@gis/shared";

type VehiclePopupData = {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  status: string;
  speed: number;
  vehicleType: string;
  driverName: string | null;
  pixelPosition: { x: number; y: number };
};

export function useVehiclePopup(
  fleetVehicles: FleetVehicle[] | null,
  isVehicleDetailsOpen: boolean,
) {
  const [vehiclePopupData, setVehiclePopupData] =
    useState<VehiclePopupData | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVehicleHover = useCallback(
    (vehicleId: string, pixelPosition: { x: number; y: number }) => {
      // Don't show popup if panel is already open
      if (isVehicleDetailsOpen) return;

      // Clear any pending hide timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (!fleetVehicles) return;

      const vehicle = fleetVehicles.find(
        (v: FleetVehicle) => String(v.id) === vehicleId,
      );
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
    [fleetVehicles, isVehicleDetailsOpen],
  );

  const handleVehicleHoverOut = useCallback(() => {
    // Use a small delay to allow mouse to move to popup
    hoverTimeoutRef.current = setTimeout(() => {
      setVehiclePopupData(null);
    }, 150);
  }, []);

  const clearPopup = useCallback(() => {
    setVehiclePopupData(null);
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  return {
    vehiclePopupData,
    hoverTimeoutRef,
    handleVehicleHover,
    handleVehicleHoverOut,
    clearPopup,
    clearHoverTimeout,
  };
}
