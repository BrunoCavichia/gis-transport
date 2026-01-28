import { NominatimResult, GeocodingResult } from "@/lib/types";

export class GeocodingService {
    private static readonly USER_AGENT = "GIS-Transport-Demo/1.0";
    private static readonly TIMEOUT = 5000;

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
}
