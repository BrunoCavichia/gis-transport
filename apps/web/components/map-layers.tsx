"use client";

import { memo, useMemo } from "react";
import { Polygon, Popup, Marker, Tooltip } from "react-leaflet";
import { THEME } from "@/lib/theme";
import type { Zone, RouteData, RouteWeather } from "@gis/shared";

interface ZoneLayerProps {
    zones: Zone[];
    visible: boolean;
    isInteracting: boolean;
    canAccessZone: (zone: Zone) => boolean;
}

// Helper to determine coordinate depth
function getCoordDepth(coords: any): string {
    if (!Array.isArray(coords) || coords.length === 0) return "empty";
    if (!Array.isArray(coords[0])) return "1D";
    if (!Array.isArray(coords[0][0])) return "2D";
    if (!Array.isArray(coords[0][0][0])) return "3D";
    return "4D";
}

// Normalize coordinates for Leaflet Polygon
// Leaflet expects: LatLng[] | LatLng[][] | LatLng[][][]
// - Simple polygon: LatLng[][] (outer ring + holes)
// - MultiPolygon: LatLng[][][] (multiple polygons)
function normalizeCoords(coords: any): any {
    const depth = getCoordDepth(coords);
    
    if (depth === "2D") {
        // It's just an array of points [lat, lon][] - wrap in another array for ring
        return [coords];
    }
    if (depth === "3D") {
        // It's a Polygon with rings LatLng[][] - this is correct
        return coords;
    }
    if (depth === "4D") {
        // It's a MultiPolygon LatLng[][][] - Leaflet can handle this
        return coords;
    }
    
    return coords;
}

export const ZoneLayer = memo(
    function ZoneLayer({
        zones,
        visible,
        isInteracting,
        canAccessZone,
    }: ZoneLayerProps) {
        if (!visible) return null;

        console.log(`[ZoneLayer] Rendering ${zones.length} zones, visible=${visible}`);

        return (
            <>
                {zones.map((zone, idx) => {
                    const hasAccess = canAccessZone(zone);
                    const normalizedType = (zone.type || "").toUpperCase();
                    const isLEZ = normalizedType === "LEZ" || normalizedType === "ENVIRONMENTAL";
                    const zType = isLEZ ? "LEZ" : "RESTRICTED";

                    // Normalize and debug coordinates
                    const rawCoords = zone.coordinates;
                    const depth = getCoordDepth(rawCoords);
                    const normalizedCoords = normalizeCoords(rawCoords);
                    
                    console.log(`[ZoneLayer] Zone "${zone.name}": raw depth=${depth}, normalized length=${normalizedCoords?.length}`);

                    if (!normalizedCoords || normalizedCoords.length === 0) {
                        console.warn(`[ZoneLayer] Skipping zone "${zone.name}" - no valid coordinates`);
                        return null;
                    }

                    const style = isLEZ
                        ? {
                            color: hasAccess ? THEME.colors.success : THEME.colors.danger,
                            fillColor: hasAccess ? THEME.colors.success : THEME.colors.danger,
                            fillOpacity: hasAccess
                                ? 0.2 // Higher opacity for visibility
                                : 0.3,
                            weight: 2, // Thicker lines
                            dashArray: undefined,
                        }
                        : {
                            color: THEME.colors.danger,
                            fillColor: THEME.colors.danger,
                            fillOpacity: 0.25,
                            weight: 2,
                            dashArray: THEME.map.polygons.restricted.dashArray,
                        };

                    return (
                        <Polygon
                            key={`${zone.id}-${idx}`}
                            positions={normalizedCoords}
                            pathOptions={style}
                            interactive={!isInteracting}
                            bubblingMouseEvents={false}
                        >
                            {!isInteracting && (
                                <Popup closeButton={false} autoClose={false} className="zone-popup">
                                    <div style={{ fontSize: THEME.map.popups.fontSize }}>
                                        <strong>{zone.name}</strong>
                                        {zType === "LEZ" && (
                                            <div
                                                style={{
                                                    color: hasAccess
                                                        ? THEME.colors.success
                                                        : THEME.colors.danger,
                                                    marginTop: 4,
                                                }}
                                            >
                                                {hasAccess ? "Access OK" : "Restricted"}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            )}
                        </Polygon>
                    );
                })}
            </>
        );
    },
    (prev: ZoneLayerProps, next: ZoneLayerProps) => {
        return (
            prev.zones === next.zones &&
            prev.visible === next.visible &&
            prev.isInteracting === next.isInteracting &&
            prev.canAccessZone === next.canAccessZone
        );
    }
);

interface WeatherMarkersLayerProps {
    weatherRoutes: RouteWeather[];
    icons: {
        snow: any;
        rain: any;
        ice: any;
        wind: any;
        fog: any;
    };
}

export const WeatherMarkersLayer = memo(
    function WeatherMarkersLayer({
        weatherRoutes,
        icons,
    }: WeatherMarkersLayerProps) {
        if (!weatherRoutes) return null;

        return (
            <>
                {weatherRoutes.flatMap((wr, wrIdx) =>
                    wr.alerts?.map((alert, idx) => {
                        if (alert.lat == null || alert.lon == null) return null;

                        let icon;
                        switch (alert.event) {
                            case "SNOW": icon = icons.snow; break;
                            case "RAIN": icon = icons.rain; break;
                            case "ICE": icon = icons.ice; break;
                            case "WIND": icon = icons.wind; break;
                            case "FOG": icon = icons.fog; break;
                            default: return null;
                        }

                        return (
                            <Marker
                                key={`weather-${wrIdx}-${idx}`}
                                position={[alert.lat, alert.lon]}
                                icon={icon}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                                    <span style={{ fontSize: 12 }}>{alert.message}</span>
                                </Tooltip>
                            </Marker>
                        );
                    }),
                )}
            </>
        );
    },
    (prev: WeatherMarkersLayerProps, next: WeatherMarkersLayerProps) => {
        return (
            prev.weatherRoutes === next.weatherRoutes &&
            prev.icons === next.icons
        );
    }
);
