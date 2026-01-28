import { type NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-utils";
import { FetchError } from "@/lib/types";
import { TIMEOUTS, ROUTING_CONFIG } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 coordinates" },
        { status: 400 }
      );
    }

    if (coordinates.length > ROUTING_CONFIG.MAX_LOCATIONS) {
      return NextResponse.json(
        { error: `Too many locations. Maximum is ${ROUTING_CONFIG.MAX_LOCATIONS}` },
        { status: 400 }
      );
    }

    const locations = coordinates.map((coord) => [coord[1], coord[0]]);

    try {
      const orsUrl = process.env.ORS_LOCAL_URL || "http://127.0.0.1:8080/ors/v2";
      const orsResponse = await fetchWithTimeout(
        `${orsUrl}/matrix/driving-car`,
        {
          method: "POST",
          headers: {
            // Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locations,
            metrics: ["distance", "duration"],
            units: "m",
          }),
          timeout: TIMEOUTS.MATRIX,
        }
      );

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
            return ROUTING_CONFIG.UNREACHABLE_COST;
          return Math.round(
            distance * ROUTING_CONFIG.COST_PER_METER + duration * ROUTING_CONFIG.COST_PER_SECOND
          );
        })
      );

      return NextResponse.json({ cost });
    } catch (err) {
      const fetchError = err as FetchError;

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Request timeout",
            message: `Request exceeded ${TIMEOUTS.MATRIX / 1000
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
