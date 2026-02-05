"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Fuel,
  Battery,
  Users,
  X,
  Zap,
  Activity,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle2,
  Route,
  Package,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import type {
  FleetVehicle,
  VehicleMetrics,
  FleetJob,
  Driver,
} from "@gis/shared";
import type { Alert } from "@/lib/utils";
import { GeocodingService } from "@/lib/services/geocoding-service";
import { AddStopDialog } from "./add-stop-dialog";
import { useAlertLogs } from "@/hooks/use-alert-logs";

interface VehicleDetailSheetProps {
  vehicle: FleetVehicle | null;
  metrics: VehicleMetrics | null;
  jobs?: FleetJob[];
  alerts?: Alert[];
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
  onClose: () => void;
  drivers?: Driver[];
  vehicles?: FleetVehicle[];
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
}

export function VehicleDetailSheet({
  vehicle,
  metrics,
  jobs = [],
  alerts = [],
  addStopToVehicle,
  startRouting,
  isAddStopOpen = false,
  setIsAddStopOpen,
  onStartPickingStop,
  pickedStopCoords,
  onAddStopSubmit,
  drivers = [],
  vehicles = [],
  onAssignDriver,
  onClose,
}: VehicleDetailSheetProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getVehicleLogs, clearVehicleLogs } = useAlertLogs();

  // Filter jobs assigned to this vehicle
  const assignedJobs = useMemo(() => {
    return jobs
      .filter((j) => String(j.assignedVehicleId) === String(vehicle?.id))
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, [jobs, vehicle?.id]);

  useEffect(() => {
    // Reset local address state when vehicle changes
    setAddress(null);
    setIsLoadingAddress(false);

    const isMoving = (metrics?.speed ?? 0) > 0;

    if (vehicle?.position && isMoving) {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);

      geocodeTimeoutRef.current = setTimeout(async () => {
        setIsLoadingAddress(true);
        try {
          const resolvedAddress = await GeocodingService.reverse(
            vehicle.position![0],
            vehicle.position![1],
          );
          setAddress(resolvedAddress);
        } catch (err) {
          console.error("Geocoding error:", err);
        } finally {
          setIsLoadingAddress(false);
        }
      }, 5000);

      return () => {
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      };
    }
  }, [vehicle?.id, metrics?.speed === 0]); // Re-run when vehicle changes OR it stops/starts

  // Get alert logs for this vehicle - MUST be before early return
  const vehicleLogs = useMemo(
    () => (vehicle ? getVehicleLogs(vehicle.id) : []),
    [vehicle?.id, getVehicleLogs],
  );

  if (!vehicle) return null;

  const isElectric =
    vehicle.type.id.includes("electric") ||
    vehicle.type.id === "zero" ||
    metrics?.batteryLevel !== undefined;

  const speed = metrics?.speed || 0;
  const maxSpeed = metrics?.maxSpeed;
  const energyLevel =
    (isElectric ? metrics?.batteryLevel : metrics?.fuelLevel) ?? 100;
  const movement = metrics?.movementState || "stopped";

  // Check if vehicle is speeding
  const isOverSpeeding = maxSpeed ? speed > maxSpeed : false;

  // Check if there are any critical alerts
  const hasCriticalAlerts = alerts.some((a) => a.severity === "critical");
  const hasAnyAlerts = alerts.length > 0;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in slide-in-from-right-4 duration-300 font-sans text-xs">
      {/* Header - Minimalist */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0 bg-background sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -ml-1.5 text-muted-foreground hover:text-foreground rounded-full"
            onClick={onClose}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-none">
              {vehicle.label}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-70">
                {vehicle.licensePlate}
              </span>
              <span className="text-[9px] text-muted-foreground/30">•</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tighter opacity-70">
                {isElectric ? "Electric" : "Combustion"}
              </span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black border tracking-wider",
            movement === "on_route"
              ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
              : movement === "moving"
                ? "bg-blue-100/80 text-blue-800 border-blue-200"
                : "bg-zinc-100/80 text-zinc-600 border-zinc-200",
          )}
        >
          {movement === "on_route"
            ? "ON ROUTE"
            : movement === "moving"
              ? "MOVING"
              : "STOPPED"}
        </div>
      </div>

      {/* Scrollable Body - High Density */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Unified Monitor Block (Speed + Location) */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
            <ShieldCheck className="h-3 w-3" /> Monitor de Seguridad
          </h3>

          <div
            className={cn(
              "relative border rounded-xl p-4 shadow-sm min-h-[140px] flex flex-col justify-between overflow-hidden transition-all duration-300",
              hasCriticalAlerts
                ? "bg-red-50/50 border-red-200/50"
                : hasAnyAlerts
                  ? "bg-amber-50/30 border-amber-200/40"
                  : "bg-card border-border/50",
            )}
          >
            <div className="flex justify-between items-start relative z-10 gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                {/* Current Speed */}
                <div className="space-y-0.5">
                  <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">
                    Velocidad Actual
                  </div>
                  <div
                    className={cn(
                      "text-3xl font-black tracking-tighter leading-none",
                      "text-foreground",
                    )}
                  >
                    {speed}
                    <span className="text-[10px] font-bold text-muted-foreground/40 ml-1 uppercase">
                      km/h
                    </span>
                  </div>
                </div>

                {/* Integrated Location */}
                <div className="space-y-0.5">
                  <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">
                    Ubicación
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-bold text-foreground leading-tight truncate transition-opacity duration-500",
                      isLoadingAddress
                        ? "opacity-50 animate-pulse"
                        : "opacity-100",
                    )}
                  >
                    {metrics?.address ||
                      address ||
                      (isLoadingAddress
                        ? "Consultando..."
                        : speed > 0
                          ? "Detectando vía..."
                          : "Sin movimiento")}
                  </div>
                </div>
              </div>

              {/* Speed Limit Sign */}
              <div className="flex flex-col items-end shrink-0">
                <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">
                  Límite
                </div>
                <div
                  className={cn(
                    "relative inline-flex items-center justify-center h-10 w-10 rounded-full border-[3px] bg-white shadow-sm",
                    isOverSpeeding ? "border-red-600" : "border-blue-600",
                  )}
                >
                  <span className="text-base font-black text-zinc-900 leading-none">
                    {maxSpeed || "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Section - Fixed position at bottom */}
            <div className="mt-3 relative z-10">
              <div className="flex items-center gap-2 bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/20">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                  Monitorear flota
                </span>
              </div>
            </div>

            <Zap
              className={cn(
                "absolute -top-4 -right-4 h-20 w-20 opacity-[0.02] rotate-12",
                "text-primary",
              )}
            />
          </div>
        </div>

        {/* Simplified Data Grid (Energy Only) */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
            <Activity className="h-3 w-3" /> Telemetría
          </h3>
          <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm space-y-2 group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground font-black text-[9px] uppercase tracking-wider opacity-60">
                {isElectric ? (
                  <Battery className="h-3 w-3 text-blue-500" />
                ) : (
                  <Fuel className="h-3 w-3 text-orange-500" />
                )}
                {isElectric ? "Estado de Batería" : "Nivel de Combustible"}
              </div>
              <div className="flex items-baseline gap-0.5">
                <span
                  className={cn(
                    "text-lg font-black tracking-tighter",
                    energyLevel < 20 ? "text-red-500" : "text-foreground",
                  )}
                >
                  {energyLevel}
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-black">
                  %
                </span>
              </div>
            </div>
            <Progress
              value={energyLevel}
              className={cn(
                "h-1.5 bg-muted/50 rounded-full",
                isElectric ? "[&>div]:bg-blue-500" : "[&>div]:bg-orange-500",
              )}
            />
          </div>
        </div>

        {/* Driver Section */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
            <Users className="h-3 w-3" /> Conductor Responsable
          </h3>
          <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm group hover:border-primary/20 transition-all">
            {vehicle?.driver ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center overflow-hidden">
                  {vehicle.driver.imageUrl ? (
                    <img
                      src={vehicle.driver.imageUrl}
                      alt={vehicle.driver.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Users className="h-5 w-5 text-primary/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black truncate">
                      {vehicle.driver.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[8px] uppercase font-black px-1 h-3.5 border-primary/20 text-primary"
                    >
                      {vehicle.driver.licenseType || "Cat. B"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] font-bold text-muted-foreground">
                        {vehicle.driver.onTimeDeliveryRate}% puntual
                      </span>
                    </div>
                    {vehicle.driver.speedingEvents &&
                      vehicle.driver.speedingEvents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 text-orange-500" />
                          <span className="text-[9px] font-bold text-orange-500">
                            {vehicle.driver.speedingEvents.length} Excesos
                          </span>
                        </div>
                      )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onAssignDriver?.(vehicle.id, null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                  Sin conductor asignado
                </p>
                <div className="flex flex-wrap gap-1 justify-center max-h-24 overflow-y-auto px-1">
                  {(() => {
                    // Filter drivers: only those marked as available
                    // isAvailable flag is the source of truth for availability
                    const availableDrivers = drivers.filter((d: Driver) => {
                      return d.isAvailable === true;
                    });

                    return availableDrivers.length > 0 ? (
                      availableDrivers.map((driver: Driver) => (
                        <Button
                          key={driver.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[9px] font-bold px-2 rounded-lg"
                          onClick={() => onAssignDriver?.(vehicle.id, driver)}
                        >
                          Asignar {driver.name.split(" ")[0]}
                        </Button>
                      ))
                    ) : (
                      <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest text-center">
                        No hay conductores libres
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Route Management Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
              <Route className="h-3 w-3" /> Gestión de Ruta
            </h3>
            {vehicle && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[9px] font-black uppercase text-primary hover:text-primary hover:bg-primary/5 px-2 rounded-lg"
                onClick={() => setIsAddStopOpen?.(true)}
              >
                <Plus className="h-3 w-3" /> Añadir Parada
              </Button>
            )}
          </div>

          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            {assignedJobs.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="h-8 w-8 text-muted-foreground/10 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                  Sin paradas asignadas
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {assignedJobs.map((job, idx) => (
                  <div
                    key={job.id}
                    className="p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex flex-col items-center gap-1 h-full pt-1">
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
                          job.status === "completed"
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            : job.status === "in_progress"
                              ? "bg-blue-500 border-blue-500 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                              : "bg-background border-muted text-muted-foreground",
                        )}
                      >
                        {job.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <span className="text-[9px] font-black">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      {idx < assignedJobs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border/20 min-h-[1rem]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-foreground truncate">
                          {job.label}
                        </span>
                        {job.status === "completed" ? (
                          <Badge className="bg-emerald-100/80 text-emerald-800 hover:bg-emerald-100 text-[7px] font-black border-none h-4 px-1.5">
                            COMPL
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/60">
                            <Clock className="h-2.5 w-2.5" />
                            {job.estimatedArrival || "--:--"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                        <p className="text-[8px] text-muted-foreground font-mono truncate uppercase tracking-tighter">
                          REF-{job.id.toString().slice(-6).toUpperCase()}
                        </p>
                        <span className="text-[8px] text-muted-foreground/20">
                          •
                        </span>
                        <p className="text-[8px] text-muted-foreground font-medium truncate">
                          {job.position[0].toFixed(4)},{" "}
                          {job.position[1].toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-2" />

        {/* Alert Logs Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Historial de Alertas
            </h3>
            {vehicleLogs.length > 0 && (
              <button
                onClick={() => clearVehicleLogs(vehicle.id)}
                className="text-[8px] text-muted-foreground/50 hover:text-destructive transition-colors flex items-center gap-0.5"
                title="Limpiar historial"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {vehicleLogs.length === 0 ? (
            <div className="text-center py-4 border-2 border-dashed border-border/30 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-500/30 mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground/60 font-medium">
                Sin alertas registradas
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {vehicleLogs.map((log, idx) => (
                <div
                  key={log.id + idx}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all",
                    log.severity === "critical"
                      ? "bg-red-50/30 border-red-200/40"
                      : log.severity === "warning"
                        ? "bg-amber-50/30 border-amber-200/40"
                        : "bg-blue-50/20 border-blue-200/30",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full mt-1.5 shrink-0",
                        log.severity === "critical"
                          ? "bg-red-600"
                          : log.severity === "warning"
                            ? "bg-amber-600"
                            : "bg-blue-600",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-foreground leading-tight">
                        {log.alertTitle}
                      </p>
                      <p className="text-[8px] text-muted-foreground/70 mt-0.5 leading-tight line-clamp-2">
                        {log.message}
                      </p>
                      <time className="text-[7px] text-muted-foreground/50 mt-1 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(log.timestamp).toLocaleString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-2" />
      </div>

      {vehicle && (
        <AddStopDialog
          vehicleId={vehicle.id}
          vehicleLabel={vehicle.label}
          open={isAddStopOpen}
          onOpenChange={setIsAddStopOpen || (() => {})}
          onStartPicking={onStartPickingStop}
          pickedCoords={pickedStopCoords}
          onAddStop={
            onAddStopSubmit ||
            ((pos, lbl) => {
              addStopToVehicle?.(vehicle.id, pos, lbl);
              setTimeout(() => startRouting?.(), 500);
            })
          }
        />
      )}
    </div>
  );
}
