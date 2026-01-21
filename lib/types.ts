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
  vehicleId: string;
  coordinates: [number, number][];
  distance: number;
  duration: number;
  color: string;
  jobsAssigned: number;
  error?: string;
}

export interface WeatherMarker {
  vehicleId: string;
  segmentIndex: number;
  coords: [number, number];
  icon: L.DivIcon;
  message: string;
  timeWindow: string;
}

export interface RouteInstruction {
  type: string;
  text: string;
  distance: number;
  duration: number;
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
  unassignedJobs?: Array<{ id: string; description: string; reason?: string }>;
  notices?: Array<{ title: string; message: string; type: "info" | "warning" }>;
  avoidPolygons?: [number, number][][];
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
  cityZones: boolean;
  route: boolean;
}

export type InteractionMode =
  | "add-vehicle"
  | "add-job"
  | "pick-poi"
  | "pick-job"
  | null;

export const ROUTE_COLORS = [
  "#4F46E5", // Indigo - Primary route
  "#0891B2", // Cyan - Cool, professional
  "#7C3AED", // Violet - Elegant accent
  "#0D9488", // Teal - Fresh, modern
  "#6366F1", // Periwinkle - Soft, refined
  "#2563EB", // Blue - Classic, trustworthy
  "#8B5CF6", // Purple - Premium accent
  "#0EA5E9", // Sky - Light, airy
];
