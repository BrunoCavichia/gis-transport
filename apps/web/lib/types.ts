import {
  LatLon,
  RiskLevel,
  POI,
  CustomPOI,
  VehicleType,
  FleetVehicle,
  FleetJob,
  Zone,
  VehicleRoute,
  RawWeatherData,
  WeatherData,
  WeatherAlert,
  RouteWeather,
  WeatherMarker,
  RouteData,
  RouteNotice,
  LayerVisibility,
  VroomStep,
  VroomRoute,
  VroomUnassigned,
  VroomResult,
  OrsMatrixResponse,
  OrsDirectionsResponse,
  OptimizeOptions,
  NominatimAddress,
  NominatimResult,
  GeocodingResult,
  OverpassGeometry,
  OverpassElement,
  OverpassResponse,
} from "@gis/shared";

export type {
  LatLon,
  RiskLevel,
  POI,
  CustomPOI,
  VehicleType,
  FleetVehicle,
  FleetJob,
  Zone,
  VehicleRoute,
  RawWeatherData,
  WeatherData,
  WeatherAlert,
  RouteWeather,
  WeatherMarker,
  RouteData,
  RouteNotice,
  LayerVisibility,
  VroomStep,
  VroomRoute,
  VroomUnassigned,
  VroomResult,
  OrsMatrixResponse,
  OrsDirectionsResponse,
  OptimizeOptions,
  NominatimAddress,
  NominatimResult,
  GeocodingResult,
  OverpassGeometry,
  OverpassElement,
  OverpassResponse,
};

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: "zero",
    label: "Zero Emission Vehicle",
    tags: ["0", "eco"],
    description: "Full electric or plug-in hybrids",
    vroomType: "car",
  },
  {
    id: "eco",
    label: "ECO Vehicle",
    tags: ["eco", "zero", "0"],
    description: "Low-emission hybrids",
    vroomType: "car",
  },
  {
    id: "b",
    label: "Label B",
    tags: ["b", "eco", "zero", "0"],
    description: "Recent gasoline vehicles",
    vroomType: "car",
  },
  {
    id: "c",
    label: "Label C",
    tags: ["c", "b", "eco", "zero", "0"],
    description: "Recent diesel and gasoline vehicles",
    vroomType: "car",
  },
  {
    id: "noLabel",
    label: "No environmental label",
    tags: [],
    description: "Vehicles without classification",
    vroomType: "car",
  },
];

export type InteractionMode = "pick-poi" | "pick-job" | "add-vehicle" | "add-job" | null;

// Redundant types have been moved to @gis/shared and are re-exported above.

export interface OrsLocation {
  location?: LatLon;
  snapped_distance?: number;
}

export interface SnappedPoint {
  location: LatLon;
  snapped: boolean;
  distance?: number;
}

export interface FetchError extends Error {
  response?: Response;
  status?: number;
  data?: unknown;
}
