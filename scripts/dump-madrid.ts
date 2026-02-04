import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const zones = await prisma.geoZone.findMany({
    where: {
      name: {
        contains: 'Distrito Centro'
      }
    }
  });

  for (const zone of zones) {
    const geojson: any = await prisma.$queryRawUnsafe(`SELECT ST_AsGeoJSON(geometry) as json FROM "GeoZone" WHERE id = '${zone.id}'`);
    const geo = JSON.parse(geojson[0].json);
    console.log(`Zone: ${zone.name}`);
    console.log(`Type: ${geo.type}`);
    if (geo.type === 'MultiPolygon') {
       console.log(`Parts: ${geo.coordinates.length}`);
       console.log(`First part rings: ${geo.coordinates[0].length}`);
       console.log(`First ring points: ${geo.coordinates[0][0].length}`);
       console.log(`First point:`, geo.coordinates[0][0][0]);
    } else {
       console.log(`Rings: ${geo.coordinates.length}`);
       console.log(`First ring points: ${geo.coordinates[0].length}`);
       console.log(`First point:`, geo.coordinates[0][0]);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
