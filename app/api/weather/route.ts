import { NextResponse } from "next/server";

type LatLon = [number, number];

interface Location {
  lat: number;
  lon: number;
}

interface Vehicle {
  id: number;
  type?: string;
}

interface Job {
  id: number;
  location_index: number;
  service: number;
}

interface Segment {
  lat: number;
  lon: number;
  eta: string; // ISO string
}

interface VroomStep {
  type: string;
  location_index: number;
  arrival: number; // en segundos
}

interface VroomRoute {
  vehicle: number;
  steps: VroomStep[];
}

interface Alert {
  segmentIndex: number;
  event: "SNOW" | "RAIN" | "ICE" | "WIND" | "FOG";
  severity: "LOW" | "MEDIUM" | "HIGH";
  timeWindow: string;
  message: string;
}

interface RouteAlerts {
  vehicle: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  alerts: Alert[];
}

interface WeatherRiskRequestFull {
  vehicles: Vehicle[];
  jobs: Job[];
  locations: Location[];
  matrix: number[][];
  startTime?: string;
}

interface VehicleRouteSimple {
  vehicleId: number;
  coordinates: LatLon[]; // assumed [lat, lon]
  distance?: number;
  duration?: number; // seconds
  color?: string;
  jobsAssigned?: number;
}

type IncomingBody =
  | WeatherRiskRequestFull
  | { vehicleRoutes?: VehicleRouteSimple[]; startTime?: string }
  | any;

export const runtime = "nodejs";

function sampleIndices(length: number, maxSamples = 5) {
  const n = Math.min(maxSamples, Math.max(1, length));
  if (n === 1) return [0];
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    indices.push(Math.round((i * (length - 1)) / (n - 1)));
  }
  // unique
  return Array.from(new Set(indices));
}

export async function POST(req: Request) {
  try {
    const body: IncomingBody = await req.json();
    console.log("🔹 BODY RECIBIDO:", body);

    // If caller sent the full VROOM-compatible payload
    const looksFull =
      Array.isArray(body?.vehicles) &&
      Array.isArray(body?.jobs) &&
      Array.isArray(body?.locations) &&
      Array.isArray(body?.matrix);

    let routesWithSegments: { vehicle: number; segments: Segment[] }[] = [];
    const startTimeStr = body?.startTime ?? new Date().toISOString();
    const startDate = new Date(startTimeStr);

    if (looksFull) {
      // Validate minimal presence
      const { vehicles, jobs, locations, matrix, startTime } =
        body as WeatherRiskRequestFull;
      if (!vehicles || !jobs || !locations || !matrix) {
        console.log("❌ Faltan campos en payload full:", {
          vehicles: vehicles?.length ?? "undefined",
          jobs: jobs?.length ?? "undefined",
          locations: locations?.length ?? "undefined",
          matrix: matrix?.length ?? "undefined",
          startTime,
        });
        return NextResponse.json(
          { error: "Missing required data" },
          { status: 400 }
        );
      }

      console.log(
        `✅ Payload full recibido: vehicles=${vehicles.length}, jobs=${jobs.length}, locations=${locations.length}`
      );

      // We need VROOM to compute route -> call VROOM as before
      const vroomRes = await fetch("http://localhost:3002", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles, jobs, matrix }),
      });

      if (!vroomRes.ok) {
        const errText = await vroomRes.text();
        console.log("❌ Error VROOM:", errText);
        return NextResponse.json(
          { error: errText },
          { status: vroomRes.status }
        );
      }

      const vroomData: { routes: VroomRoute[] } = await vroomRes.json();
      if (!vroomData.routes || vroomData.routes.length === 0) {
        console.log("❌ VROOM no devolvió rutas");
        return NextResponse.json(
          { error: "No routes returned by VROOM" },
          { status: 500 }
        );
      }

      // Map VROOM steps -> segments (using arrival times from VROOM)
      for (const route of vroomData.routes) {
        const segments: Segment[] = route.steps
          .filter((s) => s.type === "job")
          .map((s) => {
            const loc = (body as WeatherRiskRequestFull).locations[
              s.location_index
            ];
            const etaDate = new Date(startDate.getTime() + s.arrival * 1000);
            return { lat: loc.lat, lon: loc.lon, eta: etaDate.toISOString() };
          });
        routesWithSegments.push({ vehicle: route.vehicle, segments });
      }

      console.log("🔹 Segments from VROOM:", routesWithSegments);
    } else if (Array.isArray(body?.vehicleRoutes)) {
      // Simplified flow: frontend sent vehicleRoutes (what you're currently sending)
      const vehicleRoutes: VehicleRouteSimple[] = body.vehicleRoutes;
      const assumedStart = startDate;
      console.log(
        `✅ Payload simple recibido: vehicleRoutes=${
          vehicleRoutes.length
        }, start=${assumedStart.toISOString()}`
      );

      for (const vr of vehicleRoutes) {
        const coords = vr.coordinates || [];
        if (!coords || coords.length === 0) {
          routesWithSegments.push({ vehicle: vr.vehicleId, segments: [] });
          continue;
        }

        // decide how many sample points (max 5)
        const indices = sampleIndices(coords.length, 5);
        const durationSeconds =
          typeof vr.duration === "number" &&
          isFinite(vr.duration) &&
          vr.duration > 0
            ? vr.duration
            : 0;
        const segments: Segment[] = indices.map((idx, sampleIdx) => {
          const [lat, lon] = coords[idx];
          // if coordinates were [lon, lat] accidentally, heuristic: lat in [-90,90] -> assume [lat,lon]
          const [sLat, sLon] =
            Math.abs(lat) <= 90 && Math.abs(lon) <= 180
              ? [lat, lon]
              : [lon, lat];
          const frac = coords.length <= 1 ? 0 : idx / (coords.length - 1); // 0..1 along route
          const etaDate = new Date(
            assumedStart.getTime() + Math.round(frac * durationSeconds * 1000)
          );
          return { lat: sLat, lon: sLon, eta: etaDate.toISOString() };
        });

        routesWithSegments.push({ vehicle: vr.vehicleId, segments });
      }

      console.log(
        "🔹 Segments generated from vehicleRoutes:",
        routesWithSegments
      );
    } else {
      console.log(
        "❌ Payload no reconocido. Esperado 'vehicleRoutes' o payload full."
      );
      return NextResponse.json(
        { error: "Invalid payload shape. Send vehicleRoutes or full payload." },
        { status: 400 }
      );
    }

    // Now we have routesWithSegments -> query forecast and produce alerts
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      console.log("❌ Missing OpenWeatherMap API key");
      return NextResponse.json(
        { error: "Missing OpenWeatherMap API key" },
        { status: 500 }
      );
    }

    const results: RouteAlerts[] = [];

    for (const route of routesWithSegments) {
      const alerts: Alert[] = [];

      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        console.log(
          `🔹 Processing vehicle ${route.vehicle} segment ${i}:`,
          seg
        );

        // call forecast
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${seg.lat}&lon=${seg.lon}&units=metric&appid=${apiKey}`
        );
        if (!forecastRes.ok) {
          console.log(
            `❌ Forecast fetch failed for seg ${i}:`,
            forecastRes.status
          );
          continue;
        }
        const forecastData = await forecastRes.json();
        const forecastList = forecastData.list;
        if (!Array.isArray(forecastList) || forecastList.length === 0) {
          console.log("❌ Forecast list empty for seg", seg);
          continue;
        }

        // find closest forecast entry
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

        console.log(
          `   🌦 Forecast: temp=${temp}, rain=${rain}, snow=${snow}, wind=${wind}, vis=${visibility}`
        );

        // map to events (no vehicle mitigation considered)
        if (snow > 0) {
          const severity: "LOW" | "MEDIUM" | "HIGH" =
            snow >= 5 ? "HIGH" : "MEDIUM";
          alerts.push({
            segmentIndex: i,
            event: "SNOW",
            severity,
            timeWindow: seg.eta,
            message: "Nieve prevista en el tramo.",
          });
        } else if (rain > 10 && temp > 0) {
          const severity: "LOW" | "MEDIUM" | "HIGH" =
            rain >= 20 ? "HIGH" : "MEDIUM";
          alerts.push({
            segmentIndex: i,
            event: "RAIN",
            severity,
            timeWindow: seg.eta,
            message: "Lluvia intensa prevista en el tramo.",
          });
        } else if (temp <= 0 && rain > 0) {
          alerts.push({
            segmentIndex: i,
            event: "ICE",
            severity: "HIGH",
            timeWindow: seg.eta,
            message:
              "Posible hielo en el tramo debido a lluvia y temperatura bajo cero.",
          });
        } else if (wind >= 15) {
          const severity: "LOW" | "MEDIUM" | "HIGH" =
            wind >= 20 ? "HIGH" : "MEDIUM";
          alerts.push({
            segmentIndex: i,
            event: "WIND",
            severity,
            timeWindow: seg.eta,
            message: `Viento fuerte previsto en el tramo (${wind} m/s).`,
          });
        } else if (visibility < 1000) {
          alerts.push({
            segmentIndex: i,
            event: "FOG",
            severity: "MEDIUM",
            timeWindow: seg.eta,
            message: `Visibilidad reducida en el tramo (${visibility} m).`,
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

    console.log("✅ Final alerts:", results);
    return NextResponse.json({ routes: results });
  } catch (err) {
    console.error("💥 Error in /api/weather:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
