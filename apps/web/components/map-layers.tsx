"use client";

import { memo, useMemo } from "react";
import { Polygon, Popup, Marker, Tooltip } from "react-leaflet";
import { Edit2 } from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Zone, RouteWeather } from "@gis/shared";

interface ZoneLayerProps {
  zones: Zone[];
  visible: boolean;
  isInteracting: boolean;
  canAccessZone: (zone: Zone) => boolean;
  onEditZone?: (zoneId: string) => void;
}

// Helper functions moved outside component to avoid recreation
function getCoordDepth(coords: any): string {
  if (!Array.isArray(coords) || coords.length === 0) return "empty";
  if (!Array.isArray(coords[0])) return "1D";
  if (!Array.isArray(coords[0][0])) return "2D";
  if (!Array.isArray(coords[0][0][0])) return "3D";
  return "4D";
}

function normalizeCoords(coords: any): any {
  const depth = getCoordDepth(coords);

  if (depth === "2D") {
    return [coords];
  }
  if (depth === "3D") {
    return coords;
  }
  if (depth === "4D") {
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
    onEditZone,
  }: ZoneLayerProps) {
    // Memoize zone processing to avoid recalculation on every render
    const processedZones = useMemo(() => {
      if (!visible) return [];

      return zones
        .map((zone, idx) => {
          const hasAccess = canAccessZone(zone);
          const normalizedType = (zone.type || "").toUpperCase();
          const isLEZ =
            normalizedType === "LEZ" || normalizedType === "ENVIRONMENTAL";
          const zType = isLEZ ? "LEZ" : "RESTRICTED";
          const isCustom = (zone as any).isCustom === true;

          // Normalize and debug coordinates
          const rawCoords = zone.coordinates;
          const depth = getCoordDepth(rawCoords);
          const normalizedCoords = normalizeCoords(rawCoords);

          console.log(
            `[ZoneLayer] Zone "${zone.name}": raw depth=${depth}, normalized length=${normalizedCoords?.length}`,
          );

          if (!normalizedCoords || normalizedCoords.length === 0) {
            console.warn(
              `[ZoneLayer] Skipping zone "${zone.name}" - no valid coordinates`,
            );
            return null;
          }

          // Modern styling for custom zones
          let style;
          if (isCustom) {
            if (isLEZ) {
              // Custom LEZ zones with modern purple gradient styling
              const config = THEME.map.polygons.customZone.lez;
              style = {
                color: config.primaryColor,
                fillColor: config.primaryColor,
                fillOpacity: config.fillOpacity,
                weight: config.weight,
                dashArray: config.dashArray,
              };
            } else if (hasAccess) {
              // Custom accessible zones with modern cyan gradient styling
              const config = THEME.map.polygons.customZone.accessible;
              style = {
                color: config.primaryColor,
                fillColor: config.primaryColor,
                fillOpacity: config.fillOpacity,
                weight: config.weight,
                dashArray: config.dashArray,
              };
            } else {
              // Custom restricted zones with modern red gradient styling
              const config = THEME.map.polygons.customZone.restricted;
              style = {
                color: config.primaryColor,
                fillColor: config.primaryColor,
                fillOpacity: config.fillOpacity,
                weight: config.weight,
                dashArray: config.dashArray,
              };
            }
          } else {
            // API zones keep existing styling
            style = isLEZ
              ? {
                  color: hasAccess ? THEME.colors.success : THEME.colors.danger,
                  fillColor: hasAccess
                    ? THEME.colors.success
                    : THEME.colors.danger,
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
          }

          return {
            key: `${zone.id}-${idx}`,
            zone,
            normalizedCoords,
            style,
            hasAccess,
            zType,
            isCustom,
          };
        })
        .filter(Boolean);
    }, [zones, visible, canAccessZone]);

    if (!visible || processedZones.length === 0) return null;

    console.log(
      `[ZoneLayer] Rendering ${processedZones.length} zones, visible=${visible}`,
    );

    return (
      <>
        {processedZones.map((processedZone) => {
          if (!processedZone) return null;

          const {
            key,
            zone,
            normalizedCoords,
            style,
            hasAccess,
            zType,
            isCustom,
          } = processedZone;

          return (
            <Polygon
              key={key}
              positions={normalizedCoords}
              pathOptions={style}
              interactive={!isInteracting}
              bubblingMouseEvents={false}
            >
              {!isInteracting && (
                <Popup
                  closeButton={false}
                  autoClose={false}
                  className="zone-popup"
                >
                  <div
                    style={{ fontSize: THEME.map.popups.fontSize }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div>
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
                    {isCustom && onEditZone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditZone(zone.id);
                        }}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Editar zona"
                      >
                        <Edit2 size={16} className="text-primary" />
                      </button>
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
      prev.canAccessZone === next.canAccessZone &&
      prev.onEditZone === next.onEditZone
    );
  },
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
    // Memoize weather markers processing
    const weatherMarkers = useMemo(() => {
      if (!weatherRoutes) return [];

      return weatherRoutes.flatMap(
        (wr, wrIdx) =>
          wr.alerts
            ?.map((alert, idx) => {
              if (alert.lat == null || alert.lon == null) return null;

              let icon;
              switch (alert.event) {
                case "SNOW":
                  icon = icons.snow;
                  break;
                case "RAIN":
                  icon = icons.rain;
                  break;
                case "ICE":
                  icon = icons.ice;
                  break;
                case "WIND":
                  icon = icons.wind;
                  break;
                case "FOG":
                  icon = icons.fog;
                  break;
                default:
                  return null;
              }

              return {
                key: `weather-${wrIdx}-${idx}`,
                position: [alert.lat, alert.lon] as [number, number],
                icon,
                message: alert.message,
              };
            })
            .filter(
              (marker): marker is NonNullable<typeof marker> => marker !== null,
            ) || [],
      );
    }, [weatherRoutes, icons]);

    return (
      <>
        {weatherMarkers.map((marker) => (
          <Marker
            key={marker.key}
            position={marker.position}
            icon={marker.icon}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span style={{ fontSize: 12 }}>{marker.message}</span>
            </Tooltip>
          </Marker>
        ))}
      </>
    );
  },
  (prev: WeatherMarkersLayerProps, next: WeatherMarkersLayerProps) => {
    return (
      prev.weatherRoutes === next.weatherRoutes && prev.icons === next.icons
    );
  },
);
