-- CreateTable
CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_driverId_assignedAt_idx" ON "DriverVehicleAssignment"("driverId", "assignedAt");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_vehicleId_assignedAt_idx" ON "DriverVehicleAssignment"("vehicleId", "assignedAt");
