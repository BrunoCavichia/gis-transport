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
import { Package, Truck, Fuel, Zap, Octagon } from "lucide-react";
import { getLOD, MapLOD } from "@/lib/map-utils";

import { AlertBadge } from "@/components/alert-badge";
import { Alert } from "@/lib/utils";
import { renderToStaticMarkup } from "react-dom/server";

interface RenderPOIsProps {
  stations: POI[];
  isEV?: boolean;
  zoom: number;
  icon: Icon | DivIcon;
}

interface RenderVehiclesProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => DivIcon;
  onUpdateType?: (vehicleId: string, type: VehicleType) => void;
  onUpdateLabel?: (vehicleId: string, label: string) => void;
  onSelect?: (vehicleId: string) => void;
  zoom: number;
  vehicleAlerts?: Record<string | number, any[]>;
}

interface RenderJobsProps {
  jobs: FleetJob[];
  icon: Icon | DivIcon;
  routeData?: any;
  vehicles?: FleetVehicle[];
  zoom: number;
  selectedVehicleId?: string | null;
}

interface RenderCustomPOIsProps {
  customPOIs: CustomPOI[];
  icon: Icon | DivIcon;
  zoom: number;
}

export function renderPOIs({
  stations,
  isEV = false,
  zoom,
  icon,
}: RenderPOIsProps) {
  const lod = getLOD(zoom, THEME.map.poi.lod.poi);
  if (lod === "HIDDEN") return null;

  const type = isEV ? "ev" : "gas";
  const color = isEV ? "#76e19dff" : "#f97316";

  return (stations || []).map((station) => {
    const pos = station.position as [number, number];

    if (lod === "MINIMAL") {
      return (
        <CircleMarker
          key={`dot-${station.id}`}
          center={pos}
          radius={4}
          pathOptions={{
            fillColor: color,
            fillOpacity: 0.8,
            color: "white",
            weight: 1,
          }}
          interactive={true}
        >
          <Tooltip direction="top" offset={[0, -5]} opacity={0.8}>
            <span style={{ fontSize: 10 }}>{station.name}</span>
          </Tooltip>
        </CircleMarker>
      );
    }

    // NORMAL or DETAILED: Use Marker with the passed icon and premium popup
    return (
      <Marker
        key={`${type}-${station.id}`}
        position={pos}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -20]} opacity={0.8}>
          <span className="font-semibold text-[10px]">{station.name}</span>
        </Tooltip>
        <Popup className="premium-popup">
          <div className="p-3 min-w-[200px] bg-white rounded-lg">
            <header className="mb-2 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 leading-tight">
                {station.name}
              </h3>
              {station.address && (
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">
                  {station.address} {station.town ? `· ${station.town}` : ""}
                </p>
              )}
            </header>

            {type === "gas" && station.prices && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Combustibles</span>
                  <Fuel className="w-3 h-3" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {station.prices.gasoline95 && (
                    <div className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold">G95 E5</span>
                      <span className="text-sm font-black text-slate-700">
                        {station.prices.gasoline95.toFixed(3)}
                        <span className="text-[10px] ml-0.5">€</span>
                      </span>
                    </div>
                  )}
                  {station.prices.diesel && (
                    <div className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold">DIESEL A</span>
                      <span className="text-sm font-black text-slate-700">
                        {station.prices.diesel.toFixed(3)}
                        <span className="text-[10px] ml-0.5">€</span>
                      </span>
                    </div>
                  )}
                  {station.prices.gasoline98 && (
                    <div className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold">G98 E5</span>
                      <span className="text-sm font-black text-slate-700">
                        {station.prices.gasoline98.toFixed(3)}
                        <span className="text-[10px] ml-0.5">€</span>
                      </span>
                    </div>
                  )}
                  {station.prices.dieselPremium && (
                    <div className="flex flex-col bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold">DIESEL+</span>
                      <span className="text-sm font-black text-slate-700">
                        {station.prices.dieselPremium.toFixed(3)}
                        <span className="text-[10px] ml-0.5">€</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-1 text-center">
                  <span className="text-[9px] text-slate-300 font-medium italic">
                    Actualizado: {station.prices.updatedAt}
                  </span>
                </div>
              </div>
            )}

            {type === "ev" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-green-500 tracking-wider">
                  <span>Punto de Carga</span>
                  <Zap className="w-3 h-3" />
                </div>
                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-green-700">Conectores:</span>
                    <span className="text-xs font-black text-green-800">{station.connectors || 1}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}

export function renderVehicleMarkers({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  onUpdateType,
  onUpdateLabel,
  onSelect,
  zoom,
  vehicleAlerts = {},
}: RenderVehiclesProps) {
  const lod = getLOD(zoom, THEME.map.poi.lod.vehicle);
  if (lod === "HIDDEN") return null;

  return (vehicles || []).map((vehicle) => {
    const isSelected = selectedVehicleId === vehicle.id;
    const isDimmed = !!selectedVehicleId && !isSelected;
    const pos = vehicle.position;
    const color = isSelected
      ? THEME.colors.vehicleSelected
      : THEME.colors.muted;
    const alerts = vehicleAlerts[vehicle.id] || [];

    if (lod === "MINIMAL" && !isSelected) {
      return (
        <CircleMarker
          key={`vehicle-dot-${vehicle.id}`}
          center={pos}
          radius={5}
          pathOptions={{
            fillColor: color,
            fillOpacity: isDimmed
              ? THEME.map.hierarchy.dimmedOpacity
              : 1,
            color: "white",
            weight: 1.5,
          }}
          eventHandlers={{
            click: () => onSelect?.(String(vehicle.id)),
          }}
        />
      );
    }

    const icon = createVehicleIcon(color);
    const opacity = isDimmed ? THEME.map.hierarchy.dimmedOpacity : 1;

    return (
      <Marker
        key={`vehicle-${vehicle.id}`}
        position={pos}
        icon={icon}
        opacity={opacity}
        eventHandlers={{
          click: () => onSelect?.(String(vehicle.id)),
        }}
      >
        <Tooltip
          direction="top"
          offset={THEME.map.popups.vehicleTooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
          permanent={isSelected && lod === "DETAILED"}
        >
          <span
            className="font-medium"
            style={{
              fontSize: THEME.map.popups.fontSize,
              fontWeight: isSelected ? "bold" : "normal",
            }}
          >
            {vehicle.label || vehicle.type.label}
          </span>
        </Tooltip>
        <Popup offset={[0, -35]} className="premium-popup">
          <div
            style={{
              fontSize: THEME.map.popups.fontSize,
              width: "220px",
              padding: "4px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: `${color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: color,
                }}
              >
                <Truck size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "13px" }}>
                  {vehicle.label || "Unnamed Vehicle"}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: THEME.colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {vehicle.type.label}
                </div>
              </div>
            </div>

            {/* Alias Input */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  marginBottom: "4px",
                  textTransform: "uppercase",
                }}
              >
                Quick Alias
              </div>
              <input
                type="text"
                defaultValue={vehicle.label || ""}
                placeholder="Enter vehicle alias..."
                onBlur={(e) => onUpdateLabel?.(String(vehicle.id), e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateLabel?.(String(vehicle.id), (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "11px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Type Selector */}
            <div>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Classification
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                }}
              >
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onUpdateType?.(String(vehicle.id), type)}
                    style={{
                      padding: "5px 2px",
                      fontSize: "9px",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: `1px solid ${vehicle.type.id === type.id
                        ? THEME.colors.info
                        : "transparent"
                        }`,
                      backgroundColor:
                        vehicle.type.id === type.id
                          ? `${THEME.colors.info}10`
                          : "#f1f5f9",
                      color:
                        vehicle.type.id === type.id
                          ? THEME.colors.info
                          : "#64748b",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center" as const,
                    }}
                  >
                    {type.label.split(" ")[0]}
                  </button>
                ))}
              </div>
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
  zoom,
  selectedVehicleId,
}: RenderJobsProps) {
  const lod = getLOD(zoom, THEME.map.poi.lod.job);
  if (lod === "HIDDEN") return null;

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
      const vehicleLabel =
        vehicle?.label || vehicle?.type.label || `Vehicle ${route.vehicleId}`;

      // Use assignedJobIds if available
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

    const isJobOfSelected =
      !!selectedVehicleId && assignedTo?.vehicleId === selectedVehicleId;
    const isJobDimmed = !!selectedVehicleId && !isJobOfSelected;
    const jobOpacity = isJobDimmed ? THEME.map.hierarchy.dimmedOpacity : 1;

    if (lod === "MINIMAL") {
      return (
        <CircleMarker
          key={`job-dot-${job.id}`}
          center={pos}
          radius={4}
          pathOptions={{
            fillColor: routeColor,
            fillOpacity: isJobDimmed ? THEME.map.hierarchy.dimmedOpacity : 0.8,
            color: "white",
            weight: 1,
          }}
        />
      );
    }

    // Use dynamic icon color based on assigned vehicle
    // If it has an assigned vehicle (either by routing or manual assignment), it's a "stop" logic
    // But specifically, if manual assignment exists (job.assignedVehicleId), we want the Stop icon (Octagon)
    const isCustomStop = !!job.assignedVehicleId;
    const IconComponent = isCustomStop ? Octagon : Package;
    const iconSize = isCustomStop ? 22 : 26; // Slightly smaller for Octagon as it's blocky

    const iconToUse = assignedTo
      ? createMapIcon(IconComponent, routeColor, iconSize, 15, { opacity: 1 })
      : icon;

    const showPermanentLabel = lod === "DETAILED" && !!assignedTo && !isJobDimmed;

    return (
      <Marker
        key={`job-${job.id}`}
        position={pos}
        icon={iconToUse}
        opacity={jobOpacity}
      >
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

export function renderCustomPOIs({
  customPOIs,
  icon,
  zoom,
}: RenderCustomPOIsProps) {
  const lod = getLOD(zoom, THEME.map.poi.lod.poi); // Use same LOD as POIs for custom ones
  if (lod === "HIDDEN") return null;

  return (customPOIs || []).map((poi) => {
    const pos = poi.position;

    if (lod === "MINIMAL") {
      return (
        <CircleMarker
          key={`custom-dot-${poi.id}`}
          center={pos}
          radius={4}
          pathOptions={{
            fillColor: THEME.colors.customPOI,
            fillOpacity: 0.8,
            color: "white",
            weight: 1,
          }}
        />
      );
    }

    return (
      <Marker key={`custom-${poi.id}`} position={pos} icon={icon}>
        <Tooltip
          direction="top"
          offset={THEME.map.popups.customPoiTooltipOffset}
          opacity={THEME.map.popups.tooltipOpacity}
        >
          <span style={{ fontSize: THEME.map.popups.fontSize }}>
            {poi.name}
          </span>
        </Tooltip>
        <Popup offset={[0, -25]}>
          <div style={{ fontSize: THEME.map.popups.fontSize }}>
            <strong>{poi.name}</strong>
            {poi.description && (
              <div
                style={{
                  marginTop: THEME.map.popups.marginTop,
                  fontSize: THEME.map.popups.subtitleFontSize,
                  fontStyle: "italic",
                  color: THEME.colors.textMuted,
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
