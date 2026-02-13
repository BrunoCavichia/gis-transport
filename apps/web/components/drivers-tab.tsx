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
  Car,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  cn,
  getDriverIsAvailable,
  getDriverOnTimeRate,
  getDriverCurrentVehicle,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Driver, FleetVehicle } from "@gis/shared";

type FilterType = "all" | "available" | "assigned";

interface DriversTabProps {
  drivers: Driver[];
  fleetVehicles: FleetVehicle[];
  isLoading: boolean;
  addDriver: (driver: Partial<Driver>) => Promise<Driver | undefined>;
  fetchDrivers: () => Promise<void>;
  onDriverSelect?: (driver: Driver) => void;
  onVehicleSelect?: (vehicleId: string) => void;
  // Persisted toggle state from parent
  expandedGroups?: Record<string, boolean>;
  onToggleGroup?: (group: string, isExpanded: boolean) => void;
}

export function DriversTab({
  drivers,
  fleetVehicles,
  isLoading,
  addDriver,
  fetchDrivers,
  onDriverSelect,
  onVehicleSelect,
  expandedGroups: externalExpandedGroups,
  onToggleGroup,
}: DriversTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Use external state if provided, otherwise use local state
  const [localExpandedGroups, setLocalExpandedGroups] = useState<
    Record<string, boolean>
  >({
    available: true,
    assigned: true,
  });

  const expandedGroups = externalExpandedGroups ?? localExpandedGroups;

  const toggleGroup = (group: string) => {
    const newValue = !expandedGroups[group];
    if (onToggleGroup) {
      onToggleGroup(group, newValue);
    } else {
      setLocalExpandedGroups((prev) => ({ ...prev, [group]: newValue }));
    }
  };

  // Filter and group drivers
  const groups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.licenseType?.toLowerCase().includes(q) ||
        d.currentVehicleId?.toString().includes(q),
    );

    return {
      available: filtered.filter((d) => getDriverIsAvailable(d)),
      assigned: filtered.filter((d) => !getDriverIsAvailable(d)),
    };
  }, [drivers, searchQuery]);

  const renderDriverCard = (driver: Driver) => (
    <div
      key={driver.id}
      onClick={() => onDriverSelect?.(driver)}
      className="group relative bg-card border border-border/40 rounded-2xl p-4 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 cursor-pointer overflow-hidden mb-3 last:mb-0"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex gap-4 items-center relative z-10">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted to-background border border-border/50 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            {driver.imageUrl ? (
              <img
                src={driver.imageUrl}
                alt={driver.name}
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <Users className="h-6 w-6 text-primary/30" />
            )}
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background shadow-sm",
            driver.isAvailable ? "bg-emerald-500" : "bg-orange-500"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-black italic tracking-tight text-foreground truncate uppercase">
              {driver.name}
            </h3>

            <div className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>{driver.licenseType || "Cat. B"}</span>
              </div>
              <span className="h-0.5 w-0.5 rounded-full bg-border" />
              <div className="flex items-center gap-1 text-blue-600/70">
                <Clock className="h-3 w-3" />
                <span>{getDriverOnTimeRate(driver)}%</span>
              </div>
            </div>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0" />
      </div>

      {driver.currentVehicleId && (
        <div className="mt-3 pt-3 border-t border-border/10 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/20 rounded-xl border border-border/30 group/tag">
              <Car className="h-3 w-3 text-primary/40 group-hover/tag:text-primary transition-colors" />
              <span className="text-[9px] font-black uppercase text-foreground/60 tracking-wider truncate">
                {fleetVehicles.find(
                  (v) => String(v.id) === String(driver.currentVehicleId),
                ) && `ID: ${driver.currentVehicleId}`}
              </span>
            </div>

            {onVehicleSelect && fleetVehicles.some(v => String(v.id) === String(driver.currentVehicleId)) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl hover:bg-primary/5 hover:text-primary transition-all border border-transparent hover:border-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onVehicleSelect(String(driver.currentVehicleId));
                }}
              >
                Monitorear en Dashboard
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {/* Header Section */}
      <div className="p-6 pb-5 flex flex-col gap-4 border-b border-border/10 bg-gradient-to-br from-primary/5 via-background to-transparent shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Conductores
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mt-1.5">
              Gestión de Personal Activo
            </p>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar - Modern Style */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nombre o licencia..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            className="pl-11 h-11 bg-muted/20 border-border/40 hover:border-primary/20 focus:bg-background focus:border-primary/30 transition-all rounded-2xl text-[13px] font-medium"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-6">
          {/* Available Drivers Group */}
          <div className="space-y-3">
            <button
              onClick={() => toggleGroup("available")}
              className="w-full flex items-center justify-between px-2 py-1 hover:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/70">
                  Disponibles
                </span>
                <Badge variant="outline" className="text-[8px] font-black bg-emerald-50/50 border-emerald-500/10 text-emerald-600 h-4 px-1.5">
                  {groups.available.length}
                </Badge>
              </div>
              {expandedGroups.available ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>

            {expandedGroups.available && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {groups.available.length > 0 ? (
                  groups.available.map(renderDriverCard)
                ) : (
                  <div className="py-8 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border/30">
                    <Users className="h-8 w-8 text-muted-foreground/10 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                      Sin disponibles
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assigned Drivers Group */}
          <div className="space-y-3">
            <button
              onClick={() => toggleGroup("assigned")}
              className="w-full flex items-center justify-between px-2 py-1 hover:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/70">
                  En Servicio
                </span>
                <Badge variant="outline" className="text-[8px] font-black bg-orange-50/50 border-orange-500/10 text-orange-600 h-4 px-1.5">
                  {groups.assigned.length}
                </Badge>
              </div>
              {expandedGroups.assigned ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>

            {expandedGroups.assigned && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {groups.assigned.length > 0 ? (
                  groups.assigned.map(renderDriverCard)
                ) : (
                  <div className="py-8 text-center bg-muted/10 rounded-3xl border-2 border-dashed border-border/30">
                    <Users className="h-8 w-8 text-muted-foreground/10 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                      Sin asignaciones
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <AddDriverDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={async (val) => {
          await addDriver(val);
          setIsAddOpen(false);
          await fetchDrivers();
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
