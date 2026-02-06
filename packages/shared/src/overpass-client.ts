import { OverpassResponse, POI, RoadInfo, OverpassElement } from "./index";

/**
 * Universal client for Overpass API.
 * Works in both Browser and Node.js (18+).
 */
export class OverpassClient {
  private static readonly DEFAULT_URL =
    "https://overpass-api.de/api/interpreter";
  private static readonly DEFAULT_TIMEOUT = 30000;

  /**
   * Executes a raw Overpass QL query.
   */
  static async query(
    query: string,
    options: {
      timeout?: number;
      url?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<OverpassResponse> {
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
    const url = options.url ?? this.DEFAULT_URL;

    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    const timeoutId = setTimeout(() => {
      if (!options.signal) controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "GIS-Transport-Logistics/1.0",
        },
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Overpass API error (${response.status}): ${text.substring(0, 100)}`,
        );
      }

      const data = await response.json();
      return data as OverpassResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches POIs around a location.
   */
  static async fetchAroundPOIs(
    lat: number,
    lon: number,
    radiusMeters: number,
    amenity: "fuel" | "charging_station",
  ): Promise<POI[]> {
    const maxRadius = Math.min(radiusMeters, 10000); // Cap at 10km
    const query = `[out:json][timeout:15];
            node["amenity"="${amenity}"](around:${maxRadius},${lat},${lon});
            out 100;`;

    const data = await this.query(query, { timeout: 15000 });
    const type = amenity === "fuel" ? "gas" : "ev";

    return (data.elements || [])
      .map((element: OverpassElement) => {
        const latEl = element.lat ?? element.center?.lat;
        const lonEl = element.lon ?? element.center?.lon;
        if (!latEl || !lonEl) return null;

        return {
          id: `${type}-${element.id}`,
          name:
            element.tags?.name ||
            element.tags?.brand ||
            (type === "gas" ? "Gas Station" : "EV Charging Station"),
          position: [latEl, lonEl] as [number, number],
          type: type,
          brand: element.tags?.brand,
          operator: element.tags?.operator,
          address: element.tags?.["addr:street"]
            ? `${element.tags["addr:street"]}${element.tags["addr:housenumber"] ? " " + element.tags["addr:housenumber"] : ""}`
            : undefined,
          town: element.tags?.["addr:city"] || element.tags?.["addr:town"],
          postalCode: element.tags?.["addr:postcode"],
          connectors:
            type === "ev" ? Number(element.tags?.capacity || 1) : undefined,
        } as POI;
      })
      .filter((p): p is POI => p !== null);
  }

  /**
   * Fetches road info (maxspeed, name) around a location.
   */
  static async fetchAroundRoadInfo(
    lat: number,
    lon: number,
  ): Promise<RoadInfo> {
    // Use a smaller radius (50m) to be more specific about the current location
    // and reduce load on Overpass API
    const query = `[out:json][timeout:5];
            way(around:50,${lat},${lon})[highway][highway!~"footway|path|cycleway|service"];
            out tags 1;`;

    const data = await this.query(query, { timeout: 6000 });
    const elements = data.elements || [];
    if (elements.length === 0) return {};

    // Find the best way with maxspeed tag
    const bestWay = elements.find((e: any) => e.tags?.maxspeed) || elements[0];
    let maxSpeed: number | undefined;

    if (bestWay?.tags?.maxspeed) {
      const match = bestWay.tags.maxspeed.match(/\d+/);
      if (match) maxSpeed = parseInt(match[0]);
    }

    // Fallback: infer speed limit from highway classification when no explicit maxspeed tag
    if (!maxSpeed && bestWay?.tags?.highway) {
      const highwaySpeedDefaults: Record<string, number> = {
        motorway: 120,
        motorway_link: 80,
        trunk: 100,
        trunk_link: 60,
        primary: 90,
        primary_link: 50,
        secondary: 70,
        secondary_link: 40,
        tertiary: 50,
        tertiary_link: 30,
        unclassified: 40,
        residential: 30,
        living_street: 20,
        track: 30,
      };
      maxSpeed = highwaySpeedDefaults[bestWay.tags.highway] ?? 50;
    }

    return {
      maxSpeed,
      roadName: bestWay?.tags?.name,
    };
  }
}
