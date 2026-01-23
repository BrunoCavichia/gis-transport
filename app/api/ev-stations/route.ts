import { type NextRequest, NextResponse } from "next/server";
import { POIService } from "@/lib/services/poi-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const distanceStr = searchParams.get("distance") || "5000";
  const limitStr = searchParams.get("limit") || "100";

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  // Distance comes in meters from client, convert to km
  const distanceMeters = Math.max(
    100,
    Math.min(parseFloat(distanceStr) || 5000, 100000),
  );
  const distanceKm = distanceMeters / 1000;

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const limit = Math.min(parseInt(limitStr) || 100, 200);
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
