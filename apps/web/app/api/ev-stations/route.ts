import { type NextRequest, NextResponse } from "next/server";
import { POIService } from "@/lib/services/poi-service";

import { extractParams } from "@/app/helpers/api-helpers";

export async function GET(request: NextRequest) {
  const result = extractParams(request);
  if (result instanceof NextResponse) return result;

  const { lat, lon, radius, limit } = result.params;
  const distanceKm = radius / 1000;

  try {
    const allStations = await POIService.getEVStations(lat, lon, distanceKm);
    const stations = allStations.slice(0, limit);
    console.log(
      `[API EV] lat=${lat}, lon=${lon}, distKm=${distanceKm}, limit=${limit} => ${stations.length} stations`,
    );
    return NextResponse.json({ stations });
  } catch (err) {
    console.error("API EV Stations Error:", err);
    return NextResponse.json({ error: "EV data unavailable" }, { status: 503 });
  }
}
