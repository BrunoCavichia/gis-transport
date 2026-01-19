// app/api/routing/route.ts
import { type NextRequest, NextResponse } from "next/server";

const REQUEST_TIMEOUT = 15000;

async function snapCoordinatesInternal(
  coordinates: [number, number][]
): Promise<[number, number][]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(`http://localhost:3005/api/snap-to-road`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Snap-to-route failed, returning original coordinates");
      return coordinates;
    }

    const data = await response.json();
    if (!data.snapped || !Array.isArray(data.snapped)) return coordinates;

    return data.snapped.map((item: any, idx: number) => {
      if (item.snapped && item.location?.length === 2) return item.location;
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

    // const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    // if (!apiKey) {
    //   return NextResponse.json(
    //     { error: "OpenRouteService API key not configured" },
    //     { status: 500 }
    //   );
    // }

    // SNAP usando tu endpoint interno
    let finalCoordinates = await snapCoordinatesInternal(coordinates);

    // Convertir [lat, lon] a [lon, lat] para ORS
    const locations = finalCoordinates.map(([lat, lon]: number[]) => [
      lon,
      lat,
    ]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const orsUrl = process.env.ORS_LOCAL_URL || "http://127.0.0.1:8080/ors/v2";
      const response = await fetch(
        `${orsUrl}/directions/driving-car/geojson`,
        {
          method: "POST",
          headers: {
            // Authorization: apiKey,
            "Content-Type": "application/json",
            Accept:
              "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          },
          body: JSON.stringify({
            coordinates: locations,
            instructions: false,
            preference: "recommended",
            radiuses: locations.map(() => 5000),
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

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
      const routeCoordinates = data.features[0].geometry.coordinates.map(
        ([lon, lat]: number[]) => [lat, lon]
      );
      const properties = data.features[0].properties;
      const distance = properties?.summary?.distance || 0;
      const duration = properties?.summary?.duration || 0;

      return NextResponse.json({
        coordinates: routeCoordinates,
        distance: Math.round(distance),
        duration: Math.round(duration),
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
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
