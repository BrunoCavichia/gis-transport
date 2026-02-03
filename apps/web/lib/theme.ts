export const THEME = {
  colors: {
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
    muted: "#64748b", // Darker Slate for better unselected contrast
    accent: "#8b5cf6", // Purple for jobs
    vehicleSelected: "#ffa616ff",
    customPOI: "#06b6d4",
    secondary: "#6b7280",
    textMuted: "#666",
    routeShadow: "#1e293b",
    route: [
      "#4F46E5", // Indigo - Primary route
      "#0891B2", // Cyan - Cool, professional
      "#7C3AED", // Violet - Elegant accent
      "#0D9488", // Teal - Fresh, modern
      "#6366F1", // Periwinkle - Soft, refined
      "#2563EB", // Blue - Classic, trustworthy
      "#8B5CF6", // Purple - Premium accent
      "#0EA5E9", // Sky - Light, airy
    ],
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
        poi: {
          hidden: 10,
          minimal: 11,
          normal: 15,
          detailed: 17,
        },
        vehicle: {
          hidden: 0,
          minimal: 8,
          normal: 12,
          detailed: 15,
        },
        job: {
          hidden: 0,
          minimal: 10,
          normal: 13,
          detailed: 16,
        },
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
    hierarchy: {
      activeOpacity: 1,
      dimmedOpacity: 1, // Full opacity to avoid "buggy" look
      dimmedRouteOpacity: 0.9, // Slightly less for routes but still very clear
    },
  },
} as const;
