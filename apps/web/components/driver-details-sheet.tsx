"use client";

import { Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Car, AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DriverDetailsSheetProps {
  driver: Driver | null;
  onClose: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DriverDetailsSheet({
  driver,
  onClose,
}: DriverDetailsSheetProps) {
  if (!driver) return null;

  const speedingCount = Array.isArray(driver.speedingEvents)
    ? driver.speedingEvents.length
    : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-right-8 duration-500 font-sans border-l border-border/20 shadow-2xl">
      {/* Header with Gradient Background */}
      <div className="relative shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary-color),transparent)] opacity-5" />

        <div className="relative px-6 py-5 border-b border-border/10 flex items-center justify-between z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-xl transition-all shadow-sm border border-border/20"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <h2 className="text-base font-black tracking-tight text-foreground uppercase italic leading-none">
                Perfil de Conductor
              </h2>
              <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mt-1">
                Expediente y Telemetría
              </p>
            </div>
          </div>
          <Badge
            variant={driver.isAvailable ? "outline" : "secondary"}
            className={cn(
              "text-[9px] uppercase font-black px-2.5 h-6 border transition-all",
              driver.isAvailable
                ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                : "border-orange-500/30 text-orange-600 bg-orange-50/50"
            )}
          >
            {driver.isAvailable ? "En Disponible" : "En Servicio"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-8 pb-10">
          {/* Profile Hero Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />
            <div className="relative bg-card border border-border/40 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-muted to-background border-2 border-white dark:border-border p-1 shadow-xl overflow-hidden">
                    {driver.imageUrl ? (
                      <img
                        src={driver.imageUrl}
                        alt={driver.name}
                        className="h-full w-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/5 rounded-xl">
                        <Users className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-background border border-border shadow-lg flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase italic underline decoration-primary/30 decoration-4 underline-offset-4">
                    {driver.name}
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    {driver.licenseNumber || "ID: " + driver.id.slice(-6)}
                  </p>
                </div>

                {driver.phoneNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 rounded-xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-wider"
                  >
                    <a href={`tel:${driver.phoneNumber}`}>
                      Llamar Conductor
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-1 w-full bg-blue-500/20" />
              <div className="flex items-center justify-between">
                <div className="p-1.5 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-lg font-black italic">{driver.onTimeDeliveryRate}%</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Puntualidad</span>
              <div className="h-1 w-full bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${driver.onTimeDeliveryRate}%` }}
                />
              </div>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500/20" />
              <div className="flex items-center justify-between">
                <div className="p-1.5 bg-emerald-50 rounded-lg dark:bg-emerald-900/20">
                  <Car className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-lg font-black italic">
                  {driver.currentVehicleId ? "Activo" : "IDLE"}
                </span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Estado GPS</span>
              <div className="h-1 w-full bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className={cn("h-full", driver.currentVehicleId ? "bg-emerald-500" : "bg-muted-foreground/20")}
                  style={{ width: driver.currentVehicleId ? "100%" : "20%" }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Info Sections */}
          <div className="space-y-5">
            {/* Documentation Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">Documentación</h3>
              </div>
              <div className="bg-muted/30 border border-border/20 rounded-2xl p-1 space-y-1">
                <div className="bg-card px-4 py-3 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Licencia Conducir</span>
                  <Badge variant="outline" className="text-[9px] font-black bg-muted/50 border-border/40 px-2 uppercase">
                    {driver.licenseType || "Clase B"}
                  </Badge>
                </div>
                <div className="bg-card px-4 py-3 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Última Revisión</span>
                  <span className="text-[10px] font-black text-foreground uppercase tracking-tight">12 Ene 2026</span>
                </div>
              </div>
            </div>

            {/* Safety Alerts Section */}
            {speedingCount > 0 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <h3 className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em]">Alertas de Seguridad</h3>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[8px] font-black px-1.5 h-4 uppercase">
                    {speedingCount} Eventos
                  </Badge>
                </div>

                <div className="bg-red-50/30 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-2xl p-4 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500/40" />

                  <div className="space-y-3">
                    {driver.speedingEvents?.slice(0, 3).map((event: any, i: number) => (
                      <div key={event.id || i} className="flex flex-col gap-1 group pb-2 border-b border-red-100/50 dark:border-red-900/20 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-red-700 dark:text-red-400 italic uppercase">
                            Exceso de Velocidad
                          </span>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">
                            {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 rounded text-[9px] font-black text-red-700 dark:text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {Math.round(event.speed)} km/h
                          </div>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                            Límite: {Math.round(event.limit)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {speedingCount > 3 && (
                      <Button variant="ghost" className="w-full h-8 text-[8px] font-black uppercase text-red-600/60 hover:text-red-600 hover:bg-red-100/30 rounded-xl transition-all tracking-widest">
                        Ver todo el historial ({speedingCount})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>


    </div>
  );
}
