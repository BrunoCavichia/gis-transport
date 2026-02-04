"use client";
// components/fleet-dashboard.tsx
//
// Fleet Monitoring Dashboard with real-time KPIs and vehicle table.
// Uses telemetry from CanBusTelemetryProvider (mocked, CAN Bus-ready).

import { useMemo } from "react";
import type {
  POI,
  FleetVehicle,
  VehicleMetrics,
  FleetJob,
  Driver,
} from "@gis/shared";
import type { Alert } from "@/lib/utils";

import {
  Activity,
  Battery,
  Fuel,
  Truck,
  ChevronRight,
  Route,
  Package,
} from "lucide-react";
import { VehicleDetailSheet } from "./vehicle-detail-sheet";
import { AddGasStationDialog } from "./add-gas-station-dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface FleetDashboardProps {
  vehicles: FleetVehicle[];
  jobs?: FleetJob[];
  vehicleAlerts?: Record<string | number, Alert[]>;
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
  drivers?: Driver[];
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  gasStations?: POI[];
  selectedVehicleId?: string | number | null;
  onVehicleSelect?: (id: string | number | null) => void;
  isGasStationLayerVisible?: boolean;
  onToggleGasStationLayer?: () => void;
}

export function FleetDashboard({
  vehicles,
  jobs = [],
  vehicleAlerts = {},
  addStopToVehicle,
  startRouting,
  isAddStopOpen,
  setIsAddStopOpen,
  onStartPickingStop,
  pickedStopCoords,
  onAddStopSubmit,
  drivers,
  onAssignDriver,
  gasStations = [],
  selectedVehicleId,
  onVehicleSelect,
  isGasStationLayerVisible = true,
  onToggleGasStationLayer,
}: FleetDashboardProps) {
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  // Local state for vehicle detail sheet (independent from parent selectedVehicleId)
  const [selectedVehicleIdLocal, setSelectedVehicleIdLocal] = useState<
    string | number | null
  >(null);

  const handleRowClick = (vehicle: FleetVehicle) => {
    setSelectedVehicleIdLocal(vehicle.id);
  };

  const kpis = useMemo(() => {
    const vehiclesWithMetrics = vehicles.filter((v) => v.metrics);

    const hasElectricVehicles = vehicles.some(
      (v) => v.type.id.includes("electric") || v.type.id === "zero",
    );
    const hasFuelVehicles = vehicles.some(
      (v) => !v.type.id.includes("electric") && v.type.id !== "zero",
    );

    const fuelLevels: number[] = [];
    const batteryLevels: number[] = [];
    let activeCount = 0;
    let onRouteCount = 0;
    let alertsCount = 0;

    vehicles.forEach((v) => {
      const m = v.metrics;
      if (m?.status === "active") activeCount++;
      if (m?.movementState === "on_route") onRouteCount++;
      if (v.id && vehicleAlerts[v.id]?.length > 0) alertsCount++;

      const isElectric =
        v.type.id === "zero" ||
        v.type.tags?.includes("0") ||
        v.type.id.toLowerCase().includes("electric") ||
        v.type.label.toLowerCase().includes("electric") ||
        (m?.batteryLevel !== undefined && m?.fuelLevel === undefined);

      if (isElectric && m?.batteryLevel !== undefined) {
        batteryLevels.push(m.batteryLevel);
      } else if (!isElectric && m?.fuelLevel !== undefined) {
        fuelLevels.push(m.fuelLevel);
      }
    });

    return {
      activeVehicles: activeCount,
      avgFuel: fuelLevels.length
        ? Math.round(
            fuelLevels.reduce((sum, val) => sum + val, 0) / fuelLevels.length,
          )
        : null,
      avgBattery: batteryLevels.length
        ? Math.round(
            batteryLevels.reduce((sum, val) => sum + val, 0) /
              batteryLevels.length,
          )
        : null,
      hasFuelVehicles,
      hasElectricVehicles,
      onRouteCount,
      alertsCount,
      pendingJobsCount: jobs.length,
    };
  }, [vehicles, jobs, vehicleAlerts]);

  // Sort gas stations by cheapest price, ascending order
  const sortedGasStations = useMemo(() => {
    console.log("[FleetDashboard] gasStations prop:", gasStations.length);
    return [...gasStations].sort((a, b) => {
      const priceA = a.prices?.diesel || a.prices?.gasoline95 || 999;
      const priceB = b.prices?.diesel || b.prices?.gasoline95 || 999;
      return priceA - priceB;
    });
  }, [gasStations]);

  const [showAllGasStations, setShowAllGasStations] = useState(false);

  const displayedGasStations = useMemo(() => {
    return showAllGasStations
      ? sortedGasStations
      : sortedGasStations.slice(0, 5);
  }, [sortedGasStations, showAllGasStations]);

  const [selectedGasStation, setSelectedGasStation] = useState<POI | null>(
    null,
  );
  const [isGasStationDialogOpen, setIsGasStationDialogOpen] = useState(false);

  if (vehicles.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center h-full bg-background">
        <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-border/60">
          <Truck className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-black italic tracking-tighter text-foreground/40 uppercase">
          No hay flota activa
        </h3>
        <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-2">
          Agregue vehículos desde la pestaña de flota
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header Section */}
          <div className="p-6 pb-6 border-b border-border/10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter text-foreground leading-none">
                  DASHBOARD
                </h2>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] mt-1 ml-0.5">
                  Métricas en Tiempo Real
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[20px] font-black italic text-primary leading-none">
                  {kpis.activeVehicles}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  En Servicio
                </span>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Route className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[14px] font-black italic text-foreground">
                    {kpis.onRouteCount}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Vehículos en Ruta
                </span>
              </div>
              <div className="p-3 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Package className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[14px] font-black italic text-foreground">
                    {kpis.pendingJobsCount}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Pedidos Pendientes
                </span>
              </div>

              {kpis.hasElectricVehicles && (
                <div className="p-3 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Battery className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-[14px] font-black italic text-foreground">
                      {kpis.avgBattery !== null ? `${kpis.avgBattery}%` : "--%"}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                    Energía Media
                  </span>
                </div>
              )}
              {kpis.hasFuelVehicles && (
                <div className="p-3 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Fuel className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-[14px] font-black italic text-foreground">
                      {kpis.avgFuel !== null ? `${kpis.avgFuel}%` : "--%"}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                    Combustible Medio
                  </span>
                </div>
              )}

              {kpis.alertsCount > 0 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-2xl shadow-sm flex flex-col gap-1 col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-600" />
                      <span className="text-[14px] font-black italic text-red-600">
                        {kpis.alertsCount} ALERTAS
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600/60">
                      Requiere Atención
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable List */}
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4 pb-8">
              <Label className="text-[11px] font-black uppercase text-foreground/70 tracking-widest pl-1 mb-2 block">
                Vehículos Conectados
              </Label>

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
                    className="group relative bg-card border border-border/40 rounded-2xl p-5 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 cursor-pointer overflow-hidden"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="h-6 w-6 text-primary/40" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-black tracking-tight text-foreground truncate">
                              {vehicle.label}
                            </h3>
                            {vehicleAlerts[vehicle.id]?.length > 0 && (
                              <div className="h-4 w-4 rounded-full bg-red-600 flex items-center justify-center border-none">
                                <span className="text-[8px] font-black text-white">
                                  !
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter mt-1">
                            <span className="font-mono bg-muted/80 px-1.5 py-0.5 rounded">
                              {vehicle.licensePlate || "N/A"}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="truncate max-w-[80px]">
                              {vehicle.driver?.name || "No Driver"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
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
                        </div>
                        {m && m.speed > 0 && (
                          <div className="text-[18px] font-black italic tracking-tighter text-foreground leading-none">
                            {m.speed}{" "}
                            <span className="text-[9px] not-italic text-muted-foreground">
                              KM/H
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {energyLevel !== undefined && (
                      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {isElectric ? (
                              <Battery className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Fuel className="h-3 w-3 text-orange-500" />
                            )}
                            <div className="h-1.5 w-24 bg-muted/50 rounded-full overflow-hidden border border-border/20">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  energyLevel < 20
                                    ? "bg-red-500"
                                    : isElectric
                                      ? "bg-blue-500"
                                      : "bg-orange-500",
                                )}
                                style={{ width: `${energyLevel}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-black italic",
                                energyLevel < 20
                                  ? "text-red-600"
                                  : "text-foreground",
                              )}
                            >
                              {energyLevel}%
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-primary/40 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Gas Stations Section */}
              <div className="mt-8 pt-6 border-t border-border/20">
                <Label className="text-[11px] font-black uppercase text-foreground/70 tracking-widest pl-1 mb-4 block">
                  Estaciones Encontradas
                </Label>
                <div className="space-y-3">
                  {sortedGasStations.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] text-muted-foreground/50 italic p-4 text-center border border-dashed border-border/40 rounded-xl">
                        {isGasStationLayerVisible
                          ? "No hay estaciones detectadas en el área"
                          : "La capa de Gasolineras está oculta"}
                      </p>
                      {!isGasStationLayerVisible && onToggleGasStationLayer && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-[10px] font-black uppercase tracking-wider rounded-xl border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-all"
                          onClick={onToggleGasStationLayer}
                        >
                          <Fuel className="h-3 w-3 mr-2" />
                          Mostrar Gasolineras
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {displayedGasStations.map((poi) => (
                        <div
                          key={poi.id}
                          className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-orange-500/10 text-orange-600 rounded-xl flex items-center justify-center">
                                <Fuel className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black truncate max-w-[150px]">
                                  {poi.name}
                                </span>
                                <span className="text-[9px] text-muted-foreground font-bold truncate max-w-[150px] uppercase">
                                  {poi.address || "Dirección no disponible"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-foreground">
                                {poi.prices?.diesel
                                  ? `${poi.prices.diesel} €`
                                  : poi.prices?.gasoline95
                                    ? `${poi.prices.gasoline95} €`
                                    : "-- €"}
                              </span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase">
                                DIESEL/G95
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 text-[10px] font-black uppercase tracking-wider rounded-xl border-primary/20 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={() => {
                              setSelectedGasStation(poi);
                              setIsGasStationDialogOpen(true);
                            }}
                          >
                            Asignar como punto adicional
                          </Button>
                        </div>
                      ))}

                      {sortedGasStations.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setShowAllGasStations(!showAllGasStations)
                          }
                          className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 h-8"
                        >
                          {showAllGasStations
                            ? "Ver menos"
                            : `Ver ${sortedGasStations.length - 5} más`}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <AddGasStationDialog
        isOpen={isGasStationDialogOpen}
        onOpenChange={setIsGasStationDialogOpen}
        gasStation={selectedGasStation}
        vehicles={vehicles}
        onAddToVehicle={(vehicleId, coords, label) => {
          addStopToVehicle?.(vehicleId, coords, label);
          setSelectedGasStation(null);
          // Trigger route optimization like when adding a custom stop
          setTimeout(() => startRouting?.(), 500);
        }}
      />

      {/* Vehicle Detail Sheet - Independent from dashboard state - Overlay Position */}
      {selectedVehicleIdLocal && (
        <div className="absolute inset-0 z-50 pointer-events-auto">
          <VehicleDetailSheet
            vehicle={
              vehicles.find((v) => v.id === selectedVehicleIdLocal) || null
            }
            metrics={
              vehicles.find((v) => v.id === selectedVehicleIdLocal)?.metrics ||
              null
            }
            alerts={vehicleAlerts[selectedVehicleIdLocal] || []}
            onClose={() => setSelectedVehicleIdLocal(null)}
            addStopToVehicle={addStopToVehicle}
            startRouting={startRouting}
            isAddStopOpen={isAddStopOpen}
            setIsAddStopOpen={setIsAddStopOpen}
            onStartPickingStop={onStartPickingStop}
            pickedStopCoords={pickedStopCoords}
            onAddStopSubmit={onAddStopSubmit}
            drivers={drivers}
            vehicles={vehicles}
            onAssignDriver={onAssignDriver}
          />
        </div>
      )}
    </div>
  );
}
