// packages/database/scripts/test-db-query.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lat = 40.4168;
  const lon = -3.7038;
  const radiusMs = 50000;

  console.log(`Querying zones for ${lat}, ${lon} (radius: ${radiusMs}m)`);
  
  try {
    const lat = 40.4168;
    const lon = -3.7038;
    const radiusMs = 50000;
    const rawZones = await prisma.$queryRaw<any[]>`
      SELECT id, name FROM "GeoZone" 
      WHERE ST_DWithin(
        geometry::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMs}
      );
    `;
    console.log(`Proximity results: ${rawZones.length}`);
    rawZones.forEach(z => console.log(`- ${z.name}`));
  } catch (err) {
    console.error('Error during query:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
