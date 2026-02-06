// app/api/kartaview/route.ts
//
// Thin proxy for the KartaView (OpenStreetCam) public Photos API.
// Avoids CORS issues when calling from the browser.
// No authentication required — this is a public endpoint.
//
// External data is validated with Zod before being trusted.

import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod schemas for external KartaView API response ──

const KartaViewPhotoSchema = z.object({
  // Pre-resolved CDN URLs (preferred)
  imageProcUrl: z.string().url().nullish(),
  imageThUrl: z.string().url().nullish(),
  imageLthUrl: z.string().url().nullish(),
  // Fallback direct-storage URLs
  fileurlProc: z.string().url().nullish(),
  fileurlTh: z.string().url().nullish(),
  fileurlLTh: z.string().url().nullish(),
  // Raw template URL (last resort — uses {{sizeprefix}} placeholder)
  fileurl: z.string().nullish(),
  // Metadata
  heading: z.union([z.string(), z.number()]).nullish(),
  lat: z.union([z.string(), z.number()]).nullish(),
  lng: z.union([z.string(), z.number()]).nullish(),
  shotDate: z.string().nullish(),
  dateAdded: z.string().nullish(),
  projection: z.string().nullish(),
  distance: z.union([z.string(), z.number()]).nullish(),
});

const KartaViewResponseSchema = z.object({
  status: z.object({
    apiCode: z.number(),
    httpCode: z.number(),
  }),
  result: z.object({
    data: z.array(KartaViewPhotoSchema).default([]),
  }),
});

// ── Slim output type sent to the client ──

export interface KartaViewPhoto {
  imageUrl: string;
  thumbUrl: string;
  heading: number;
  lat: number;
  lng: number;
  shotDate: string;
  distanceM: number;
}

// ── In-memory cache ──

const cache = new Map<string, { data: KartaViewPhoto[]; ts: number }>();
const CACHE_TTL = 300_000; // 5 minutes

// ── Resolve the best image URL from the validated photo object ──

function resolveImageUrl(photo: z.infer<typeof KartaViewPhotoSchema>): {
  imageUrl: string;
  thumbUrl: string;
} {
  // Priority: CDN URLs > direct storage URLs > template URL
  const imageUrl =
    photo.imageProcUrl ||
    photo.fileurlProc ||
    photo.imageThUrl ||
    photo.fileurlTh ||
    (photo.fileurl
      ? photo.fileurl.replace("{{sizeprefix}}", "proc")
      : "");

  const thumbUrl =
    photo.imageLthUrl ||
    photo.fileurlLTh ||
    photo.imageThUrl ||
    photo.fileurlTh ||
    (photo.fileurl
      ? photo.fileurl.replace("{{sizeprefix}}", "lth")
      : "");

  return { imageUrl: imageUrl || "", thumbUrl: thumbUrl || "" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ data: [] });
  }

  // Grid-based cache key (~110 m precision)
  const cacheKey = `${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ data: cached.data });
  }

  try {
    const url = `https://api.openstreetcam.org/2.0/photo/?lat=${lat}&lng=${lng}&zoomLevel=18&radius=200`;
    const res = await fetch(url, {
      headers: { "User-Agent": "GIS-Transport-Logistics/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[KartaView] API returned ${res.status}`);
      return NextResponse.json({ data: [] });
    }

    const rawJson = await res.json();

    // Validate with Zod — reject malformed data safely
    const parsed = KartaViewResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      console.error("[KartaView] Zod validation failed:", parsed.error.message);
      return NextResponse.json({ data: [] });
    }

    const { data: photos } = parsed.data.result;

    // Transform to slim output (first 5 nearest photos)
    const slim: KartaViewPhoto[] = photos
      .slice(0, 5)
      .map((p) => {
        const { imageUrl, thumbUrl } = resolveImageUrl(p);
        if (!imageUrl) return null;
        return {
          imageUrl,
          thumbUrl: thumbUrl || imageUrl,
          heading: Number(p.heading) || 0,
          lat: Number(p.lat) || 0,
          lng: Number(p.lng) || 0,
          shotDate: p.shotDate || p.dateAdded || "",
          distanceM: Number(p.distance) || 0,
        };
      })
      .filter((p): p is KartaViewPhoto => p !== null);

    cache.set(cacheKey, { data: slim, ts: Date.now() });

    return NextResponse.json({ data: slim });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort) console.error("[KartaView] Fetch error:", err);
    return NextResponse.json({ data: [] });
  }
}
