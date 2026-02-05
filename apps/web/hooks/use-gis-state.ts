import { useReducer } from "react";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  WeatherData,
  Zone,
  Driver,
} from "@gis/shared";
import { VEHICLE_TYPES } from "@/lib/types";

interface GISState {
  layers: LayerVisibility;
  weather: WeatherData | null;
  dynamicEVStations: POI[];
  dynamicGasStations: POI[];
  mapCenter: [number, number];
  selectedVehicle: VehicleType;
  fleetMode: boolean;
  showCustomPOIs: boolean;
  interactionMode: string | null;
  pickedPOICoords: [number, number] | null;
  isAddCustomPOIOpen: boolean;
  pickedJobCoords: [number, number] | null;
  pickedStopCoords: [number, number] | null;
  isAddJobOpen: boolean;
  isAddStopOpen: boolean;
  activeZones: Zone[];
  selectedDriver: Driver | null;
  isDriverDetailsOpen: boolean;
  isVehicleDetailsOpen: boolean;
}

type GISAction =
  | { type: "SET_LAYERS"; payload: LayerVisibility }
  | { type: "SET_WEATHER"; payload: WeatherData | null }
  | { type: "SET_DYNAMIC_EV_STATIONS"; payload: POI[] }
  | { type: "SET_DYNAMIC_GAS_STATIONS"; payload: POI[] }
  | { type: "SET_MAP_CENTER"; payload: [number, number] }
  | { type: "SET_SELECTED_VEHICLE"; payload: VehicleType }
  | { type: "SET_FLEET_MODE"; payload: boolean }
  | { type: "SET_SHOW_CUSTOM_POIS"; payload: boolean }
  | { type: "SET_INTERACTION_MODE"; payload: string | null }
  | { type: "SET_PICKED_POI_COORDS"; payload: [number, number] | null }
  | { type: "SET_IS_ADD_CUSTOM_POI_OPEN"; payload: boolean }
  | { type: "SET_PICKED_JOB_COORDS"; payload: [number, number] | null }
  | { type: "SET_PICKED_STOP_COORDS"; payload: [number, number] | null }
  | { type: "SET_IS_ADD_JOB_OPEN"; payload: boolean }
  | { type: "SET_IS_ADD_STOP_OPEN"; payload: boolean }
  | { type: "SET_ACTIVE_ZONES"; payload: Zone[] }
  | { type: "SET_SELECTED_DRIVER"; payload: Driver | null }
  | { type: "SET_IS_DRIVER_DETAILS_OPEN"; payload: boolean }
  | { type: "SET_IS_VEHICLE_DETAILS_OPEN"; payload: boolean };

const initialState: GISState = {
  layers: {
    gasStations: false,
    evStations: false,
    cityZones: true,
    route: true,
  },
  weather: null,
  dynamicEVStations: [],
  dynamicGasStations: [],
  mapCenter: [40.4168, -3.7038], // Default MAP_CENTER
  selectedVehicle: VEHICLE_TYPES[0],
  fleetMode: false,
  showCustomPOIs: true,
  interactionMode: null,
  pickedPOICoords: null,
  isAddCustomPOIOpen: false,
  pickedJobCoords: null,
  pickedStopCoords: null,
  isAddJobOpen: false,
  isAddStopOpen: false,
  activeZones: [],
  selectedDriver: null,
  isDriverDetailsOpen: false,
  isVehicleDetailsOpen: false,
};

function gisReducer(state: GISState, action: GISAction): GISState {
  switch (action.type) {
    case "SET_LAYERS":
      return { ...state, layers: action.payload };
    case "SET_WEATHER":
      return { ...state, weather: action.payload };
    case "SET_DYNAMIC_EV_STATIONS":
      return { ...state, dynamicEVStations: action.payload };
    case "SET_DYNAMIC_GAS_STATIONS":
      return { ...state, dynamicGasStations: action.payload };
    case "SET_MAP_CENTER":
      return { ...state, mapCenter: action.payload };
    case "SET_SELECTED_VEHICLE":
      return { ...state, selectedVehicle: action.payload };
    case "SET_FLEET_MODE":
      return { ...state, fleetMode: action.payload };
    case "SET_SHOW_CUSTOM_POIS":
      return { ...state, showCustomPOIs: action.payload };
    case "SET_INTERACTION_MODE":
      return { ...state, interactionMode: action.payload };
    case "SET_PICKED_POI_COORDS":
      return { ...state, pickedPOICoords: action.payload };
    case "SET_IS_ADD_CUSTOM_POI_OPEN":
      return { ...state, isAddCustomPOIOpen: action.payload };
    case "SET_PICKED_JOB_COORDS":
      return { ...state, pickedJobCoords: action.payload };
    case "SET_PICKED_STOP_COORDS":
      return { ...state, pickedStopCoords: action.payload };
    case "SET_IS_ADD_JOB_OPEN":
      return { ...state, isAddJobOpen: action.payload };
    case "SET_IS_ADD_STOP_OPEN":
      return { ...state, isAddStopOpen: action.payload };
    case "SET_ACTIVE_ZONES":
      return { ...state, activeZones: action.payload };
    case "SET_SELECTED_DRIVER":
      return { ...state, selectedDriver: action.payload };
    case "SET_IS_DRIVER_DETAILS_OPEN":
      return { ...state, isDriverDetailsOpen: action.payload };
    case "SET_IS_VEHICLE_DETAILS_OPEN":
      return { ...state, isVehicleDetailsOpen: action.payload };
    default:
      return state;
  }
}

export function useGISState() {
  const [state, dispatch] = useReducer(gisReducer, initialState);

  return { state, dispatch };
}
