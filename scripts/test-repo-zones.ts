import { repository } from '../packages/database/src/index';

async function test() {
  const lat = 40.4168;
  const lon = -3.7038;
  const radius = 50000;
  
  console.log(`Testing repository.getZones for ${lat}, ${lon} radius ${radius}`);
  try {
    const zones = await repository.getZones(lat, lon, radius);
    console.log(`Found ${zones.length} zones`);
    zones.forEach(z => {
      console.log(`- ${z.name} (${z.type}) Coords parts: ${z.coordinates.length}`);
    });
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
