"use client";

import { MAP_CENTER } from "@/lib/config";

import { useState } from "react";
import { Button } from "@/components/ui/button";;
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
  Car,
  Plus,
  Trash2,
  X,
  Package,
  Loader2,
  Warehouse,
  Radio,
} from "lucide-react";
import type { LayerVisibility, VehicleType, CustomPOI, FleetJob, FleetVehicle } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";

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
    description?: string
  ) => CustomPOI;
  removeCustomPOI?: (id: string) => void;
  updateCustomPOI?: (
    id: string,
    updates: Partial<Omit<CustomPOI, "id" | "type" | "createdAt">>
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

export function Sidebar({
  layers,
  toggleLayer,
  fleetMode,
  setFleetMode,
  clearFleet,
  fleetVehicles,
  fleetJobs,
  selectedVehicleId,
  setSelectedVehicleId,
  addVehicle,
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
  isAddJobOpen,
  setIsAddJobOpen,
  onStartPickingJob,
  pickedJobCoords,
  isTracking = false,
  toggleTracking,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    <div
      className={cn(
        "fixed left-4 top-4 bottom-4 z-[1000] flex flex-col transition-all duration-500 ease-in-out pointer-events-none",
        isCollapsed ? "w-0" : "w-80"
      )}
    >
      {/* Collapse Toggle - Floating handle */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "absolute -right-12 top-10 h-10 w-10 rounded-full border border-border bg-background/80 backdrop-blur-md shadow-xl transition-all duration-300 pointer-events-auto z-[1001]",
          isCollapsed ? "translate-x-12" : "hover:scale-110"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5 text-primary" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {/* Main Sidebar Card */}
      <div className={cn(
        "flex h-full flex-col rounded-3xl border border-white/20 bg-background/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-500 pointer-events-auto overflow-hidden",
        isCollapsed ? "opacity-0 -translate-x-full scale-95" : "opacity-100 translate-x-0 scale-100"
      )}>
        {/* Header - Search-like Style */}
        <div className="p-5 pb-2">
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/50 border border-white/40 shadow-inner group transition-all hover:bg-white/80">
            <div className="bg-primary h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-foreground leading-none mb-0.5">
                Logistics System
              </h1>
            </div>
          </div>
        </div>

        {/* Global Stats / Quick Actions (Non-invasive) */}
        {fleetMode && (
          <div className="px-5 py-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex flex-col items-center flex-1 border-r border-primary/10">
                <span className="text-xl font-black text-primary leading-none">{fleetVehicles.length}</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">Vehículos</span>
              </div>
              <div className="flex flex-col items-center flex-1 border-r border-primary/10">
                <span className="text-xl font-black text-primary leading-none">{fleetJobs.length}</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">Pedidos</span>
              </div>
              <div className="flex items-center justify-center flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 rounded-lg transition-all", isTracking ? "bg-green-500 text-white shadow-md" : "text-muted-foreground")}
                  onClick={toggleTracking}
                >
                  <Radio className={cn("h-4 w-4", isTracking && "animate-pulse")} />
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="fleet" className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-2">
            <TabsList className="w-full h-12 bg-muted/40 p-1 rounded-2xl border border-white/20">
              <TabsTrigger
                value="fleet"
                className="flex-1 text-xs font-bold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:shadow-lg"
              >
                <Car className="h-4 w-4 mr-2" />
                Flota
              </TabsTrigger>
              <TabsTrigger
                value="layers"
                className="flex-1 text-xs font-bold rounded-xl transition-all data-[state=active]:bg-background data-[state=active]:shadow-lg"
              >
                <Layers className="h-4 w-4 mr-2" />
                Capas
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Fleet Content */}
          <TabsContent value="fleet" className="flex-1 flex flex-col min-h-0 m-0 outline-none overflow-hidden h-full">
            <ScrollArea className="flex-1 min-h-0 w-full">
              <div className="p-5 pt-2 space-y-6">

                {/* Fleet Switcher */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", fleetMode ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-muted-foreground/30")} />
                    <Label className="text-sm font-bold cursor-pointer">Modo Flota</Label>
                  </div>
                  <Switch
                    checked={fleetMode}
                    onCheckedChange={setFleetMode}
                    className="data-[state=unchecked]:bg-black/10 border border-white/20"
                  />
                </div>

                {!fleetMode ? (
                  <div className="py-12 text-center space-y-4 px-6 grayscale opacity-60">
                    <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                      <Car className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-balance leading-relaxed">
                      Activa el <b>Modo Flota</b> para gestionar vehículos y optimizar rutas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* Add Controls */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-widest">
                        Operaciones Rápidas
                      </Label>


                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          variant="secondary"
                          onClick={addVehicle}
                          disabled={!!addMode || isCalculatingRoute}
                          className="h-12 rounded-2xl font-bold text-xs shadow-sm shadow-black/[0.05]"
                        >
                          <Plus className="h-4 w-4 mr-2 text-primary" /> Vehículo
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setIsAddJobOpenFinal(true)}
                          disabled={!!addMode || isCalculatingRoute}
                          className="h-12 rounded-2xl font-bold text-xs shadow-sm shadow-black/[0.05]"
                        >
                          <Plus className="h-4 w-4 mr-2 text-primary" /> Pedido
                        </Button>
                      </div>

                      {addMode && (
                        <div className="bg-primary text-white p-3 rounded-xl flex items-center justify-between shadow-lg shadow-primary/25 animate-pulse">
                          <span className="text-xs font-bold">Haz click en el mapa para colocar</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={cancelAddMode}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Vehicles List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Vehículos</Label>
                        <Button variant="ghost" size="sm" onClick={fetchVehicles} disabled={isLoadingVehicles} className="h-6 text-[10px] font-bold uppercase tracking-tight">
                          {isLoadingVehicles ? "Cargando..." : "Sincronizar"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {fleetVehicles.length === 0 ? (
                          <p className="text-xs text-center py-4 text-muted-foreground italic">No hay vehículos asignados</p>
                        ) : (
                          fleetVehicles.map(v => (
                            <div
                              key={v.id}
                              onClick={() => setSelectedVehicleId(v.id)}
                              className={cn(
                                "group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                                selectedVehicleId === v.id ? "bg-white border-primary/30 shadow-md ring-1 ring-primary/10" : "bg-white/40 border-transparent hover:bg-white"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors", selectedVehicleId === v.id ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                  <Car className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{v.type.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{v.id.slice(0, 8)}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); removeVehicle(v.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Jobs List */}
                    <div className="space-y-3 pb-4">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-widest">Pedidos Agendados</Label>
                      <div className="space-y-2">
                        {fleetJobs.length === 0 ? (
                          <p className="text-xs text-center py-4 text-muted-foreground italic">No hay pedidos pendientes</p>
                        ) : (
                          fleetJobs.map(j => (
                            <div key={j.id} className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/40 border border-transparent hover:border-border hover:bg-white transition-all shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                                  <Package className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold">{j.label}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => removeJob(j.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
                }
              </div >
            </ScrollArea >

            {/* Sticky Action Bar */}
            {
              fleetMode && (
                <div className="p-5 pt-0 bg-gradient-to-t from-background/90 to-transparent">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 font-bold"
                      onClick={clearFleet}
                      disabled={fleetVehicles.length === 0 && fleetJobs.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Borrar
                    </Button>
                    <Button
                      className="h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all font-bold"
                      onClick={startRouting}
                      disabled={fleetVehicles.length === 0 || fleetJobs.length === 0 || isCalculatingRoute}
                    >
                      {isCalculatingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trazar Rutas"}
                    </Button>
                  </div>
                </div>
              )
            }
          </TabsContent >

          {/* Layers Content */}
          < TabsContent value="layers" className="flex-1 flex flex-col min-h-0 m-0 outline-none overflow-hidden h-full" >
            <ScrollArea className="flex-1 min-h-0 w-full">
              <div className="p-5 space-y-8">

                {/* Map Config */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-widest">Configuración Base</Label>
                  <div className="space-y-2">
                    {Object.entries(layers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-transparent hover:border-border/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-4 w-4 rounded-md transition-colors", value ? "bg-primary" : "bg-muted")} />
                          <span className="text-sm font-bold capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        </div>
                        <Switch
                          checked={value}
                          onCheckedChange={() => toggleLayer(key as keyof LayerVisibility)}
                          className="data-[state=unchecked]:bg-black/10 border border-white/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom POIs Management */}
                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">POIs del Cliente</Label>
                    <Badge variant="secondary" className="rounded-full px-2.5 h-6 bg-primary/10 text-primary border-none font-bold">
                      {customPOIs.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="secondary"
                      className="w-full h-12 rounded-2xl font-bold border border-white/40 shadow-sm"
                      onClick={() => setIsAddCustomPOIOpenFinal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Nuevo Punto de Interés
                    </Button>

                    {customPOIs.length > 0 && (
                      <div className="space-y-3 py-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-bold text-muted-foreground">Visibilidad</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-bold text-primary"
                            onClick={() => setShowCustomPOIs?.(!showCustomPOIs)}
                          >
                            {showCustomPOIs ? "Ocultar en Mapa" : "Mostrar en Mapa"}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {customPOIs.map(poi => (
                            <div key={poi.id} className="group flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-transparent hover:border-border transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                                  <Warehouse className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-bold truncate">{poi.name}</span>
                                  <span className="text-[10px] text-muted-foreground">Lat: {poi.position[0].toFixed(4)}</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeCustomPOI?.(poi.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full h-9 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={clearAllCustomPOIs}
                        >
                          Borrar todos los POIs
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent >
        </Tabs >
      </div >

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
    </div >
  );
}
