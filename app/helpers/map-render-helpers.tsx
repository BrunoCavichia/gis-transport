import React from "react";
import { Marker, Tooltip, Popup, CircleMarker, Polyline } from "react-leaflet";
import type { POI, FleetVehicle, FleetJob, CustomPOI, SupplyRiskResult, LayerVisibility } from "@/lib/types";

interface RenderPOIsProps {
  stations: POI[];
  icon: L.Icon;
  isEV?: boolean;
  isRouting: boolean;
}

interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => L.Icon;
  isRouting: boolean;
}

interface RenderJobsProps {
  jobs: FleetJob[];
  isRouting: boolean;
  icon: L.Icon;
}

interface RenderCustomPOIsProps {
  customPOIs: CustomPOI[];
  isRouting: boolean;
  icon: L.Icon;
}

interface RenderSupplyRiskProps {
  supplyRisk: SupplyRiskResult[];
  riskIcon: L.DivIcon;
  warningIcon: L.DivIcon;
  suggestionIcon: L.DivIcon;
  layers: LayerVisibility;
  onFindStation?: (position: [number, number], type: 'ev' | 'gas') => void;
}

function normalizeCoords(coords: [number, number]): [number, number] {
  const [a, b] = coords;
  return a < -90 || a > 90 ? [b, a] : [a, b];
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
      position={station.position as [number, number]}
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
    const center = normalizeCoords(vehicle.coords);
    const isSelected = selectedVehicleId === vehicle.id;

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={center}
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
                {`Lat: ${center[0].toFixed(5)}, Lon: ${center[1].toFixed(5)}`}
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
  return jobs.map((job) => {
    const center = normalizeCoords(job.coords);

    return (
      <Marker
        key={`job-${job.id}`}
        position={center}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
          <span style={{ fontSize: 12 }}>{job.label}</span>
        </Tooltip>
        {!isRouting && (
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>{job.label}</strong>
              <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                {`Lat: ${center[0].toFixed(5)}, Lon: ${center[1].toFixed(5)}`}
              </div>
            </div>
          </Popup>
        )}
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
    const center = normalizeCoords(poi.position);

    return (
      <Marker
        key={`custom-poi-${poi.id}`}
        position={center}
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
                {`Lat: ${center[0].toFixed(5)}, Lon: ${center[1].toFixed(5)}`}
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

export function renderSupplyRiskMarkers({
  supplyRisk,
  riskIcon,
  warningIcon,
  suggestionIcon,
  layers,
}: RenderSupplyRiskProps) {
  if (!layers.supplyRisk) return null;

  const components: React.ReactNode[] = [];

  supplyRisk.forEach((res) => {
    // 1. Alerts (Critical Risk Points)
    res.alerts.forEach((alert, idx) => {
      const center = normalizeCoords(alert.coords);
      const icon = alert.riskLevel === "HIGH" ? riskIcon : warningIcon;

      components.push(
        <Marker
          key={`risk-alert-${res.vehicleId}-${idx}`}
          position={center}
          icon={icon}
        >
          <Popup>
            <div className="p-2 max-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {alert.riskLevel} Risk
                </div>
                <span className="text-[10px] text-gray-400">#Segment {alert.segmentIndex}</span>
              </div>
              <div className="text-sm font-bold text-gray-900 mb-1">Supply Critical Alert</div>
              <p className="text-xs text-gray-600 mb-3">{alert.reason}</p>
              <div className="bg-gray-50 border border-gray-100 rounded p-2">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Status</div>
                <div className="flex justify-between items-center text-xs">
                  <span>Remaining Supply:</span>
                  <span className={`font-bold ${alert.riskLevel === 'HIGH' ? 'text-red-600' : 'text-orange-600'}`}>{alert.remainingSupply.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });

    // 2. Suggested Stations
    res.suggestedStations.forEach((suggestion, idx) => {
      const center = normalizeCoords(suggestion.station.position);

      components.push(
        <Marker
          key={`suggested-station-${res.vehicleId}-${idx}`}
          position={center}
          icon={suggestionIcon}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                  Recommended Stop
                </div>
              </div>
              <div className="text-base font-bold text-gray-900 mb-1">{suggestion.station.name}</div>
              <p className="text-xs text-gray-600 mb-3">{suggestion.reason}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px] border-b pb-1">
                  <span className="text-gray-500">Deviation:</span>
                  <span className="font-medium text-gray-900">+{suggestion.deviationDistance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between text-[11px] border-b pb-1">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">{suggestion.station.type === 'ev' ? 'Electric Station' : 'Fuel Station'}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  });

  return components;
}
