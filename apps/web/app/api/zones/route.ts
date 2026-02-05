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
      `[API Zones] ${lat},${lon} R:${radius} => Found ${zones.length} zones`,
    );
    if (zones.length > 0) {
      const z = zones[0];
      const depth =
        Array.isArray(z.coordinates) && z.coordinates.length > 0
          ? Array.isArray(z.coordinates[0])
            ? Array.isArray(z.coordinates[0][0])
              ? Array.isArray(z.coordinates[0][0][0])
                ? "4D"
                : "3D"
              : "2D"
            : "1D"
          : "empty";
      console.log(
        `[API Zones] Sample: ${z.name}, type: ${z.type}, coords depth: ${depth}`,
      );
    }

    return NextResponse.json({ zones });
  } catch (err) {
    console.error("API Zones Error:", err);
    return NextResponse.json(
      { error: "Zones data unavailable" },
      { status: 503 },
    );
  }
}
