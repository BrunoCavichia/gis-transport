import { type NextRequest, NextResponse } from "next/server";
import { FetchError } from "@/lib/types";
const SNAP_RADIUS = 5000;
const REQUEST_TIMEOUT = 30000; // 30 segundos
const RETRIES = 2;

interface OrsLocation {
  location?: [number, number];
  snapped_distance?: number;
}

interface SnappedPoint {
  location: [number, number];
  snapped: boolean;
  distance?: number;
}

import { fetchWithRetry } from "@/app/helpers/fetch-helpers";

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const orsUrl = process.env.ORS_LOCAL_URL || "http://127.0.0.1:8080/ors/v2";
      const response = await fetchWithRetry(
        `${orsUrl}/snap/driving-car`,
        {
          method: "POST",
          headers: {
            // Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locations, radius: SNAP_RADIUS }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
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
