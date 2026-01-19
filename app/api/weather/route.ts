import { NextResponse } from "next/server";

import {
  Segment,
  VroomRoute,
  Alert,
  RouteAlerts,
  WeatherRiskRequestFull,
  VehicleRouteSimple,
  IncomingBody,
} from "@/lib/types/weather-types";

export const runtime = "nodejs";

function sampleIndices(length: number, maxSamples = 5) {
  const n = Math.min(maxSamples, Math.max(1, length));
  if (n === 1) return [0];
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    indices.push(Math.round((i * (length - 1)) / (n - 1)));
  }
  return Array.from(new Set(indices));
}

export async function POST(req: Request) {
  try {
    const body: IncomingBody = await req.json();
    const startTimeStr = body?.startTime ?? new Date().toISOString();
    const startDate = new Date(startTimeStr);

    let routesWithSegments: { vehicle: number; segments: Segment[] }[] = [];

    // Detect full payload or simplified vehicleRoutes
    const looksFull =
      Array.isArray(body?.vehicles) &&
      Array.isArray(body?.jobs) &&
      Array.isArray(body?.locations) &&
      Array.isArray(body?.matrix);

    if (looksFull) {
      const { vehicles, jobs, locations, matrix } =
        body as WeatherRiskRequestFull;
      // call VROOM
      const vroomRes = await fetch("http://localhost:3002", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles, jobs, matrix }),
      });
      if (!vroomRes.ok)
        return NextResponse.json(
          { error: await vroomRes.text() },
          { status: vroomRes.status }
        );

      const vroomData: { routes: VroomRoute[] } = await vroomRes.json();
      for (const route of vroomData.routes) {
        const segments: Segment[] = route.steps
          .filter((s) => s.type === "job")
          .map((s) => {
            const loc = locations[s.location_index];
            const etaDate = new Date(startDate.getTime() + s.arrival * 1000);
            return { lat: loc.lat, lon: loc.lon, eta: etaDate.toISOString() };
          });
        routesWithSegments.push({ vehicle: route.vehicle, segments });
      }
    } else if (Array.isArray(body?.vehicleRoutes)) {
      const vehicleRoutes: VehicleRouteSimple[] = body.vehicleRoutes;
      for (const vr of vehicleRoutes) {
        const coords = vr.coordinates || [];
        const indices = sampleIndices(coords.length, 5);
        const durationSeconds = vr.duration ?? 0;
        const segments: Segment[] = indices.map((idx) => {
          const [lat, lon] = coords[idx];
          const [sLat, sLon] =
            Math.abs(lat) <= 90 && Math.abs(lon) <= 180
              ? [lat, lon]
              : [lon, lat];
          const frac = coords.length <= 1 ? 0 : idx / (coords.length - 1);
          const etaDate = new Date(
            startDate.getTime() + Math.round(frac * durationSeconds * 1000)
          );
          return { lat: sLat, lon: sLon, eta: etaDate.toISOString() };
        });
        routesWithSegments.push({ vehicle: vr.vehicleId, segments });
      }
    } else {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "Missing OpenWeatherMap API key" },
        { status: 500 }
      );

    const results: RouteAlerts[] = [];

    for (const route of routesWithSegments) {
      const alerts: Alert[] = [];
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${seg.lat}&lon=${seg.lon}&units=metric&appid=${apiKey}`
        );
        if (!forecastRes.ok) continue;
        const forecastData = await forecastRes.json();
        const forecastList = forecastData.list;
        if (!Array.isArray(forecastList) || forecastList.length === 0) continue;

        const etaTime = new Date(seg.eta).getTime() / 1000;
        let closest = forecastList[0];
        let minDiff = Math.abs(etaTime - closest.dt);
        for (const item of forecastList) {
          const diff = Math.abs(etaTime - item.dt);
          if (diff < minDiff) {
            minDiff = diff;
            closest = item;
          }
        }

        const temp = closest.main?.temp ?? NaN;
        const rain = closest.rain?.["3h"] ?? 0;
        const snow = closest.snow?.["3h"] ?? 0;
        const wind = closest.wind?.speed ?? 0;
        const visibility = closest.visibility ?? 10000;

        // realistic driver alerts
        if (snow > 0) {
          alerts.push({
            segmentIndex: i,
            event: "SNOW",
            severity: snow >= 5 ? "HIGH" : "MEDIUM",
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: "Nieve en ruta: reducir velocidad y precaución.",
          });
        }
        if (rain > 10) {
          const severity = rain >= 20 ? "HIGH" : "MEDIUM";
          alerts.push({
            segmentIndex: i,
            event: "RAIN",
            severity,
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: "Lluvia significativa: posible hidroplaneo.",
          });
        }
        if (temp <= 0 && rain > 0) {
          alerts.push({
            segmentIndex: i,
            event: "ICE",
            severity: "HIGH",
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: "Riesgo de hielo: extremar precaución.",
          });
        }
        if (wind >= 10) {
          const severity: "LOW" | "MEDIUM" | "HIGH" =
            wind >= 20 ? "HIGH" : "MEDIUM";
          alerts.push({
            segmentIndex: i,
            event: "WIND",
            severity,
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: `Viento fuerte (${wind.toFixed(1)} m/s): sujetar volante.`,
          });
        }
        if (visibility < 1000) {
          alerts.push({
            segmentIndex: i,
            event: "FOG",
            severity: "MEDIUM",
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: `Niebla: visibilidad reducida (${visibility} m).`,
          });
        }
        if (temp >= 35) {
          alerts.push({
            segmentIndex: i,
            event: "HEAT",
            severity: "MEDIUM",
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: "Calor extremo: hidratarse y evitar sobreesfuerzo.",
          });
        }
        if (temp <= -5) {
          alerts.push({
            segmentIndex: i,
            event: "COLD",
            severity: "MEDIUM",
            timeWindow: seg.eta,
            lat: seg.lat,
            lon: seg.lon,
            message: "Frío intenso: precaución con motor y combustible.",
          });
        }
      }

      const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
        alerts.length === 0
          ? "LOW"
          : alerts.some((a) => a.severity === "HIGH")
            ? "HIGH"
            : "MEDIUM";

      results.push({ vehicle: route.vehicle, riskLevel, alerts });
    }

    return NextResponse.json({ routes: results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
