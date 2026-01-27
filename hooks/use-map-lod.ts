// hooks/use-map-lod.ts
import { useState, useEffect } from "react";
import { THEME } from "@/lib/theme";
import { DEFAULT_ZOOM } from "@/lib/config";

export function useMapLOD(zoom: number) {
    const [debouncedZoom, setDebouncedZoom] = useState(zoom);
    const [showIcons, setShowIcons] = useState(zoom >= THEME.map.poi.lod.minZoomForIcons);
    const [isExitingIcons, setIsExitingIcons] = useState(false);

    useEffect(() => {
        const isIconZoom = zoom >= THEME.map.poi.lod.minZoomForIcons;

        if (isIconZoom) {
            setIsExitingIcons(false);
            setShowIcons(true);
            setDebouncedZoom(zoom);
        } else if (showIcons) {
            // Start exit animation (fade-out)
            setIsExitingIcons(true);
            const timer = setTimeout(() => {
                setShowIcons(false);
                setIsExitingIcons(false);
                setDebouncedZoom(zoom);
            }, 400); // Transition duration
            return () => clearTimeout(timer);
        } else {
            setDebouncedZoom(zoom);
        }
    }, [zoom, showIcons]);

    return {
        showIcons,
        isExitingIcons,
        debouncedZoom
    };
}
