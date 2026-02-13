"use client";
// components/fleet-dashboard.tsx
//
// Fleet Monitoring Dashboard with real-time KPIs and vehicle table.
// Uses telemetry from CanBusTelemetryProvider (mocked, CAN Bus-ready).

import { useMemo, useEffect, useRef, memo } from "react";
import type { POI, FleetVehicle, FleetJob, Driver } from "@gis/shared";
import type { Alert } from "@/lib/utils";
import { useAlertLogs } from "@/hooks/use-alert-logs";
import { getAlertStyles } from "@/lib/utils";

import {
  Battery,
  Fuel,
  Truck,
  ChevronRight,
  Route,
  Package,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddGasStationDialog } from "./add-gas-station-dialog";
import { VehicleDetailSheet } from "./vehicle-detail-sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

import dynamic from "next/dynamic";
const MapPreview = dynamic(() => import("./map-preview"), { ssr: false });
import type { RouteData } from "@gis/shared";

interface FleetDashboardProps {
  vehicles: FleetVehicle[];
  jobs?: FleetJob[];
  vehicleAlerts?: Record<string | number, Alert[]>;
  isTracking?: boolean;
  addStopToVehicle?: (
    vehicleId: string | number,
    position: [number, number],
    label?: string,
    eta?: string,
  ) => void;
  startRouting?: () => void;
  isAddStopOpen?: boolean;
  setIsAddStopOpen?: (open: boolean) => void;
  onStartPickingStop?: () => void;
  pickedStopCoords?: [number, number] | null;
  onAddStopSubmit?: (coords: [number, number], label: string, eta?: string) => void;
  drivers?: Driver[];
  selectedVehicleId?: string | number | null;
  onSelectVehicle?: (id: string | number | null) => void;
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  gasStations?: POI[];
  isGasStationLayerVisible?: boolean;
  onToggleGasStationLayer?: () => void;
  routeData?: RouteData | null;
}

const AlertLogsSection = ({ vehicleId, vehicleLabel }: { vehicleId: string | number | null; vehicleLabel?: string }) => {
  const { getVehicleLogs } = useAlertLogs();
  const logs = useMemo(() => (vehicleId ? getVehicleLogs(vehicleId) : []), [vehicleId, getVehicleLogs]);

  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
      <div className="px-5 py-4 border-b border-border/10 flex items-center justify-between bg-muted/20">
        <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Alertas y Seguridad</Label>
        <Badge variant="outline" className="text-[8px] font-bold border-red-500/20 text-red-600 bg-red-50 uppercase">Historial de Logs</Badge>
      </div>
      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-5 space-y-4">
            {vehicleId && logs.length > 0 ? (
              logs.map((log, idx) => {
                const styles = getAlertStyles(log.severity as any);
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div key={`${log.id}-${idx}`} className={cn("flex gap-4 p-3 border rounded-xl transition-all hover:opacity-80", styles.bg, styles.border)}>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", styles.badge.split(' ')[0])}>
                      <AlertTriangle className={cn("h-4 w-4", styles.icon)} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-black uppercase tracking-tight", styles.icon)}>{log.alertTitle}</span>
                        <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">— {timeStr}</span>
                      </div>
                      <p className="text-[11px] font-bold text-foreground mt-0.5 leading-snug">{log.message}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">{vehicleId ? "Sin alertas registradas" : "Seleccione un vehículo"}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export const FleetDashboard = memo(function FleetDashboard({
  vehicles,
  jobs = [],
  vehicleAlerts = {},
  isTracking,
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
  isGasStationLayerVisible,
  onToggleGasStationLayer,
  routeData,
}: FleetDashboardProps) {
  // Sync local selection with parent
  const [localSelectedId, setLocalSelectedId] = useState<string | number | null>(selectedVehicleId ?? null);

  useEffect(() => {
    setLocalSelectedId(selectedVehicleId ?? null);
  }, [selectedVehicleId]);

  // Local state for add-stop dialog
  const [dashboardIsAddStopOpen, setDashboardIsAddStopOpen] = useState(false);
  const waitingForPickRef = useRef(false);

  // Job type filter
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | "standard" | "custom">("all");
  // Vehicle assignment filter
  const [vehicleAssignmentFilter, setVehicleAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(localSelectedId)) || null,
    [vehicles, localSelectedId],
  );

  useEffect(() => {
    if (pickedStopCoords && waitingForPickRef.current && localSelectedId) {
      setDashboardIsAddStopOpen(true);
      waitingForPickRef.current = false;
    }
  }, [pickedStopCoords, localSelectedId]);

  const handleStartPickingStop = () => {
    waitingForPickRef.current = true;
    setDashboardIsAddStopOpen(false);
    onStartPickingStop?.();
  };

  // Gas Station logic
  const sortedGasStations = useMemo(() => {
    return [...gasStations].sort((a, b) => {
      const priceA = a.prices?.diesel || a.prices?.gasoline95 || 0;
      const priceB = b.prices?.diesel || b.prices?.gasoline95 || 0;
      return priceA - priceB;
    });
  }, [gasStations]);

  const [showAllGasStations, setShowAllGasStations] = useState(false);
  const [selectedGasStation, setSelectedGasStation] = useState<POI | null>(null);
  const [isGasStationDialogOpen, setIsGasStationDialogOpen] = useState(false);

  const displayedGasStations = useMemo(() => {
    return showAllGasStations ? sortedGasStations : sortedGasStations.slice(0, 5);
  }, [sortedGasStations, showAllGasStations]);

  const handleRowClick = (vehicleId: string | number) => {
    setLocalSelectedId(vehicleId);
    onSelectVehicle?.(vehicleId);
  };

  const kpis = useMemo(() => {
    const activeCount = vehicles.filter((v) => v.metrics?.status === "active").length;
    const onRouteCount = vehicles.filter((v) => v.metrics?.movementState === "on_route").length;
    const alertsCount = vehicles.filter((v) => v.id && vehicleAlerts[v.id]?.length > 0).length;

    const hasElectricVehicles = vehicles.some((v) => v.type.id.includes("electric") || v.type.id === "zero");
    const hasFuelVehicles = vehicles.some((v) => !v.type.id.includes("electric") && v.type.id !== "zero");

    const fuelLevels = vehicles.filter(v => v.metrics?.fuelLevel !== undefined).map(v => v.metrics!.fuelLevel!);
    const batteryLevels = vehicles.filter(v => v.metrics?.batteryLevel !== undefined).map(v => v.metrics!.batteryLevel!);

    return {
      activeVehicles: activeCount,
      avgFuel: fuelLevels.length ? Math.round(fuelLevels.reduce((a, b) => a + b, 0) / fuelLevels.length) : null,
      avgBattery: batteryLevels.length ? Math.round(batteryLevels.reduce((a, b) => a + b, 0) / batteryLevels.length) : null,
      onRouteCount,
      alertsCount,
      pendingJobsCount: jobs.length,
      hasElectricVehicles,
      hasFuelVehicles
    };
  }, [vehicles, jobs, vehicleAlerts]);


  if (vehicles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-background/50 backdrop-blur-sm">
        <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mb-8 border border-dashed border-primary/20">
          <Truck className="h-12 w-12 text-primary/20" />
        </div>
        <h3 className="text-2xl font-black italic tracking-tighter text-foreground/40 uppercase">No hay flota activa</h3>
        <p className="text-xs font-bold text-muted-foreground/30 uppercase tracking-widest mt-4">Agregue vehículos desde la pestaña de flota</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-6 gap-6">
      {/* 1. Header & Global Vehicle Selector */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase italic leading-none">Fleet Dashboard</h2>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mt-1.5">Métricas y Operaciones en Tiempo Real</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="flex flex-col items-end px-4 border-r border-border/40">
              <span className="text-xl font-black text-primary leading-tight">{kpis.activeVehicles}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Activos</span>
            </div>
            <div className="flex flex-col items-end px-4">
              <span className="text-xl font-black text-orange-500 leading-tight">{kpis.pendingJobsCount}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Pedidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">

        {/* Left Column (3 cols): KPIs & Vehicle/Gas Station Lists */}
        <div className="col-span-3 flex flex-col gap-5 min-h-0 overflow-hidden">
          {/* Quick Stats Grid - Shrink-0 to maintain height */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Route className="h-4 w-4 text-emerald-500" />
                <span className="text-lg font-black">{kpis.onRouteCount}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">En Ruta</span>
            </div>
            <div className="p-4 bg-card border border-border/40 rounded-2xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                {kpis.hasElectricVehicles ? <Battery className="h-4 w-4 text-blue-500" /> : <Fuel className="h-4 w-4 text-orange-500" />}
                <span className="text-lg font-black">{kpis.hasElectricVehicles ? (kpis.avgBattery ?? "--") : (kpis.avgFuel ?? "--")}%</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">{kpis.hasElectricVehicles ? "Energía" : "Combustible"}</span>
            </div>
          </div>

          {/* Vehicle List Section - flex-1 basis-0 for absolute stability */}
          <div className="flex-1 basis-0 flex flex-col min-h-0 bg-card/30 border border-border/30 rounded-2xl overflow-hidden shadow-inner translate-z-0">
            <div className="p-4 py-3 border-b border-border/10 bg-muted/20 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Flota Conectada</Label>
                <Badge variant="outline" className="text-[8px] font-bold border-primary/20 text-primary bg-primary/5">
                  {vehicles.length}
                </Badge>
              </div>
              <div className="flex gap-1.5 bg-background/40 p-1 rounded-lg border border-border/5">
                {(["all", "assigned", "unassigned"] as const).map((filter) => {
                  const count = vehicles.filter(v => {
                    const hasJob = jobs.some(j => String(j.assignedVehicleId) === String(v.id));
                    if (filter === "assigned") return hasJob;
                    if (filter === "unassigned") return !hasJob;
                    return true;
                  }).length;

                  return (
                    <button
                      key={filter}
                      onClick={() => setVehicleAssignmentFilter(filter)}
                      className={cn(
                        "flex-1 px-1.5 py-1 text-[7.5px] font-black uppercase tracking-tight rounded-md transition-all flex items-center justify-center gap-1",
                        vehicleAssignmentFilter === filter
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground/60 hover:text-foreground hover:bg-background/80"
                      )}
                    >
                      {filter === "all" ? "Todos" : filter === "assigned" ? "Asignados" : "Libres"}
                      <span className={cn(
                        "text-[6px] opacity-40 px-1 rounded-full",
                        vehicleAssignmentFilter === filter ? "bg-white/20" : "bg-muted"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="p-3 space-y-2">
                  {vehicles
                    .filter((v) => {
                      const hasJob = jobs.some(j => String(j.assignedVehicleId) === String(v.id));
                      if (vehicleAssignmentFilter === "assigned") return hasJob;
                      if (vehicleAssignmentFilter === "unassigned") return !hasJob;
                      return true;
                    })
                    .map((v) => (
                      <div
                        key={v.id}
                        onClick={() => handleRowClick(v.id)}
                        className={cn(
                          "group relative border rounded-xl p-3 transition-all cursor-pointer overflow-hidden flex items-center gap-3",
                          localSelectedId === v.id
                            ? "bg-primary/5 border-primary/40 shadow-sm"
                            : "bg-background border-border/40 hover:border-primary/20 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                          localSelectedId === v.id ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-border/10 text-muted-foreground/40"
                        )}>
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-black truncate uppercase tracking-tight">{v.label}</h3>
                            {vehicleAlerts[v.id]?.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground/50">{v.licensePlate || "SIN PLACA"}</span>
                        </div>
                        {localSelectedId === v.id && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Gas Station List Section - flex-1 basis-0 for absolute stability */}
          <div className="flex-1 basis-0 flex flex-col min-h-0 bg-card/30 border border-border/30 rounded-2xl overflow-hidden shadow-inner translate-z-0">
            <div className="px-3.5 py-1.5 border-b border-border/10 bg-muted/30 flex items-center justify-between shrink-0">
              <Label className="text-[8.5px] font-black uppercase text-muted-foreground/70 tracking-widest italic leading-none">Gasolineras</Label>
              {isGasStationLayerVisible && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-[18px] text-[7.5px] font-black uppercase tracking-tight bg-primary/10 text-primary hover:bg-primary/20 border-none px-2 rounded-md transition-all shadow-none"
                  onClick={() => setShowAllGasStations(!showAllGasStations)}
                >
                  {showAllGasStations ? "Ver menos" : "Ver todas"}
                </Button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
              <ScrollArea className="h-full w-full">
                {!isGasStationLayerVisible ? (
                  <div className="flex flex-col items-center justify-center min-h-[150px] h-full p-6 text-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                      <Fuel className="h-5 w-5 text-orange-500/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-foreground/80">Capa Inactiva</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-[8px] font-black uppercase tracking-widest text-orange-600"
                        onClick={onToggleGasStationLayer}
                      >
                        Activar ahora
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {displayedGasStations.length > 0 ? (
                      displayedGasStations.map((station) => (
                        <div
                          key={station.id}
                          onClick={() => {
                            setSelectedGasStation(station);
                            setIsGasStationDialogOpen(true);
                          }}
                          className="p-2.5 bg-card/50 border border-border/20 rounded-xl hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer group shadow-sm relative overflow-hidden"
                        >
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase truncate tracking-tight text-foreground/80 leading-tight">{station.name}</span>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase truncate leading-none tracking-tight">{station.address || "S/D"}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 bg-background/40 px-2 py-1.5 rounded-lg border border-border/10">
                              <div className="flex flex-col items-end">
                                <span className="text-[11px] font-black text-emerald-600 leading-none">{station.prices?.diesel || station.prices?.gasoline95 || "--"}</span>
                                <span className="text-[6px] font-black text-muted-foreground/30 uppercase mt-0.5">€/L</span>
                              </div>
                              <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 opacity-20 text-center">
                        <Fuel className="h-6 w-6 mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Sin datos</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Center Column (6 cols): Map Preview & Tables */}
        <div className="col-span-6 flex flex-col gap-6 min-h-0">
          {/* Activity Logs & Jobs Section */}
          <div className="flex-1 grid grid-rows-2 gap-6 min-h-0">
            {/* Jobs Management Table */}
            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
              <div className="px-5 py-4 border-b border-border/10 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Cola de Pedidos Activos</Label>
                  <div className="flex bg-background/50 p-0.5 rounded-lg border border-border/10">
                    {(["all", "standard", "custom"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setJobTypeFilter(t)}
                        className={cn(
                          "px-2 py-1 text-[8px] font-bold uppercase tracking-tighter rounded-md transition-all",
                          jobTypeFilter === t
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background hover:text-foreground"
                        )}
                      >
                        {t === "all" ? "Todos" : t === "standard" ? "Logística" : "Manuales"}
                      </button>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="text-[8px] font-bold border-primary/20 text-primary bg-primary/5 uppercase">{jobs.filter(j => jobTypeFilter === "all" || j.type === jobTypeFilter).length} pendientes</Badge>
              </div>
              <div className="flex-1 relative min-h-0">
                <ScrollArea className="h-full w-full">
                  <div className="p-0 border-collapse">
                    {(() => {
                      const filteredJobsList = jobs.filter(job => {
                        const jobType = job.type || "standard";
                        const matchesType = jobTypeFilter === "all" || jobType === jobTypeFilter;
                        const matchesVehicle = !localSelectedId || String(job.assignedVehicleId) === String(localSelectedId);
                        return matchesType && matchesVehicle;
                      });

                      if (filteredJobsList.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 opacity-30">
                            <Package className="h-8 w-8 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Sin pedidos activos</p>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-left text-[10px]">
                          <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10 border-b border-border/20">
                            <tr>
                              <th className="p-3 font-black uppercase tracking-tighter opacity-40">Pedido</th>
                              <th className="p-3 font-black uppercase tracking-tighter opacity-40 text-center">Estado</th>
                              <th className="p-3 font-black uppercase tracking-tighter opacity-40">Asignación</th>
                              <th className="p-3 font-black uppercase tracking-tighter opacity-40 text-right">ETA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                            {filteredJobsList.map((job) => {
                              const assignedVehicle = vehicles.find(v => String(v.id) === String(job.assignedVehicleId));
                              const assignedDriver = assignedVehicle?.driver;

                              return (
                                <tr key={job.id} className="hover:bg-muted/20 transition-colors group">
                                  <td className="p-3">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-bold text-foreground/80">{job.label}</span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "w-fit text-[7px] h-3.5 px-1 font-black uppercase border-none",
                                          job.type === "custom" ? "bg-orange-100/80 text-orange-700" : "bg-blue-100/80 text-blue-700"
                                        )}
                                      >
                                        {job.type === "custom" ? "Manual" : "Logística"}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                      job.status === "completed" ? "bg-emerald-100 text-emerald-800" : (job.status === "in_progress" ? "bg-blue-100 text-blue-800 animate-pulse" : "bg-muted/50 text-muted-foreground")
                                    )}>
                                      {job.status === "completed" ? "OK" : (job.status === "in_progress" ? "EN CURSO" : "PENDIENTE")}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {assignedVehicle ? (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <Truck className="h-3 w-3 text-primary/40" />
                                          <span className="font-bold opacity-60 text-primary">{assignedVehicle.label}</span>
                                        </div>
                                        {assignedDriver && (
                                          <div className="flex items-center gap-1.5 ml-4">
                                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{assignedDriver.name}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : <span className="opacity-20">—</span>}
                                  </td>
                                  <td className="p-3 text-right font-mono opacity-80 font-bold">
                                    {job.eta ? (
                                      (() => {
                                        try {
                                          const d = new Date(job.eta);
                                          return isNaN(d.getTime()) ? (job.estimatedArrival || "--:--") : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        } catch {
                                          return job.estimatedArrival || "--:--";
                                        }
                                      })()
                                    ) : (job.estimatedArrival || "--:--")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Alert Logs Section (Historical) */}
            <AlertLogsSection vehicleId={localSelectedId} vehicleLabel={selectedVehicle?.label} />
          </div>
        </div>

        {/* Right Column (3 cols): Secondary Map & Vehicle Detail */}
        <div className="col-span-3 flex flex-col gap-6 min-h-0">
          {/* Map Preview Area (Secondary Context) */}
          <div className="h-[200px] bg-card border border-border/40 rounded-2xl overflow-hidden relative shadow-sm group shrink-0">
            <MapPreview
              vehicle={selectedVehicle}
              jobs={jobs.filter(j => localSelectedId && String(j.assignedVehicleId) === String(localSelectedId))}
              routeData={routeData}
              vehicleAlerts={vehicleAlerts}
            />
          </div>

          <div className="flex-1 min-h-0 bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm relative">
            {!selectedVehicle ? (
              <div className="flex-1 h-full flex flex-col items-center justify-center p-10 text-center opacity-30">
                <ChevronRight className="h-12 w-12 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest leading-normal">Seleccione vehículo para telemetría</p>
              </div>
            ) : (
              <VehicleDetailSheet
                vehicle={selectedVehicle}
                metrics={selectedVehicle.metrics || null}
                jobs={jobs}
                alerts={vehicleAlerts[selectedVehicle.id] || []}
                onClose={() => setLocalSelectedId(null)}
                addStopToVehicle={addStopToVehicle}
                startRouting={startRouting}
                isAddStopOpen={dashboardIsAddStopOpen}
                setIsAddStopOpen={setDashboardIsAddStopOpen}
                onStartPickingStop={handleStartPickingStop}
                pickedStopCoords={pickedStopCoords}
                drivers={drivers}
                vehicles={vehicles}
                onAssignDriver={onAssignDriver}
              />
            )}
          </div>
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
          setTimeout(() => startRouting?.(), 500);
        }}
      />
    </div>
  );
});
