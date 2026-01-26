import { type NextRequest, NextResponse } from "next/server";
import { POIService } from "@/lib/services/poi-service";

import { extractParams } from "@/app/helpers/api-helpers";

export async function GET(request: NextRequest) {
  const result = extractParams(request);
  if (result instanceof NextResponse) return result;

  const { lat, lon, radius, limit } = result.params;

  try {
    const allStations = await POIService.getGasStations(lat, lon, radius);
    const stations = allStations.slice(0, limit);
    console.log(
      `[API Gas] lat=${lat}, lon=${lon}, radius=${radius}, limit=${limit} => ${stations.length} stations`,
    );
    return NextResponse.json({ stations });
  } catch (err) {
    console.error("API Gas Stations Error:", err);
    return NextResponse.json(
      { error: "Gas stations data unavailable" },
      { status: 503 },
    );
  }
}
