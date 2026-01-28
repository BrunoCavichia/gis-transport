import { type NextRequest, NextResponse } from "next/server";
import { ZoneService } from "@/lib/services/zone-service";
import { extractParams } from "@/app/helpers/api-helpers";

export async function GET(request: NextRequest) {
  const result = extractParams(request);
  if (result instanceof NextResponse) return result;

  const { lat, lon, radius, limit } = result.params;

  try {
    const allZones = await ZoneService.getZones(lat, lon, radius);
    const zones = allZones.slice(0, limit);
    console.log(
      `[API Zones] lat=${lat}, lon=${lon}, radius=${radius}, limit=${limit} => ${zones.length} zones`,
    );
    return NextResponse.json({ zones });
  } catch (err) {
    console.error("API Zones Error:", err);
    return NextResponse.json({ error: "Zones data unavailable" }, { status: 503 });
  }
}
