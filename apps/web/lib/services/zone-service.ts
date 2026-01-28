import { Zone } from "@gis/shared";
import { repository } from "@gis/database";

export class ZoneService {
    /**
     * Fetches zones (LEZ, Restricted, etc.) around a point from the local cache.
     */
    static async getZones(lat: number, lon: number, radius = 5000): Promise<Zone[]> {
        try {
            // Using "Loading" instead of "Fetching" to avoid confusion with network requests
            console.log(`[ZoneService] Loading zones from local DB for ${lat},${lon} (radius: ${radius}m)`);
            return await repository.getZones(lat, lon, radius);
        } catch (err) {
            console.error("ZoneService Error:", err);
            return [];
        }
    }
}
