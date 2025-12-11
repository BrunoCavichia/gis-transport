import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 3) {
    return NextResponse.json({ hits: [] });
  }

  try {
    // Try Nominatim (OSM) for geocoding - no API key required
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=es&limit=10&addressdetails=1`,
      {
        headers: { "User-Agent": "GIS-Transport-Demo/1.0" },
        next: { revalidate: 3600 },
      }
    );

    const data = await response.json();

    const hits = data.map((item: any) => {
      // Extraer ciudad de varias formas posibles
      const city =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.municipality;
      const road = item.address?.road;
      const housenumber = item.address?.house_number;

      // Construir un nombre descriptivo
      let displayName = item.display_name;
      if (city && road && housenumber) {
        displayName = `${road} ${housenumber}, ${city}`;
      } else if (city && road) {
        displayName = `${road}, ${city}`;
      } else if (city) {
        displayName = city;
      }

      return {
        point: {
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon),
        },
        name: displayName,
        country: item.address?.country,
        city: city,
        state: item.address?.state,
        street: road,
        housenumber: housenumber,
        osm_id: item.osm_id,
      };
    });

    return NextResponse.json({ hits });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ hits: [] });
  }
}
