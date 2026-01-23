/**
 * Global application configuration and constants.
 */

export const OVERPASS_URL = "https://overpass.private.coffee/api/interpreter";

// Local OpenRouteService (Docker) - Internal redirect via Gateway or direct
export const ORS_URL = "http://localhost:8080/ors/v2";

// Internal Microservices
export const VROOM_URL = "http://localhost:3002";
export const SNAP_URL = "http://localhost:3005/api/snap-to-road";

// Map Settings
export const MAP_CENTER: [number, number] = [40.4168, -3.7038]; // Madrid, Spain
export const DEFAULT_ZOOM = 13;
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast";

// POI Configuration - Centralized settings for each POI type
export type POIType = "ev" | "gas";

export const POI_CONFIG: Record<POIType, {
    apiPath: string;
    distanceParam: string;
    color: string;
    maxResults: number;
}> = {
    ev: {
        apiPath: "/api/ev-stations",
        distanceParam: "distance",
        color: "#22c55e",
        maxResults: 50,
    },
    gas: {
        apiPath: "/api/gas-stations",
        distanceParam: "radius",
        color: "#f97316",
        maxResults: 50,
    },
};

export function buildPOIUrl(type: POIType, lat: number, lon: number, distance: number, vehicle: string): string {
    const config = POI_CONFIG[type];
    return `${config.apiPath}?lat=${lat}&lon=${lon}&${config.distanceParam}=${distance}&vehicle=${vehicle}&limit=${config.maxResults}`;
}
