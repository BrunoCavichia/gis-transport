import { type NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-utils";
import { FetchError, SnappedPoint } from "@/lib/types";
import { TIMEOUTS } from "@/lib/config";

async function snapCoordinatesInternal(
  coordinates: [number, number][]
): Promise<[number, number][]> {
  try {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
    const response = await fetchWithTimeout(`${baseURL}/api/snap-to-road`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates }),
      timeout: TIMEOUTS.ROUTING,
    });

    if (!response.ok) {
      console.warn("Snap-to-route failed, returning original coordinates");
      return coordinates;
    }

    const data = await response.json();
    if (!data.snapped || !Array.isArray(data.snapped)) return coordinates;

    return data.snapped.map((item: SnappedPoint, idx: number) => {
      if (item.snapped && item.location?.length === 2) {
        return item.location;
      }
      return coordinates[idx];
    });
  } catch (error) {
    console.error("Error calling snap-to-route:", error);
    return coordinates;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 coordinates for routing" },
        { status: 400 }
      );
    }

    let finalCoordinates = await snapCoordinatesInternal(coordinates);


    try {
      const orsUrl = process.env.ORS_LOCAL_URL || "http://127.0.0.1:8080/ors/v2";
      const response = await fetchWithTimeout(
        `${orsUrl}/directions/driving-car/geojson`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept:
              "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          },
          body: JSON.stringify({
            coordinates: finalCoordinates,
            instructions: false,
            preference: "recommended",
            radiuses: finalCoordinates.map(() => 5000),
          }),
          timeout: TIMEOUTS.ROUTING,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          {
            error: "Routing failed",
            details: errorText,
            fallback: true,
            coordinates: finalCoordinates,
            distance: 0,
            duration: 0,
          },
          { status: 502 }
        );
      }

      const data = await response.json();
      const routeCoordinates = data.features[0].geometry.coordinates;
      const properties = data.features[0].properties;
      const distance = properties?.summary?.distance || 0;
      const duration = properties?.summary?.duration || 0;

      return NextResponse.json({
        coordinates: routeCoordinates,
        distance: Math.round(distance),
        duration: Math.round(duration),
      });
    } catch (err) {
      const fetchError = err as FetchError;
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "Routing request timeout" },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
