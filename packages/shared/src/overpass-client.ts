import { OverpassResponse, POI, RoadInfo, OverpassElement } from "./index";

/**
 * Universal client for Overpass API.
 * Works in both Browser and Node.js (18+).
 */
export class OverpassClient {
    private static readonly DEFAULT_URL = "https://overpass-api.de/api/interpreter";
    private static readonly DEFAULT_TIMEOUT = 30000;

    /**
     * Executes a raw Overpass QL query.
     */
    static async query(
        query: string,
        options: {
            timeout?: number;
            url?: string;
            signal?: AbortSignal;
        } = {}
    ): Promise<OverpassResponse> {
        const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
        const url = options.url ?? this.DEFAULT_URL;

        const controller = new AbortController();
        const signal = options.signal || controller.signal;

        const timeoutId = setTimeout(() => {
            if (!options.signal) controller.abort();
        }, timeout);

        try {
            const response = await fetch(url, {
                method: "POST",
                body: query,
                headers: {
                    "Content-Type": "text/plain",
                    "User-Agent": "GIS-Transport-Logistics/1.0"
                },
                signal
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Overpass API error (${response.status}): ${text.substring(0, 100)}`);
            }

            const data = await response.json();
            return data as OverpassResponse;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetches POIs around a location.
     */
    static async fetchAroundPOIs(
        lat: number,
        lon: number,
        radiusMeters: number,
        amenity: "fuel" | "charging_station"
    ): Promise<POI[]> {
        const maxRadius = Math.min(radiusMeters, 10000); // Cap at 10km
        const query = `[out:json][timeout:15];
            node["amenity"="${amenity}"](around:${maxRadius},${lat},${lon});
            out 100;`;

        const data = await this.query(query, { timeout: 15000 });
        const type = amenity === "fuel" ? "gas" : "ev";

        return (data.elements || []).map((element: OverpassElement) => {
            const latEl = element.lat ?? element.center?.lat;
            const lonEl = element.lon ?? element.center?.lon;
            if (!latEl || !lonEl) return null;

            return {
                id: `${type}-${element.id}`,
                name: element.tags?.name || element.tags?.brand || (type === "gas" ? "Gas Station" : "EV Charging Station"),
                position: [latEl, lonEl] as [number, number],
                type: type,
                brand: element.tags?.brand,
                operator: element.tags?.operator,
                address: element.tags?.["addr:street"]
                    ? `${element.tags["addr:street"]}${element.tags["addr:housenumber"] ? " " + element.tags["addr:housenumber"] : ""}`
                    : undefined,
                connectors: type === "ev" ? Number(element.tags?.capacity || 1) : undefined,
            } as POI;
        }).filter((p): p is POI => p !== null);
    }

    /**
     * Fetches road info (maxspeed, name) around a location.
     */
    static async fetchAroundRoadInfo(lat: number, lon: number): Promise<RoadInfo> {
        const query = `[out:json][timeout:10];
            way(around:100,${lat},${lon})[highway];
            out tags;`;

        const data = await this.query(query, { timeout: 10000 });
        const elements = data.elements || [];
        if (elements.length === 0) return {};

        const bestWay = elements.find((e: any) => e.tags?.maxspeed) || elements[0];
        let maxSpeed: number | undefined;

        if (bestWay.tags?.maxspeed) {
            const match = bestWay.tags.maxspeed.match(/\d+/);
            if (match) maxSpeed = parseInt(match[0]);
        }

        return {
            maxSpeed,
            roadName: bestWay.tags?.name
        };
    }
}
