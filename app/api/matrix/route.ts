import { type NextRequest, NextResponse } from "next/server";

const COST_PER_METER = 1;
const COST_PER_SECOND = 0.3;
const UNREACHABLE_COST = 999999999;
const MAX_LOCATIONS = 50;
const REQUEST_TIMEOUT = 60000; // 60 segundos
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

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 coordinates" },
        { status: 400 }
      );
    }

    if (coordinates.length > MAX_LOCATIONS) {
      return NextResponse.json(
        { error: `Too many locations. Maximum is ${MAX_LOCATIONS}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "OpenRouteService API key not set" },
        { status: 500 }
      );

    const locations = coordinates.map((coord) => [coord[1], coord[0]]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const orsResponse = await fetchWithRetry(
        "https://api.openrouteservice.org/v2/matrix/driving-car",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locations,
            metrics: ["distance", "duration"],
            units: "m",
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!orsResponse) throw new Error("ORS matrix request failed");

      if (!orsResponse.ok) {
        const text = await orsResponse.text();
        return NextResponse.json(
          {
            error: "ORS matrix request failed",
            status: orsResponse.status,
            body: text,
          },
          { status: 502 }
        );
      }

      const data = await orsResponse.json();
      const n = coordinates.length;

      const cost: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
          if (i === j) return 0;
          const distance = Number(data.distances[i][j]);
          const duration = Number(data.durations[i][j]);
          if (
            !isFinite(distance) ||
            !isFinite(duration) ||
            distance < 0 ||
            duration < 0
          )
            return UNREACHABLE_COST;
          return Math.round(
            distance * COST_PER_METER + duration * COST_PER_SECOND
          );
        })
      );

      return NextResponse.json({ cost });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Request timeout",
            message: `Request exceeded ${
              REQUEST_TIMEOUT / 1000
            }s. Reduce locations.`,
            locations: coordinates.length,
          },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Matrix API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
