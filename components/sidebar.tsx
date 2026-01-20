"use client";

import { MAP_CENTER } from "@/lib/config";

import { useState } from "react";
import { Button } from "@/components/ui/button";;
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Eye,
  EyeOff,
  Radio,
} from "lucide-react";
import type { LayerVisibility, VehicleType, CustomPOI } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
        "relative z-10 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-20 h-6 w-6 rounded-full border border-border bg-card shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {!isCollapsed && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shadow-sm shadow-primary/5">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground leading-none mb-1">
                  GIS Logistics
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Intelligent Transport
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="map" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-none px-4 py-3">
              <TabsList className="w-full h-11 bg-muted/30 p-1.5 rounded-xl border border-border/40">
                <TabsTrigger
                  value="map"
                  className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  <Layers className="h-3.5 w-3.5 mr-2" />
                  Map Layers
                </TabsTrigger>
                <TabsTrigger
                  value="fleet"
                  className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  <Car className="h-3.5 w-3.5 mr-2" />
                  Fleet Ops
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="map"
              className="flex-1 flex flex-col min-h-0 m-0 outline-none data-[state=active]:flex overflow-hidden"
            >
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-4 py-6 space-y-8">
                  {/* Map Layers */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.1em]">
                        Visibility Controls
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {isLoadingLayers ? (
                        <div className="space-y-3 p-2">
                          <Skeleton className="h-8 w-full rounded-lg" />
                          <Skeleton className="h-8 w-full rounded-lg" />
                        </div>
                      ) : (
                        Object.entries(layers).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/30 border border-border/30 rounded-xl transition-all group">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-2 w-2 rounded-full transition-all",
                                value ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-muted-foreground/30"
                              )} />
                              <Label className="text-sm font-medium capitalize cursor-pointer tracking-tight" htmlFor={`layer-${key}`}>
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </Label>
                            </div>
                            <Switch
                              id={`layer-${key}`}
                              checked={value}
                              onCheckedChange={() =>
                                toggleLayer(key as keyof LayerVisibility)
                              }
                              className="scale-90"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  {/* Custom POIs */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Custom POIs</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs px-2 h-5">
                        {customPOIs?.length || 0}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-sm h-9 bg-muted/10 hover:bg-muted/30"
                      onClick={() => setIsAddCustomPOIOpenFinal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom POI
                    </Button>

                    {customPOIs && customPOIs.length > 0 && (
                      <div className="space-y-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setShowCustomPOIs?.(!showCustomPOIs)}
                        >
                          {showCustomPOIs ? (
                            <><EyeOff className="h-4 w-4 mr-2" /> Hide markers</>
                          ) : (
                            <><Eye className="h-4 w-4 mr-2" /> Show markers</>
                          )}
                        </Button>

                        <div className="space-y-2 max-h-[300px] pr-1">
                          {customPOIs.map((poi) => (
                            <div
                              key={poi.id}
                              className="group flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-transparent hover:border-border hover:bg-accent/40 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Warehouse className="h-4 w-4 text-cyan-600/70" />
                                <div className="min-w-0">
                                  <span className="text-sm font-medium truncate block leading-tight mb-1">
                                    {poi.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {poi.position[0].toFixed(3)}, {poi.position[1].toFixed(3)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeCustomPOI?.(poi.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive/70" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-8"
                          onClick={() => clearAllCustomPOIs?.()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear all POIs
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="fleet"
              className="flex-1 flex flex-col min-h-0 m-0 outline-none data-[state=active]:flex overflow-hidden"
            >
              <div className="flex-none flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Fleet Optimization</h3>
                </div>
                <Switch
                  checked={fleetMode}
                  onCheckedChange={setFleetMode}
                  className="scale-100"
                />
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 py-4 space-y-8">
                  {!fleetMode ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/5 p-8 text-center">
                      <Car className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Activate Fleet Mode to start optimization
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Status Alerts - Only when active */}
                      {addMode && (
                        <div className="p-4 bg-primary/5 rounded-xl flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="bg-primary h-2 w-2 rounded-full animate-pulse" />
                              <span className="text-xs font-semibold text-primary">
                                Click on map to place {addMode}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-primary/60 hover:text-primary"
                              onClick={cancelAddMode}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {isCalculatingRoute && (
                        <div className="p-4 bg-green-500/5 rounded-xl flex items-center gap-3">
                          <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                          <span className="text-xs font-semibold text-green-700">
                            Computing routes...
                          </span>
                        </div>
                      )}

                      {/* Quick Overview - Visual Anchor */}
                      <div className="flex items-center justify-around py-4 bg-card rounded-2xl border border-border/40 shadow-sm shadow-black/[0.02]">
                        <div className="flex flex-col items-center">
                          <div className="text-3xl font-black text-primary leading-none mb-1">{fleetVehicles.length}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vehicles</div>
                        </div>
                        <div className="w-px h-10 bg-border/60" />
                        <div className="flex flex-col items-center">
                          <div className="text-3xl font-black text-primary leading-none mb-1">{fleetJobs.length}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Jobs</div>
                        </div>
                      </div>

                      {/* Config + Actions Card */}
                      <div className="bg-card p-5 rounded-2xl border border-border/40 space-y-5 shadow-sm shadow-black/[0.01]">
                        <div className="space-y-2.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em] ml-1">
                            Configuration
                          </Label>
                          <Select
                            value={selectedVehicle.id}
                            onValueChange={(value) => {
                              const vehicle = VEHICLE_TYPES.find((v) => v.id === value);
                              if (vehicle) setSelectedVehicle(vehicle);
                            }}
                            disabled={isCalculatingRoute}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-border/30 hover:bg-muted/30 transition-all">
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40">
                              {VEHICLE_TYPES.map((v) => (
                                <SelectItem key={v.id} value={v.id} className="rounded-lg">
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addVehicle}
                            disabled={!!addMode || isCalculatingRoute}
                            className="h-11 rounded-xl border-border/40 bg-muted/20 hover:bg-muted/40 transition-all font-bold text-xs uppercase tracking-widest"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Vehicle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddJobOpenFinal(true)}
                            disabled={!!addMode || isCalculatingRoute}
                            className="h-11 rounded-xl border-border/40 bg-muted/20 hover:bg-muted/40 transition-all font-bold text-xs uppercase tracking-widest"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Job
                          </Button>
                        </div>
                      </div>

                      {/* Vehicle Fleet */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicles</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchVehicles}
                            disabled={!!addMode || isCalculatingRoute || isLoadingVehicles}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                          >
                            {isLoadingVehicles ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Sync"
                            )}
                          </Button>
                        </div>

                        {fleetVehicles.length === 0 ? (
                          <div className="py-8 text-center">
                            <Car className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground/60">No vehicles</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {fleetVehicles.map((vehicle) => (
                              <div
                                key={vehicle.id}
                                className={cn(
                                  "group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer relative overflow-hidden",
                                  selectedVehicleId === vehicle.id
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/40"
                                )}
                                onClick={() => setSelectedVehicleId(vehicle.id)}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {selectedVehicleId === vehicle.id && (
                                    <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-full" />
                                  )}
                                  <Car className={cn(
                                    "h-4 w-4 shrink-0",
                                    selectedVehicleId === vehicle.id ? "text-primary" : "text-muted-foreground"
                                  )} />
                                  <span className="text-sm font-medium truncate">
                                    {vehicle.type.label}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeVehicle(vehicle.id);
                                  }}
                                  disabled={isCalculatingRoute}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Jobs */}
                      <div className="space-y-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jobs</span>

                        {fleetJobs.length === 0 ? (
                          <div className="py-8 text-center">
                            <Package className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground/60">No jobs</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {fleetJobs.map((job) => (
                              <div
                                key={job.id}
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">
                                    {job.label}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeJob(job.id)}
                                  disabled={isCalculatingRoute}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* POIs as Jobs - Only if there are POIs */}
                      {customPOIs.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">POIs as Jobs</span>
                          <div className="space-y-1 max-h-[140px] overflow-y-auto">
                            {customPOIs.map((poi) => (
                              <div key={poi.id} className="flex items-center gap-3 py-2 px-1">
                                <Switch
                                  id={`fleet-poi-${poi.id}`}
                                  checked={!!poi.selectedForFleet}
                                  onCheckedChange={() => togglePOISelectionForFleet?.(poi.id)}
                                />
                                <Label
                                  htmlFor={`fleet-poi-${poi.id}`}
                                  className="text-sm truncate cursor-pointer flex-1"
                                >
                                  {poi.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Sticky Footer Actions within tab */}
              {fleetMode && (
                <div className="flex-none p-5 border-t border-border/60 bg-card/95 backdrop-blur-md shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 text-destructive hover:bg-destructive/5 hover:text-destructive border-border/80 font-bold transition-all"
                      onClick={clearFleet}
                      disabled={
                        (fleetVehicles.length === 0 &&
                          fleetJobs.length === 0 &&
                          !customPOIs.some((p) => p.selectedForFleet)) ||
                        isCalculatingRoute ||
                        isTracking
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isTracking ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-11 font-bold transition-all",
                        isTracking
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25"
                          : "border-green-600/50 text-green-600 hover:bg-green-50"
                      )}
                      onClick={toggleTracking}
                      disabled={fleetVehicles.length === 0 || isCalculatingRoute}
                    >
                      <Radio className={cn("h-4 w-4 mr-1", isTracking && "animate-pulse")} />
                      {isTracking ? "Live" : "Live"}
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      onClick={startRouting}
                      disabled={
                        fleetVehicles.length === 0 ||
                        (fleetJobs.length === 0 &&
                          !customPOIs.some((p) => p.selectedForFleet)) ||
                        isCalculatingRoute ||
                        isTracking
                      }
                    >
                      {isCalculatingRoute ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /></>
                      ) : (
                        "Route"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <AddJobDialog
        isOpen={isAddJobOpenFinal}
        onOpenChange={(value) => setIsAddJobOpenFinal(value)}
        onSubmit={(coords, label) => {
          // GISMap handles the actual adding
          // but we can pass coords here if needed
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
}
