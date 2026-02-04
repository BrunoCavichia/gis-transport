import { Driver, PrismaClient } from "@prisma/client";
import { GisDashboardData, VehicleType, Zone } from "@gis/shared";

export interface IGisRepository {
  getLatestSnapshot(): Promise<GisDashboardData | null>;
  saveSnapshot(data: any): Promise<string>;
  getZones(lat: number, lon: number, radiusMs: number): Promise<Zone[]>;
  getDrivers(): Promise<Driver[]>;
  addDriver(data: any): Promise<Driver>;
  updateDriver(id: string, data: any): Promise<Driver>;
  logSpeeding(driverId: string, event: any): Promise<void>;
  clearAllDrivers(): Promise<void>;
  createDriverVehicleAssignment(data: {
    driverId: string;
    vehicleId: string;
    assignedAt?: Date;
    unassignedAt?: Date | null;
  }): Promise<any>;
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
            (v: VehicleType) => v.id === r.vehicleId,
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
          },
        ],
      },
    });

    return rawZones.map((rz) => ({
      id: rz.osmId,
      name: rz.name,
      type: rz.type as any,
      coordinates: JSON.parse(rz.geometry),
      description: rz.metadata || "",
      requiredTags: rz.type === "PEDESTRIAN" ? [] : ["eco", "zero"],
    }));
  }

  async getDrivers(): Promise<any[]> {
    return this.prisma.driver.findMany({
      include: { speedingEvents: true },
      orderBy: { name: "asc" },
    });
  }

  async addDriver(data: any): Promise<any> {
    return this.prisma.driver.create({
      data: {
        name: data.name,
        licenseType: data.licenseType,
        licenseNumber: data.licenseNumber,
        imageUrl: data.imageUrl,
        isAvailable: true,
        onTimeDeliveryRate: 100,
      },
    });
  }

  async updateDriver(id: string, data: any): Promise<any> {
    return this.prisma.driver.update({
      where: { id },
      data,
    });
  }

  async logSpeeding(driverId: string, event: any): Promise<void> {
    await this.prisma.speedingEvent.create({
      data: {
        driverId,
        speed: event.speed,
        limit: event.limit,
        latitude: event.latitude,
        longitude: event.longitude,
        timestamp: new Date(),
      },
    });
  }

  async clearAllDrivers(): Promise<void> {
    // Delete all speeding events first (due to foreign key constraint)
    await this.prisma.speedingEvent.deleteMany({});
    // Then delete all drivers
    await this.prisma.driver.deleteMany({});
  }

  async createDriverVehicleAssignment(data: {
    driverId: string;
    vehicleId: string;
    assignedAt?: Date;
    unassignedAt?: Date | null;
  }): Promise<any> {
    return this.prisma.driverVehicleAssignment.create({
      data: {
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        assignedAt: data.assignedAt || new Date(),
        unassignedAt: data.unassignedAt || null,
      },
    });
  }
}

// Singleton instance for default use
export const prisma = new PrismaClient();
export const repository = new PrismaGisRepository(prisma);
