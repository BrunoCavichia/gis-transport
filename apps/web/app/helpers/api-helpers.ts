import { SearchPOIParamsSchema, SearchPOIParams } from "@gis/shared";
import { NextRequest, NextResponse } from "next/server";

/**
 * Calculates the Haversine distance between two points on Earth.
 *
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @param unit - Unit for the result: 'km' for kilometers, 'm' for meters
 * @returns Distance between the two points in the specified unit
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: "km" | "m" = "km",
): number {
  const R = unit === "km" ? 6371 : 6371000; // Earth radius in km or meters
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

/**
 * Extracts and validates common POI search parameters from a request.
 *
 * @param request - The NextRequest object.
 * @returns An object with validated parameters or a NextResponse error.
 */
export function extractParams(
  request: NextRequest,
): { params: SearchPOIParams } | NextResponse {
  const searchParamsEntries = Object.fromEntries(request.nextUrl.searchParams);

  // Support 'distance' as an alias for 'radius'
  if (!searchParamsEntries.radius && searchParamsEntries.distance) {
    searchParamsEntries.radius = searchParamsEntries.distance;
  }

  const result = SearchPOIParamsSchema.safeParse(searchParamsEntries);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: result.error.format() },
      { status: 400 },
    );
  }

  return { params: result.data };
}
