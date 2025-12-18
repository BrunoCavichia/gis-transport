import { type NextRequest, NextResponse } from "next/server";

const SNAP_RADIUS = 5000; // 5 km
const REQUEST_TIMEOUT = 30000; // 30 segundos
const RETRIES = 2;

async function fetchWithRetry(url: string, options: any, retries = RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries) throw err;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    if (!coordinates || !Array.isArray(coordinates)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        snapped: coordinates.map(([lat, lon]: number[]) => ({
          location: [lat, lon],
          snapped: false,
        })),
      });
    }

    const locations = coordinates.map(([lat, lon]: number[]) => [lon, lat]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetchWithRetry(
        "https://api.openrouteservice.org/v2/snap/driving-car",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
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

      const snapped = data.locations.map((loc: any, idx: number) => {
        if (loc?.location?.length === 2 && loc.distance != null) {
          const [lon, lat] = loc.location;
          return { location: [lat, lon], snapped: true };
        }
        return { location: coordinates[idx], snapped: false };
      });

      return NextResponse.json({ snapped });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("Snap-to-road fetch error:", fetchError.message);

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
