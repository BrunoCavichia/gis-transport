import { memo } from "react";
import { Polygon, Marker, Polyline } from "react-leaflet";
import L from "leaflet";

interface ZoneDrawingPreviewProps {
  points: [number, number][];
  visible: boolean;
}

// Create a simple marker icon for zone points
const pointIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#3b82f6" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const ZoneDrawingPreview = memo(
  function ZoneDrawingPreview({ points, visible }: ZoneDrawingPreviewProps) {
    if (!visible || points.length === 0) return null;

    return (
      <>
        {/* Draw markers for each point */}
        {points.map((point, index) => (
          <Marker key={`point-${index}`} position={point} icon={pointIcon} />
        ))}

        {/* Draw lines connecting the points */}
        {points.length > 1 && (
          <Polyline
            positions={points}
            color="#3b82f6"
            weight={2}
            dashArray="5, 5"
          />
        )}

        {/* Draw a line from last point to first to show the closing edge */}
        {points.length > 2 && (
          <Polyline
            positions={[points[points.length - 1], points[0]]}
            color="#3b82f6"
            weight={2}
            dashArray="5, 5"
            opacity={0.5}
          />
        )}

        {/* Draw the filled polygon if we have at least 3 points */}
        {points.length >= 3 && (
          <Polygon
            positions={points}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.2,
              weight: 2,
              dashArray: "5, 5",
            }}
          />
        )}
      </>
    );
  },
);
