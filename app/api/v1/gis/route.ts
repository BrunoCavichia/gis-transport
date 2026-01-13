import { NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { GisDataService } from "@/lib/services/gis-data-service";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const dashboardData = await GisDataService.getLatestSnapshot();

    if (!dashboardData) {
      return NextResponse.json(
        errorResponse("NO_DATA", "No optimization data available yet."),
        { status: 404 }
      );
    }

    // Calcula ETag solo sobre los datos reales, sin timestamp
    const hashInput = JSON.stringify(dashboardData);
    const hash = crypto.createHash("sha256").update(hashInput).digest("base64");
    const etag = `"${hash}"`; // Strong ETag

    // Conditional request
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // Crea el response con timestamp en el body
    const response = NextResponse.json(successResponse(dashboardData));
    response.headers.set("ETag", etag);
    response.headers.set(
      "Cache-Control",
      "private, must-revalidate, max-age=10"
    );

    return response;
  } catch (err) {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "Failed to fetch GIS data", String(err)),
      { status: 500 }
    );
  }
}
