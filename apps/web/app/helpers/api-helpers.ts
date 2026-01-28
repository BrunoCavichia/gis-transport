import { SearchPOIParamsSchema, SearchPOIParams } from "@gis/shared";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extracts and validates common POI search parameters from a request.
 * 
 * @param request - The NextRequest object.
 * @returns An object with validated parameters or a NextResponse error.
 */
export function extractParams(
    request: NextRequest
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
            { status: 400 }
        );
    }

    return { params: result.data };
}
