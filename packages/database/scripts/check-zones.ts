import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const zones = await p.$queryRaw`SELECT name, "osmId", ST_NPoints(geometry)::int as pts FROM "GeoZone"`;
    console.log(JSON.stringify(zones, null, 2));
    process.exit(0);
}
main();
