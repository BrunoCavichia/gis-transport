import type { POI } from "@/lib/types";
import { GAS_STATIONS_API_URL } from "@/lib/config";
import { GEO_CACHE_CONFIG, getGeoCacheKey } from "@/lib/geo-utils";
import { OverpassClient } from "@gis/shared";

export class POIService {
    private static evCache = new Map<string, { data: POI[]; timestamp: number }>();
    private static gasCache = new Map<
        string,
        { data: POI[]; timestamp: number }
    >();

    // In-flight request deduplication
    private static pendingRequests = new Map<string, Promise<POI[]>>();

    // Ministry Data Cache (Large payload, fetch once)
    private static ministryData: any[] | null = null;
    private static lastMinistryFetch: number = 0;
    private static MINISTRY_CACHE_TTL = 1000 * 60 * 30; // 30 mins

    /**
     * Fetches the full list of gas stations and prices from the Spanish Ministry.
     */
    private static async fetchMinistryPrices(): Promise<any[]> {
        if (
            this.ministryData &&
            Date.now() - this.lastMinistryFetch < this.MINISTRY_CACHE_TTL
        ) {
            return this.ministryData;
        }

        try {
            console.log("[POIService] Fetching Spanish Ministry Fuel prices...");
            const res = await fetch(GAS_STATIONS_API_URL);
            const data = await res.json();
            if (data && data.ListaEESSPrecio) {
                this.ministryData = data.ListaEESSPrecio;
                this.lastMinistryFetch = Date.now();
                console.log(
                    `[POIService] Successfully cached ${this.ministryData?.length} stations from Ministry.`,
                );
                return this.ministryData!;
            }
        } catch (e) {
            console.error("[POIService] Error fetching Ministry prices:", e);
        }
        return this.ministryData || [];
    }

    /**
     * Fetches EV charging stations around a point using Overpass.
     */
    static async getEVStations(
        lat: number,
        lon: number,
        distanceKm: number = 1,
    ): Promise<POI[]> {
        const radiusMeters = distanceKm * 1000;
        const key = getGeoCacheKey("ev", lat, lon, radiusMeters);

        // Check cache
        const cached = this.evCache.get(key);
        if (
            cached &&
            Date.now() - cached.timestamp < GEO_CACHE_CONFIG.SERVER_EXPIRE
        ) {
            return cached.data;
        }

        // Deduplicate in-flight requests
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key)!;
        }

        const promise = OverpassClient.fetchAroundPOIs(
            lat,
            lon,
            radiusMeters,
            "charging_station",
        )
            .then((stations) => {
                this.evCache.set(key, { data: stations, timestamp: Date.now() });
                this.pendingRequests.delete(key);
                return stations;
            })
            .catch((e: Error) => {
                console.error(`POIService: Overpass fetch failed for EV`, e);
                this.pendingRequests.delete(key);
                if (cached) return cached.data;
                return [];
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Fetches gas stations around a point using Ministry data exclusively.
     */
    static async getGasStations(
        lat: number,
        lon: number,
        radiusMeters: number = 5000,
    ): Promise<POI[]> {
        const key = getGeoCacheKey("gas", lat, lon, radiusMeters);

        // Check cache
        const cached = this.gasCache.get(key);
        if (
            cached &&
            Date.now() - cached.timestamp < GEO_CACHE_CONFIG.SERVER_EXPIRE
        ) {
            return cached.data;
        }

        // Deduplicate in-flight requests
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key)!;
        }

        const promise = (async () => {
            try {
                const ministryResults = await this.fetchMinistryPrices();
                if (!ministryResults.length) return [];

                const radiusKm = radiusMeters / 1000;

                // Filter geographically in memory
                const filtered = ministryResults.filter((m) => {
                    const mLat = this.parseCoord(m["Latitud"]);
                    const mLon = this.parseCoord(m["Longitud (WGS84)"]);
                    if (mLat === undefined || mLon === undefined) return false;

                    const dist = this.getDistance(lat, lon, mLat, mLon);
                    return dist <= radiusKm;
                });

                // Map to POI
                const stations: POI[] = filtered.map((m) => {
                    const mLat = this.parseCoord(m["Latitud"])!;
                    const mLon = this.parseCoord(m["Longitud (WGS84)"])!;
                    const brand = m["Rótulo"] || "Gas Station";

                    return {
                        id: `gas-min-${m["IDEESS"]}`,
                        name: brand,
                        position: [mLat, mLon],
                        type: "gas",
                        brand: brand,
                        address: m["Dirección"],
                        town: m["Municipio"],
                        postalCode: m["C.P."],
                        prices: {
                            gasoline95: this.parsePrice(m["Precio Gasolina 95 E5"]),
                            gasoline98: this.parsePrice(m["Precio Gasolina 98 E5"]),
                            diesel: this.parsePrice(m["Precio Gasoleo A"]),
                            dieselPremium: this.parsePrice(m["Precio Gasoleo Premium"]),
                            updatedAt: new Date().toLocaleDateString(),
                        },
                    };
                });

                this.gasCache.set(key, { data: stations, timestamp: Date.now() });
                return stations;
            } catch (e) {
                console.error("[POIService] Error processing gas stations:", e);
                return [];
            } finally {
                this.pendingRequests.delete(key);
            }
        })();

        this.pendingRequests.set(key, promise);
        return promise;
    }

    private static parseCoord(val: any): number | undefined {
        if (!val) return undefined;
        if (typeof val === "number") return val;
        // Handle string format "39,123456"
        const cleaned = val.toString().replace(",", ".");
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
    }

    private static parsePrice(val: string): number | undefined {
        if (!val) return undefined;
        const clean = val.replace(",", ".");
        const num = parseFloat(clean);
        return isNaN(num) ? undefined : num;
    }

    /**
     * Simple Haversine distance in KM.
     */
    private static getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
