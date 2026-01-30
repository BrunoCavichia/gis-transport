import { NominatimResult, GeocodingResult } from "@/lib/types";

export class GeocodingService {
    private static readonly USER_AGENT = "GIS-Transport-Demo/1.0";
    private static readonly TIMEOUT = 5000;
    private static reverseCache = new Map<string, { address: string; timestamp: number }>();
    private static readonly CACHE_TTL = 3600000; // 1 hour

    /**
     * Search for addresses using Nominatim API (OpenStreetMap)
     */
    static async search(query: string): Promise<GeocodingResult[]> {
        if (!query || query.length < 3) return [];

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query
                )}&limit=10&addressdetails=1`,
                {
                    headers: { "User-Agent": this.USER_AGENT },
                    signal: AbortSignal.timeout(this.TIMEOUT),
                }
            );

            if (!response.ok) {
                throw new Error(`Nominatim API returned ${response.status}`);
            }

            const data: NominatimResult[] = await response.json();

            return data.map((item) => {
                const city =
                    item.address?.city ||
                    item.address?.town ||
                    item.address?.village ||
                    item.address?.municipality;
                const road = item.address?.road;
                const housenumber = item.address?.house_number;

                return {
                    point: {
                        lat: Number.parseFloat(item.lat),
                        lng: Number.parseFloat(item.lon),
                    },
                    name: item.display_name,
                    country: item.address?.country || "Spain",
                    city,
                    state: item.address?.state,
                    street: road,
                    housenumber: housenumber,
                    osm_id: item.osm_id,
                };
            });
        } catch (error) {
            console.error("[GeocodingService] Search failed:", error);
            return [];
        }
    }

    /**
     * Reverse geocode coordinates to get an address using Nominatim
     */
    static async reverse(lat: number, lon: number): Promise<string> {
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        const cached = this.reverseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.address;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
                {
                    headers: { "User-Agent": this.USER_AGENT },
                    signal: AbortSignal.timeout(this.TIMEOUT),
                }
            );

            if (!response.ok) {
                throw new Error(`Nominatim API returned ${response.status}`);
            }

            const data = await response.json();

            // Trim address: Prioritize Road + City/Town
            const addr = data.address;
            let displayString = "";

            if (addr) {
                const road = addr.road || addr.pedestrian || addr.path;
                const city = addr.city || addr.town || addr.village || addr.suburb;
                const house = addr.house_number;

                if (road) {
                    displayString = house ? `${road} ${house}` : road;
                    if (city) displayString += `, ${city}`;
                } else if (city) {
                    displayString = city;
                } else {
                    displayString = data.display_name.split(',').slice(0, 2).join(',');
                }
            } else {
                displayString = data.display_name || "Unknown Location";
            }

            const finalAddress = displayString.length > 60 ? displayString.substring(0, 57) + "..." : displayString;

            this.reverseCache.set(cacheKey, { address: finalAddress, timestamp: Date.now() });
            return finalAddress;
        } catch (error) {
            console.error("[GeocodingService] Reverse geocode failed:", error);
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`; // Fallback to coordinates
        }
    }
}
