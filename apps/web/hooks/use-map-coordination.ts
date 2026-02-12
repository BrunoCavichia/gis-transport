"use client";
import { useCallback, useRef, useEffect } from "react";
import type { POI, VehicleType, WeatherData } from "@gis/shared";

interface UseMapCoordinationProps {
  dispatch: any;
  interactionMode: string | null;
  selectedVehicle: VehicleType;
  addVehicleAt: (coords: [number, number], vehicle: VehicleType) => void;
  addJobAt: (coords: [number, number], label?: string) => void;
  isDrawingZone: boolean;
}

export function useMapCoordination({
  dispatch,
  interactionMode,
  selectedVehicle,
  addVehicleAt,
  addJobAt,
  isDrawingZone,
}: UseMapCoordinationProps) {
  // Refs to access current values in event handlers
  const interactionModeRef = useRef(interactionMode);
  const selectedVehicleRef = useRef(selectedVehicle);
  const addVehicleAtRef = useRef(addVehicleAt);
  const addJobAtRef = useRef(addJobAt);
  const isDrawingZoneRef = useRef(isDrawingZone);

  // Keep refs in sync
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

  useEffect(() => {
    isDrawingZoneRef.current = isDrawingZone;
  }, [isDrawingZone]);

  // Handle map clicks based on interaction mode
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
    },
    [dispatch],
  );

  // Set map center
  const handleSetMapCenter = useCallback(
    (center: [number, number]) => {
      dispatch({ type: "SET_MAP_CENTER", payload: center });
    },
    [dispatch],
  );

  // Set weather data
  const handleSetWeather = useCallback(
    (weather: WeatherData | null) => {
      dispatch({ type: "SET_WEATHER", payload: weather });
    },
    [dispatch],
  );

  // Set dynamic EV stations
  const handleSetDynamicEVStations = useCallback(
    (stations: POI[]) => {
      dispatch({ type: "SET_DYNAMIC_EV_STATIONS", payload: stations });
    },
    [dispatch],
  );

  // Set dynamic gas stations
  const handleSetDynamicGasStations = useCallback(
    (stations: POI[]) => {
      dispatch({ type: "SET_DYNAMIC_GAS_STATIONS", payload: stations });
    },
    [dispatch],
  );

  // Cancel add mode
  const handleCancelAddMode = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: null });
  }, [dispatch]);

  return {
    handleMapClick,
    handleSetMapCenter,
    handleSetWeather,
    handleSetDynamicEVStations,
    handleSetDynamicGasStations,
    handleCancelAddMode,
  };
}
