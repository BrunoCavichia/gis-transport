"use client";
import { useCallback } from "react";

interface UseDialogCoordinationProps {
  dispatch: any;
  interactionMode: string | null;
  isDrawingZone: boolean;
}

export function useDialogCoordination({
  dispatch,
  interactionMode,
  isDrawingZone,
}: UseDialogCoordinationProps) {
  // Set fleet mode
  const handleSetFleetMode = useCallback(
    (mode: boolean) => {
      dispatch({ type: "SET_FLEET_MODE", payload: mode });
    },
    [dispatch],
  );

  // Set show custom POIs
  const handleSetShowCustomPOIs = useCallback(
    (show: boolean) => {
      dispatch({ type: "SET_SHOW_CUSTOM_POIS", payload: show });
    },
    [dispatch],
  );

  // Set add custom POI dialog open/close
  const handleSetIsAddCustomPOIOpen = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: open });
    },
    [dispatch],
  );

  // Handle add custom POI dialog open/close with cleanup
  const handleOpenAddCustomPOIChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: open });
      if (!open) {
        // Only clear points and mode if not actively drawing
        if (!isDrawingZone) {
          dispatch({ type: "SET_PICKED_POI_COORDS", payload: null });
          dispatch({ type: "CLEAR_ZONE_POINTS" });
          if (
            interactionMode === "pick-poi" ||
            interactionMode === "pick-zone"
          ) {
            dispatch({ type: "SET_INTERACTION_MODE", payload: null });
          }
        }
      }
    },
    [interactionMode, isDrawingZone, dispatch],
  );

  // Set add job dialog open/close
  const handleSetIsAddJobOpen = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: open });
    },
    [dispatch],
  );

  return {
    handleSetFleetMode,
    handleSetShowCustomPOIs,
    handleSetIsAddCustomPOIOpen,
    handleOpenAddCustomPOIChange,
    handleSetIsAddJobOpen,
  };
}
