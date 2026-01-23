import { type NextRequest, NextResponse } from "next/server";
import { POIService } from "@/lib/services/poi-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const radiusStr = searchParams.get("radius") ?? "5000";
  const limitStr = searchParams.get("limit") || "100";

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Missing coords" }, { status: 400 });
  }
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const radius = Math.min(parseInt(radiusStr), 100000);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const limit = Math.min(parseInt(limitStr) || 100, 200);
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
