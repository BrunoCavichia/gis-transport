import { prisma } from '@/lib/db';
import {
    GisDashboardData,
    FleetOverview,
    OptimizationSummary,
    WeatherSummary,
    SupplyRiskSummary,
    DashboardKPIs
} from '@/lib/types/api-types';

export interface GisDataContext {
    fleet: FleetOverview;
    optimization: OptimizationSummary;
    weather: WeatherSummary;
    supplyRisk: SupplyRiskSummary;
    kpis: DashboardKPIs;
}

export class GisDataService {
    /**
     * Saves a new snapshot of the GIS state to SQLite.
     */
    static async saveSnapshot(context: GisDataContext): Promise<string> {
        const snapshot = await prisma.optimizationSnapshot.create({
            data: {
                fleetData: JSON.stringify(context.fleet),
                optimizationData: JSON.stringify(context.optimization),
                weatherData: JSON.stringify(context.weather),
                supplyRiskData: JSON.stringify(context.supplyRisk),
                kpiData: JSON.stringify(context.kpis),
                status: context.optimization.status,
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

        // Parse JSON fields
        try {
            const fleet = JSON.parse(snapshot.fleetData) as FleetOverview;
            const optimization = JSON.parse(snapshot.optimizationData) as OptimizationSummary;
            const weather = JSON.parse(snapshot.weatherData) as WeatherSummary;
            const supplyRisk = JSON.parse(snapshot.supplyRiskData) as SupplyRiskSummary;
            const kpis = JSON.parse(snapshot.kpiData) as DashboardKPIs;

            return {
                meta: {
                    generatedAt: snapshot.createdAt.toISOString(),
                    dataFreshness: 'cached',
                    cacheAge: Math.floor((Date.now() - snapshot.createdAt.getTime()) / 1000),
                },
                fleet,
                optimization,
                weather,
                supplyRisk,
                kpis,
            };
        } catch (e) {
            console.error("Failed to parse snapshot data", e);
            return null;
        }
    }
}
