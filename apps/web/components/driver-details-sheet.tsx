"use client";

import { Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Clock, Car, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverDetailsSheetProps {
  driver: Driver | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export function DriverDetailsSheet({
  driver,
  isOpen,
  onOpenChange,
  onClose,
}: DriverDetailsSheetProps) {
  if (!driver) return null;

  const speedicngCount = Array.isArray(driver.speedingEvents)
    ? driver.speedingEvents.length
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-6">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {driver.imageUrl ? (
                <img
                  src={driver.imageUrl}
                  alt={driver.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Users className="h-8 w-8 text-primary/40" />
              )}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">{driver.name}</SheetTitle>
              <Badge
                variant={driver.isAvailable ? "outline" : "secondary"}
                className="mt-1 text-[9px] uppercase font-black px-2 h-4 border-emerald-500/20 text-emerald-600 bg-emerald-500/5"
              >
                {driver.isAvailable ? "Disponible" : "En Ruta"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* License Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Licencia
            </h3>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Categoría</span>
                <span className="text-sm font-bold">
                  {driver.licenseType || "Cat. B"}
                </span>
              </div>
              {driver.licenseNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Número</span>
                  <span className="text-sm font-mono">
                    {driver.licenseNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Desempeño
            </h3>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary/60" />
                  <span className="text-xs text-muted-foreground">
                    Puntualidad
                  </span>
                </div>
                <span className="text-sm font-bold">
                  {driver.onTimeDeliveryRate}%
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    driver.onTimeDeliveryRate >= 90
                      ? "bg-green-500"
                      : driver.onTimeDeliveryRate >= 75
                        ? "bg-yellow-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${driver.onTimeDeliveryRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Assignment */}
          {driver.currentVehicleId && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Asignación
              </h3>
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">
                    {driver.currentVehicleId}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Speeding Events */}
          {speedicngCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Alertas
              </h3>
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs font-bold text-orange-600">
                      Excesos de velocidad
                    </p>
                    <p className="text-[10px] text-orange-600/70">
                      {speedicngCount} evento(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full mt-8" variant="outline">
          Cerrar
        </Button>
      </SheetContent>
    </Sheet>
  );
}
