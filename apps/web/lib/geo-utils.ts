/**
 * Geo-Cache configuration and utilities.
 * Centralizes the logic for sharding geographic areas into buckets for consistent caching.
 */

export const GEO_CACHE_CONFIG = {
    BUCKET_SIZE: 50,
    RADIUS_STEP: 2000,
    CLIENT_EXPIRE: 15 * 60 * 1000, // 15 minutes
    SERVER_EXPIRE: 30 * 60 * 1000, // 30 minutes
};

/**
 * Generates a consistent cache key for a geographic area and search radius.
 */
export function getGeoCacheKey(type: string, lat: number, lon: number, radiusMeters: number): string {
    const latB = Math.floor(lat * GEO_CACHE_CONFIG.BUCKET_SIZE);
    const lonB = Math.floor(lon * GEO_CACHE_CONFIG.BUCKET_SIZE);
    const radB = Math.ceil(radiusMeters / GEO_CACHE_CONFIG.RADIUS_STEP);
    return `${type}:${latB},${lonB},${radB}`;
}
