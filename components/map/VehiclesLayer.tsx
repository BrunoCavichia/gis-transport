// components/map/VehiclesLayer.tsx
"use client";
import { memo, useMemo } from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import { THEME } from "@/lib/theme";
import { VEHICLE_TYPES } from "@/lib/types";
import type { FleetVehicle, VehicleType } from "@/lib/types";

interface VehicleMarkerItemProps {
    vehicle: FleetVehicle;
    isSelected: boolean;
    isRouting: boolean;
    icon: any;
    onSelect?: (vehicleId: string) => void;
    onUpdateType?: (vehicleId: string, type: VehicleType) => void;
}

// Internal memoized component for a single vehicle marker
const VehicleMarkerItem = memo(function VehicleMarkerItem({
    vehicle,
    isSelected,
    isRouting,
    icon,
    onSelect,
    onUpdateType,
}: VehicleMarkerItemProps) {
    return (
        <Marker
            position={vehicle.coords}
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
            {!isRouting && (
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
            )}
        </Marker>
    );
});

interface VehiclesLayerProps {
    vehicles: FleetVehicle[];
    selectedVehicleId?: string | null;
    isRouting: boolean;
    createVehicleIcon: (color: string) => any;
    onSelect?: (vehicleId: string) => void;
    onUpdateType?: (vehicleId: string, type: VehicleType) => void;
}

export const VehiclesLayer = memo(function VehiclesLayer({
    vehicles,
    selectedVehicleId,
    isRouting,
    createVehicleIcon,
    onSelect,
    onUpdateType,
}: VehiclesLayerProps) {
    const markers = useMemo(() => {
        return vehicles.map((vehicle) => {
            const isSelected = selectedVehicleId === vehicle.id;
            const color = isSelected ? THEME.colors.vehicleSelected : THEME.colors.muted;
            const icon = createVehicleIcon(color);

            return (
                <VehicleMarkerItem
                    key={`vehicle-${vehicle.id}`}
                    vehicle={vehicle}
                    isSelected={isSelected}
                    isRouting={isRouting}
                    icon={icon}
                    onSelect={onSelect}
                    onUpdateType={onUpdateType}
                />
            );
        });
    }, [vehicles, selectedVehicleId, isRouting, createVehicleIcon, onSelect, onUpdateType]);

    return <>{markers}</>;
});
