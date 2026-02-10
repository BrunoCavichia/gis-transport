import { PrismaClient } from "./dist/prisma-client";
import { GisDashboardData, VehicleType, Zone, Driver } from "@gis/shared";

export interface IGisRepository {
  getLatestSnapshot(): Promise<GisDashboardData | null>;
  saveSnapshot(data: any): Promise<string>;
  getZones(lat: number, lon: number, radiusMs: number): Promise<Zone[]>;
  getDrivers(): Promise<Driver[]>;
  getDriverById(id: string): Promise<Driver | null>;
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

    // With PostgreSQL jsonb, data is already parsed as JSON objects
    const parseField = (field: any) => {
      if (field === null || field === undefined) return null;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch {
          return null;
        }
      }
      return field;
    };

    const fleet = parseField(snapshot.fleetData);
    const optimization = parseField(snapshot.optimizationData);
    const weather = parseField(snapshot.weatherData);

    if (!fleet || !optimization || !weather) return null;

    return {
      meta: {
        generatedAt: snapshot.createdAt.toISOString(),
      },
      fleet,
      optimization,
      weather,
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
        // PostgreSQL jsonb stores objects directly
        // Prisma will handle JSON serialization for us
        fleetData: context.fleet as any,
        optimizationData: context.optimization as any,
        weatherData: context.weather as any,
        status: context.optimization.status,
        runDetails: {
          create: runDetails,
        },
      },
    });

    return snapshot.id;
  }

  async getZones(lat: number, lon: number, radiusMs: number): Promise<Zone[]> {
    // Use PostGIS ST_DWithin for distance-based spatial queries
    // This is more accurate than bbox approximation and leverages PostGIS indexes
    try {
      const rawZones = await this.prisma.$queryRaw<
        Array<{
          id: string;
          osmId: string;
          name: string;
          type: string;
          metadata: any;
          geojson: string;
        }>
      >`
        SELECT id, "osmId", name, type, metadata, ST_AsGeoJSON(geometry) as geojson
        FROM "GeoZone"
        WHERE ST_DWithin(
          geometry::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${radiusMs}
        )
        LIMIT 100;
      `;

      console.log(`[Repository] getZones returned ${rawZones.length} zones`);

      // Map results to domain Zone type with proper coordinate format
      return rawZones.map((rz: any) => {
        let coords: any = [];
        try {
          const geojson = JSON.parse(rz.geojson);
          console.log(
            `[Repository] Zone ${rz.name}: GeoJSON type=${geojson.type}, parts=${geojson.coordinates?.length}`,
          );

          if (geojson.type === "Polygon") {
            // Polygon: coordinates is [ Ring1, Ring2(hole), ... ]
            // Leaflet expects LatLng[][] for a polygon with rings
            coords = geojson.coordinates.map((ring: any) =>
              ring.map((p: any) => [p[1], p[0]]),
            );
          } else if (geojson.type === "MultiPolygon") {
            // MultiPolygon: coordinates is [ Polygon1, Polygon2, ... ]
            // Each Polygon is [ Ring1, Ring2, ... ]
            // Leaflet can render MultiPolygon as LatLng[][][]
            coords = geojson.coordinates.map((poly: any) =>
              poly.map((ring: any) => ring.map((p: any) => [p[1], p[0]])),
            );
          }

          // Log the structure for debugging
          const depth =
            Array.isArray(coords) && coords.length > 0
              ? Array.isArray(coords[0])
                ? Array.isArray(coords[0][0])
                  ? Array.isArray(coords[0][0][0])
                    ? "4D"
                    : "3D"
                  : "2D"
                : "1D"
              : "empty";
          console.log(
            `[Repository] Zone ${rz.name}: coords depth=${depth}, first ring points=${coords[0]?.[0]?.length || coords[0]?.length || 0}`,
          );
        } catch (e) {
          console.warn(
            `[Repository] Failed to parse geometry for zone ${rz.osmId}:`,
            e,
          );
        }

        const meta = rz.metadata || {};
        return {
          id: rz.osmId,
          name: rz.name,
          type: rz.type,
          coordinates: coords,
          description: meta.description || `OSM: ${rz.osmId}`,
          requiredTags: ["eco", "zero", "c", "b", "0"],
        };
      });
    } catch (error) {
      console.error("[Repository] getZones error:", error);
      return [];
    }
  }

  async getDrivers(): Promise<any[]> {
    const drivers = await this.prisma.driver.findMany({
      orderBy: { name: "asc" },
    });

    // Fetch speeding events with lat/lon extracted from PostGIS geometry
    // (Prisma can't natively read Unsupported geometry fields)
    let speedingEvents: any[] = [];
    try {
      speedingEvents = await this.prisma.$queryRaw`
        SELECT
          id,
          "driverId",
          speed,
          "limit",
          EXTRACT(EPOCH FROM timestamp) * 1000 AS timestamp,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          "createdAt"
        FROM "SpeedingEvent"
        ORDER BY timestamp DESC
      `;
      // Convert BigInt values from raw query to numbers
      speedingEvents = speedingEvents.map((se: any) => ({
        ...se,
        timestamp: Number(se.timestamp),
        speed: Number(se.speed),
        limit: Number(se.limit),
        latitude: Number(se.latitude),
        longitude: Number(se.longitude),
      }));
    } catch (err) {
      console.error("[Repository] Failed to fetch speeding events:", err);
    }

    // Merge speeding events into driver objects
    return drivers.map((d) => ({
      ...d,
      speedingEvents: speedingEvents.filter((se: any) => se.driverId === d.id),
    }));
  }

  async getDriverById(id: string): Promise<any | null> {
    return this.prisma.driver.findUnique({
      where: { id },
    });
  }

  async addDriver(data: any): Promise<any> {
    const driverData: any = {
      name: data.name,
      licenseType: data.licenseType,
      licenseNumber: data.licenseNumber,
      imageUrl: data.imageUrl,
      isAvailable: true,
      onTimeDeliveryRate: 100,
    };

    // Only include phoneNumber if it has a non-empty value
    if (data.phoneNumber && data.phoneNumber.trim()) {
      driverData.phoneNumber = data.phoneNumber.trim();
    }

    return this.prisma.driver.create({
      data: driverData,
    });
  }

  async updateDriver(id: string, data: any): Promise<any> {
    const updateData: any = { ...data };

    // Handle phoneNumber specially - don't update if it's an empty string
    if (updateData.phoneNumber === "") {
      delete updateData.phoneNumber;
    } else if (updateData.phoneNumber && updateData.phoneNumber.trim()) {
      updateData.phoneNumber = updateData.phoneNumber.trim();
    }

    return this.prisma.driver.update({
      where: { id },
      data: updateData,
    });
  }

  async logSpeeding(driverId: string, event: any): Promise<void> {
    // Use PostGIS ST_MakePoint to create Point geometry (longitude, latitude order)
    await this.prisma.$executeRaw`
      INSERT INTO "SpeedingEvent" (id, "driverId", speed, "limit", location, timestamp, "createdAt")
      VALUES (
        gen_random_uuid(),
        ${driverId},
        ${event.speed},
        ${event.limit},
        ST_SetSRID(ST_MakePoint(${event.longitude}, ${event.latitude}), 4326),
        NOW(),
        NOW()
      )
    `;
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

// Singleton instance for default use with proper Next.js pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const repository = new PrismaGisRepository(prisma);
