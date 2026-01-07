import { prisma } from '@/lib/db';
import {
    GisDashboardData,
    FleetOverview,
    OptimizationSummary,
    WeatherSummary,
    DashboardKPIs
} from '@/lib/types/api-types';

export interface GisDataContext {
    fleet: FleetOverview;
    optimization: OptimizationSummary;
    weather: WeatherSummary;
    kpis: DashboardKPIs;
}

export class GisDataService {
    /**
     * Saves a new snapshot of the GIS state to SQLite.
     */
    static async saveSnapshot(context: GisDataContext): Promise<string> {
        // Prepare relations
        const runDetails = {
            totalDistanceMeters: context.optimization.totals.distance,
            totalDurationSeconds: context.optimization.totals.duration,
            totalJobs: context.optimization.totalJobs,
            utilityScore: context.kpis.routeEfficiency,
            vehicleMetrics: {
                create: context.optimization.routes.map(r => {
                    // Try to find the matching fleet vehicle info
                    // The route.vehicleId is likely an index from VROOM if mapped that way, 
                    // or an ID. Assuming it maps to fleet.vehicles index as per frontend logic.
                    const fleetVehicle = context.fleet.vehicles[r.vehicleId] || { id: String(r.vehicleId), type: 'unknown' };

                    return {
                        vehicleId: fleetVehicle.id,
                        vehicleType: fleetVehicle.type,
                        totalDistanceMeters: r.distance,
                        totalDurationSeconds: r.duration,
                        jobsAssigned: r.jobsAssigned,
                        efficiencyFactor: r.distance > 0 ? (r.jobsAssigned / (r.distance / 1000)) : 0 // Jobs per km example
                    };
                })
            }
        };

        const snapshot = await prisma.optimizationSnapshot.create({
            data: {
                fleetData: JSON.stringify(context.fleet),
                optimizationData: JSON.stringify(context.optimization),
                weatherData: JSON.stringify(context.weather),
                kpiData: JSON.stringify(context.kpis),
                status: context.optimization.status,
                // Create the analytics relation
                runDetails: {
                    create: runDetails
                }
            },
        });

        return snapshot.id;
    }

    /**
     * Retrieves the latest GIS state snapshot from SQLite.
     */
    static async getLatestSnapshot(): Promise<GisDashboardData | null> {
        const snapshot = await prisma.optimizationSnapshot.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        if (!snapshot) {
            return null;
        }

        // Fetch Analytics (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentRuns = await prisma.optimizationRun.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Parse JSON fields
        try {
            const fleet = JSON.parse(snapshot.fleetData) as FleetOverview;
            const optimization = JSON.parse(snapshot.optimizationData) as OptimizationSummary;
            const weather = JSON.parse(snapshot.weatherData) as WeatherSummary;
            const kpis = JSON.parse(snapshot.kpiData) as DashboardKPIs;

            // Calculate Analytics Aggregates
            const totalDistance = recentRuns.reduce((acc: number, run) => acc + run.totalDistanceMeters, 0);
            const totalDuration = recentRuns.reduce((acc: number, run) => acc + run.totalDurationSeconds, 0);
            const totalScore = recentRuns.reduce((acc: number, run) => acc + (run.utilityScore || 0), 0);
            const avgScore = recentRuns.length > 0 ? totalScore / recentRuns.length : 0;

            const analytics = {
                period: 'Last 7 Days',
                summary: {
                    totalOptimizations: recentRuns.length,
                    totalDistanceKm: Math.round(totalDistance / 1000),
                    totalDurationHours: Math.round(totalDuration / 3600),
                    averageEfficiencyScore: parseFloat(avgScore.toFixed(1))
                },
                trend: recentRuns.map(run => ({
                    date: run.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
                    efficiency: run.utilityScore || 0,
                    distanceKm: Math.round(run.totalDistanceMeters / 1000)
                }))
            };

            return {
                meta: {
                    generatedAt: snapshot.createdAt.toISOString(),
                    dataFreshness: 'cached',
                    cacheAge: Math.floor((Date.now() - snapshot.createdAt.getTime()) / 1000),
                },
                fleet,
                optimization,
                weather,
                kpis,
                analytics
            };
        } catch (e) {
            console.error("Failed to parse snapshot data", e);
            return null;
        }
    }
}
