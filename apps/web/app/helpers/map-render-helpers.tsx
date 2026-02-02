import { THEME } from "@/lib/theme";
import { POI_CONFIG } from "@/lib/config";
import { Marker, Tooltip, Popup, CircleMarker } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import { VEHICLE_TYPES } from "@/lib/types";
import {
  POI,
  FleetVehicle,
  FleetJob,
  CustomPOI,
  VehicleType,
} from "@gis/shared";
import { createMapIcon } from "@/lib/map-icons";
import { Package } from "lucide-react";

interface RenderPOIsProps {
  stations: POI[];
  isEV?: boolean;
}

interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => Icon | DivIcon;
  onUpdateType?: (vehicleId: string, type: VehicleType) => void;
  onSelect?: (vehicleId: string) => void;
}

interface RenderJobsProps {
  jobs: FleetJob[];
  icon: Icon | DivIcon;
  routeData?: any;
  vehicles?: FleetVehicle[];
}

interface RenderCustomPOIsProps {
  customPOIs: CustomPOI[];
  icon: Icon | DivIcon;
}

export function renderPOIs({ stations, isEV = false }: RenderPOIsProps) {
  const type = isEV ? "ev" : "gas";
  const color = POI_CONFIG[type].color;

  return (stations || []).map((station) => {
    const pos = station.position as [number, number];

    return (
      <CircleMarker
        key={`dot-${station.id}`}
        center={pos}
        radius={5}
        pathOptions={{
          fillColor: color,
          fillOpacity: 0.9,
          color: "white",
          weight: 1.5,
        }}
        interactive={true}
      >
        <Tooltip direction="top" offset={[0, -5]} opacity={0.8}>
          <span style={{ fontSize: 10 }}>{station.name}</span>
        </Tooltip>
      </CircleMarker>
    );
  });
}

export function renderVehicleMarkers({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  onUpdateType,
  onSelect,
}: RenderVehiclesProps) {
  return (vehicles || []).map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;
    const pos = vehicle.position;
    const color = isSelected
      ? THEME.colors.vehicleSelected
      : THEME.colors.muted;
    const icon = createVehicleIcon(color);

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={pos}
        icon={icon}
        eventHandlers={{
          click: () => onSelect?.(String(vehicle.id)),
        }}
      >
        <Tooltip
          direction="top"
          offset={THEME.map.popups.vehicleTooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
          permanent={isSelected}
        >
          <span
            style={{
              fontSize: THEME.map.popups.fontSize,
              fontWeight: isSelected ? "bold" : "normal",
            }}
          >
            {vehicle.type.label}
          </span>
        </Tooltip>
        <Popup offset={[0, -35]}>
          <div style={{ fontSize: THEME.map.popups.fontSize }}>
            <strong>{vehicle.type.label}</strong>
            <div
              style={{
                marginTop: THEME.map.popups.padding,
                color: THEME.colors.textMuted,
                fontSize: THEME.map.popups.subtitleFontSize,
              }}
            >
              Assign Label:
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onUpdateType?.(String(vehicle.id), type)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    borderRadius: "4px",
                    border: `1px solid ${vehicle.type.id === type.id ? THEME.colors.info : "#e2e8f0"}`,
                    backgroundColor:
                      vehicle.type.id === type.id ? THEME.colors.info : "white",
                    color: vehicle.type.id === type.id ? "white" : "#1e293b",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });
}

export function renderJobMarkers({
  jobs,
  icon,
  routeData,
  vehicles = [],
}: RenderJobsProps) {
  // Build a map of job ID -> vehicle info for quick lookup
  const jobToVehicleMap: Record<
    string | number,
    { vehicleId: string | number; color: string; label: string }
  > = {};
  if (routeData?.vehicleRoutes) {
    routeData.vehicleRoutes.forEach((route: any) => {
      const vehicle = vehicles.find(
        (v) => String(v.id) === String(route.vehicleId),
      );
      const vehicleLabel = vehicle?.type.label || `Vehicle ${route.vehicleId}`;

      // Use assignedJobIds if available, otherwise fall back to checking jobsAssigned count
      if (route.assignedJobIds && Array.isArray(route.assignedJobIds)) {
        route.assignedJobIds.forEach((jobId: any) => {
          jobToVehicleMap[jobId] = {
            vehicleId: route.vehicleId,
            color: route.color,
            label: vehicleLabel,
          };
        });
      }
    });
  }

  return (jobs || []).map((job) => {
    const pos = job.position;
    const assignedTo = jobToVehicleMap[job.id];
    const routeColor = assignedTo?.color || THEME.colors.accent;

    // Use dynamic icon color based on assigned vehicle
    const iconToUse = assignedTo
      ? createMapIcon(Package, routeColor, 26, 15, { opacity: 1 })
      : icon;

    return (
      <Marker key={`job-${job.id}`} position={pos} icon={iconToUse}>
        <Tooltip
          direction="top"
          offset={THEME.map.popups.jobTooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
        >
          <span style={{ fontSize: THEME.map.popups.fontSize }}>
            {job.label}
            {assignedTo && (
              <>
                <br />
                <span style={{ fontSize: "11px", opacity: 0.8 }}>
                  → {assignedTo.label}
                </span>
              </>
            )}
          </span>
        </Tooltip>
        <Popup closeButton={false} offset={[0, -25]}>
          <div style={{ fontSize: THEME.map.popups.fontSize }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "2px",
                  backgroundColor: routeColor,
                  boxShadow: `0 0 4px ${routeColor}80`,
                }}
              />
              <strong style={{ color: routeColor }}>{job.label}</strong>
            </div>
            {assignedTo ? (
              <div
                style={{
                  marginTop: THEME.map.popups.marginTop,
                  fontSize: THEME.map.popups.subtitleFontSize,
                  color: THEME.colors.secondary,
                  padding: "6px 8px",
                  backgroundColor: routeColor + "15",
                  borderLeft: `3px solid ${routeColor}`,
                  borderRadius: "2px",
                }}
              >
                <strong style={{ color: routeColor }}>
                  → {assignedTo.label}
                </strong>
                <div
                  style={{ fontSize: "10px", marginTop: "2px", opacity: 0.7 }}
                >
                  Vehicle ID: {assignedTo.vehicleId}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: THEME.map.popups.marginTop,
                  fontSize: THEME.map.popups.subtitleFontSize,
                  color: "#f59e0b",
                  padding: "6px 8px",
                  backgroundColor: "#fef3c715",
                  borderLeft: "3px solid #f59e0b",
                  borderRadius: "2px",
                }}
              >
                ⚠️ Unassigned
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}

export function renderCustomPOIs({ customPOIs, icon }: RenderCustomPOIsProps) {
  const activeIcon = icon;

  return (customPOIs || []).map((poi) => {
    const pos = poi.position;
    return (
      <Marker key={`custom-poi-${poi.id}`} position={pos} icon={activeIcon}>
        <Tooltip
          direction="top"
          offset={THEME.map.popups.customPoiTooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
          permanent={false}
        >
          <span
            style={{
              fontSize: THEME.map.popups.fontSize,
              fontWeight: "bold",
            }}
          >
            {poi.name}
          </span>
        </Tooltip>
        <Popup offset={[0, -28]}>
          <div style={{ fontSize: THEME.map.popups.fontSize }}>
            <strong style={{ color: THEME.colors.customPOI }}>
              {poi.name}
            </strong>
            <div
              style={{
                marginTop: 4,
                color: THEME.colors.textMuted,
                fontSize: THEME.map.popups.subtitleFontSize,
              }}
            ></div>
            {poi.description && (
              <div
                style={{
                  marginTop: THEME.map.popups.marginTop,
                  fontSize: THEME.map.popups.subtitleFontSize,
                  fontStyle: "italic",
                }}
              >
                {poi.description}
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}
