import { type NextRequest, NextResponse } from "next/server";
import { POIService } from "@/lib/services/poi-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const distanceStr = searchParams.get("distance") || "1"; // km

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const distanceKm = Math.max(0.1, Math.min(parseFloat(distanceStr) || 1, 50));

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const stations = await POIService.getEVStations(lat, lon, distanceKm);
    return NextResponse.json({ stations });
  } catch (err) {
    console.error("API EV Stations Error:", err);
    return NextResponse.json({ error: "EV data unavailable" }, { status: 503 });
  }
}
