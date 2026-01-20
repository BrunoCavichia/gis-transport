import React from "react";
import { MAP_CENTER } from "@/lib/config";
import { Marker, Tooltip, Popup } from "react-leaflet";
import type { POI, FleetVehicle, FleetJob, CustomPOI } from "@/lib/types";

/**
 * Robust coordinate fixer.
 * In GIS, [lon, lat] is standard (GeoJSON), but Leaflet uses [lat, lon].
 * This function detects if the values are likely swapped (e.g. lon is in the lat position).
 */
export function fixCoords(coords: [number, number]): [number, number] {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return MAP_CENTER;

  const [a, b] = coords;

  // Rule: Latitude MUST be between -90 and 90.
  // Rule: Longitude is usually much larger in magnitude for Spain/Europe (e.g. -3 vs 40).
  // If 'a' (the supposed latitude) is > 90 or < -90, it CANNOT be a latitude.
  // But wait, if 'a' is -3 and 'b' is 40, both are valid! 
  // However, in Spain/Madrid, lat is always ~40 and lon is always ~-3.

  // If a is between -20 and 20 and b is between 35 and 60 -> it's almost certainly [lon, lat] for Europe.
  if (Math.abs(a) < 20 && (b > 30 && b < 70)) {
    // This looks like [lon, lat]. Swap it to [lat, lon] for Leaflet.
    return [b, a];
  }

  // General fallback: if first is absolute > 90, it's definitely a longitude.
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    return [b, a];
  }

  return [a, b];
}

interface RenderPOIsProps {
  stations: POI[];
  icon: any;
  isEV?: boolean;
  isRouting: boolean;
}

interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => any;
  isRouting: boolean;
}

interface RenderJobsProps {
  jobs: FleetJob[];
  isRouting: boolean;
  icon: any;
}

interface RenderCustomPOIsProps {
  customPOIs: CustomPOI[];
  isRouting: boolean;
  icon: any;
}

export function renderPOIs({
  stations,
  icon,
  isEV = false,
  isRouting,
}: RenderPOIsProps) {
  return (stations || []).map((station) => {
    const pos = fixCoords(station.position as [number, number]);
    return (
      <Marker
        key={station.id}
        position={pos}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
          <span style={{ fontSize: 12 }}>{station.name}</span>
        </Tooltip>
        {!isRouting && (
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>{station.name}</strong>
              <div style={{ marginTop: 4, color: '#666', fontSize: 10 }}>
                {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
              </div>
              <div style={{ marginTop: 6 }}>
                {isEV
                  ? station.connectors
                    ? `${station.connectors} connectors`
                    : "EV station"
                  : station.address}
              </div>
            </div>
          </Popup>
        )}
      </Marker>
    );
  });
}

export function renderVehicleMarkers({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  isRouting,
}: RenderVehiclesProps) {
  return (vehicles || []).map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;
    const pos = fixCoords(vehicle.coords);

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={pos}
        icon={createVehicleIcon(isSelected ? "#ffa616ff" : "#94a3b8")}
      >
        <Tooltip
          direction="top"
          offset={[0, -18]}
          opacity={0.95}
          permanent={isSelected}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: isSelected ? "bold" : "normal",
            }}
          >
            {vehicle.type.label}
          </span>
        </Tooltip>
        {!isRouting && (
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>{vehicle.type.label}</strong>
              <div style={{ marginTop: 4, color: '#666', fontSize: 10 }}>
                {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
              </div>
            </div>
          </Popup>
        )}
      </Marker>
    );
  });
}

export function renderJobMarkers({
  jobs,
  isRouting,
  icon,
}: RenderJobsProps) {
  return (jobs || []).map((job) => {
    const pos = fixCoords(job.coords);
    return (
      <Marker
        key={`job-${job.id}`}
        position={pos}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
          <span style={{ fontSize: 12 }}>{job.label}</span>
        </Tooltip>
        <Popup closeButton={false}>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color: '#8b5cf6' }}>{job.label}</strong>
            <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
              {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });
}

export function renderCustomPOIs({
  customPOIs,
  isRouting,
  icon,
}: RenderCustomPOIsProps) {
  return (customPOIs || []).map((poi) => {
    const pos = fixCoords(poi.position);
    return (
      <Marker
        key={`custom-poi-${poi.id}`}
        position={pos}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -14]} opacity={0.95} permanent={false}>
          <span style={{ fontSize: 12, fontWeight: "bold" }}>{poi.name}</span>
        </Tooltip>
        {!isRouting && (
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong style={{ color: "#06b6d4" }}>{poi.name}</strong>
              <div style={{ marginTop: 4, color: '#666', fontSize: 10 }}>
                {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
              </div>
              {poi.description && (
                <div style={{ marginTop: 6, fontSize: 11, fontStyle: "italic" }}>
                  {poi.description}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Marker>
    );
  });
}
