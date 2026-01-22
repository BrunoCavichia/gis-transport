import { THEME } from "@/lib/theme";
import { Marker, Tooltip, Popup } from "react-leaflet";
import type { POI, FleetVehicle, FleetJob, CustomPOI, VehicleType } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import ReactDOMServer from "react-dom/server";

interface RenderPOIsProps {
  stations: POI[];
  icon: any;
  isEV?: boolean;
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
  const activeIcon = icon;

  return (stations || []).map((station) => {
    const pos = station.position as [number, number]
    return (
      <Marker
        key={station.id}
        position={pos}
        icon={activeIcon}
      >
        <Tooltip
          direction="top"
          offset={THEME.map.popups.tooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
        >
          <span style={{ fontSize: THEME.map.popups.fontSize }}>{station.name}</span>
        </Tooltip>

        {!isRouting && (
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



interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => any;
  isRouting: boolean;
  updateVehicleType?: (vehicleId: string, newType: VehicleType) => void;
}

// ... (RenderPOIsProps and RenderJobsProps remain unchanged)

export function renderVehicleMarkers({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  isRouting,
  updateVehicleType,
}: RenderVehiclesProps) {
  return (vehicles || []).map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;
    const pos = vehicle.coords;
    const color = THEME.colors.vehicleSelected;
    const icon = createVehicleIcon(color);

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={pos}
        icon={icon}
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

        {!isRouting && (
          <Popup offset={[0, -35]} className="vehicle-popup">
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex flex-col">
                <strong className="text-sm font-bold">{vehicle.type.label}</strong>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {`ID: ${vehicle.id.slice(0, 8)}`}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {`Coords: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-border/50 my-1" />

              {/* Tag Selection UI */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Cambiar Etiqueta
                </span>
                <div className="flex flex-col gap-1">
                  {VEHICLE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent map click
                        if (updateVehicleType) {
                          updateVehicleType(vehicle.id, type);
                          // Close popup logic is handled by Leaflet usually when clicking inside, 
                          // but we might want to keep it or let user manually close.
                          // For now, let's just update.
                        }
                      }}
                      disabled={vehicle.type.id === type.id}
                      className={`
                        flex items-center justify-between p-1.5 rounded-lg text-xs font-medium transition-colors
                        ${vehicle.type.id === type.id
                          ? "bg-primary/10 text-primary cursor-default"
                          : "hover:bg-accent hover:text-accent-foreground text-foreground cursor-pointer"}
                      `}
                    >
                      <span className="flex items-center gap-2">
                        {/* We can reproduce the badge style here small-scale if needed, or just text */}
                        {type.label}
                      </span>
                      {vehicle.type.id === type.id && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
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
  const activeIcon = icon;

  return (jobs || []).map((job) => {
    const pos = job.coords;
    return (
      <Marker
        key={`job-${job.id}`}
        position={pos}
        icon={activeIcon}
      >
        <Tooltip direction="top" offset={THEME.map.popups.jobTooltipOffset} opacity={THEME.map.popups.tooltipOpacity}>
          <span style={{ fontSize: THEME.map.popups.fontSize }}>{job.label}</span>
        </Tooltip>
        {!isRouting && (
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
}: RenderCustomPOIsProps) {
  const activeIcon = icon;

  return (customPOIs || []).map((poi) => {
    const pos = poi.position;
    return (
      <Marker
        key={`custom-poi-${poi.id}`}
        position={pos}
        icon={activeIcon}
      >

        <Tooltip direction="top" offset={THEME.map.popups.customPoiTooltipOffset} opacity={THEME.map.popups.tooltipOpacity} permanent={false}>
          <span style={{ fontSize: THEME.map.popups.fontSize, fontWeight: "bold" }}>{poi.name}</span>
        </Tooltip>

        {!isRouting && (
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
