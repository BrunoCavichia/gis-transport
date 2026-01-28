import { Zone, OverpassResponse, OverpassElement } from "@/lib/types";
import { OVERPASS_URL, TIMEOUTS } from "@/lib/config";
import { fetchWithTimeout } from "@/lib/fetch-utils";

export class ZoneService {
    private static cache = new Map<string, { data: Zone[]; timestamp: number }>();
    private static pendingRequests = new Map<string, Promise<Zone[]>>();
    private static readonly CACHE_DURATION = 3600000; // 1 hour

    /**
     * Fetches zones (LEZ, Restricted, etc.) around a point.
     */
    static async getZones(lat: number, lon: number, radius = 5000): Promise<Zone[]> {
        const cacheKey = `zone:${Math.round(lat * 100)}:${Math.round(lon * 100)}:${radius}`;

        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.data;
        if (this.pendingRequests.has(cacheKey)) return this.pendingRequests.get(cacheKey)!;

        const radiusKm = Math.min(radius / 1000, 20);
        const query = `[out:json][timeout:30];
            (
                relation["boundary"~"low_emission_zone|environmental|limited_traffic_zone"](around:${radiusKm * 1000},${lat},${lon});
                way["boundary"~"low_emission_zone|environmental|limited_traffic_zone"](around:${radiusKm * 1000},${lat},${lon});
                relation["zone:traffic"~"environmental|no_emission|low_emission"](around:${radiusKm * 1000},${lat},${lon});
                way["zone:traffic"~"environmental|no_emission|low_emission"](around:${radiusKm * 1000},${lat},${lon});
            );
            out geom;`;

        const request = (async () => {
            try {
                const res = await fetchWithTimeout(OVERPASS_URL, {
                    method: "POST",
                    body: query,
                    timeout: TIMEOUTS.OVERPASS,
                });

                if (!res.ok) return [];
                const data: OverpassResponse = await res.json();

                const zones = (data.elements || [])
                    .map(element => this.mapElementToZone(element))
                    .filter((zone): zone is Zone => zone !== null);

                this.cache.set(cacheKey, { data: zones, timestamp: Date.now() });
                return zones;
            } catch (err) {
                console.error("ZoneService Error:", err);
                return [];
            } finally {
                this.pendingRequests.delete(cacheKey);
            }
        })();

        this.pendingRequests.set(cacheKey, request);
        return request;
    }

    private static mapElementToZone(element: OverpassElement): Zone | null {
        let coords: [number, number][] = [];

        if (element.type === "way" && element.geometry) {
            coords = element.geometry.map(point => [point.lat, point.lon] as [number, number]);
        } else if (element.type === "relation" && element.members) {
            coords = element.members.flatMap(member => member.geometry?.map(point => [point.lat, point.lon] as [number, number]) ?? []);
        }

        if (coords.length < 3) return null;

        const tags = element.tags || {};
        let type: "LEZ" | "ENVIRONMENTAL" | "PEDESTRIAN" | "RESTRICTED" = "RESTRICTED";

        if (tags.boundary === "low_emission_zone" || tags["zone:traffic"] === "environmental" || tags["zone:environmental"]) {
            type = "LEZ";
        } else if (tags.boundary === "limited_traffic_zone" || tags.boundary === "environmental") {
            type = "ENVIRONMENTAL";
        } else if (tags.highway === "pedestrian") {
            type = "PEDESTRIAN";
        }

        return {
            id: `${element.type}-${element.id}`,
            name: tags.name ?? tags.description ?? type,
            type,
            coordinates: coords,
            description: tags.description || JSON.stringify(tags),
            requiredTags: type === "PEDESTRIAN" ? [] : ["eco", "zero"]
        };
    }






}
