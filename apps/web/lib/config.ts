/**
 * Global application configuration and constants.
 */

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const GAS_STATIONS_API_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
// Local OpenRouteService (Docker) - Internal redirect via Gateway or direct
export const ORS_URL = "http://localhost:8080/ors/v2";

// Internal Microservices
export const VROOM_URL = "http://localhost:3002";
export const SNAP_URL = "http://localhost:3005/api/snap-to-road";

// Map Settings
export const MAP_CENTER: [number, number] = [40.4168, -3.7038];
export const DEFAULT_ZOOM = 13;
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast";

// POI Configuration - Centralized settings for each POI type
export type POIType = "ev" | "gas";

export const POI_CONFIG: Record<POIType, {
    apiPath: string;
    distanceParam: string;
    maxResults: number;
}> = {
    ev: {
        apiPath: "/api/ev-stations",
        distanceParam: "radius",
        maxResults: 50,
    },
    gas: {
        apiPath: "/api/gas-stations",
        distanceParam: "radius",
        maxResults: 50,
    },
};

// Request Configuration
export const DEFAULT_TIMEOUT = 15000;
export const DEFAULT_RETRIES = 2;

export const TIMEOUTS = {
    GENERAL: 30000,
    GEOCODE: 10000,
    ROUTING: 15000,
    SNAP: 30000,
    MATRIX: 60000,
    OVERPASS: 30000,
};

export const RETRIES = {
    GENERAL: 2,
    GEOCODE: 1,
    ORS: 2,
};

// Routing & Optimization Logic
export const ROUTING_CONFIG = {
    COST_PER_METER: 1,
    COST_PER_SECOND: 0.3,
    UNREACHABLE_COST: 200000000,
    DEFAULT_SERVICE_TIME: 300, // seconds
    DEFAULT_RADIUS: 5000, // meters
    MAX_CAPACITY: 100,
    MAX_LOCATIONS: 50,
};

export function buildPOIUrl(type: POIType, lat: number, lon: number, distance: number, vehicle: string): string {
    const config = POI_CONFIG[type];
    return `${config.apiPath}?lat=${lat}&lon=${lon}&${config.distanceParam}=${distance}&vehicle=${vehicle}&limit=${config.maxResults}`;
}
