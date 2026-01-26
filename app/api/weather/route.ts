import { NextResponse } from "next/server";
import { WeatherService } from "@/lib/services/weather-service";
import { WeatherIncomingBody, VehicleRoute } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body: WeatherIncomingBody = await req.json();
    const startTime = body?.startTime ?? new Date().toISOString();

    let routesToAnalyze: VehicleRoute[] = [];

    if (Array.isArray(body?.vehicleRoutes)) {
      routesToAnalyze = body.vehicleRoutes;
    }
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
