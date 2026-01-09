/*
  Warnings:

  - You are about to drop the column `totalDistanceMeters` on the `OptimizationRun` table. All the data in the column will be lost.
  - You are about to drop the column `totalDurationSeconds` on the `OptimizationRun` table. All the data in the column will be lost.
  - You are about to drop the column `utilityScore` on the `OptimizationRun` table. All the data in the column will be lost.
  - You are about to drop the column `efficiencyFactor` on the `VehicleMetric` table. All the data in the column will be lost.
  - You are about to drop the column `totalDistanceMeters` on the `VehicleMetric` table. All the data in the column will be lost.
  - You are about to drop the column `totalDurationSeconds` on the `VehicleMetric` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OptimizationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotId" TEXT NOT NULL,
    "totalJobs" INTEGER NOT NULL,
    CONSTRAINT "OptimizationRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "OptimizationSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OptimizationRun" ("createdAt", "id", "snapshotId", "totalJobs") SELECT "createdAt", "id", "snapshotId", "totalJobs" FROM "OptimizationRun";
DROP TABLE "OptimizationRun";
ALTER TABLE "new_OptimizationRun" RENAME TO "OptimizationRun";
CREATE UNIQUE INDEX "OptimizationRun_snapshotId_key" ON "OptimizationRun"("snapshotId");
CREATE TABLE "new_VehicleMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "jobsAssigned" INTEGER NOT NULL,
    CONSTRAINT "VehicleMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "OptimizationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VehicleMetric" ("id", "jobsAssigned", "runId", "vehicleId", "vehicleType") SELECT "id", "jobsAssigned", "runId", "vehicleId", "vehicleType" FROM "VehicleMetric";
DROP TABLE "VehicleMetric";
ALTER TABLE "new_VehicleMetric" RENAME TO "VehicleMetric";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
