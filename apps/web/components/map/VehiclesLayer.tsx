import { memo } from "react";
import { FleetVehicle, VehicleType } from "@gis/shared";
import type { Alert } from "@/lib/utils";
import { renderVehicleMarkers } from "@/app/helpers/map-render-helpers";
import { Icon, DivIcon } from "leaflet";

interface VehiclesLayerProps {
  vehicles: FleetVehicle[];
  selectedVehicleId?: string | null;
  createVehicleIcon: (color: string) => Icon | DivIcon;
  vehicleAlerts?: Record<string | number, Alert[]>;
  onUpdateType?: (vehicleId: string, type: VehicleType) => void;
  onUpdateLabel?: (vehicleId: string, label: string) => void;
  onSelect?: (vehicleId: string) => void;
  onHover?: (
    vehicleId: string,
    pixelPosition: { x: number; y: number },
  ) => void;
  onHoverOut?: () => void;
  zoom: number;
}

export const VehiclesLayer = memo(function VehiclesLayer({
  vehicles,
  selectedVehicleId,
  createVehicleIcon,
  vehicleAlerts = {},
  onSelect,
  onHover,
  onHoverOut,
  onUpdateType,
  onUpdateLabel,
  zoom,
}: VehiclesLayerProps) {
  return (
    <>
      {renderVehicleMarkers({
        vehicles,
        selectedVehicleId,
        createVehicleIcon,
        onUpdateType,
        onUpdateLabel,
        onSelect,
        onHover,
        onHoverOut,
        zoom,
        vehicleAlerts,
      })}
    </>
  );
});
