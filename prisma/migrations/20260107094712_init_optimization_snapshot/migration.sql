-- CreateTable
CREATE TABLE "OptimizationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fleetData" TEXT NOT NULL,
    "optimizationData" TEXT NOT NULL,
    "weatherData" TEXT NOT NULL,
    "supplyRiskData" TEXT NOT NULL,
    "kpiData" TEXT NOT NULL,
    "status" TEXT NOT NULL
);
