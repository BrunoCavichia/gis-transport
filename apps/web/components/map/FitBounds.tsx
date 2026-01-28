// components/map/FitBounds.tsx
"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { THEME } from "@/lib/theme";

interface FitBoundsProps {
    routes: { coordinates: [number, number][] }[];
}

export function FitBounds({ routes }: FitBoundsProps) {
    const map = useMap();

    useEffect(() => {
        const all = routes.flatMap((r) => r.coordinates || []);
        if (all.length === 0) return;

        // Use fitBounds for sharpness and standard professional transition
        map.fitBounds(all as [number, number][], {
            padding: THEME.map.routes.padding,
            maxZoom: THEME.map.routes.maxZoom,
            animate: true,
            duration: THEME.map.routes.duration,
        });
    }, [routes, map]);

    return null;
}
