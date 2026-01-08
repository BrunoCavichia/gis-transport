// lib/services/poi-service.ts
import type { POI } from "@/lib/types";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<string, { data: POI[]; timestamp: number }>();

    private static readonly EV_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private static readonly GAS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    private static getEVCacheKey(lat: number, lon: number, distanceKm: number): string {
        const latDegPerKm = 1 / 111.32;
        const latBucketSize = Math.max(distanceKm * latDegPerKm, 0.0001);
        const latRad = (lat * Math.PI) / 180;
        const lonDegPerKm = 1 / (111.32 * Math.cos(latRad) || 1);
        const lonBucketSize = Math.max(distanceKm * lonDegPerKm, 0.0001);
        const latBucket = Math.round(lat / latBucketSize);
        const lonBucket = Math.round(lon / lonBucketSize);
        return `${latBucket}:${lonBucket}:${Math.round(distanceKm)}`;
    }

    private static getGasCacheKey(lat: number, lon: number, radius: number) {
        const latB = Math.floor(lat * 100);
        const lonB = Math.floor(lon * 100);
        const radB = Math.floor(radius / 1000);
        return `${latB}:${lonB}:${radB}`;
    }

    /**
     * Fetches EV charging stations around a point.
     */
    static async getEVStations(lat: number, lon: number, distanceKm: number = 1): Promise<POI[]> {
        const key = this.getEVCacheKey(lat, lon, distanceKm);
        const cached = this.evCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.EV_CACHE_DURATION) {
            return cached.data;
        }

        const apiKey = process.env.OPENCHARGEMAP_API_KEY || "92a14a07-d941-41c6-aa71-97c9adf0b01c";
        const url = new URL("https://api.openchargemap.io/v3/poi/");
        url.searchParams.set("output", "json");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lon));
        url.searchParams.set("distance", String(distanceKm));
        url.searchParams.set("distanceunit", "km");
        url.searchParams.set("maxresults", "100");
        url.searchParams.set("compact", "true");
        url.searchParams.set("key", apiKey);

        try {
            const resp = await fetch(url.toString(), {
                headers: { "User-Agent": "GIS-Transport-Demo/1.0" },
            });
            if (!resp.ok) return [];
            const data = await resp.json();
            const stations: POI[] = (data || []).map((station: any) => ({
                id: `ev-${station.ID}`,
                name: station.AddressInfo?.Title || "EV Charging Station",
                position: [station.AddressInfo?.Latitude, station.AddressInfo?.Longitude],
                type: "ev",
                operator: station.OperatorInfo?.Title || "Unknown",
                address: station.AddressInfo?.AddressLine1,
                connectors: station.Connections?.length || 0,
            })).filter((s: any) => s.position[0] !== null && s.position[1] !== null);

            this.evCache.set(key, { data: stations, timestamp: Date.now() });
            return stations;
        } catch (e) {
            console.error("POIService: EV stations fetch failed", e);
            return [];
        }
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

        const radiusKm = Math.min(radius / 1000, 100);
        const overpassUrl = "https://overpass.private.coffee/api/interpreter";

        const query = `[out:json][timeout:30];
            (
                node["amenity"="fuel"](around:${radiusKm * 1000},${lat},${lon});
                way["amenity"="fuel"](around:${radiusKm * 1000},${lat},${lon});
            );
            out center;`;

        try {
            const res = await fetch(overpassUrl, {
                method: "POST",
                body: query,
                headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
            });
            if (!res.ok) return [];
            const data = await res.json();
            const stations: POI[] = (data.elements || []).map((el: any) => {
                const latEl = el.lat ?? el.center?.lat;
                const lonEl = el.lon ?? el.center?.lon;
                if (!latEl || !lonEl) return null;
                return {
                    id: `gas-${el.id}`,
                    name: el.tags?.name || el.tags?.brand || "Gas Station",
                    position: [latEl, lonEl],
                    type: "gas",
                    brand: el.tags?.brand,
                    operator: el.tags?.operator,
                    address: el.tags?.["addr:street"],
                };
            }).filter((s: any) => s !== null);

            this.gasCache.set(key, { data: stations, timestamp: Date.now() });
            return stations;
        } catch (e) {
            console.error("POIService: Gas stations fetch failed", e);
            return [];
        }
    }
}
