// components/map/RouteLayer.tsx
"use client";
import { memo, useEffect, useRef, Fragment } from "react";
import { Polyline, Marker, useMapEvents, useMap } from "react-leaflet";
import { VehicleRoute } from "@/lib/types";
import { getDynamicWeight, formatDistance, formatDuration } from "@/lib/map-utils";
import { createRouteLabelIcon } from "@/lib/map-icons";
import { useState } from "react";
import L from "leaflet";

interface RouteLayerProps {
    vehicleRoutes: VehicleRoute[];
}

export const RouteLayer = memo(function RouteLayer({ vehicleRoutes }: RouteLayerProps) {
    const map = useMap();
    const coreRefs = useRef<Record<string, L.Polyline | null>>({});

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
            {vehicleRoutes.map((r) => (
                <Fragment key={`route-group-${r.vehicleId}`}>
                    <Polyline
                        ref={(el) => {
                            if (el) coreRefs.current[r.vehicleId as string] = el;
                        }}
                        positions={r.coordinates}
                        pathOptions={{
                            color: r.color,
                            weight: getDynamicWeight(map.getZoom()),
                            opacity: 1,
                            lineCap: "round",
                            lineJoin: "round",
                        }}
                    />
                </Fragment>
            ))}
        </>
    );
});

export const RouteLabelsLayer = memo(function RouteLabelsLayer({ vehicleRoutes }: RouteLayerProps) {
    const map = useMap();
    const [showLabels, setShowLabels] = useState(map.getZoom() >= 12);

    useMapEvents({
        zoomend: () => {
            const shouldShow = map.getZoom() >= 12;
            if (shouldShow !== showLabels) setShowLabels(shouldShow);
        },
    });

    if (!showLabels) return null;

    return (
        <>
            {vehicleRoutes.map((r) => {
                if (!r.coordinates || r.coordinates.length < 2) return null;
                return (
                    <Marker
                        key={`route-label-${r.vehicleId}`}
                        position={r.coordinates[Math.floor(r.coordinates.length / 3)]}
                        icon={createRouteLabelIcon(
                            formatDistance(r.distance),
                            formatDuration(r.duration),
                            r.color,
                        )}
                        interactive={false}
                    />
                );
            })}
        </>
    );
});
