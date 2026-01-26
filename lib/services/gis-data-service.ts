import { prisma } from "@/lib/db";
import {
  GisDataContext,
  FleetOverview,
  OptimizationSummary,
  WeatherSummary,
  GisDashboardData,
} from "@/lib/types";

export class GisDataService {
  /**
   * Saves a new snapshot of the GIS state to SQLite.
   */
  static async saveSnapshot(context: GisDataContext): Promise<string> {
    // Prepare relations
    const runDetails = {
      totalJobs: context.optimization.totalJobs,
      vehicleMetrics: {
        create: context.optimization.routes.map((r) => {
          // Find the matching fleet vehicle info by string ID
          const fleetVehicle = context.fleet.vehicles.find(
            (v) => v.id === r.vehicleId
          ) || {
            id: r.vehicleId,
            type: "unknown",
          };

          return {
            vehicleId: String(fleetVehicle.id),
            vehicleType: fleetVehicle.type,
            jobsAssigned: r.jobsAssigned,
          };
        }),
      },
    };

    const snapshot = await prisma.optimizationSnapshot.create({
      data: {
        fleetData: JSON.stringify(context.fleet),
        optimizationData: JSON.stringify(context.optimization),
        weatherData: JSON.stringify(context.weather),
        status: context.optimization.status,
        runDetails: {
          create: runDetails,
        },
      },
    });

    return snapshot.id;
  }

  /**
   * Retrieves the latest GIS state snapshot from SQLite.
   * Optionally fetches real-time geo-data (zones/POIs) if requested.
   */
  static async getLatestSnapshot(
    options: { includeGeoData?: boolean } = {}
  ): Promise<GisDashboardData | null> {
    const snapshot = await prisma.optimizationSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!snapshot) {
      return null;
    }

    // Fetch Analytics (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parse JSON fields
    try {
      const fleet = JSON.parse(snapshot.fleetData) as FleetOverview;
      const optimization = JSON.parse(
        snapshot.optimizationData
      ) as OptimizationSummary;
      const weather = JSON.parse(snapshot.weatherData) as WeatherSummary;

      // If geo-data requested, pick a representative point (e.g. first vehicle or map center if we had it)
      if (options.includeGeoData && fleet.vehicles.length > 0) {
        const samplePos = fleet.vehicles[0].position;
      }

      return {
        meta: {
          generatedAt: snapshot.createdAt.toISOString(),
        },
        fleet,
        optimization,
        weather,
      };
    } catch (e) {
      console.error("Failed to parse snapshot data", e);
      return null;
    }
  }
}
