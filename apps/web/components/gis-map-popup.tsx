"use client";
import React from "react";

interface VehiclePopupData {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  status: string;
  speed: number;
  vehicleType: string;
  driverName: string | null;
  pixelPosition: { x: number; y: number };
}

interface GISMapPopupProps {
  vehiclePopupData: VehiclePopupData | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenVehiclePanel: () => void;
}

export function GISMapPopup({
  vehiclePopupData,
  onMouseEnter,
  onMouseLeave,
  onOpenVehiclePanel,
}: GISMapPopupProps) {
  if (!vehiclePopupData) return null;

  return (
    <div
      className="fixed z-50 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: `${vehiclePopupData.pixelPosition.x}px`,
        top: `${vehiclePopupData.pixelPosition.y - 8}px`,
        transform: "translate(-50%, -100%)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-card/95 backdrop-blur-sm rounded-md shadow-lg border border-border/30 overflow-hidden min-w-[140px] max-w-[180px]">
        {/* Header */}
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-foreground truncate leading-tight">
              {vehiclePopupData.vehicleName}
            </p>
            {vehiclePopupData.licensePlate && (
              <p className="text-[7px] font-mono text-muted-foreground/50 uppercase tracking-wide">
                {vehiclePopupData.licensePlate}
              </p>
            )}
          </div>
          <div
            className={`shrink-0 px-1 py-px rounded text-[6px] font-bold uppercase ${
              vehiclePopupData.status === "on_route"
                ? "bg-emerald-500/10 text-emerald-600"
                : vehiclePopupData.status === "moving"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {vehiclePopupData.status === "on_route"
              ? "Ruta"
              : vehiclePopupData.status === "moving"
                ? "Moviendo"
                : "Sin movimiento"}
          </div>
        </div>

        {/* Compact info row */}
        <div className="px-2.5 py-1 border-t border-border/20 flex items-center gap-2 text-[8px] text-muted-foreground">
          <span className="font-medium">
            {vehiclePopupData.vehicleType === "EV"
              ? "Vehiculo de tipo eléctrico"
              : "Vehiculo de tipo combustión"}
          </span>
          {vehiclePopupData.driverName && (
            <span className="text black">
              Conductor:{" "}
              <span className="truncate inline-block max-w-[70px]">
                {vehiclePopupData.driverName.split(" ")[0]}
              </span>
            </span>
          )}
        </div>

        {/* Action */}
        <button
          onClick={onOpenVehiclePanel}
          className="w-full px-2.5 py-1 border-t border-border/20 text-[8px] font-semibold text-primary hover:bg-primary/5 transition-colors text-center"
        >
          Ver detalles →
        </button>
      </div>

      {/* Pointer triangle */}
      <div className="flex justify-center -mt-px">
        <div className="w-1.5 h-1.5 bg-card/95 border-b border-r border-border/30 rotate-45 -translate-y-0.5" />
      </div>
    </div>
  );
}
