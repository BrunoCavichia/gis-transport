"use client";
import { useCallback } from "react";
import { useGISState } from "@/hooks/use-gis-state";

export function useVehicleSelection(
  selectedVehicleId: string | null,
  setSelectedVehicleId: (id: string | null) => void,
  clearPopup?: () => void,
) {
  const { dispatch } = useGISState();

  const handleVehicleClick = useCallback(
    (vehicleId: string) => {
      if (clearPopup) clearPopup();
      setSelectedVehicleId(vehicleId);
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: true });
    },
    [setSelectedVehicleId, clearPopup, dispatch],
  );

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
    [setSelectedVehicleId, dispatch],
  );

  // Highlight vehicle without opening properties panel (for dashboard)
  const handleHighlightVehicleOnly = useCallback(
    (id: string | number | null) => {
      setSelectedVehicleId(id ? String(id) : null);
      // Close panels but don't open properties panel
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: false });
    },
    [setSelectedVehicleId, dispatch],
  );

  // Open properties panel from popup (VehicleDetailsPanel)
  const handleOpenVehiclePanel = useCallback(
    (vehicleId: string) => {
      setSelectedVehicleId(vehicleId);
      // Open properties panel when clicking "Ver detalles" in popup
      dispatch({ type: "SET_SHOW_VEHICLE_PROPERTIES_PANEL", payload: true });
      dispatch({ type: "SET_IS_VEHICLE_DETAILS_OPEN", payload: false });
      if (clearPopup) clearPopup();
    },
    [setSelectedVehicleId, clearPopup, dispatch],
  );

  return {
    selectedVehicleId,
    handleVehicleClick,
    handleSelectVehicleIdOnly,
    handleHighlightVehicleOnly,
    handleOpenVehiclePanel,
  };
}
