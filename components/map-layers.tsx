"use client";

import { memo } from "react";
import { Polygon, Popup, Marker, Tooltip } from "react-leaflet";
import { THEME } from "@/lib/theme";
import type { Zone, RouteData } from "@/lib/types";

interface ZoneLayerProps {
    zones: Zone[];
    visible: boolean;
    isInteracting: boolean;
    canAccessZone: (zone: Zone) => boolean;
}

export const ZoneLayer = memo(
    function ZoneLayer({
        zones,
        visible,
        isInteracting,
        canAccessZone,
    }: ZoneLayerProps) {
        if (!visible) return null;

        return (
            <>
                {zones.map((zone, idx) => {
                    const hasAccess = canAccessZone(zone);
                    const isLEZ =
                        zone.type?.toUpperCase() === "LEZ" || zone.type === "Environmental";
                    const zType = isLEZ ? "LEZ" : "RESTRICTED";

                    const style = isLEZ
                        ? {
                            color: hasAccess ? THEME.colors.success : THEME.colors.danger,
                            fillColor: hasAccess ? THEME.colors.success : THEME.colors.danger,
                            fillOpacity: hasAccess
                                ? THEME.map.polygons.lez.fillOpacity.allowed
                                : THEME.map.polygons.lez.fillOpacity.restricted,
                            weight: THEME.map.polygons.lez.weight,
                            dashArray: undefined,
                        }
                        : {
                            color: THEME.colors.danger,
                            fillColor: THEME.colors.danger,
                            fillOpacity: THEME.map.polygons.restricted.fillOpacity,
                            weight: THEME.map.polygons.restricted.weight,
                            dashArray: THEME.map.polygons.restricted.dashArray,
                        };

                    return (
                        <Polygon
                            key={`${zone.id}-${idx}`}
                            positions={zone.coordinates}
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
    weatherRoutes: RouteData["weatherRoutes"];
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
