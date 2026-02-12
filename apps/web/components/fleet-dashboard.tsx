"use client";
// components/fleet-dashboard.tsx
//
// Fleet Monitoring Dashboard with real-time KPIs and vehicle table.
// Uses telemetry from CanBusTelemetryProvider (mocked, CAN Bus-ready).

import { useMemo, useEffect, useRef } from "react";
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
import { AddGasStationDialog } from "./add-gas-station-dialog";
import { VehicleDetailSheet } from "./vehicle-detail-sheet";
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
  selectedVehicleId?: string | number | null;
  onSelectVehicle?: (id: string | number | null) => void;
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  gasStations?: POI[];
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
  selectedVehicleId,
  onSelectVehicle,
  onAssignDriver,
  gasStations = [],
  isGasStationLayerVisible = true,
  onToggleGasStationLayer,
}: FleetDashboardProps) {
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  // Local state for vehicle detail sheet inside dashboard (independent from gis-map panels)
  const [dashboardVehicleId, setDashboardVehicleId] = useState<
    string | number | null
  >(null);

  // Local state for add-stop dialog - independent from gis-map's isAddStopOpen
  const [dashboardIsAddStopOpen, setDashboardIsAddStopOpen] = useState(false);

  // Track if we're waiting for a pick-from-map action
  const waitingForPickRef = useRef(false);

  // When pickedStopCoords changes (user clicked map after "Select from Map"), reopen dialog
  useEffect(() => {
    if (pickedStopCoords && waitingForPickRef.current && dashboardVehicleId) {
      setDashboardIsAddStopOpen(true);
      waitingForPickRef.current = false;
    }
  }, [pickedStopCoords, dashboardVehicleId]);

  // Wrapper for onStartPickingStop that sets waiting flag and closes dialog
  const handleStartPickingStop = () => {
    waitingForPickRef.current = true;
    setDashboardIsAddStopOpen(false); // Close dialog to allow map interaction
    onStartPickingStop?.();
  };

  const handleRowClick = (vehicle: FleetVehicle) => {
    // Set local dashboard state for the detail sheet
    setDashboardVehicleId(vehicle.id);
    // Notify map for highlighting (without opening properties panel)
    onSelectVehicle?.(vehicle.id);
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
      <div className="p-10 text-center flex flex-col items-center justify-center bg-background">
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
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Header Section */}
          <div className="p-4 pb-3 border-b border-border/10 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground leading-none">
                  Dashboard
                </h2>
                <p className="text-[9px] uppercase font-medium text-muted-foreground/50 tracking-wider mt-0.5">
                  Métricas en Tiempo Real
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-primary leading-none">
                  {kpis.activeVehicles}
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                  En Servicio
                </span>
              </div>
            </div>

            {/* KPI Grid - more compact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-card border border-border/40 rounded-xl shadow-sm flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <Route className="h-3 w-3 text-emerald-500" />
                  <span className="text-sm font-bold text-foreground">
                    {kpis.onRouteCount}
                  </span>
                </div>
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/40">
                  En Ruta
                </span>
              </div>
              <div className="p-2.5 bg-card border border-border/40 rounded-xl shadow-sm flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <Package className="h-3 w-3 text-orange-500" />
                  <span className="text-sm font-bold text-foreground">
                    {kpis.pendingJobsCount}
                  </span>
                </div>
                <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/40">
                  Pendientes
                </span>
              </div>

              {kpis.hasElectricVehicles && (
                <div className="p-2.5 bg-card border border-border/40 rounded-xl shadow-sm flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <Battery className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-bold text-foreground">
                      {kpis.avgBattery !== null ? `${kpis.avgBattery}%` : "--%"}
                    </span>
                  </div>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/40">
                    Energía
                  </span>
                </div>
              )}
              {kpis.hasFuelVehicles && (
                <div className="p-2.5 bg-card border border-border/40 rounded-xl shadow-sm flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <Fuel className="h-3 w-3 text-orange-500" />
                    <span className="text-sm font-bold text-foreground">
                      {kpis.avgFuel !== null ? `${kpis.avgFuel}%` : "--%"}
                    </span>
                  </div>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/40">
                    Combustible
                  </span>
                </div>
              )}

              {kpis.alertsCount > 0 && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl shadow-sm flex items-center justify-between col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    <span className="text-xs font-bold text-red-600">
                      {kpis.alertsCount} ALERTAS
                    </span>
                  </div>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-red-600/60">
                    Atención
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable List */}
          <ScrollArea className="flex-1 min-h-0 px-4 py-3">
            <div className="space-y-2.5 pb-4">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-wider pl-1 mb-1.5 block">
                Vehículos Conectados
              </Label>

              <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1">
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
                    className="group relative bg-card border border-border/40 rounded-xl p-3 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer overflow-hidden"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex gap-2.5 items-center min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="h-4 w-4 text-primary/40" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-semibold text-foreground truncate">
                              {vehicle.label}
                            </h3>
                            {vehicleAlerts[vehicle.id]?.length > 0 && (
                              <div className="h-3.5 w-3.5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                                <span className="text-[7px] font-bold text-white">
                                  !
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50 mt-0.5">
                            <span className="font-mono bg-muted/60 px-1 py-px rounded text-[8px]">
                              {vehicle.licensePlate || "N/A"}
                            </span>
                            <span className="truncate">
                              {vehicle.driver?.name || "Sin conductor"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <div
                          className={cn(
                            "px-1.5 py-px rounded text-[8px] font-semibold uppercase border",
                            movement === "on_route"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : movement === "moving"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-zinc-50 text-zinc-600 border-zinc-100",
                          )}
                        >
                          {movement === "on_route"
                            ? "Ruta"
                            : movement === "moving"
                              ? "Mov"
                              : "Stop"}
                        </div>
                        {m && m.speed > 0 && (
                          <div className="text-sm font-bold text-foreground leading-none">
                            {m.speed}
                            <span className="text-[8px] text-muted-foreground ml-0.5">
                              km/h
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {energyLevel !== undefined && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/20 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 flex-1">
                          {isElectric ? (
                            <Battery className="h-3 w-3 text-blue-500 shrink-0" />
                          ) : (
                            <Fuel className="h-3 w-3 text-orange-500 shrink-0" />
                          )}
                          <div className="h-1 flex-1 max-w-[80px] bg-muted/50 rounded-full overflow-hidden">
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
                              "text-[9px] font-semibold",
                              energyLevel < 20
                                ? "text-red-600"
                                : "text-muted-foreground",
                            )}
                          >
                            {energyLevel}%
                          </span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-primary/30 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              {/* Gas Stations Section */}
              <div className="mt-4 pt-4 border-t border-border/20">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-wider pl-1 mb-2 block">
                  Estaciones Encontradas ({sortedGasStations.length})
                </Label>
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                  {sortedGasStations.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[9px] text-muted-foreground/50 p-3 text-center border border-dashed border-border/40 rounded-lg">
                        {isGasStationLayerVisible
                          ? "No hay estaciones en el área"
                          : "Capa de Gasolineras oculta"}
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
                          className="p-2 bg-muted/20 border border-border/40 rounded-lg flex items-center justify-between gap-2 hover:border-orange-200 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedGasStation(poi);
                            setIsGasStationDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="h-7 w-7 bg-orange-500/10 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                              <Fuel className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-bold text-foreground truncate">
                                {poi.name}
                              </span>
                              <span className="text-[8px] text-muted-foreground/60 truncate">
                                {poi.address || "Sin dirección"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs font-black text-foreground">
                              {poi.prices?.diesel
                                ? `${poi.prices.diesel}€`
                                : poi.prices?.gasoline95
                                  ? `${poi.prices.gasoline95}€`
                                  : "--"}
                            </span>
                            <span className="text-[7px] font-semibold text-muted-foreground/50 uppercase">
                              {poi.prices?.diesel ? "Diesel" : "G95"}
                            </span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-orange-500 transition-colors shrink-0" />
                        </div>
                      ))}

                      {sortedGasStations.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setShowAllGasStations(!showAllGasStations)
                          }
                          className="w-full text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 h-7"
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

      {/* Vehicle Detail Sheet - Local dashboard state, independent from gis-map panels */}
      {dashboardVehicleId && (
        <div className="absolute inset-0 z-50 pointer-events-auto bg-background border-l border-border/40 shadow-lg overflow-hidden">
          <VehicleDetailSheet
            vehicle={vehicles.find((v) => v.id === dashboardVehicleId) || null}
            metrics={
              vehicles.find((v) => v.id === dashboardVehicleId)?.metrics || null
            }
            jobs={jobs}
            alerts={vehicleAlerts[dashboardVehicleId] || []}
            onClose={() => {
              setDashboardVehicleId(null);
              setDashboardIsAddStopOpen(false);
            }}
            addStopToVehicle={addStopToVehicle}
            startRouting={startRouting}
            isAddStopOpen={dashboardIsAddStopOpen}
            setIsAddStopOpen={setDashboardIsAddStopOpen}
            onStartPickingStop={handleStartPickingStop}
            pickedStopCoords={pickedStopCoords}
            // Do NOT pass onAddStopSubmit - let it use fallback with vehicle.id
            drivers={drivers}
            vehicles={vehicles}
            onAssignDriver={onAssignDriver}
          />
        </div>
      )}
    </div>
  );
}
