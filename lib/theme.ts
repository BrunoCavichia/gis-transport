export const THEME = {
    colors: {
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6",
        muted: "#94a3b8",
        accent: "#8b5cf6", // Purple for jobs
        vehicleSelected: "#ffa616ff",
        customPOI: "#06b6d4",
        secondary: "#6b7280",
        textMuted: "#666",
        routeShadow: "#1e293b",
    },
    map: {
        interaction: {
            moveThreshold: 3000,   // Only update center state if moved >3km
            fetchDebounce: 1500,   // Wait longer before fetching
            zoomDebounce: 2000,
            flyToDuration: 0.8,
            flyToThreshold: 5,
        },
        poi: {
            fetchDistanceRatio: 800, // Fetch radius covers ~1.25x the diagonal for better overlap
            maxFetchDistance: 100,  // Max 100km radius for EV
            gasRadiusMultiplier: 1000,
            maxGasRadius: 50000,    // Max 50km radius for Gas
        },
        polygons: {
            lez: {
                fillOpacity: {
                    allowed: 0.08,
                    restricted: 0.12,
                },
                weight: 1,
            },
            restricted: {
                fillOpacity: 0.12,
                weight: 0.5,
                dashArray: "4,4",
            },
        },
        routes: {
            padding: [80, 80] as [number, number],
            duration: 1.2,
            maxZoom: 16,
            shadowWeight: 7,
            shadowOpacity: 0.15,
            mainWeight: 4,
            dashArray: "12, 8",
        },
        popups: {
            fontSize: 12,
            padding: 4,
            marginTop: 6,
            titleFontSize: 12,
            subtitleFontSize: 10,
            tooltipOpacity: 0.9,
            // Offsets for the new "Needle" style (anchor is at bottom tip)
            tooltipOffset: [0, -42] as [number, number],
            jobTooltipOffset: [0, -38] as [number, number],
            vehicleTooltipOffset: [0, -48] as [number, number],
            customPoiTooltipOffset: [0, -40] as [number, number],
            minimalZoomThreshold: 13, // Show full icons sooner
        },
    },
} as const;
