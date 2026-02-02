// app/api/v1/optimize/route.ts
import { NextResponse } from "next/server";
import { RoutingService } from "@/lib/services/routing-service";
import { GisDataService } from "@/lib/services/gis-data-service";
import {
  FleetVehicle,
  FleetJob,
  RouteData,
  VehicleRoute,
  RouteWeather,
  WeatherAlert,
  Zone,
  IGisResponse,
  GisDashboardData,
  OptimizeOptions,
} from "@gis/shared";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vehicles, jobs, startTime, zones } = body as {
      vehicles: FleetVehicle[];
      jobs: FleetJob[];
    } & OptimizeOptions;

    if (!vehicles || !jobs) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Missing vehicles or jobs" },
        } as IGisResponse,
        { status: 400 },
      );
    }

    const routeData: RouteData = await RoutingService.optimize(vehicles, jobs, {
      startTime,
      zones,
    });

    const vehicleRoutes: VehicleRoute[] = routeData.vehicleRoutes || [];
    const weatherRoutes: RouteWeather[] = routeData.weatherRoutes || [];

    // 2. Build context for persistence
    const context: GisDashboardData = {
      meta: {
        generatedAt: new Date().toISOString(),
      },
      fleet: {
        totalVehicles: vehicles.length,
        activeVehicles: vehicleRoutes.length,
        vehiclesByType: vehicles.reduce(
          (acc: Record<string, number>, v: FleetVehicle) => ({
            ...acc,
            [v.type.id]: (acc[v.type.id] || 0) + 1,
          }),
          {},
        ),
        vehicles: vehicles.map((v: FleetVehicle) => ({
          id: v.id,
          type: v.type.id,
          label: v.label, // Use v.label now
          position: v.position, // Use v.position now
        })),
      },
      optimization: {
        status: "optimized",
        totalJobs: jobs.length,
        assignedJobs: vehicleRoutes.reduce(
          (acc: number, r: VehicleRoute) => acc + (r.jobsAssigned || 0),
          0,
        ),
        unassignedJobs:
          jobs.length -
          vehicleRoutes.reduce(
            (acc: number, r: VehicleRoute) => acc + (r.jobsAssigned || 0),
            0,
          ),
        routes: vehicleRoutes.map((r: VehicleRoute) => ({
          vehicleId: r.vehicleId,
          jobsAssigned: r.jobsAssigned,
          distanceFormatted: `${(r.distance / 1000).toFixed(1)} km`,
          durationFormatted: `${Math.floor(r.duration / 3600)}h ${Math.floor(
            (r.duration % 3600) / 60,
          )}m`,
          startPoint: r.coordinates[0],
          endPoint: r.coordinates[r.coordinates.length - 1],
        })),
        totals: {
          distanceFormatted: `${(routeData.distance / 1000).toFixed(1)} km`,
          durationFormatted: `${Math.floor(
            routeData.duration / 3600,
          )}h ${Math.floor((routeData.duration % 3600) / 60)}m`,
        },
      },
      weather: {
        overallRisk: weatherRoutes.some(
          (r: RouteWeather) => r.riskLevel === "HIGH",
        )
          ? "HIGH"
          : weatherRoutes.some((r: RouteWeather) => r.riskLevel === "MEDIUM")
            ? "MEDIUM"
            : "LOW",
        alertCount: weatherRoutes.reduce(
          (acc: number, r: RouteWeather) => acc + (r.alerts?.length || 0),
          0,
        ),
        alertsByType: {},
        affectedRoutes: weatherRoutes.filter(
          (r: RouteWeather) => r.alerts?.length > 0,
        ).length,
        alerts: weatherRoutes.flatMap((r: RouteWeather) =>
          r.alerts.map((a: WeatherAlert) => ({
            vehicleId: r.vehicle,
            event: a.event,
            severity: a.severity,
            location: [a.lat, a.lon] as [number, number],
            message: a.message,
            timeWindow: a.timeWindow || new Date().toISOString(),
          })),
        ),
      },
    };

    // 3. Persist background snapshot
    GisDataService.saveSnapshot(context).catch((err: unknown) =>
      console.error("Failed to save background snapshot in orchestrator", err),
    );

    return NextResponse.json({
      success: true,
      data: routeData,
    } as IGisResponse<RouteData>);
  } catch (error) {
    console.error("Orchestrator error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: (error as Error).message,
        },
      } as IGisResponse,
      { status: 500 },
    );
  }
}
