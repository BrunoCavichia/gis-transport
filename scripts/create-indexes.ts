import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "GeoZone_geometry_idx" ON "GeoZone" USING GIST (geometry)');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "GeoZone_centroid_idx" ON "GeoZone" USING GIST (centroid)');
  console.log('Indexes created');
}
main().catch(console.error).finally(() => prisma.$disconnect());
