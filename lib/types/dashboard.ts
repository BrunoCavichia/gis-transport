import { LatLon, RiskLevel } from "../types";

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

// Main GIS Dashboard response
export interface GisDashboardData {
    meta: DashboardMeta;
    fleet: FleetOverview;
    optimization: OptimizationSummary;
    weather: WeatherSummary;
    analytics?: DashboardAnalytics;
}

export interface FleetVehicleSummary {
    id: string | number;
    type: string;
    label: string;
    position: LatLon;
}

export interface FleetOverview {
    totalVehicles: number;
    activeVehicles: number;
    vehiclesByType: Record<string, number>;
    vehicles: FleetVehicleSummary[];
}

export interface RouteSummary {
    vehicleId: string | number;
    jobsAssigned: number;
    distanceFormatted: string;
    durationFormatted: string;
    startPoint: LatLon;
    endPoint: LatLon;
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
    vehicleId: string | number;
    event: string;
    severity: RiskLevel;
    location: LatLon;
    message: string;
    timeWindow: string;
}

export interface WeatherSummary {
    overallRisk: RiskLevel;
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
