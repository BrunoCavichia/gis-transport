// lib/services/poi-service.ts
import type { POI } from "@/lib/types";
import { OVERPASS_URL } from "@/lib/config";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<string, { data: POI[]; timestamp: number }>();

    private static readonly EV_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private static readonly GAS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    private static getEVCacheKey(lat: number, lon: number, distanceKm: number): string {
        const latB = Math.floor(lat * 100);
        const lonB = Math.floor(lon * 100);
        const distB = Math.floor(distanceKm);
        return `ev:${latB}:${lonB}:${distB}`;
    }

    private static getGasCacheKey(lat: number, lon: number, radius: number) {
        const latB = Math.floor(lat * 100);
        const lonB = Math.floor(lon * 100);
        const radB = Math.floor(radius / 1000);
        return `gas:${latB}:${lonB}:${radB}`;
    }

    /**
     * Internal helper to fetch POIs from Overpass
     */
    private static async fetchFromOverpass(
        lat: number,
        lon: number,
        radiusMeters: number,
        amenity: "fuel" | "charging_station"
    ): Promise<POI[]> {
        const query = `[out:json][timeout:30];
            (
                node["amenity"="${amenity}"](around:${radiusMeters},${lat},${lon});
                way["amenity"="${amenity}"](around:${radiusMeters},${lat},${lon});
            );
            out center;`;

        try {
            const res = await fetch(OVERPASS_URL, {
                method: "POST",
                body: query,
                headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
            });
            if (!res.ok) return [];
            const data = await res.json();

            return (data.elements || []).map((el: any) => {
                const latEl = el.lat ?? el.center?.lat;
                const lonEl = el.lon ?? el.center?.lon;
                if (!latEl || !lonEl) return null;

                const type = amenity === "fuel" ? "gas" : "ev";

                return {
                    id: `${type}-${el.id}`,
                    name: el.tags?.name || el.tags?.brand || (type === "gas" ? "Gas Station" : "EV Charging Station"),
                    position: [latEl, lonEl] as [number, number],
                    type: type,
                    brand: el.tags?.brand,
                    operator: el.tags?.operator,
                    address: el.tags?.["addr:street"]
                        ? `${el.tags["addr:street"]}${el.tags["addr:housenumber"] ? " " + el.tags["addr:housenumber"] : ""}`
                        : undefined,
                    // Extra for EV
                    connectors: type === "ev" ? (el.tags?.capacity || 1) : undefined,
                };
            }).filter((s: any) => s !== null) as POI[];
        } catch (e) {
            console.error(`POIService: Overpass fetch failed for ${amenity}`, e);
            return [];
        }
    }

    /**
     * Fetches EV charging stations around a point using Overpass.
     */
    static async getEVStations(lat: number, lon: number, distanceKm: number = 1): Promise<POI[]> {
        const key = this.getEVCacheKey(lat, lon, distanceKm);
        const cached = this.evCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.EV_CACHE_DURATION) {
            return cached.data;
        }

        const radiusMeters = distanceKm * 1000;
        const stations = await this.fetchFromOverpass(lat, lon, radiusMeters, "charging_station");

        this.evCache.set(key, { data: stations, timestamp: Date.now() });
        return stations;
    }

    /**
     * Fetches gas stations around a point using Overpass.
     */
    static async getGasStations(lat: number, lon: number, radius: number = 5000): Promise<POI[]> {
        const key = this.getGasCacheKey(lat, lon, radius);
        const cached = this.gasCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.GAS_CACHE_DURATION) {
            return cached.data;
        }

        const stations = await this.fetchFromOverpass(lat, lon, radius, "fuel");

        this.gasCache.set(key, { data: stations, timestamp: Date.now() });
        return stations;
    }
}
