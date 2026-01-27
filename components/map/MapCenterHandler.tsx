// components/map/MapCenterHandler.tsx
"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { THEME } from "@/lib/theme";

interface MapCenterHandlerProps {
    center: [number, number];
}

export function MapCenterHandler({ center }: MapCenterHandlerProps) {
    const map = useMap();

    useEffect(() => {
        const dist = map.getCenter().distanceTo({ lat: center[0], lng: center[1] });
        if (dist > THEME.map.interaction.flyToThreshold) {
            map.flyTo(center, map.getZoom(), {
                animate: true,
                duration: THEME.map.interaction.flyToDuration,
            });
        }
    }, [center, map]);

    return null;
}
