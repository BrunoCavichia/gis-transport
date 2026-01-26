import { NextRequest, NextResponse } from "next/server";

export interface POIParams {
    lat: number;
    lon: number;
    radius: number;
    limit: number;
}

/**
 * Extracts and validates common POI search parameters from a request.
 * 
 * @param request - The NextRequest object.
 * @param defaultRadius - The default radius in meters.
 * @returns An object with validated parameters or a NextResponse error.
 */
export function extractPOIParams(
    request: NextRequest,
    defaultRadius = 5000
): { params: POIParams } | NextResponse {
    const searchParams = request.nextUrl.searchParams;
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    const radiusStr = searchParams.get("radius") || searchParams.get("distance");
    const limitStr = searchParams.get("limit") || "100";

    if (!latStr || !lonStr) {
        return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const radius = Math.max(100, Math.min(parseInt(radiusStr || String(defaultRadius)), 100000));
    const limit = Math.max(1, Math.min(parseInt(limitStr) || 100, 200));

    if (isNaN(lat) || isNaN(lon)) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    return {
        params: { lat, lon, radius, limit }
    };
}
