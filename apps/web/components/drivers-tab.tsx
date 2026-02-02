"use client";

import { AddDriverDialog } from "./add-driver-dialog";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  UserPlus,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Car,
} from "lucide-react";
import {
  cn,
  getDriverIsAvailable,
  getDriverOnTimeRate,
  getDriverCurrentVehicle,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Driver } from "@gis/shared";

type FilterType = "all" | "available" | "assigned";

interface DriversTabProps {
  drivers: Driver[];
  isLoading: boolean;
  addDriver: (data: Partial<Driver>) => Promise<Driver | undefined>;
  fetchDrivers: () => Promise<void>;
  onDriverSelect?: (driver: Driver) => void;
}

export function DriversTab({
  drivers,
  isLoading,
  addDriver,
  fetchDrivers,
  onDriverSelect,
}: DriversTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Filtrar conductores basado en el estado seleccionado
  const filteredDrivers = useMemo(() => {
    switch (filterType) {
      case "available":
        return drivers.filter((d) => getDriverIsAvailable(d));
      case "assigned":
        return drivers.filter((d) => !getDriverIsAvailable(d));
      default:
        return drivers;
    }
  }, [drivers, filterType]);

  // Contar por estado
  const counts = useMemo(() => {
    return {
      all: drivers.length,
      available: drivers.filter((d) => getDriverIsAvailable(d)).length,
      assigned: drivers.filter((d) => !getDriverIsAvailable(d)).length,
    };
  }, [drivers]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-border/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black tracking-tight text-foreground">
            Conductores
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={fetchDrivers}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-3">
          Gestión de personal y rendimiento
        </p>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg"
            onClick={() => setFilterType("all")}
          >
            <Users className="h-3 w-3 mr-1" />
            Todos ({counts.all})
          </Button>
          <Button
            variant={filterType === "available" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg"
            onClick={() => setFilterType("available")}
          >
            <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />
            Disponibles ({counts.available})
          </Button>
          <Button
            variant={filterType === "assigned" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg"
            onClick={() => setFilterType("assigned")}
          >
            <span className="h-2 w-2 rounded-full bg-orange-500 mr-1.5" />
            Asignados ({counts.assigned})
          </Button>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Alta de Conductor
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 space-y-3">
          {filteredDrivers.length === 0 && !isLoading ? (
            <div className="text-center py-12 px-6">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                {filterType === "available" && "No hay conductores disponibles"}
                {filterType === "assigned" && "No hay conductores asignados"}
                {filterType === "all" && "No hay conductores registrados"}
              </p>
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                onClick={() => onDriverSelect?.(driver)}
                className="group bg-card border border-border/50 rounded-2xl p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 cursor-pointer relative overflow-hidden"
              >
                {/* Driver Status Indicator */}
                <div
                  className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    driver.isAvailable ? "bg-green-500" : "bg-orange-500",
                  )}
                />

                <div className="flex gap-3 items-start">
                  <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {driver.imageUrl ? (
                      <img
                        src={driver.imageUrl}
                        alt={driver.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-primary/40" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h3 className="text-sm font-black truncate">
                          {driver.name}
                        </h3>
                        <Badge
                          variant={
                            getDriverIsAvailable(driver)
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[9px] uppercase font-black px-1.5 h-4 border-emerald-500/20 text-emerald-600 bg-emerald-500/5 shrink-0"
                        >
                          {getDriverIsAvailable(driver)
                            ? "Disponible"
                            : "Asignado"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 text-primary/60 shrink-0" />
                          <span className="font-bold text-muted-foreground">
                            {driver.licenseType || "Cat. B"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-primary/60 shrink-0" />
                          <span className="font-bold text-muted-foreground">
                            {getDriverOnTimeRate(driver)}% Puntual
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {getDriverCurrentVehicle(driver) && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Car className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-black uppercase text-muted-foreground truncate">
                        {getDriverCurrentVehicle(driver)?.registration || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Speeding Alerts Hint */}
                {driver.speedingEvents && driver.speedingEvents.length > 0 && (
                  <div className="absolute top-4 right-4 animate-pulse">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AddDriverDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={async (val) => {
          await addDriver(val);
          setIsAddOpen(false);
          // Refresh the list after adding
          await fetchDrivers();
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
