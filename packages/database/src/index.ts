import { PrismaClient } from "@prisma/client";
import { GisDashboardData, Zone } from "@gis/shared";

export interface IGisRepository {
    getLatestSnapshot(): Promise<GisDashboardData | null>;
    saveSnapshot(data: any): Promise<string>;
    getZones(lat: number, lon: number, radiusMs: number): Promise<Zone[]>;
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

    async getZones(lat: number, lon: number, radiusMs: number): Promise<Zone[]> {
        // Approximate degrees for radius (111km per degree)
        const radiusDeg = radiusMs / 111000;

        const rawZones = await this.prisma.geoZone.findMany({
            where: {
                OR: [
                    {
                        // Check if the search point is within the BBox
                        minLat: { lte: lat + radiusDeg },
                        maxLat: { gte: lat - radiusDeg },
                        minLon: { lte: lon + radiusDeg },
                        maxLon: { gte: lon - radiusDeg },
                    }
                ]
            }
        });

        return rawZones.map(rz => ({
            id: rz.osmId,
            name: rz.name,
            type: rz.type as any,
            coordinates: JSON.parse(rz.geometry),
            description: rz.metadata || "",
            requiredTags: rz.type === "PEDESTRIAN" ? [] : ["eco", "zero"]
        }));
    }
}

// Singleton instance for default use
export const prisma = new PrismaClient();
export const repository = new PrismaGisRepository(prisma);
