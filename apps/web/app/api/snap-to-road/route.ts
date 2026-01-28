import { type NextRequest, NextResponse } from "next/server";
import { FetchError, OrsLocation, SnappedPoint } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/fetch-utils";
import { TIMEOUTS, ROUTING_CONFIG } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    if (!coordinates || !Array.isArray(coordinates)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }
    const locations = coordinates.map(([lat, lon]: number[]) => [lon, lat]);

    try {
      const orsUrl = process.env.ORS_LOCAL_URL || "http://127.0.0.1:8080/ors/v2";
      const response = await fetchWithTimeout(
        `${orsUrl}/snap/driving-car`,
        {
          method: "POST",
          headers: {
            // Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locations, radius: ROUTING_CONFIG.DEFAULT_RADIUS }),
          timeout: TIMEOUTS.SNAP,
        }
      );

      if (!response) throw new Error("ORS snap failed");

      if (!response.ok) throw new Error(`ORS snap failed ${response.status}`);

      const data = await response.json();

      const snapped: SnappedPoint[] = data.locations.map((loc: OrsLocation, idx: number) => {
        if (loc.location?.length === 2 && loc.snapped_distance != null) {
          const [lon, lat] = loc.location;
          console.log(`[Snap] Point ${idx}: [${coordinates[idx]}] -> [${lat}, ${lon}] (distance: ${loc.snapped_distance}m)`);
          return { location: [lat, lon], snapped: true, distance: loc.snapped_distance };
        }
        console.log(`[Snap] Point ${idx}: Could not snap [${coordinates[idx]}]`);
        return { location: coordinates[idx], snapped: false };
      });

      return NextResponse.json({ snapped });
    } catch (err) {
      const error = err as FetchError;
      console.error("Snap-to-road fetch error:", error.message);

      return NextResponse.json({
        snapped: coordinates.map(([lat, lon]: number[]) => ({
          location: [lat, lon],
          snapped: false,
        })),
      });
    }
  } catch (error) {
    console.error("Snap-to-road error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
