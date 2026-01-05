// lib/types.ts - Archivo completo actualizado
import type { RouteWeather } from "@/components/weather-panel";
export interface POI {
  id: string;
  name: string;
  position: [number, number];
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
  fuel_diesel?: boolean;
  fuel_octane_95?: boolean;
  fuel_octane_98?: boolean;
  opening_hours?: string;
}

export interface CustomPOI {
  id: string;
  name: string;
  position: [number, number];
  type: "custom";
  description?: string;
  createdAt: number;
  selectedForFleet?: boolean;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  type?: string;
  description?: string;
  requiredTags?: string[];
  boundary?: string;
  zone?: string;
  access?: string;
  motor_vehicle?: string;
  maxspeed?: string;
  enforcement?: string;
  traffic_sign?: string;
  start_date?: string;
  end_date?: string;
  restrictions?: string;
}

export interface VehicleType {
  id: string;
  label: string;
  tags: string[];
  description: string;
  vroomType: "car";
}

export interface FleetVehicle {
  id: string;
  coords: [number, number];
  type: VehicleType;
}

export interface FleetJob {
  id: string;
  coords: [number, number];
  label: string;
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
  vehicleId: number;
  coordinates: [number, number][];
  distance: number;
  duration: number;
  color: string;
  jobsAssigned: number;
}

export interface WeatherMarker {
  vehicleId: number;
  segmentIndex: number;
  coords: [number, number];
  icon: L.DivIcon;
  message: string;
  timeWindow: string;
}
export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions?: RouteInstruction[];
  waypoints?: Array<{
    name?: string;
    location: [number, number];
  }>;
  vehicleRoutes?: VehicleRoute[];
  weatherRoutes?: RouteWeather[];
  weatherMarkers?: WeatherMarker[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type?: string;
  modifier?: string;
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

export interface LayerVisibility {
  gasStations: boolean;
  evStations: boolean;
  lowEmissionZones: boolean;
  restrictedZones: boolean;
  route: boolean;
}

export interface SearchLocation {
  coords: [number, number];
  name: string;
}
