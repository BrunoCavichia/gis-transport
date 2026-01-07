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
    supplyRisk: SupplyRiskSummary;
    kpis: DashboardKPIs;
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

// Supply Risk summary
export interface SupplyRiskSummary {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    vehiclesAtRisk: number;
    criticalAlerts: number;
    suggestedStops: number;
    risks: VehicleRiskSummary[];
}

export interface VehicleRiskSummary {
    vehicleId: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    remainingSupply?: number;
    suggestedStation?: {
        name: string;
        type: 'gas' | 'ev';
        position: [number, number];
        deviationKm: number;
    };
}

// Dashboard KPIs
export interface DashboardKPIs {
    fleetUtilization: number;        // % of vehicles with assigned jobs
    routeEfficiency: number;         // Optimization gain %
    totalDistanceKm: number;
    totalDurationHours: number;
    averageJobsPerVehicle: number;
    weatherRiskScore: number;        // 0-100
    supplyRiskScore: number;         // 0-100
    activeAlerts: number;
}
