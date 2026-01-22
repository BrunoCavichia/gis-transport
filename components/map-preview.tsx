// components/map-preview.tsx
"use client";

import { memo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

interface MapPreviewProps {
    coords: [number, number];
}

const MapPreview = memo(({ coords }: MapPreviewProps) => {
    return (
        <MapContainer
            center={coords}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            className="h-full w-full grayscale-[0.2]"
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={coords} />
        </MapContainer>
    );
});

MapPreview.displayName = "MapPreview";

export default MapPreview;