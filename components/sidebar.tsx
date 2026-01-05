"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPinned,
  Package,
  Loader2,
  Warehouse,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LayerVisibility, VehicleType, CustomPOI } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddressSearch } from "@/components/address-search";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";
import { cn } from "@/lib/utils";

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
  removeVehicle,
  removeJob,
  addMode,
  cancelAddMode,
  startRouting,
  isCalculatingRoute = false,
  setMapCenter,
  customPOIs = [],
  addCustomPOI,
  removeCustomPOI,
  clearAllCustomPOIs,
  showCustomPOIs = false,
  setShowCustomPOIs,
  mapCenter = [40.4168, -3.7038],
  onStartPicking,
  pickedCoords,
  isAddCustomPOIOpen,
  setIsAddCustomPOIOpen,
  isLoadingVehicles = false,
  fetchVehicles,
  togglePOISelectionForFleet,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    coords: [number, number];
    label: string;
  } | null>(null);

  const [localIsAddCustomPOIOpen, setLocalIsAddCustomPOIOpen] = useState(false);

  const isAddCustomPOIOpenFinal =
    typeof isAddCustomPOIOpen === "boolean"
      ? isAddCustomPOIOpen
      : localIsAddCustomPOIOpen;

  const setIsAddCustomPOIOpenFinal =
    setIsAddCustomPOIOpen ?? setLocalIsAddCustomPOIOpen;

  return (
    <div
      className={cn(
        "relative z-10 flex h-full flex-col border-r border-border bg-card transition-all duration-300",
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
          {/* Header */}
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Gis-Transport
              </h1>
            </div>

            <AddressSearch
              onSelectLocation={(coords, label) => {
                setSelectedAddress({ coords, label });
                setMapCenter(coords);
              }}
              placeholder="Search address..."
              className="w-full"
            />

            {selectedAddress && (
              <div className="mt-2 p-2 text-xs leading-tight text-muted-foreground bg-muted/30 rounded border border-border/50">
                <span className="font-medium text-foreground/80">Selected:</span> {selectedAddress.label}
              </div>
            )}
          </div>

          <Tabs defaultValue="map" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-none px-4 py-2 border-b border-border/50 bg-muted/20">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="map" className="text-sm">
                  <Layers className="h-4 w-4 mr-2" />
                  Map
                </TabsTrigger>
                <TabsTrigger value="fleet" className="text-sm">
                  <Car className="h-4 w-4 mr-2" />
                  Fleet
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
                    <div className="flex items-center gap-2 px-1">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Map Layers</h3>
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-border bg-muted/10 p-2.5">
                      {Object.entries(layers).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between px-2 py-2 hover:bg-accent/30 rounded-md transition-colors">
                          <Label className="text-sm capitalize cursor-pointer flex-1 py-1" htmlFor={`layer-${key}`}>
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </Label>
                          <Switch
                            id={`layer-${key}`}
                            checked={value}
                            onCheckedChange={() =>
                              toggleLayer(key as keyof LayerVisibility)
                            }
                            className="scale-90"
                          />
                        </div>
                      ))}
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Control Panel */}
                      <div className="space-y-4">
                        {addMode && (
                          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-primary h-2 w-2 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                                  Placement Mode
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-primary/20 text-primary"
                                onClick={cancelAddMode}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-primary/90 leading-relaxed font-medium">
                              Click on the map to place a {addMode === "vehicle" ? "vehicle" : "job"}.
                            </p>
                          </div>
                        )}

                        {isCalculatingRoute && (
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center gap-3 shadow-sm">
                            <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                            <span className="text-xs font-bold text-green-700 uppercase tracking-widest">
                              Computing optimal routes...
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addVehicle}
                            disabled={!!addMode || isCalculatingRoute}
                            className="h-10 text-sm font-medium"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Vehicle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addJob}
                            disabled={!!addMode || isCalculatingRoute}
                            className="h-10 text-sm font-medium"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Job
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchVehicles}
                            disabled={!!addMode || isCalculatingRoute || isLoadingVehicles}
                            className="w-full col-span-2 h-10 text-sm font-bold bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 hover:border-primary/40 transition-all shadow-sm shadow-primary/5"
                          >
                            {isLoadingVehicles ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" /> Syncing...</>
                            ) : (
                              <><Car className="h-4 w-4 mr-2 text-primary" /> Sync from Device</>
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center gap-4 px-3 py-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground font-bold uppercase tracking-wider border border-border/50">
                          <div className="flex-1 flex justify-between items-center border-r border-border/50 pr-4">
                            <span>Vehicles</span>
                            <span className="text-foreground text-sm">{fleetVehicles.length}</span>
                          </div>
                          <div className="flex-1 flex justify-between items-center pl-2">
                            <span>Jobs</span>
                            <span className="text-foreground text-sm">{fleetJobs.length}</span>
                          </div>
                        </div>

                        <div className="space-y-2 px-1">
                          <Label className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">
                            New vehicle profile
                          </Label>
                          <select
                            value={selectedVehicle.id}
                            onChange={(e) => {
                              const vehicle = VEHICLE_TYPES.find((v) => v.id === e.target.value);
                              if (vehicle) setSelectedVehicle(vehicle);
                            }}
                            disabled={isCalculatingRoute}
                            className="w-full h-10 px-3 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted/30 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all disabled:opacity-50"
                          >
                            {VEHICLE_TYPES.map((v) => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      {/* Lists */}
                      <div className="space-y-6 pb-2">
                        {/* Vehicles List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-muted-foreground/80 uppercase px-1 tracking-widest">Vehicle Fleet</h4>
                          {fleetVehicles.length === 0 ? (
                            <div className="py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
                              <p className="text-xs font-medium text-muted-foreground italic">No vehicles added</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[220px] pr-1">
                              {fleetVehicles.map((vehicle) => (
                                <div
                                  key={vehicle.id}
                                  className={cn(
                                    "group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                    selectedVehicleId === vehicle.id
                                      ? "bg-primary/5 border-primary shadow-sm"
                                      : "bg-muted/10 border-transparent hover:border-border/50 hover:bg-muted/20"
                                  )}
                                  onClick={() => setSelectedVehicleId(vehicle.id)}
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={cn(
                                      "p-2 rounded-lg transition-colors",
                                      selectedVehicleId === vehicle.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "bg-muted/50 text-muted-foreground"
                                    )}>
                                      <Car className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-sm font-bold block truncate leading-tight mb-1">
                                        {vehicle.type.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {vehicle.coords[0].toFixed(3)}, {vehicle.coords[1].toFixed(3)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-all rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeVehicle(vehicle.id);
                                    }}
                                    disabled={isCalculatingRoute}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Jobs List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-muted-foreground/80 uppercase px-1 tracking-widest">Job List</h4>
                          {fleetJobs.length === 0 ? (
                            <div className="py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
                              <p className="text-xs font-medium text-muted-foreground italic">No jobs added</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[220px] pr-1">
                              {fleetJobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="group flex items-center justify-between p-3 rounded-lg bg-muted/5 hover:bg-muted/15 border border-transparent hover:border-border/40 transition-all"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <Package className="h-4 w-4 text-blue-500/80" />
                                    <div className="min-w-0">
                                      <span className="text-sm font-medium block truncate">
                                        {job.label}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive/50 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => removeJob(job.id)}
                                    disabled={isCalculatingRoute}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Selected POIs in Fleet */}
                        {customPOIs.length > 0 && (
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 px-1">
                              <Warehouse className="h-4 w-4 text-muted-foreground" />
                              <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest">Enable POIs as jobs</h4>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-muted/5 p-3 pr-1">
                              <div className="space-y-2 max-h-[160px] overflow-y-auto px-1 custom-scrollbar">
                                {customPOIs.map((poi) => (
                                  <div key={poi.id} className="flex items-center gap-4 py-1.5 px-1 rounded-md hover:bg-accent/20 transition-colors">
                                    <Switch
                                      id={`fleet-poi-${poi.id}`}
                                      checked={!!poi.selectedForFleet}
                                      onCheckedChange={() => togglePOISelectionForFleet?.(poi.id)}
                                      className="scale-90"
                                    />
                                    <Label
                                      htmlFor={`fleet-poi-${poi.id}`}
                                      className="text-sm font-medium truncate cursor-pointer flex-1 leading-none"
                                    >
                                      {poi.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Sticky Footer Actions within tab */}
              {fleetMode && (
                <div className="flex-none p-5 border-t border-border/60 bg-card/95 backdrop-blur-md shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 text-destructive hover:bg-destructive/5 hover:text-destructive border-border/80 font-bold transition-all"
                      onClick={clearFleet}
                      disabled={
                        (fleetVehicles.length === 0 &&
                          fleetJobs.length === 0 &&
                          !customPOIs.some((p) => p.selectedForFleet)) ||
                        isCalculatingRoute
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      onClick={startRouting}
                      disabled={
                        fleetVehicles.length === 0 ||
                        (fleetJobs.length === 0 &&
                          !customPOIs.some((p) => p.selectedForFleet)) ||
                        isCalculatingRoute
                      }
                    >
                      {isCalculatingRoute ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> ...</>
                      ) : (
                        "Run Routing"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

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
