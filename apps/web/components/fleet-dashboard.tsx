"use client";
// components/fleet-dashboard.tsx
//
// Fleet Monitoring Dashboard with real-time KPIs and vehicle table.
// Uses telemetry from CanBusTelemetryProvider (mocked, CAN Bus-ready).

import { useMemo } from "react";
import type {
  FleetVehicle,
  MovementState,
  VehicleMetrics,
  FleetJob,
} from "@gis/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Activity, Battery, Fuel, TrendingUp, Truck } from "lucide-react";
import { VehicleDetailSheet } from "./vehicle-detail-sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FleetDashboardProps {
  vehicles: FleetVehicle[];
  jobs?: FleetJob[];
  isTracking?: boolean;
  addStopToVehicle?: (
    vehicleId: string | number,
    position: [number, number],
    label?: string,
  ) => void;
  startRouting?: () => void;
  isAddStopOpen?: boolean;
  setIsAddStopOpen?: (open: boolean) => void;
  onStartPickingStop?: () => void;
  pickedStopCoords?: [number, number] | null;
  onAddStopSubmit?: (coords: [number, number], label: string) => void;
  drivers?: any[];
  onAssignDriver?: (vehicleId: string | number, driver: any) => void;
}

function getMovementLabel(state: MovementState): {
  label: string;
  color: string;
} {
  switch (state) {
    case "on_route":
      return { label: "En Ruta", color: "bg-green-500" };
    case "moving":
      return { label: "En Movimiento", color: "bg-blue-500" };
    case "stopped":
      return { label: "Parado", color: "bg-gray-500" };
    default:
      return { label: "Desconocido", color: "bg-gray-400" };
  }
}

export function FleetDashboard({
  vehicles,
  jobs = [],
  isTracking,
  addStopToVehicle,
  startRouting,
  isAddStopOpen,
  setIsAddStopOpen,
  onStartPickingStop,
  pickedStopCoords,
  onAddStopSubmit,
  drivers,
  onAssignDriver,
}: FleetDashboardProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<
    string | number | null
  >(null);

  // Get live vehicle data from the updated prop array
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const handleRowClick = (vehicle: FleetVehicle) => {
    setSelectedVehicleId(vehicle.id);
  };

  // Calculate KPIs from unified vehicle metrics
  const kpis = useMemo(() => {
    const metricsArray = vehicles
      .map((v) => v.metrics)
      .filter((m): m is VehicleMetrics => !!m);

    if (metricsArray.length === 0) {
      return {
        activeVehicles: 0,
        avgFuel: 0,
        avgBattery: 0,
        totalDistance: 0,
      };
    }

    const fuelVehicles = metricsArray.filter((m) => m.fuelLevel !== undefined);
    const batteryVehicles = metricsArray.filter(
      (m) => m.batteryLevel !== undefined,
    );
    const activeCount = metricsArray.filter(
      (m) => m.status === "active",
    ).length;

    return {
      activeVehicles: activeCount,
      avgFuel: fuelVehicles.length
        ? Math.round(
            fuelVehicles.reduce((sum, m) => sum + (m.fuelLevel || 0), 0) /
              fuelVehicles.length,
          )
        : null,
      avgBattery: batteryVehicles.length
        ? Math.round(
            batteryVehicles.reduce((sum, m) => sum + (m.batteryLevel || 0), 0) /
              batteryVehicles.length,
          )
        : null,
      totalDistance: Math.round(
        metricsArray.reduce((sum, m) => sum + m.distanceTotal, 0),
      ),
    };
  }, [vehicles]);

  if (vehicles.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Truck className="mx-auto mb-2 h-12 w-12 opacity-50" />
        <p>No hay vehículos en la flota</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-muted/5 font-sans transition-all duration-300 h-auto max-h-full",
      )}
    >
      {selectedVehicle ? (
        <div className="flex-1 min-h-0">
          <VehicleDetailSheet
            vehicle={selectedVehicle}
            metrics={selectedVehicle.metrics ?? null}
            jobs={jobs}
            addStopToVehicle={addStopToVehicle}
            startRouting={startRouting}
            isAddStopOpen={isAddStopOpen}
            setIsAddStopOpen={setIsAddStopOpen}
            onStartPickingStop={onStartPickingStop}
            pickedStopCoords={pickedStopCoords}
            onAddStopSubmit={onAddStopSubmit}
            drivers={drivers}
            onAssignDriver={onAssignDriver}
            onClose={() => {
              setSelectedVehicleId(null);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col min-h-0">
          {/* Boutique Header */}
          <div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-border/10 bg-background/50 backdrop-blur-sm">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Flota Activa
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <Activity className="h-3 w-3 text-green-500" />
                <span>
                  {kpis.activeVehicles} de {vehicles.length} en servicio
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                Energía de Flota
              </div>
              <div className="flex items-center gap-3 mt-1 justify-end">
                {kpis.avgBattery !== null && kpis.avgBattery > 0 && (
                  <div className="flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100/50">
                    <Battery className="h-3 w-3" /> {kpis.avgBattery}%
                  </div>
                )}
                {kpis.avgFuel !== null && kpis.avgFuel > 0 && (
                  <div className="flex items-center gap-1 text-xs font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100/50">
                    <Fuel className="h-3 w-3" /> {kpis.avgFuel}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium List Cards */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 pt-0 space-y-2.5">
            {vehicles.map((vehicle) => {
              const m = vehicle.metrics;
              const movement = m ? m.movementState : null;
              const isElectric =
                vehicle.type.id.includes("electric") ||
                vehicle.type.id === "zero" ||
                (m?.batteryLevel !== undefined && m?.fuelLevel === undefined);
              const energyLevel = isElectric ? m?.batteryLevel : m?.fuelLevel;

              return (
                <div
                  key={vehicle.id}
                  onClick={() => handleRowClick(vehicle)}
                  className="group relative flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-primary/20 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Left: Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                      <Truck className="h-5 w-5 text-primary/80" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {vehicle.label}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium border shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                            movement === "on_route"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : movement === "moving"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-zinc-50 text-zinc-600 border-zinc-100",
                          )}
                        >
                          {movement === "on_route"
                            ? "En Ruta"
                            : movement === "moving"
                              ? "Moviendo"
                              : "Parado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono">
                          {vehicle.licensePlate}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-border" />
                        <span>{vehicle.driver?.name || "Sin Conductor"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics */}
                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    {/* Telemetry Pills */}
                    {m && (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium">
                          {m.speed > 0 && (
                            <span
                              className={cn(
                                "transition-colors duration-300",
                                m.maxSpeed && m.speed > m.maxSpeed
                                  ? "text-red-600 font-bold animate-pulse"
                                  : "text-foreground",
                              )}
                            >
                              {m.speed}
                              <span className="text-[8px] ml-0.5 opacity-50">
                                km/h
                              </span>
                            </span>
                          )}
                          {m.maxSpeed && (
                            <span
                              className="bg-zinc-100 text-zinc-500 px-1 rounded-[4px] border border-zinc-200/50 text-[8px] flex items-center gap-0.5"
                              title="Límite de la vía"
                            >
                              <span className="opacity-40 tracking-tighter">
                                L
                              </span>
                              {m.maxSpeed}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {energyLevel !== undefined && (
                            <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/50">
                              {isElectric ? (
                                <Battery className="h-2.5 w-2.5 text-blue-500" />
                              ) : (
                                <Fuel className="h-2.5 w-2.5 text-orange-500" />
                              )}
                              <span
                                className={cn(
                                  "text-[10px] font-mono font-medium",
                                  energyLevel < 20
                                    ? "text-red-600"
                                    : "text-foreground",
                                )}
                              >
                                {energyLevel}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Arrow */}
                    <div className="h-6 w-6 rounded-full bg-transparent flex items-center justify-center group-hover:bg-primary/5 text-muted-foreground/30 group-hover:text-primary transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}

            {vehicles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Truck className="h-8 w-8 opacity-20 mb-3" />
                <span className="text-xs font-medium opacity-50">
                  No hay vehículos conectados
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
