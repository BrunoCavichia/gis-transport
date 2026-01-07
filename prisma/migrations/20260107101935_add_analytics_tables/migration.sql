-- CreateTable
CREATE TABLE "OptimizationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotId" TEXT NOT NULL,
    "totalDistanceMeters" INTEGER NOT NULL,
    "totalDurationSeconds" INTEGER NOT NULL,
    "totalJobs" INTEGER NOT NULL,
    "utilityScore" REAL,
    CONSTRAINT "OptimizationRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "OptimizationSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "totalDistanceMeters" INTEGER NOT NULL,
    "totalDurationSeconds" INTEGER NOT NULL,
    "jobsAssigned" INTEGER NOT NULL,
    "efficiencyFactor" REAL,
    CONSTRAINT "VehicleMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OptimizationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationRun_snapshotId_key" ON "OptimizationRun"("snapshotId");
