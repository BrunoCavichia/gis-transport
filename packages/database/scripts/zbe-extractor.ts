import { PrismaClient } from "@prisma/client";
import { OverpassClient, OverpassElement } from "@gis/shared";

const prisma = new PrismaClient();

const MAJOR_CITIES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Zaragoza",
  "Málaga",
  "Murcia",
  "Palma",
  "Las Palmas de Gran Canaria",
  "Bilbao",
  "Alicante",
  "Córdoba",
  "Valladolid",
  "Vitoria-Gasteiz",
  "A Coruña",
  "Granada",
  "Oviedo",
  "Santa Cruz de Tenerife",
  "Pamplona",
  "Almería",
  "San Sebastián",
  "Burgos",
  "Santander",
  "Castellón de la Plana",
  "Logroño",
  "Badajoz",
  "Salamanca",
];

async function queryOverpass(
  city: string,
  retryCount = 0,
): Promise<OverpassElement[]> {
  const query = `
      [out:json][timeout:180];
      area[name="${city}"]->.searchArea;
      (
        nwr["boundary"~"low_emission_zone|environmental|limited_traffic_zone"](area.searchArea);
        nwr["zone:traffic"~"environmental|no_emission|low_emission"](area.searchArea);
        nwr["hazard"="low_emission_zone"](area.searchArea);
      );
      out geom;
    `;

  try {
    const data = await OverpassClient.query(query, { timeout: 200000 });
    return data.elements || [];
  } catch (error: any) {
    if (retryCount < 3) {
      const delay = (retryCount + 1) * 15000;
      console.warn(
        ` Error querying ${city} (${error.message}). Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/3)`,
      );
      await new Promise((r) => setTimeout(r, delay));
      return queryOverpass(city, retryCount + 1);
    }
    throw error;
  }
}

async function extractZBE() {
  console.log(" Starting Robust National ZBE Extraction for Spain...");

  // 1. Try National Query first - focusing specifically on Spain tags
  const nationalQuery = `
      [out:json][timeout:600];
      area["ISO3166-1"="ES"]->.spain;
      (
        nwr["boundary"~"low_emission_zone|environmental|limited_traffic_zone"](area.spain);
        nwr["zone:traffic"~"environmental|no_emission|low_emission"](area.spain);
        nwr["hazard"="low_emission_zone"](area.spain);
      );
      out geom;
    `;

  try {
    console.log(" Sending national query (this may take up to 10 minutes)...");
    const data = await OverpassClient.query(nationalQuery, { timeout: 650000 });

    const elements = data.elements || [];
    console.log(` Found ${elements.length} zones across Spain!`);
    const savedCount = await saveElements(elements);
    console.log(` National data processed. Total saved/updated: ${savedCount}`);
  } catch (error: any) {
    console.warn(
      ` National query failed (${error.message}). Switching to city-by-city backup...`,
    );
    await extractByCities();
  } finally {
    await prisma.$disconnect();
  }
}

async function extractByCities() {
  let totalProcessed = 0;
  for (const city of MAJOR_CITIES) {
    console.log(` Querying backup for ${city}...`);
    try {
      const elements = await queryOverpass(city);
      const savedCount = await saveElements(elements, city);
      totalProcessed += savedCount;
      console.log(` Processed ${savedCount} elements for ${city}.`);
      await new Promise((r) => setTimeout(r, 8000)); // Be very conservative to avoid rate limits
    } catch (error: any) {
      console.error(` Permanent failure for ${city}:`, error.message);
    }
  }
  console.log(
    ` Chunked extraction complete! Total processed: ${totalProcessed}`,
  );
}

async function saveElements(
  elements: OverpassElement[],
  defaultCity?: string,
): Promise<number> {
  let count = 0;
  for (const element of elements) {
    const zoneData = processElement(element);
    if (!zoneData || zoneData.geometry.length < 3) continue;

    const tags = element.tags || {};
    if (defaultCity && !tags.city) tags.city = defaultCity;

    // Calculate centroid for distance queries
    const centerLat = (zoneData.minLat + zoneData.maxLat) / 2;
    const centerLon = (zoneData.minLon + zoneData.maxLon) / 2;

    try {
      // Ensure polygon is closed for WKT
      const coords = [...zoneData.geometry];
      if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
      ) {
        coords.push(coords[0]);
      }

      // Create WKT Polygon
      const wktPoints = coords.map((c) => `${c[1]} ${c[0]}`).join(", ");
      const wkt = "POLYGON((" + wktPoints + "))";

      await prisma.$executeRaw`
                INSERT INTO "GeoZone" (id, "osmId", name, type, metadata, geometry, centroid, "createdAt", "updatedAt")
                VALUES (
                    gen_random_uuid(),
                    ${zoneData.osmId},
                    ${zoneData.name},
                    ${zoneData.type},
                    ${JSON.stringify(tags)}::jsonb,
                    ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromText(${wkt}, 4326)), 3)),
                    ST_SetSRID(ST_MakePoint(${centerLon}, ${centerLat}), 4326),
                    NOW(),
                    NOW()
                )
                ON CONFLICT ("osmId") DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    metadata = EXCLUDED.metadata,
                    geometry = EXCLUDED.geometry,
                    centroid = EXCLUDED.centroid,
                    "updatedAt" = NOW();
            `;
      count++;
    } catch (error) {
      console.error(
        `   Failed to save zone ${zoneData.osmId}:`,
        (error as any).message,
      );
      continue;
    }
  }
  return count;
}

function processElement(element: OverpassElement) {
  let coords: [number, number][] = [];
  if (element.type === "way" && element.geometry) {
    coords = element.geometry.map((p) => [p.lat, p.lon] as [number, number]);
  } else if (element.type === "relation" && element.members) {
    coords = element.members.flatMap(
      (m) => m.geometry?.map((p) => [p.lat, p.lon] as [number, number]) || [],
    );
  }

  if (coords.length < 3) return null;

  const tags = element.tags || {};
  let type = "RESTRICTED";
  if (
    tags.boundary === "low_emission_zone" ||
    tags["zone:traffic"] === "environmental" ||
    tags.hazard === "low_emission_zone"
  )
    type = "LEZ";
  else if (tags.boundary === "environmental") type = "ENVIRONMENTAL";
  else if (tags.boundary === "limited_traffic_zone") type = "RESTRICTED";

  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);

  return {
    osmId: `${element.type}-${element.id}`,
    name:
      tags.name ||
      tags.official_name ||
      tags.description ||
      "ZBE " + (tags.city || "España") + " " + element.id,
    type,
    geometry: coords,
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

extractZBE();
