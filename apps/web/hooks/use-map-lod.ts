// hooks/use-map-lod.ts
// Simplified: Always show dots, no icon transitions
export function useMapLOD(zoom: number) {
    return {
        showIcons: false,      // Always false - never show icons
        isExitingIcons: false, // No animation needed
        debouncedZoom: zoom
    };
}
