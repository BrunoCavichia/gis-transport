import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZoneService } from "@/lib/services/zone-service";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lon = parseFloat(url.searchParams.get("lon") || "");
  const radius = parseFloat(url.searchParams.get("radius") || "5000");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Missing or invalid coordinates" },
      { status: 400 }
    );
  }

  try {
    const zones = await ZoneService.getZones(lat, lon, radius);
    return NextResponse.json({ zones });
  } catch (err) {
    console.error("API Zones Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}
