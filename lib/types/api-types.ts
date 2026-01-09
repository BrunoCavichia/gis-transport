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

// Fleet overview for dashboard
export interface FleetOverview {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesByType: Record<string, number>;
  vehicles: FleetVehicleSummary[];
}

export interface FleetVehicleSummary {
  id: string;
  type: string;
  label: string;
  position: [number, number];
}

// Optimization summary
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

export interface RouteSummary {
  vehicleId: number;
  jobsAssigned: number;
  startPoint: [number, number];
  endPoint: [number, number];
}

// Weather summary
export interface WeatherSummary {
  overallRisk: "LOW" | "MEDIUM" | "HIGH";
  alertCount: number;
  alertsByType: Record<string, number>;
  affectedRoutes: number;
  alerts: WeatherAlertSummary[];
}

export interface WeatherAlertSummary {
  vehicleId: number;
  event: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  location: [number, number];
  message: string;
  timeWindow: string;
}
