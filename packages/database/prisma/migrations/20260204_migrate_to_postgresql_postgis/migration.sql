-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "postgis_topology" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public";

-- CreateTable OptimizationSnapshot
CREATE TABLE "OptimizationSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fleetData" JSONB NOT NULL,
    "optimizationData" JSONB NOT NULL,
    "weatherData" JSONB NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "OptimizationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable OptimizationRun
CREATE TABLE "OptimizationRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotId" TEXT NOT NULL,
    "totalJobs" INTEGER NOT NULL,

    CONSTRAINT "OptimizationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable VehicleMetric
CREATE TABLE "VehicleMetric" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "jobsAssigned" INTEGER NOT NULL,

    CONSTRAINT "VehicleMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable GeoZone
CREATE TABLE "GeoZone" (
    "id" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "geometry" geometry(Polygon, 4326),
    "metadata" JSONB,
    "centroid" geometry(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable Driver
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseType" TEXT,
    "licenseNumber" TEXT,
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "currentVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable DriverVehicleAssignment
CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable SpeedingEvent
CREATE TABLE "SpeedingEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "speed" DOUBLE PRECISION NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeedingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationRun_snapshotId_key" ON "OptimizationRun"("snapshotId");

-- CreateIndex
CREATE INDEX "VehicleMetric_runId_idx" ON "VehicleMetric"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoZone_osmId_key" ON "GeoZone"("osmId");

-- CreateIndex - GIST indexes for spatial queries
CREATE INDEX "GeoZone_geometry_idx" ON "GeoZone" USING GIST ("geometry");
CREATE INDEX "GeoZone_centroid_idx" ON "GeoZone" USING GIST ("centroid");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_driverId_assignedAt_idx" ON "DriverVehicleAssignment"("driverId", "assignedAt");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_vehicleId_assignedAt_idx" ON "DriverVehicleAssignment"("vehicleId", "assignedAt");

-- CreateIndex - GIST index for spatial queries on SpeedingEvent
CREATE INDEX "SpeedingEvent_location_idx" ON "SpeedingEvent" USING GIST ("location");

-- AddForeignKey
ALTER TABLE "OptimizationRun" ADD CONSTRAINT "OptimizationRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "OptimizationSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMetric" ADD CONSTRAINT "VehicleMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OptimizationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeedingEvent" ADD CONSTRAINT "SpeedingEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
