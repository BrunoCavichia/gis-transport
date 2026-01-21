import { THEME } from "@/lib/theme";
import { Marker, Tooltip, Popup } from "react-leaflet";
import type { POI, FleetVehicle, FleetJob, CustomPOI } from "@/lib/types";

interface RenderPOIsProps {
  stations: POI[];
  icon: any;
  minimalIcon?: any;
  zoom: number;
  isEV?: boolean;
  isRouting: boolean;
}

interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => any;
  createMinimalIcon: (color: string) => any;
  zoom: number;
  isRouting: boolean;
}

interface RenderJobsProps {
  jobs: FleetJob[];
  isRouting: boolean;
  icon: any;
  minimalIcon?: any;
  zoom: number;
}

interface RenderCustomPOIsProps {
  customPOIs: CustomPOI[];
  isRouting: boolean;
  icon: any;
  minimalIcon?: any;
  zoom: number;
}

export function renderPOIs({
  stations,
  icon,
  minimalIcon,
  zoom,
  isEV = false,
  isRouting,
}: RenderPOIsProps) {
  const isMinimal = zoom < THEME.map.popups.minimalZoomThreshold;
  const activeIcon = isMinimal && minimalIcon ? minimalIcon : icon;

  return (stations || []).map((station) => {
    const pos = station.position as [number, number]
    return (
      <Marker
        key={station.id}
        position={pos}
        icon={activeIcon}
      >
        {!isMinimal && (
          <Tooltip
            direction="top"
            offset={THEME.map.popups.tooltipOffset}
            opacity={THEME.map.popups.tooltipOpacity}
          >
            <span style={{ fontSize: THEME.map.popups.fontSize }}>{station.name}</span>
          </Tooltip>
        )}
        {!isRouting && !isMinimal && (
          <Popup offset={[0, -30]}>
            <div style={{ fontSize: THEME.map.popups.fontSize }}>
              <strong>{station.name}</strong>
              <div style={{ marginTop: THEME.map.popups.padding, color: THEME.colors.textMuted, fontSize: THEME.map.popups.subtitleFontSize }}>
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
  createMinimalIcon,
  zoom,
  isRouting,
}: RenderVehiclesProps) {
  const isMinimal = zoom < THEME.map.popups.minimalZoomThreshold;

  return (vehicles || []).map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;
    const pos = vehicle.coords;
    const color = isSelected ? THEME.colors.vehicleSelected : THEME.colors.muted;

    // Only turn to dot if not selected
    const icon = (isMinimal && !isSelected)
      ? createMinimalIcon(color)
      : createVehicleIcon(color);

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={pos}
        icon={icon}
      >
        {!isMinimal && (
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
        )}
        {!isRouting && !isMinimal && (
          <Popup offset={[0, -35]}>
            <div style={{ fontSize: THEME.map.popups.fontSize }}>
              <strong>{vehicle.type.label}</strong>
              <div style={{ marginTop: THEME.map.popups.padding, color: THEME.colors.textMuted, fontSize: THEME.map.popups.subtitleFontSize }}>
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
  minimalIcon,
  zoom,
}: RenderJobsProps) {
  const isMinimal = zoom < THEME.map.popups.minimalZoomThreshold;
  const activeIcon = isMinimal && minimalIcon ? minimalIcon : icon;

  return (jobs || []).map((job) => {
    const pos = job.coords;
    return (
      <Marker
        key={`job-${job.id}`}
        position={pos}
        icon={activeIcon}
      >
        {!isMinimal && (
          <Tooltip direction="top" offset={THEME.map.popups.jobTooltipOffset} opacity={THEME.map.popups.tooltipOpacity}>
            <span style={{ fontSize: THEME.map.popups.fontSize }}>{job.label}</span>
          </Tooltip>
        )}
        {!isRouting && !isMinimal && (
          <Popup closeButton={false} offset={[0, -25]}>
            <div style={{ fontSize: THEME.map.popups.fontSize }}>
              <strong style={{ color: THEME.colors.accent }}>{job.label}</strong>
              <div style={{ marginTop: THEME.map.popups.marginTop, fontSize: THEME.map.popups.subtitleFontSize, color: THEME.colors.secondary }}>
                {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
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
  minimalIcon,
  zoom,
}: RenderCustomPOIsProps) {
  const isMinimal = zoom < THEME.map.popups.minimalZoomThreshold;
  const activeIcon = isMinimal && minimalIcon ? minimalIcon : icon;

  return (customPOIs || []).map((poi) => {
    const pos = poi.position;
    return (
      <Marker
        key={`custom-poi-${poi.id}`}
        position={pos}
        icon={activeIcon}
      >
        {!isMinimal && (
          <Tooltip direction="top" offset={THEME.map.popups.customPoiTooltipOffset} opacity={THEME.map.popups.tooltipOpacity} permanent={false}>
            <span style={{ fontSize: THEME.map.popups.fontSize, fontWeight: "bold" }}>{poi.name}</span>
          </Tooltip>
        )}
        {!isRouting && !isMinimal && (
          <Popup offset={[0, -28]}>
            <div style={{ fontSize: THEME.map.popups.fontSize }}>
              <strong style={{ color: THEME.colors.customPOI }}>{poi.name}</strong>
              <div style={{ marginTop: 4, color: THEME.colors.textMuted, fontSize: THEME.map.popups.subtitleFontSize }}>
                {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
              </div>
              {poi.description && (
                <div style={{ marginTop: THEME.map.popups.marginTop, fontSize: THEME.map.popups.subtitleFontSize, fontStyle: "italic" }}>
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
