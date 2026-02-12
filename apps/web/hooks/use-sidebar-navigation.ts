"use client";
import { useState, useCallback } from "react";
import type { SidebarTab } from "@/components/sidebar";

export function useSidebarNavigation(
  setSelectedVehicleId: (id: string | null) => void,
) {
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
    },
    [setSelectedVehicleId],
  );

  // Reset navigation request after sidebar consumes it
  const handleNavigateConsumed = useCallback(() => {
    setSidebarNavigateTab(null);
    setSidebarNavigateDriverId(null);
  }, []);

  return {
    sidebarNavigateTab,
    sidebarNavigateDriverId,
    handleViewDriverProfile,
    handleVehicleSelectFromDrivers,
    handleNavigateConsumed,
  };
}
