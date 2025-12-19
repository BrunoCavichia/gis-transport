"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { AddressSearch } from "@/components/address-search";
import { AddCustomPOIDialog } from "@/components/add-custom-poi-dialog";

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
      className={`relative z-10 flex h-full flex-col border-r border-border bg-card transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-80"
      }`}
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
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <AddressSearch
            onSelectLocation={(coords, label) => {
              setSelectedAddress({ coords, label });
              setMapCenter(coords);
            }}
            placeholder="Search address..."
            className="mb-4"
          />

          {selectedAddress && (
            <div className="p-2 text-xs text-muted-foreground bg-muted/20 rounded-md mb-2">
              Selected: {selectedAddress.label}
            </div>
          )}

          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              Fleet Manager Demo
            </h1>
          </div>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fleet Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="fleet-mode" className="text-sm">
                  Activate Fleet Mode
                </Label>
                <Switch
                  id="fleet-mode"
                  checked={fleetMode}
                  onCheckedChange={setFleetMode}
                />
              </div>

              {fleetMode && (
                <div className="mt-4 space-y-3">
                  {addMode && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {addMode === "vehicle"
                              ? "Adding Vehicle"
                              : "Adding Job"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={cancelAddMode}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Click on the map to place{" "}
                        {addMode === "vehicle" ? "a new vehicle" : "a new job"}
                      </p>
                    </div>
                  )}

                  {isCalculatingRoute && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Calculating optimal routes...
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addVehicle}
                      disabled={!!addMode || isCalculatingRoute}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Vehicle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addJob}
                      disabled={!!addMode || isCalculatingRoute}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Job
                    </Button>
                  </div>

                  <div className="p-2 bg-muted rounded-lg text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total Vehicles:</span>
                      <span className="font-medium">
                        {fleetVehicles.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Jobs:</span>
                      <span className="font-medium">{fleetJobs.length}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Vehicle Type for New Vehicles
                    </Label>
                    <select
                      value={selectedVehicle.id}
                      onChange={(e) => {
                        const vehicle = VEHICLE_TYPES.find(
                          (v) => v.id === e.target.value
                        );
                        if (vehicle) setSelectedVehicle(vehicle);
                      }}
                      disabled={isCalculatingRoute}
                      className="w-full p-2 text-sm border rounded-lg bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {VEHICLE_TYPES.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Vehicles ({fleetVehicles.length})
                    </Label>
                    {fleetVehicles.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg">
                        No vehicles. Click "Add Vehicle".
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {fleetVehicles.map((vehicle) => (
                          <Card
                            key={vehicle.id}
                            className={`cursor-pointer transition-all ${
                              selectedVehicleId === vehicle.id
                                ? "ring-2 ring-primary"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => setSelectedVehicleId(vehicle.id)}
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-primary" />
                                <div>
                                  <span className="font-medium text-sm">
                                    {vehicle.type.label}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    {vehicle.coords[0].toFixed(4)},{" "}
                                    {vehicle.coords[1].toFixed(4)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVehicle(vehicle.id);
                                }}
                                disabled={isCalculatingRoute}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Jobs ({fleetJobs.length})
                    </Label>
                    {fleetJobs.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg">
                        No jobs. Click "Add Job".
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {fleetJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3 text-purple-600" />
                              <div>
                                <span className="text-sm font-medium">
                                  {job.label}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {job.coords[0].toFixed(4)},{" "}
                                  {job.coords[1].toFixed(4)}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeJob(job.id)}
                              disabled={isCalculatingRoute}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={clearFleet}
                    disabled={
                      (fleetVehicles.length === 0 && fleetJobs.length === 0) ||
                      isCalculatingRoute
                    }
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear All
                  </Button>

                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={startRouting}
                    disabled={
                      fleetVehicles.length === 0 ||
                      fleetJobs.length === 0 ||
                      isCalculatingRoute
                    }
                  >
                    {isCalculatingRoute ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />{" "}
                        Calculating...
                      </>
                    ) : (
                      "Start Routing"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Warehouse className="h-4 w-4" /> Custom POIs (
                {customPOIs?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAddCustomPOIOpenFinal(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Custom POI
              </Button>

              {customPOIs && customPOIs.length > 0 && (
                <>
                  <Button
                    variant={showCustomPOIs ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setShowCustomPOIs?.(!showCustomPOIs)}
                  >
                    {showCustomPOIs ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" /> Hide Custom POIs
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" /> Show Custom POIs
                      </>
                    )}
                  </Button>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {customPOIs.map((poi) => (
                      <Card key={poi.id} className="bg-accent/20">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Warehouse className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium text-sm truncate block">
                                {poi.name}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {poi.position[0].toFixed(4)},{" "}
                                {poi.position[1].toFixed(4)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => removeCustomPOI?.(poi.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => clearAllCustomPOIs?.()}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear All Custom POIs
                  </Button>
                </>
              )}

              {(!customPOIs || customPOIs.length === 0) && (
                <div className="p-3 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg">
                  No custom POIs yet. Click "Add Custom POI" to create one.
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" /> Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(layers).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                  <Switch
                    checked={value}
                    onCheckedChange={() =>
                      toggleLayer(key as keyof LayerVisibility)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
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
