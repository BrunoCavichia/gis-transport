// lib/types.ts - Archivo completo actualizado

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

// Standard API envelope
export interface ApiResponse<T> {
  timestamp: string;
  data?: T;
  error?: ApiError;
}

export type LatLon = [number, number];
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface POI {
  id: string;
  name: string;
  position: LatLon;
  type: "gas" | "ev";
  brand?: string;
  operator?: string;
  address?: string;
  town?: string;
  connectors?: number;
  connectionTypes?: string[];
  powerKW?: number;
  status?: string;
  isOperational?: boolean;
}

export interface CustomPOI {
  id: string;
  name: string;
  position: LatLon;
  type: "custom";
  description?: string;
  createdAt: number;
  selectedForFleet?: boolean;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: LatLon[];
  type?: string;
  description?: string;
  requiredTags?: string[];
}

export interface VehicleType {
  id: string;
  label: string;
  tags: string[];
  description: string;
  vroomType: "car";
}

export interface FleetVehicle {
  id: string | number;
  coords: LatLon;
  type: VehicleType;
  // Vroom-specific
  start_index?: number;
  profile?: string;
}

export interface FleetJob {
  id: string | number;
  coords: LatLon;
  label: string;
  // Vroom-specific
  location_index?: number;
  service?: number;
  delivery?: number[];
  description?: string;
}

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

export interface VehicleRoute {
  vehicleId: string | number;
  coordinates: LatLon[];
  distance: number;
  duration: number;
  color: string;
  jobsAssigned: number;
  error?: string;
}

export interface RawWeatherData {
  main?: {
    temp?: number;
  };
  rain?: {
    "3h"?: number;
  };
  snow?: {
    "3h"?: number;
  };
  wind?: {
    speed?: number;
  };
  visibility?: number;
}

export interface WeatherData {
  location?: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  alerts?: string[];

}

export interface WeatherAlert {
  segmentIndex: number;
  event: "SNOW" | "RAIN" | "ICE" | "WIND" | "FOG" | "HEAT" | "COLD";
  severity: RiskLevel;
  timeWindow: string;
  message: string;
  lat: number;
  lon: number;
}

export interface RouteWeather {
  vehicle: string | number;
  riskLevel: RiskLevel;
  alerts: WeatherAlert[];
}

// Optimization request types
export interface WeatherRiskRequestFull {
  vehicles: FleetVehicle[];
  jobs: FleetJob[];
  locations: LatLon[];
  matrix: number[][];
  startTime?: string;
}

export type WeatherIncomingBody =
  | WeatherRiskRequestFull
  | { vehicleRoutes?: VehicleRoute[]; startTime?: string }
  | any;

export interface WeatherMarker {
  vehicleId: string | number;
  segmentIndex: number;
  coords: LatLon;
  icon: any;
  message: string;
  timeWindow: string;
}

export interface RouteData {
  coordinates: LatLon[];
  distance: number;
  duration: number;
  waypoints?: Array<{
    name?: string;
    location: LatLon;
  }>;
  vehicleRoutes?: VehicleRoute[];
  weatherRoutes?: RouteWeather[];
  weatherMarkers?: WeatherMarker[];
  unassignedJobs?: Array<{ id: string; description: string; reason?: string }>;
  notices?: Array<{ title: string; message: string; type: "info" | "warning" }>;
  avoidPolygons?: LatLon[][];
}

export interface LayerVisibility {
  gasStations: boolean;
  evStations: boolean;
  cityZones: boolean;
  route: boolean;
}

export type InteractionMode = "pick-poi" | "pick-job" | "add-vehicle" | "add-job" | null;

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  road?: string;
  house_number?: string;
  country?: string;
  state?: string;
  postcode?: string;
  county?: string;
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
  osm_id: number;
}

export interface GeocodingResult {
  point: { lat: number; lng: number };
  name: string;
  country: string;
  city?: string;
  state?: string;
  street?: string;
  housenumber?: string;
  osm_id?: number | string;
}

// Overpass API Types
export interface OverpassGeometry {
  lat: number;
  lon: number;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassGeometry;
  geometry?: OverpassGeometry[];
  tags?: Record<string, string>;
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    geometry?: OverpassGeometry[];
  }>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

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
  data?: any;
}
