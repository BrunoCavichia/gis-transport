// lib/types.ts - Archivo completo actualizado

// Standard API envelope
export interface ApiResponse<T> {
  timestamp: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

// Main GIS Dashboard response
export interface GisDashboardData {
  meta: DashboardMeta;
  fleet: FleetOverview;
  optimization: OptimizationSummary;
  weather: WeatherSummary;
  analytics?: DashboardAnalytics;
}

export interface DashboardAnalytics {
  period: string; // e.g. "Last 7 Days"
  summary: {
    totalOptimizations: number;
    totalDistanceKm: number;
    totalDurationHours: number;
  };
  trend: Array<{
    date: string;
    distanceKm: number;
  }>;
}

export interface DashboardMeta {
  generatedAt: string;
}

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
  icon: any; // Using any for L.DivIcon to avoid Leaflet dependency in types if needed, or keeping it
  message: string;
  timeWindow: string;
}

export interface WeatherAlert {
  segmentIndex: number;
  event: "SNOW" | "RAIN" | "ICE" | "WIND" | "FOG";
  severity: "LOW" | "MEDIUM" | "HIGH";
  timeWindow: string;
  message: string;
  lat: number;
  lon: number;
}

export interface RouteWeather {
  vehicle: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  alerts: WeatherAlert[];
}

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
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
}

// Optimization contexts for GIS Data Service
export interface FleetVehicleSummary {
  id: string;
  type: string;
  label: string;
  position: [number, number];
}

export interface FleetOverview {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesByType: Record<string, number>;
  vehicles: FleetVehicleSummary[];
}

export interface RouteSummary {
  vehicleId: string;
  jobsAssigned: number;
  distanceFormatted: string;
  durationFormatted: string;
  startPoint: [number, number];
  endPoint: [number, number];
}

export interface OptimizationSummary {
  status: "idle" | "optimized" | "error";
  lastOptimizedAt?: string;
  totalJobs: number;
  assignedJobs: number;
  unassignedJobs: number;
  routes: RouteSummary[];
  totals: {
    distanceFormatted: string;
    durationFormatted: string;
  };
}

export interface WeatherAlertSummary {
  vehicleId: string;
  event: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  location: [number, number];
  message: string;
  timeWindow: string;
}

export interface WeatherSummary {
  overallRisk: "LOW" | "MEDIUM" | "HIGH";
  alertCount: number;
  alertsByType: Record<string, number>;
  affectedRoutes: number;
  alerts: WeatherAlertSummary[];
}

export interface GisDataContext {
  fleet: FleetOverview;
  optimization: OptimizationSummary;
  weather: WeatherSummary;
  includeGeoData?: boolean;
}

export interface FetchError extends Error {
  response?: Response;
  status?: number;
  data?: any;
}

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
