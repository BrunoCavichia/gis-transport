// components/map/VehiclesLayer.tsx
"use client";
import { memo, useMemo } from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import { THEME } from "@/lib/theme";
import { VEHICLE_TYPES } from "@/lib/types";
import { FleetVehicle, VehicleType } from "@gis/shared";
import type { Alert } from "@/lib/utils";
import L from "leaflet";
import { AlertBadge } from "@/components/alert-badge";
import { renderToStaticMarkup } from "react-dom/server";

interface VehicleMarkerItemProps {
    vehicle: FleetVehicle;
    isSelected: boolean;
    icon: any;
    alerts: Alert[];
    onSelect?: (vehicleId: string) => void;
    onUpdateType?: (vehicleId: string, type: VehicleType) => void;
}

// Internal memoized component for a single vehicle marker
const VehicleMarkerItem = memo(function VehicleMarkerItem({
    vehicle,
    isSelected,
    icon,
    alerts,
    onSelect,
    onUpdateType,
}: VehicleMarkerItemProps) {
    // Create a wrapper icon with alert badge if there are alerts
    let finalIcon = icon;
    if (alerts.length > 0) {
        const hasCritical = alerts.some((a) => a.severity === "critical");
        const hasWarning = alerts.some((a) => a.severity === "warning");
        const severity = hasCritical ? "critical" : hasWarning ? "warning" : "info";
        const colors = {
            critical: { bg: "#ef4444", ring: "rgba(239,68,68,0.3)" },
            warning: { bg: "#f59e0b", ring: "rgba(245,158,11,0.3)" },
            info: { bg: "#3b82f6", ring: "rgba(59,130,246,0.3)" },
        };

        const badgeHtml = renderToStaticMarkup(
            <div style={{ position: "relative", display: "inline-block" }}>
                <div
                    style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        backgroundColor: colors[severity].bg,
                        border: `2px solid white`,
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        boxShadow: `0 0 8px ${colors[severity].ring}`,
                        zIndex: 10,
                    }}
                >
                    ⚠
                </div>
            </div>
        );

        // Note: We can't easily modify the icon HTML, so alerts will be shown via tooltip enhancement
    }

    return (
        <Marker
            position={vehicle.position}
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
                    {alerts.length > 0 && ` ⚠️ ${alerts.length}`}
                </span>
            </Tooltip>
            <Popup offset={[0, -35]}>
                <div style={{ fontSize: THEME.map.popups.fontSize }}>
                    <strong>{vehicle.type.label}</strong>
                    {alerts.length > 0 && (
                        <div
                            style={{
                                marginTop: THEME.map.popups.padding,
                                padding: "8px",
                                backgroundColor: "#fef3c7",
                                borderRadius: "4px",
                                borderLeft: "3px solid #f59e0b",
                            }}
                        >
                            <strong style={{ fontSize: "11px", color: "#92400e" }}>Alertas Activas:</strong>
                            {alerts.slice(0, 2).map((alert, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: "10px",
                                        color: "#78350f",
                                        marginTop: "4px",
                                    }}
                                >
                                    • {alert.title}
                                </div>
                            ))}
                            {alerts.length > 2 && (
                                <div
                                    style={{
                                        fontSize: "10px",
                                        color: "#78350f",
                                        marginTop: "4px",
                                    }}
                                >
                                    + {alerts.length - 2} más
                                </div>
                            )}
                        </div>
                    )}
                    <div
                        style={{
                            marginTop: THEME.map.popups.padding,
                            color: THEME.colors.textMuted,
                            fontSize: THEME.map.popups.subtitleFontSize,
                        }}
                    >
                        Assign Label:
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {VEHICLE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => onUpdateType?.(String(vehicle.id), type)}
                                style={{
                                    padding: "4px 8px",
                                    fontSize: "10px",
                                    borderRadius: "4px",
                                    border: `1px solid ${vehicle.type.id === type.id ? THEME.colors.info : "#e2e8f0"}`,
                                    backgroundColor: vehicle.type.id === type.id ? THEME.colors.info : "white",
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

interface VehiclesLayerProps {
    vehicles: FleetVehicle[];
    selectedVehicleId?: string | null;
    createVehicleIcon: (color: string) => any;
    vehicleAlerts?: Record<string | number, Alert[]>;
    onSelect?: (vehicleId: string) => void;
    onUpdateType?: (vehicleId: string, type: VehicleType) => void;
}

export const VehiclesLayer = memo(function VehiclesLayer({
    vehicles,
    selectedVehicleId,
    createVehicleIcon,
    vehicleAlerts = {},
    onSelect,
    onUpdateType,
}: VehiclesLayerProps) {
    const markers = useMemo(() => {
        return vehicles.map((vehicle) => {
            const isSelected = selectedVehicleId === vehicle.id;
            const color = isSelected ? THEME.colors.vehicleSelected : THEME.colors.muted;
            const icon = createVehicleIcon(color);
            const alerts = vehicleAlerts[vehicle.id] || [];

            return (
                <VehicleMarkerItem
                    key={`vehicle-${vehicle.id}`}
                    vehicle={vehicle}
                    isSelected={isSelected}
                    icon={icon}
                    alerts={alerts}
                    onSelect={onSelect}
                    onUpdateType={onUpdateType}
                />
            );
        });
    }, [vehicles, selectedVehicleId, createVehicleIcon, vehicleAlerts, onSelect, onUpdateType]);

    return <>{markers}</>;
});
