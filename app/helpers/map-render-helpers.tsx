import React from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import type { POI, FleetVehicle, FleetJob, CustomPOI } from "@/lib/types";

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
  return stations.map((station) => (
    <Marker
      key={station.id}
      position={station.position}
      icon={icon}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
        <span style={{ fontSize: 12 }}>{station.name}</span>
      </Tooltip>
      {!isRouting && (
        <Popup>
          <div style={{ fontSize: 12 }}>
            <strong>{station.name}</strong>
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
  ));
}

export function renderVehicleMarkers({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  isRouting,
}: RenderVehiclesProps) {
  return vehicles.map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={vehicle.coords}
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
              <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                {`Lat: ${vehicle.coords[0].toFixed(5)}, Lon: ${vehicle.coords[1].toFixed(5)}`}
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
  if (!jobs) return null;
  return jobs.map((job) => {
    return (
      <Marker
        key={`job-${job.id}`}
        position={job.coords}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
          <span style={{ fontSize: 12 }}>{job.label}</span>
        </Tooltip>
        <Popup closeButton={false}>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color: '#8b5cf6' }}>{job.label}</strong>
            <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
              {`Coords: ${job.coords[0].toFixed(5)}, ${job.coords[1].toFixed(5)}`}
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
  return customPOIs.map((poi) => {
    return (
      <Marker
        key={`custom-poi-${poi.id}`}
        position={poi.position}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -14]} opacity={0.95} permanent={false}>
          <span style={{ fontSize: 12, fontWeight: "bold" }}>{poi.name}</span>
        </Tooltip>
        {!isRouting && (
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong style={{ color: "#06b6d4" }}>{poi.name}</strong>
              <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                {`Lat: ${poi.position[0].toFixed(5)}, Lon: ${poi.position[1].toFixed(5)}`}
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
