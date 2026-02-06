import { memo } from "react";
import { Polygon, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";

interface ZoneDrawingPreviewProps {
  points: [number, number][];
  visible: boolean;
  isEditing?: boolean;
  onRemovePoint?: (index: number) => void;
  onUpdatePoint?: (index: number, newCoords: [number, number]) => void;
}

// Create a simple marker icon for zone points
const pointIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="#3b82f6" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Editing mode marker icon (red, bigger)
const editingPointIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="#ef4444" stroke="white" stroke-width="2.5"/>
      <path d="M 8 12 L 16 12 M 12 8 L 12 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const ZoneDrawingPreview = memo(function ZoneDrawingPreview({
  points,
  visible,
  isEditing = false,
  onRemovePoint,
  onUpdatePoint,
}: ZoneDrawingPreviewProps) {
  if (!visible || points.length === 0) return null;

  const handleMarkerDragEnd = (index: number, event: any) => {
    const newLatLng = event.target.getLatLng();
    if (!newLatLng) {
      console.warn(
        `[ZoneDrawingPreview] Failed to get coordinates for point ${index}`,
      );
      return;
    }
    const newCoords: [number, number] = [newLatLng.lat, newLatLng.lng];
    if (onUpdatePoint) {
      onUpdatePoint(index, newCoords);
    }
  };

  return (
    <>
      {/* Draw markers for each point */}
      {points.map((point, index) => {
        // Skip invalid points
        if (
          !point ||
          !Array.isArray(point) ||
          point.length < 2 ||
          typeof point[0] !== "number" ||
          typeof point[1] !== "number" ||
          isNaN(point[0]) ||
          isNaN(point[1])
        ) {
          console.warn(
            `[ZoneDrawingPreview] Skipping invalid point at index ${index}:`,
            point,
          );
          return null;
        }

        return (
          <Marker
            key={`point-${index}`}
            position={point}
            icon={isEditing ? editingPointIcon : pointIcon}
            draggable={isEditing}
            eventHandlers={{
              ...(isEditing
                ? {
                    click: () => {
                      if (onRemovePoint) {
                        onRemovePoint(index);
                      }
                    },
                    dragend: (event) => handleMarkerDragEnd(index, event),
                  }
                : {}),
            }}
          >
            {isEditing && (
              <Popup>
                <div className="text-xs font-semibold whitespace-nowrap">
                  <div className="mb-1">Punto {index + 1}</div>
                  <div className="text-[10px] text-gray-500 mb-2">
                    Arrastra para mover
                  </div>
                  <button
                    onClick={() => onRemovePoint?.(index)}
                    className="block w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[11px] font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}

      {/* Draw lines connecting the points */}
      {points.length > 1 && (
        <Polyline
          positions={points}
          color={isEditing ? "#ef4444" : "#3b82f6"}
          weight={isEditing ? 2.5 : 2}
          dashArray="5, 5"
          opacity={isEditing ? 0.8 : 1}
        />
      )}

      {/* Draw a line from last point to first to show the closing edge */}
      {points.length > 2 && (
        <Polyline
          positions={[points[points.length - 1], points[0]]}
          color={isEditing ? "#ef4444" : "#3b82f6"}
          weight={isEditing ? 2.5 : 2}
          dashArray="5, 5"
          opacity={isEditing ? 0.8 : 0.5}
        />
      )}

      {/* Draw the filled polygon if we have at least 3 points */}
      {points.length >= 3 && (
        <Polygon
          positions={points}
          pathOptions={{
            color: isEditing ? "#ef4444" : "#3b82f6",
            fillColor: isEditing ? "#ef4444" : "#3b82f6",
            fillOpacity: isEditing ? 0.3 : 0.2,
            weight: isEditing ? 2.5 : 2,
            dashArray: "5, 5",
          }}
        />
      )}
    </>
  );
});
