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
      moveThreshold: 3000, // Only update center state if moved >3km
      fetchDebounce: 600, // Wait 600ms after moveend before fetching (was 2000)
      zoomDebounce: 800, // Wait 800ms after zoomend before fetching (was 2500)
      flyToDuration: 0.8,
      flyToThreshold: 5,
    },
    poi: {
      fetchDistanceRatio: 800, // Ratio remains similar but we will enforce a minimum radius in logic
      maxFetchDistance: 100,
      gasRadiusMultiplier: 1000,
      maxGasRadius: 50000,

      // Optimized Performance Settings
      minFetchRadius: 8, // Fetch larger 8km chunks to reduce request frequency
      refetchDistanceThreshold: 3500, // Only refetch if moved > 3.5km
      lod: {
        minZoomForDots: 11, // Below 11: Nothing (don't show any POIs when too zoomed out)
        minZoomForIcons: 15, // 16+: Show full icons with labels
      },
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
