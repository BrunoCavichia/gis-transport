// components/map/RouteLayer.tsx
"use client";
import { memo, useEffect, useRef, Fragment } from "react";
import { Polyline, Marker, useMapEvents, useMap } from "react-leaflet";
import { THEME } from "@/lib/theme";
import { VehicleRoute } from "@/lib/types";
import {
  getDynamicWeight,
  getOffsetCoordinates,
} from "@/lib/map-utils";
import L from "leaflet";

interface RouteLayerProps {
  vehicleRoutes: VehicleRoute[];
  selectedVehicleId?: string | null;
}

export const RouteLayer = memo(function RouteLayer({
  vehicleRoutes,
  selectedVehicleId,
}: RouteLayerProps) {
  const map = useMap();
  const coreRefs = useRef<Record<string, L.Polyline | null>>({});

  useEffect(() => {
    console.log("[RouteLayer] Rendering routes", {
      count: vehicleRoutes.length,
      routes: vehicleRoutes.map((r) => ({
        vehicleId: r.vehicleId,
        coordinateCount: r.coordinates?.length || 0,
        hasCoordinates: !!r.coordinates,
        color: r.color,
      })),
    });
  }, [vehicleRoutes]);

  // Unified weight application
  useEffect(() => {
    const zoom = map.getZoom();
    const coreWeight = getDynamicWeight(zoom);

    Object.values(coreRefs.current).forEach((layer) => {
      layer?.setStyle({ weight: coreWeight });
    });
  }, [vehicleRoutes, map]);

  useMapEvents({
    zoom: () => {
      const zoom = map.getZoom();
      const coreWeight = getDynamicWeight(zoom);
      Object.values(coreRefs.current).forEach((layer) => {
        layer?.setStyle({ weight: coreWeight });
      });
    },
  });

  return (
    <>
      {vehicleRoutes.map((r, index) => {
        const isSelected = selectedVehicleId === String(r.vehicleId);
        const isDimmed = !!selectedVehicleId && !isSelected;

        return (
          <Fragment key={`route-group-${r.vehicleId}`}>
            <Polyline
              ref={(el) => {
                if (el) coreRefs.current[r.vehicleId as string] = el;
              }}
              positions={getOffsetCoordinates(
                r.coordinates || [],
                index,
                map.getZoom(),
              )}
              pathOptions={{
                color: r.color,
                weight: getDynamicWeight(map.getZoom()),
                opacity: isDimmed
                  ? THEME.map.hierarchy.dimmedRouteOpacity
                  : THEME.map.hierarchy.activeOpacity,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </Fragment>
        );
      })}
    </>
  );
});

