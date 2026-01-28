// lib/map-utils.ts
import { THEME } from "./theme";

export const formatDistance = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;

export const formatDuration = (s: number) => {
    const mins = Math.round(s / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}min`;
};

/**
 * Google-style dynamic weighting that updates in real-time during zoom/flyTo
 * Returns a weight value based on the current zoom level.
 */
export function getDynamicWeight(zoom: number) {
    const baseScale = [
        { z: 0, w: 1 },
        { z: 5, w: 1.5 },
        { z: 8, w: 2.5 },
        { z: 10, w: 3.5 },
        { z: 12, w: 4.5 },
        { z: 13, w: 5.5 },
        { z: 14, w: 6.5 },
        { z: 15, w: 7.5 },
        { z: 16, w: 9 },
        { z: 18, w: 11 },
    ];

    for (let i = 0; i < baseScale.length - 1; i++) {
        const lower = baseScale[i];
        const upper = baseScale[i + 1];

        if (zoom >= lower.z && zoom <= upper.z) {
            const range = upper.z - lower.z;
            const progress = (zoom - lower.z) / range;
            return lower.w + (upper.w - lower.w) * progress;
        }
    }

    return zoom < baseScale[0].z
        ? baseScale[0].w
        : baseScale[baseScale.length - 1].w;
}

/**
 * Sprints coords to a grid to avoid excessive API calls on small movements.
 */
export function snapToGrid(coord: number, gridSize: number = 0.02) {
    return Math.round(coord / gridSize) * gridSize;
}

/**
 * Calculate the radius to fetch POIs based on the current map center and diagonal distance.
 */
export function calculateFetchRadius(viewportDistanceKm: number) {
    let fetchRadiusKm = Math.max(
        THEME.map.poi.minFetchRadius,
        viewportDistanceKm / 1.5,
    );
    fetchRadiusKm = Math.ceil(fetchRadiusKm / 2) * 2;
    return fetchRadiusKm;
}
