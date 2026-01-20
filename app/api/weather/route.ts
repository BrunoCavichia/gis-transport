import { NextResponse } from "next/server";
import { WeatherService } from "@/lib/services/weather-service";
import { IncomingBody, VehicleRouteSimple } from "@/lib/types/weather-types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body: IncomingBody = await req.json();
    const startTime = body?.startTime ?? new Date().toISOString();

    let routesToAnalyze: VehicleRouteSimple[] = [];

    // Protocol 1: Simplified vehicleRoutes (most common)
    if (Array.isArray(body?.vehicleRoutes)) {
      routesToAnalyze = body.vehicleRoutes;
    }
    // Protocol 2: Full payload (backward compatibility)
    else if (body?.vehicles && body?.jobs && body?.locations && body?.matrix) {
      return NextResponse.json({ error: "Full payload must be handled via /api/gis/optimize" }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Invalid payload: missing vehicleRoutes" }, { status: 400 });
    }

    const results = await WeatherService.analyzeRoutes(routesToAnalyze, startTime);

    return NextResponse.json({ routes: results });
  } catch (err) {
    console.error("[Weather API] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
