"use client";

import { useEffect, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  MapPin,
  Car,
  Plus,
  Trash2,
  X,
  Package,
  Loader2,
  Warehouse,
  ChevronLeft,
  Settings,
  Route,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LayerVisibility, VehicleType, CustomPOI } from "@/lib/types";
import { MAP_CENTER } from "@/lib/config";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";
import { VehicleItem, JobItem } from "@/components/sidebar-items";

interface FleetJob {
  id: string;
  coords: [number, number];
  label: string;
}

interface FleetVehicle {
  id: string;
  coords: [number, number];
  type: VehicleType;
}

interface SidebarProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  selectedVehicle: VehicleType;
  setSelectedVehicle: (vehicle: VehicleType) => void;
  fleetMode: boolean;
  setFleetMode: (value: boolean) => void;
  clearFleet: () => void;
  fleetVehicles: FleetVehicle[];
  fleetJobs: FleetJob[];
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  addVehicle: () => void;
  addJob: () => void;
  addJobDirectly?: (coords: [number, number], label: string) => void;
  removeVehicle: (vehicleId: string) => void;
  removeJob: (jobId: string) => void;
  addMode: "vehicle" | "job" | null;
  cancelAddMode: () => void;
  startRouting: () => void;
  isCalculatingRoute?: boolean;
  setMapCenter: (coords: [number, number]) => void;
  customPOIs?: CustomPOI[];
  addCustomPOI?: (
    name: string,
    coords: [number, number],
    description?: string,
  ) => CustomPOI;
  removeCustomPOI?: (id: string) => void;
  updateCustomPOI?: (
    id: string,
    updates: Partial<Omit<CustomPOI, "id" | "type" | "createdAt">>,
  ) => void;
  clearAllCustomPOIs?: () => void;
  showCustomPOIs?: boolean;
  setShowCustomPOIs?: (value: boolean) => void;
  mapCenter?: [number, number];
  onStartPicking?: () => void;
  pickedCoords?: [number, number] | null;
  isAddCustomPOIOpen?: boolean;
  setIsAddCustomPOIOpen?: (value: boolean) => void;
  isLoadingVehicles?: boolean;
  fetchVehicles?: () => Promise<void>;
  togglePOISelectionForFleet?: (id: string) => void;
  isAddJobOpen?: boolean;
  setIsAddJobOpen?: (value: boolean) => void;
  onStartPickingJob?: () => void;
  pickedJobCoords?: [number, number] | null;
  isLoadingLayers?: boolean;
  isTracking?: boolean;
  toggleTracking?: () => void;
}

type SidebarTab = "fleet" | "layers" | "settings";

export const Sidebar = memo(function Sidebar({
  layers,
  toggleLayer,
  selectedVehicle,
  setSelectedVehicle,
  fleetMode,
  setFleetMode,
  clearFleet,
  fleetVehicles,
  fleetJobs,
  selectedVehicleId,
  setSelectedVehicleId,
  addVehicle,
  addJob,
  addJobDirectly,
  removeVehicle,
  removeJob,
  addMode,
  cancelAddMode,
  startRouting,
  isCalculatingRoute = false,
  customPOIs = [],
  addCustomPOI,
  removeCustomPOI,
  clearAllCustomPOIs,
  showCustomPOIs = false,
  setShowCustomPOIs,
  mapCenter = MAP_CENTER,
  onStartPicking,
  pickedCoords,
  isAddCustomPOIOpen,
  setIsAddCustomPOIOpen,
  isLoadingVehicles = false,
  fetchVehicles,
  togglePOISelectionForFleet,
  isAddJobOpen,
  setIsAddJobOpen,
  onStartPickingJob,
  pickedJobCoords,
  isLoadingLayers = false,
  isTracking = false,
  toggleTracking,
}: SidebarProps) {
  // Local state for sidebar visibility
  const [activeTab, setActiveTabState] = useState<SidebarTab>("fleet");
  const [isExpanded, setIsExpanded] = useState(true);

  // Helper to sync tab change with fleet mode
  const setActiveTab = (tab: SidebarTab) => {
    setActiveTabState(tab);
    if (!isExpanded) setIsExpanded(true);

    // Implicitly handle fleet mode
    if (tab === "fleet") {
      setFleetMode(true);
    } else {
      // Optional: setFleetMode(false) if we want to hide fleet stuff when not in fleet tab
      // For now, let's keep it true or user preference, but we must ensure
      // the parent knows we are "focused" on something else.
      // Actually, user requirement "without removing functionality" implies
      // we should just show the controls.
    }
  };

  // Sync initial fleet mode
  useEffect(() => {
    if (activeTab === "fleet" && !fleetMode) {
      setFleetMode(true);
    }
  }, [activeTab, fleetMode, setFleetMode]);

  // Dialog state management
  const [localIsAddJobOpen, setLocalIsAddJobOpen] = useState(false);
  const [localIsAddCustomPOIOpen, setLocalIsAddCustomPOIOpen] = useState(false);

  const isAddJobOpenFinal =
    typeof isAddJobOpen === "boolean" ? isAddJobOpen : localIsAddJobOpen;
  const setIsAddJobOpenFinal = setIsAddJobOpen ?? setLocalIsAddJobOpen;

  const isAddCustomPOIOpenFinal =
    typeof isAddCustomPOIOpen === "boolean"
      ? isAddCustomPOIOpen
      : localIsAddCustomPOIOpen;
  const setIsAddCustomPOIOpenFinal =
    setIsAddCustomPOIOpen ?? setLocalIsAddCustomPOIOpen;

  return (
    <div className="fixed left-4 top-4 bottom-4 z-[1000] flex pointer-events-none">
      {/* 1. Navigation Rail */}
      <div className="w-16 h-full bg-background/95 backdrop-blur-md border border-white/20 rounded-3xl flex flex-col items-center py-6 gap-4 shadow-xl pointer-events-auto z-[1002] transition-all duration-300">
        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
          <MapPin className="h-6 w-6 text-primary" />
        </div>

        <TooltipProvider delayDuration={0}>
          {/* Fleet Tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("fleet")}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative group",
                  activeTab === "fleet" && isExpanded
                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Route className="h-5 w-5" />
                {activeTab === "fleet" && isExpanded && (
                  <span className="absolute -right-1 top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold ml-2">
              Gestión de Flota
            </TooltipContent>
          </Tooltip>

          {/* Layers Tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("layers")}
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                  activeTab === "layers" && isExpanded
                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Layers className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold ml-2">
              Capas y POIs
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        {/* Footer Actions / Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform duration-300",
              !isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* 2. Content Panel */}
      <div
        className={cn(
          "h-full ml-3 rounded-3xl border border-white/20 bg-background/90 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden flex flex-col pointer-events-auto",
          isExpanded
            ? "w-80 opacity-100 translate-x-0"
            : "w-0 opacity-0 -translate-x-10",
        )}
      >
        {/* Helper to render content based on active tab */}
        {activeTab === "fleet" && (
          <div className="flex flex-col h-full min-w-[20rem]">
            {/* Header */}
            <div className="p-5 border-b border-border/10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Flota
                </h2>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={fetchVehicles}
                    disabled={isLoadingVehicles}
                  >
                    <Loader2
                      className={cn(
                        "h-4 w-4",
                        isLoadingVehicles && "animate-spin",
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={clearFleet}
                    disabled={
                      fleetVehicles.length === 0 && fleetJobs.length === 0
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Gestión de rutas y vehículos
              </p>

              {/* Quick Stats Row */}
              <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-primary/5 rounded-xl p-2.5 flex flex-col items-center justify-center border border-primary/10">
                  <span className="text-lg font-black text-primary leading-none">
                    {fleetVehicles.length}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground mt-1">
                    Vehículos
                  </span>
                </div>
                <div className="flex-1 bg-primary/5 rounded-xl p-2.5 flex flex-col items-center justify-center border border-primary/10">
                  <span className="text-lg font-black text-primary leading-none">
                    {fleetJobs.length}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground mt-1">
                    Pedidos
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 grid grid-cols-2 gap-2">
              <Button
                variant={addMode === "vehicle" ? "default" : "secondary"}
                className="h-10 rounded-xl text-xs font-bold transition-all"
                onClick={addVehicle}
                disabled={!!addMode || isCalculatingRoute}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Vehículo
              </Button>
              <Button
                variant={addMode === "job" ? "default" : "secondary"}
                className="h-10 rounded-xl text-xs font-bold transition-all"
                onClick={() => setIsAddJobOpenFinal(true)}
                disabled={!!addMode || isCalculatingRoute}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Pedido
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 pt-0 space-y-6">
                {addMode && (
                  <div className="bg-primary text-primary-foreground p-3 rounded-xl flex items-center justify-between shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-top-2 mb-4">
                    <span className="text-xs font-bold">
                      Selecciona ubicación en el mapa
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:bg-white/20 rounded-full"
                      onClick={cancelAddMode}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Vehicles */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">
                    Vehículos Activos
                  </Label>
                  {fleetVehicles.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-muted rounded-xl">
                      <Car className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Sin vehículos
                      </p>
                    </div>
                  ) : (
                    fleetVehicles.map((v) => (
                      <VehicleItem
                        key={v.id}
                        id={v.id}
                        type={v.type}
                        isSelected={selectedVehicleId === v.id}
                        onSelect={setSelectedVehicleId}
                        onRemove={removeVehicle}
                      />
                    ))
                  )}
                </div>

                {/* Jobs */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">
                    Lista de Pedidos
                  </Label>
                  {fleetJobs.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-muted rounded-xl">
                      <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Sin pedidos
                      </p>
                    </div>
                  ) : (
                    fleetJobs.map((j) => (
                      <JobItem
                        key={j.id}
                        id={j.id}
                        label={j.label}
                        onRemove={removeJob}
                      />
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Bottom Action */}
            <div className="p-4 border-t border-border/10 bg-background/50">
              <Button
                className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98]"
                onClick={startRouting}
                disabled={
                  fleetVehicles.length === 0 ||
                  fleetJobs.length === 0 ||
                  isCalculatingRoute
                }
              >
                {isCalculatingRoute ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Route className="h-4 w-4 mr-2" />
                    Optimizar Rutas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "layers" && (
          <div className="flex flex-col h-full min-w-[20rem]">
            <div className="p-5 border-b border-border/10">
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Capas
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Personalización del mapa
              </p>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-8">
                {/* Layer Toggles */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">
                    Elementos del Mapa
                  </Label>
                  {Object.entries(layers).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-transparent hover:border-border transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full shadow-sm",
                            value ? "bg-primary shadow-primary/50" : "bg-muted",
                          )}
                        />
                        <span className="text-xs font-bold capitalize text-foreground">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={() =>
                          toggleLayer(key as keyof LayerVisibility)
                        }
                        className="scale-75 origin-right"
                      />
                    </div>
                  ))}
                </div>

                {/* Custom POIs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pl-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Puntos de Interés
                    </Label>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold h-5"
                    >
                      {customPOIs.length}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-bold h-10 rounded-xl"
                    onClick={() => setIsAddCustomPOIOpenFinal(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Nuevo Punto
                  </Button>

                  {customPOIs.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {customPOIs.map((poi) => (
                        <div
                          key={poi.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-card/50 border border-transparent hover:bg-card hover:border-border transition-all group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Warehouse className="h-4 w-4 text-cyan-600" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate">
                                {poi.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-mono">
                                {poi.position[0].toFixed(3)},{" "}
                                {poi.position[1].toFixed(3)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustomPOI?.(poi.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {customPOIs.length > 0 && (
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-8 text-[10px] font-bold rounded-lg opacity-80 hover:opacity-100"
                        onClick={clearAllCustomPOIs}
                      >
                        Eliminar todos los POIs
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <AddJobDialog
        isOpen={isAddJobOpenFinal}
        onOpenChange={(value) => setIsAddJobOpenFinal(value)}
        onSubmit={(coords, label) => {
          addJobDirectly?.(coords, label);
          setIsAddJobOpenFinal(false);
        }}
        mapCenter={mapCenter}
        onStartPicking={onStartPickingJob}
        pickedCoords={pickedJobCoords}
      />

      <AddCustomPOIDialog
        isOpen={isAddCustomPOIOpenFinal}
        onOpenChange={(value) => setIsAddCustomPOIOpenFinal(value)}
        onSubmit={(name, coords, description) => {
          addCustomPOI?.(name, coords, description);
          setIsAddCustomPOIOpenFinal(false);
        }}
        mapCenter={mapCenter}
        onStartPicking={onStartPicking}
        pickedCoords={pickedCoords}
      />
    </div>
  );
});
