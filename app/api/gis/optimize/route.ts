// app/api/v1/optimize/route.ts
import { NextResponse } from "next/server";
import { RoutingService } from "@/lib/services/routing-service";
import { GisDataService } from "@/lib/services/gis-data-service";
import { GisDataContext } from "@/lib/services/gis-data-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vehicles, jobs, startTime } = body;

    if (!vehicles || !jobs) {
      return NextResponse.json(
        { error: "Missing vehicles or jobs" },
        { status: 400 }
      );
    }

    // 1. Run the heavy lifting
    const routeData = await RoutingService.optimize(vehicles, jobs, {
      startTime,
    });

    const vehicleRoutes = routeData.vehicleRoutes || [];
    const weatherRoutes = routeData.weatherRoutes || [];

    // 2. Build context for persistence
    const context: GisDataContext = {
      fleet: {
        totalVehicles: vehicles.length,
        activeVehicles: vehicleRoutes.length,
        vehiclesByType: vehicles.reduce(
          (acc: any, v: any) => ({
            ...acc,
            [v.type.id]: (acc[v.type.id] || 0) + 1,
          }),
          {}
        ),
        vehicles: vehicles.map((v: any) => ({
          id: v.id,
          type: v.type.id,
          label: v.type.label,
          position: v.coords,
        })),
      },
      optimization: {
        status: "optimized",
        totalJobs: jobs.length,
        assignedJobs: vehicleRoutes.reduce(
          (acc: number, r: any) => acc + (r.jobsAssigned || 0),
          0
        ),
        unassignedJobs:
          jobs.length -
          vehicleRoutes.reduce(
            (acc: number, r: any) => acc + (r.jobsAssigned || 0),
            0
          ),
        routes: vehicleRoutes.map((r: any) => ({
          vehicleId: r.vehicleId,
          jobsAssigned: r.jobsAssigned,
          distanceFormatted: `${(r.distance / 1000).toFixed(1)} km`,
          durationFormatted: `${Math.floor(r.duration / 3600)}h ${Math.floor(
            (r.duration % 3600) / 60
          )}m`,
          startPoint: r.coordinates[0],
          endPoint: r.coordinates[r.coordinates.length - 1],
        })),
        totals: {
          distanceFormatted: `${(routeData.distance / 1000).toFixed(1)} km`,
          durationFormatted: `${Math.floor(
            routeData.duration / 3600
          )}h ${Math.floor((routeData.duration % 3600) / 60)}m`,
        },
      },
      weather: {
        overallRisk: weatherRoutes.some((r: any) => r.riskLevel === "HIGH")
          ? "HIGH"
          : weatherRoutes.some((r: any) => r.riskLevel === "MEDIUM")
          ? "MEDIUM"
          : "LOW",
        alertCount: weatherRoutes.reduce(
          (acc: number, r: any) => acc + (r.alerts?.length || 0),
          0
        ),
        alertsByType: {},
        affectedRoutes: weatherRoutes.filter((r: any) => r.alerts?.length > 0)
          .length,
        alerts: weatherRoutes.flatMap((r: any) =>
          r.alerts.map((a: any) => ({
            vehicleId: r.vehicle,
            event: a.event,
            severity: a.severity,
            location: [a.lat, a.lon],
            message: a.message,
            timeWindow: a.timeWindow || new Date().toISOString(),
          }))
        ),
      },
    };

    // 3. Persist background snapshot
    GisDataService.saveSnapshot(context).catch((err: unknown) =>
      console.error("Failed to save background snapshot in orchestrator", err)
    );

    return NextResponse.json(routeData);
  } catch (error) {
    console.error("Orchestrator error:", error);
    return NextResponse.json(
      { error: "Optimization failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
