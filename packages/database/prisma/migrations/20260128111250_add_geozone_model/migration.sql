-- CreateTable
CREATE TABLE "GeoZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "geometry" TEXT NOT NULL,
    "metadata" TEXT,
    "minLat" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "minLon" REAL NOT NULL,
    "maxLon" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoZone_osmId_key" ON "GeoZone"("osmId");

-- CreateIndex
CREATE INDEX "GeoZone_minLat_maxLat_minLon_maxLon_idx" ON "GeoZone"("minLat", "maxLat", "minLon", "maxLon");
