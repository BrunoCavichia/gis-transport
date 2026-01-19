export type LatLon = [number, number];

export interface Location {
    lat: number;
    lon: number;
}

export interface Vehicle {
    id: number;
    type?: string;
}

export interface Job {
    id: number;
    location_index: number;
    service: number;
}

export interface Segment {
    lat: number;
    lon: number;
    eta: string;
}

export interface VroomStep {
    type: string;
    location_index: number;
    arrival: number;
}

export interface VroomRoute {
    vehicle: number;
    steps: VroomStep[];
}

export interface Alert {
    segmentIndex: number;
    event: "SNOW" | "RAIN" | "ICE" | "WIND" | "FOG" | "HEAT" | "COLD";
    severity: "LOW" | "MEDIUM" | "HIGH";
    timeWindow: string;
    lat: number;
    lon: number;
    message: string;
}

export interface RouteAlerts {
    vehicle: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    alerts: Alert[];
}

export interface WeatherRiskRequestFull {
    vehicles: Vehicle[];
    jobs: Job[];
    locations: Location[];
    matrix: number[][];
    startTime?: string;
}

export interface VehicleRouteSimple {
    vehicleId: number;
    coordinates: LatLon[];
    distance?: number;
    duration?: number;
    color?: string;
    jobsAssigned?: number;
}

export type IncomingBody =
    | WeatherRiskRequestFull
    | { vehicleRoutes?: VehicleRouteSimple[]; startTime?: string }
    | any;
