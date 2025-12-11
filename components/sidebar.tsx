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
  Navigation,
  Fuel,
  Zap,
  AlertTriangle,
  MapPin,
  Route,
  Car,
} from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import type { LayerVisibility, SearchLocation, VehicleType } from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";

interface SidebarProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  isRouting: boolean;
  setIsRouting: (value: boolean) => void;
  clearRoute: () => void;
  routePoints: { start: [number, number] | null; end: [number, number] | null };
  startLocation: SearchLocation | null;
  endLocation: SearchLocation | null;
  onStartLocationSelect: (coords: [number, number], name: string) => void;
  onEndLocationSelect: (coords: [number, number], name: string) => void;
  selectedVehicle: VehicleType;
  setSelectedVehicle: (vehicle: VehicleType) => void;
}

export function Sidebar({
  layers,
  toggleLayer,
  isRouting,
  setIsRouting,
  clearRoute,
  routePoints,
  startLocation,
  endLocation,
  onStartLocationSelect,
  onEndLocationSelect,
  selectedVehicle,
  setSelectedVehicle,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              GIS Transport Demo
            </h1>
          </div>

          <Separator />

          {/* Vehicle Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4" />
                Type of Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                {VEHICLE_TYPES.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      selectedVehicle.id === vehicle.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-accent/50 hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="font-medium">{vehicle.label}</div>
                    <div
                      className={`text-xs ${
                        selectedVehicle.id === vehicle.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vehicle.tags.length > 0
                        ? `Etiquetas: ${vehicle.tags.join(", ")}`
                        : "Sin etiqueta"}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedVehicle.description}
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Address Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4" />
                Address Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Start Location
                </Label>
                <AddressSearch
                  onSelectLocation={onStartLocationSelect}
                  placeholder="Search start address..."
                  className="mt-1"
                />
                {startLocation && (
                  <p className="mt-1 truncate text-xs text-green-600">
                    {startLocation.name}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  End Location
                </Label>
                <AddressSearch
                  onSelectLocation={onEndLocationSelect}
                  placeholder="Search destination..."
                  className="mt-1"
                />
                {endLocation && (
                  <p className="mt-1 truncate text-xs text-green-600">
                    {endLocation.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Layer Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-orange-500" />
                  <Label htmlFor="gas-stations" className="text-sm">
                    Gas Stations
                  </Label>
                </div>
                <Switch
                  id="gas-stations"
                  checked={layers.gasStations}
                  onCheckedChange={() => toggleLayer("gasStations")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <Label htmlFor="ev-stations" className="text-sm">
                    EV Charging
                  </Label>
                </div>
                <Switch
                  id="ev-stations"
                  checked={layers.evStations}
                  onCheckedChange={() => toggleLayer("evStations")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Label htmlFor="lez" className="text-sm">
                    Low Emission Zones
                  </Label>
                </div>
                <Switch
                  id="lez"
                  checked={layers.lowEmissionZones}
                  onCheckedChange={() => toggleLayer("lowEmissionZones")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <Label htmlFor="restricted" className="text-sm">
                    Restricted Zones
                  </Label>
                </div>
                <Switch
                  id="restricted"
                  checked={layers.restrictedZones}
                  onCheckedChange={() => toggleLayer("restrictedZones")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="route" className="text-sm">
                    Route
                  </Label>
                </div>
                <Switch
                  id="route"
                  checked={layers.route}
                  onCheckedChange={() => toggleLayer("route")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Route Planning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4" />
                Route Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {isRouting
                  ? routePoints.start
                    ? "Click on the map to set your destination"
                    : "Click on the map to set your starting point"
                  : "Use address search above or enable routing mode to click on map"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={isRouting ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsRouting(!isRouting)}
                >
                  {isRouting ? "Routing Mode On" : "Click-to-Route"}
                </Button>
                {(routePoints.start || routePoints.end) && (
                  <Button variant="destructive" size="sm" onClick={clearRoute}>
                    Clear
                  </Button>
                )}
              </div>
              {routePoints.start && (
                <div className="rounded-md bg-muted p-2 text-xs">
                  <p className="font-medium text-foreground">Start:</p>
                  <p className="text-muted-foreground">
                    {startLocation?.name ||
                      `${routePoints.start[0].toFixed(
                        5
                      )}, ${routePoints.start[1].toFixed(5)}`}
                  </p>
                </div>
              )}
              {routePoints.end && (
                <div className="rounded-md bg-muted p-2 text-xs">
                  <p className="font-medium text-foreground">End:</p>
                  <p className="text-muted-foreground">
                    {endLocation?.name ||
                      `${routePoints.end[0].toFixed(
                        5
                      )}, ${routePoints.end[1].toFixed(5)}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">
                  Gas Stations (OSM)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  EV Charging (Open Charge Map)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded border-2 border-amber-500 bg-amber-500/20" />
                <span className="text-muted-foreground">
                  Low Emission Zones (ZBE)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded border-2 border-dashed border-red-500 bg-red-500/30" />
                <span className="text-muted-foreground">Restricted Areas</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-0.5 w-3 bg-blue-500" />
                <span className="text-muted-foreground">Route</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
