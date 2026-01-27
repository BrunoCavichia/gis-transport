// hooks/use-map-lod.ts
import { useState, useEffect, useRef } from "react";
import { THEME } from "@/lib/theme";
import { DEFAULT_ZOOM } from "@/lib/config";

export function useMapLOD(zoom: number) {
    const [debouncedZoom, setDebouncedZoom] = useState(zoom);
    const [showIcons, setShowIcons] = useState(zoom >= THEME.map.poi.lod.minZoomForIcons);
    const [isExitingIcons, setIsExitingIcons] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastZoomRef = useRef(zoom);

    useEffect(() => {
        const isIconZoom = zoom >= THEME.map.poi.lod.minZoomForIcons;
        const wasIconZoom = lastZoomRef.current >= THEME.map.poi.lod.minZoomForIcons;
        
        lastZoomRef.current = zoom;

        // Only trigger animation if crossing the threshold
        if (isIconZoom && !wasIconZoom) {
            // Crossing upward - show icons
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsExitingIcons(false);
            setShowIcons(true);
            setDebouncedZoom(zoom);
        } else if (!isIconZoom && wasIconZoom) {
            // Crossing downward - hide icons with animation
            setIsExitingIcons(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setShowIcons(false);
                setIsExitingIcons(false);
                setDebouncedZoom(zoom);
            }, 400); // Transition duration
        } else {
            // No threshold crossing, just update debounced zoom
            setDebouncedZoom(zoom);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [zoom]);

    return {
        showIcons,
        isExitingIcons,
        debouncedZoom
    };
}
