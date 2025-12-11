import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startLat = searchParams.get("startLat");
  const startLon = searchParams.get("startLon");
  const endLat = searchParams.get("endLat");
  const endLon = searchParams.get("endLon");

  if (!startLat || !startLon || !endLat || !endLon) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  try {
    // OSRM Route Service - format: /route/v1/{profile}/{coordinates}
    // coordinates format: {longitude},{latitude};{longitude},{latitude}
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true&annotations=true`;

    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.code !== "Ok") {
      return NextResponse.json(
        { error: data.message || "OSRM routing failed", code: data.code },
        { status: 400 }
      );
    }

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    const route = data.routes[0];

    // Convert GeoJSON coordinates from [lon, lat] to [lat, lon] for Leaflet
    const coordinates = route.geometry.coordinates.map((c: number[]) => [
      c[1],
      c[0],
    ]);

    // Extract turn-by-turn instructions from all legs and steps
    const instructions = (route.legs || []).flatMap(
      (leg: any) =>
        leg.steps?.map((step: any) => {
          // Build instruction text
          let instructionText = step.maneuver?.instruction || "";

          return {
            text: instructionText,
            distance: step.distance || 0,
            duration: step.duration || 0,
            type: step.maneuver?.type,
            modifier: step.maneuver?.modifier,
          };
        }) || []
    );

    return NextResponse.json({
      coordinates,
      distance: route.distance,
      duration: route.duration,
      instructions,
      waypoints: data.waypoints?.map((wp: any) => ({
        name: wp.name,
        location: [wp.location[1], wp.location[0]],
      })),
    });
  } catch (error) {
    console.error("OSRM routing error:", error);
    return NextResponse.json(
      { error: "Routing service unavailable" },
      { status: 500 }
    );
  }
}
