// Standard API envelope
export interface ApiResponse<T> {
    success: boolean;
    timestamp: string;
    version: string;
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
    kpis: DashboardKPIs;
    zones?: any[]; // Simplified for now, or use Zone[] if imported
    pois?: any[];  // Simplified for now, or use POI[] if imported
    analytics?: DashboardAnalytics; // New section for Historical/BI data
}

export interface DashboardAnalytics {
    period: string; // e.g. "Last 7 Days"
    summary: {
        totalOptimizations: number;
        totalDistanceKm: number;
        totalDurationHours: number;
        averageEfficiencyScore: number;
    };
    trend: Array<{
        date: string;
        efficiency: number;
        distanceKm: number;
    }>;
}

export interface DashboardMeta {
    generatedAt: string;
    dataFreshness: 'live' | 'cached';
    cacheAge?: number; // seconds
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
    isActive: boolean;
}

// Optimization summary
export interface OptimizationSummary {
    status: 'idle' | 'optimized' | 'error';
    lastOptimizedAt?: string;
    totalJobs: number;
    assignedJobs: number;
    unassignedJobs: number;
    routes: RouteSummary[];
    totals: {
        distance: number;      // meters
        duration: number;      // seconds
        distanceFormatted: string;
        durationFormatted: string;
    };
}

export interface RouteSummary {
    vehicleId: number;
    jobsAssigned: number;
    distance: number;
    duration: number;
    distanceFormatted: string;
    durationFormatted: string;
    color: string;
    startPoint: [number, number];
    endPoint: [number, number];
    waypoints: [number, number][];
}

// Weather summary
export interface WeatherSummary {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    alertCount: number;
    alertsByType: Record<string, number>;
    affectedRoutes: number;
    alerts: WeatherAlertSummary[];
}

export interface WeatherAlertSummary {
    vehicleId: number;
    event: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    location: [number, number];
    message: string;
    timeWindow: string;
}

// Dashboard KPIs
export interface DashboardKPIs {
    fleetUtilization: number;        // % of vehicles with assigned jobs
    routeEfficiency: number;         // Optimization gain %
    totalDistanceKm: number;
    totalDurationHours: number;
    averageJobsPerVehicle: number;
    weatherRiskScore: number;        // 0-100
    activeAlerts: number;
    nearbyZonesCount?: number;
    nearbyPOIsCount?: number;
}
