import { PrismaClient } from "@prisma/client";
import { GisDashboardData } from "@gis/shared";

export interface IGisRepository {
    getLatestSnapshot(): Promise<GisDashboardData | null>;
    saveSnapshot(data: any): Promise<string>;
}

export class PrismaGisRepository implements IGisRepository {
    private prisma: PrismaClient;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || new PrismaClient();
    }

    async getLatestSnapshot(): Promise<GisDashboardData | null> {
        const snapshot = await this.prisma.optimizationSnapshot.findFirst({
            orderBy: { createdAt: "desc" },
        });

        if (!snapshot) return null;

        return {
            meta: {
                generatedAt: snapshot.createdAt.toISOString(),
            },
            fleet: JSON.parse(snapshot.fleetData),
            optimization: JSON.parse(snapshot.optimizationData),
            weather: JSON.parse(snapshot.weatherData),
        };
    }

    async saveSnapshot(context: any): Promise<string> {
        const runDetails = {
            totalJobs: context.optimization.totalJobs,
            vehicleMetrics: {
                create: context.optimization.routes.map((r: any) => {
                    const fleetVehicle = context.fleet.vehicles.find(
                        (v: any) => v.id === r.vehicleId
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

        const snapshot = await this.prisma.optimizationSnapshot.create({
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
}

// Singleton instance for default use
export const prisma = new PrismaClient();
export const repository = new PrismaGisRepository(prisma);
