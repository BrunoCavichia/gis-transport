"use client";
import { useCallback } from "react";
import { useGISState } from "@/hooks/use-gis-state";
import type { LayerVisibility } from "@gis/shared";

export function useMapLayers() {
  const { state, dispatch } = useGISState();

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

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) => {
      const newLayers = { ...state.layers, [layer]: !state.layers[layer] };
      dispatch({ type: "SET_LAYERS", payload: newLayers });
      if (layer === "evStations" && !newLayers.evStations)
        dispatch({ type: "SET_DYNAMIC_EV_STATIONS", payload: [] });
      if (layer === "gasStations" && !newLayers.gasStations)
        dispatch({ type: "SET_DYNAMIC_GAS_STATIONS", payload: [] });
    },
    [state.layers, dispatch],
  );

  return {
    layers: state.layers,
    setLayers,
    toggleLayer,
  };
}
