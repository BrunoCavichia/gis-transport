// app/api/matrix/route.ts
import { type NextRequest, NextResponse } from "next/server";

/**
 * Simple and accurate cost matrix for VROOM.
 * Returns actual travel costs without artificial penalties.
 */

const COST_PER_METER = 1;
const COST_PER_SECOND = 0.3;
const UNREACHABLE_COST = 999999999;
const MAX_LOCATIONS = 50; // Límite de ORS para matrices

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 coordinates" },
        { status: 400 }
      );
    }

    // Validar límite de ORS
    if (coordinates.length > MAX_LOCATIONS) {
      return NextResponse.json(
        {
          error: `Too many locations. Maximum is ${MAX_LOCATIONS}, got ${coordinates.length}`,
          tip: "Reduce el número de vehículos o jobs",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouteService API key not set" },
        { status: 500 }
      );
    }

    // Convertir [lat, lon] a [lon, lat] para ORS
    const locations = coordinates.map((coord: number[]) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error("Invalid coordinate format, expected [lat, lon]");
      }
      return [coord[1], coord[0]];
    });

    const orsUrl = "https://api.openrouteservice.org/v2/matrix/driving-car";

    // Crear AbortController para timeout manual
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    try {
      const orsResponse = await fetch(orsUrl, {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          locations,
          metrics: ["distance", "duration"],
          units: "m",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      if (!data.distances || !data.durations) {
        return NextResponse.json(
          { error: "ORS returned unexpected payload" },
          { status: 502 }
        );
      }

      const n = coordinates.length;

      // Create cost matrix: simple combination of distance + duration
      const cost: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
          if (i === j) return 0;

          const distance = Number(data.distances[i][j]);
          const duration = Number(data.durations[i][j]);

          // Check for invalid values
          if (
            !isFinite(distance) ||
            !isFinite(duration) ||
            distance < 0 ||
            duration < 0
          ) {
            return UNREACHABLE_COST;
          }

          // Simple linear combination
          const totalCost =
            distance * COST_PER_METER + duration * COST_PER_SECOND;

          return Math.round(totalCost);
        })
      );

      // Log matrix for debugging (optional, remove in production)
      console.log("📊 Cost Matrix generated:");
      console.log("Dimensions:", n, "x", n);
      console.log("Sample costs (first 3x3):");
      for (let i = 0; i < Math.min(3, n); i++) {
        console.log(cost[i].slice(0, Math.min(3, n)));
      }

      return NextResponse.json({ cost });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Request timeout",
            message:
              "La petición tardó más de 30 segundos. Prueba con menos ubicaciones.",
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
