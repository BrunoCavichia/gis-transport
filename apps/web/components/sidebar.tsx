"use client";

import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Car,
  Plus,
  Trash2,
  X,
  Package,
  Warehouse,
  Route,
  LayoutDashboard,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  CustomPOI,
  Driver,
  FleetJob,
  FleetVehicle,
  LayerVisibility,
  POI,
  VehicleType,
  RouteData,
} from "@gis/shared";
import type { Alert } from "@/lib/utils";
import { JobsList, VehiclesList } from "@/components/sidebar-items";
import { DriversTab } from "./drivers-tab";
import {
  SidebarLogo,
  NavigationButton,
  ExpandButton,
  FleetHeaderButtons,
  FleetActionButtons,
  FleetFooterButtons,
} from "@/components/sidebar-components";
import { DriverDetailsSheet } from "./driver-details-sheet";

const STABLE_NOOP = () => { };
const STABLE_PROMISE_NOOP = () => Promise.resolve();

import { FleetDashboard } from "@/components/fleet-dashboard";

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
  selectedVehicleId: string | number | null;
  setSelectedVehicleId: (id: string | number | null) => void;
  highlightVehicleOnly?: (id: string | number | null) => void;
  vehicleAlerts?: Record<string | number, Alert[]>;
  addVehicle: () => void;
  addJob: () => void;
  addStopToVehicle?: (
    vehicleId: string | number,
    position: [number, number],
    label?: string,
    eta?: string,
  ) => void;
  addJobDirectly?: (coords: [number, number], label: string) => void;
  removeVehicle: (vehicleId: string | number) => void;
  removeJob: (jobId: string | number) => void;
  cancelAddMode: () => void;
  startRouting: () => void;
  isCalculatingRoute?: boolean;
  setMapCenter: (coords: [number, number]) => void;
  customPOIs?: CustomPOI[];
  removeCustomPOI?: (id: string) => void;
  clearAllCustomPOIs?: () => void;
  showCustomPOIs?: boolean;
  setShowCustomPOIs?: (value: boolean) => void;
  onEditZone?: (zoneId: string) => void;
  isLoadingVehicles?: boolean;
  fetchVehicles?: () => Promise<void>;
  isAddJobOpen?: boolean;
  setIsAddJobOpen?: (value: boolean) => void;
  isAddCustomPOIOpen?: boolean;
  setIsAddCustomPOIOpen?: (value: boolean) => void;
  isLoadingLayers?: boolean;
  isTracking?: boolean;
  toggleTracking?: () => void;
  hasRoute?: boolean;
  isAddStopOpen?: boolean;
  setIsAddStopOpen?: (value: boolean) => void;
  addDriver?: (data: Partial<Driver>) => Promise<Driver | undefined>;
  gasStations?: POI[];
  onStartPickingStop: () => void;
  addMode: "vehicle" | "job" | null;
  isLoadingDrivers?: boolean;
  interactionMode?: string | null;
  fetchDrivers?: () => Promise<void>;
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  drivers?: Driver[];
  onAddStopSubmit?: (coords: [number, number], label: string, eta?: string) => void;
  pickedStopCoords?: [number, number] | null;
  isGasStationLayerVisible?: boolean;
  onToggleGasStationLayer?: () => void;
  onVehicleSelectFromDrivers?: (vehicleId: string) => void;
  onViewDriverProfile?: (driverId: string) => void;
  navigateToTab?: SidebarTab | null;
  navigateToDriverId?: string | null;
  onNavigateConsumed?: () => void;
  routeData?: RouteData | null;
}

export type SidebarTab =
  | "fleet"
  | "layers"
  | "dashboard"
  | "drivers"
  | "settings";

interface NavigationRailProps {
  activeTab: SidebarTab;
  isExpanded: boolean;
  onSetTab: (tab: SidebarTab) => void;
  onToggleExpand: () => void;
  totalAlerts: number;
}

const NavigationRail = memo(
  ({
    activeTab,
    isExpanded,
    onSetTab,
    onToggleExpand,
    totalAlerts,
  }: NavigationRailProps) => (
    <div className="w-14 h-full bg-background/95 backdrop-blur-md border border-border/30 rounded-2xl flex flex-col items-center py-4 gap-3 shadow-lg pointer-events-auto z-[1002] transition-all duration-200">
      <SidebarLogo />

      <NavigationButton
        tabId="fleet"
        activeTab={activeTab}
        isExpanded={isExpanded}
        onClick={onSetTab}
        label="Gestión de Flota"
        icon={Route}
      />

      <NavigationButton
        tabId="layers"
        activeTab={activeTab}
        isExpanded={isExpanded}
        onClick={onSetTab}
        label="Capas y POIs"
        icon={Layers}
      />

      <NavigationButton
        tabId="drivers"
        activeTab={activeTab}
        isExpanded={isExpanded}
        onClick={onSetTab}
        label="Conductores"
        icon={Users}
      />

      <NavigationButton
        tabId="dashboard"
        activeTab={activeTab}
        isExpanded={isExpanded}
        onClick={onSetTab}
        label="Dashboard"
        icon={LayoutDashboard}
        alertCount={totalAlerts}
      />

      <div className="flex-1" />

      <ExpandButton isExpanded={isExpanded} onToggle={onToggleExpand} />
    </div>
  ),
);
NavigationRail.displayName = "NavigationRail";

interface FleetTabProps {
  isLoadingVehicles: boolean;
  fetchVehicles: () => Promise<void>;
  clearFleet: () => void;
  fleetVehicles: FleetVehicle[];
  fleetJobs: FleetJob[];
  vehicleAlerts?: Record<string | number, Alert[]>;
  addVehicle: () => void;
  onAddJobClick: () => void;
  cancelAddMode: () => void;
  selectedVehicleId: string | number | null;
  setSelectedVehicleId: (id: string | number | null) => void;
  removeVehicle: (id: string | number) => void;
  removeJob: (id: string | number) => void;
  startRouting: () => void;
  isCalculatingRoute: boolean;
  isTracking: boolean;
  toggleTracking: () => void;
  hasRoute: boolean;
  isAddStopOpen?: boolean;
  setIsAddStopOpen?: (open: boolean) => void;
  onStartPickingStop?: () => void;
  pickedStopCoords?: [number, number] | null;
  onAddStopSubmit?: (coords: [number, number], label: string) => void;
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  drivers?: Driver[];
  addMode: "vehicle" | "job" | null;
}

const FleetTab = memo(
  ({
    isLoadingVehicles,
    fetchVehicles,
    clearFleet,
    fleetVehicles,
    fleetJobs,
    vehicleAlerts = {},
    addMode,
    addVehicle,
    onAddJobClick,
    cancelAddMode,
    selectedVehicleId,
    setSelectedVehicleId,
    removeVehicle,
    removeJob,
    startRouting,
    isCalculatingRoute,
    isTracking,
    toggleTracking,
    hasRoute,
  }: FleetTabProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedGroups, setExpandedGroups] = useState({
      vehicles: false,
      jobs: false,
    });

    const toggleGroup = (group: "vehicles" | "jobs") => {
      setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
    };

    const filteredVehicles = fleetVehicles.filter(
      (v) =>
        v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const filteredJobs = fleetJobs.filter((j) =>
      j.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
        <div className="p-4 pb-3 flex flex-col gap-3 border-b border-border/10 bg-gradient-to-b from-primary/3 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground leading-none">
                Fleet
              </h2>
              <p className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-wider mt-0.5">
                Gestión de Operaciones
              </p>
            </div>
            <FleetHeaderButtons
              isLoading={isLoadingVehicles}
              hasData={fleetVehicles.length > 0 || fleetJobs.length > 0}
              onRefresh={fetchVehicles}
              onClear={clearFleet}
            />
          </div>

          {/* Compact Search Bar */}
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar vehículo o pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-muted/20 border-border/30 hover:border-primary/15 focus:bg-background transition-all rounded-lg text-xs"
            />
          </div>
        </div>

        <FleetActionButtons
          addMode={addMode}
          isRouting={isCalculatingRoute}
          onAddVehicle={addVehicle}
          onAddJob={onAddJobClick}
        />

        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <div className="space-y-5 pb-6">
            {addMode && (
              <div className="bg-primary text-primary-foreground p-3 rounded-xl flex items-center justify-between shadow-md shadow-primary/15 animate-in fade-in slide-in-from-top-1">
                <span className="text-[10px] font-semibold uppercase tracking-tight">
                  Selecciona el punto en el mapa
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

            {/* Vehicles Group */}
            <div className="space-y-2">
              <button
                onClick={() => toggleGroup("vehicles")}
                className="w-full flex items-center justify-between px-0.5 hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.4)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                    Vehículos ({filteredVehicles.length})
                  </span>
                </div>
                {expandedGroups.vehicles ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              {expandedGroups.vehicles && (
                <div className="max-h-[300px] overflow-y-auto space-y-3 pt-1 pr-1">
                  {filteredVehicles.length === 0 ? (
                    <div className="py-6 text-center bg-muted/15 rounded-xl border border-dashed border-border/30">
                      <Car className="h-6 w-6 text-muted-foreground/15 mx-auto mb-1.5" />
                      <p className="text-[9px] text-muted-foreground/35 font-semibold uppercase tracking-wide">
                        Sin vehículos
                      </p>
                    </div>
                  ) : (
                    <VehiclesList
                      vehicles={filteredVehicles}
                      selectedVehicleId={selectedVehicleId}
                      vehicleAlerts={vehicleAlerts}
                      onSelect={setSelectedVehicleId}
                      onRemove={removeVehicle}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Jobs Group */}
            <div className="space-y-2">
              <button
                onClick={() => toggleGroup("jobs")}
                className="w-full flex items-center justify-between px-0.5 hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                    Pedidos ({filteredJobs.length})
                  </span>
                </div>
                {expandedGroups.jobs ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              {expandedGroups.jobs && (
                <div className="max-h-[300px] overflow-y-auto space-y-3 pt-1 pr-1">
                  {filteredJobs.length === 0 ? (
                    <div className="py-6 text-center bg-muted/15 rounded-xl border border-dashed border-border/30">
                      <Package className="h-6 w-6 text-muted-foreground/15 mx-auto mb-1.5" />
                      <p className="text-[9px] text-muted-foreground/35 font-semibold uppercase tracking-wide">
                        Sin pedidos
                      </p>
                    </div>
                  ) : (
                    <JobsList jobs={filteredJobs} onRemove={removeJob} />
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <FleetFooterButtons
          isRouting={isCalculatingRoute}
          hasData={fleetVehicles.length > 0 && fleetJobs.length > 0}
          hasRoute={hasRoute}
          isTracking={isTracking}
          onStartRouting={startRouting}
          onToggleTracking={toggleTracking}
        />
      </div>
    );
  },
  (prev: FleetTabProps, next: FleetTabProps) => {
    return (
      prev.isLoadingVehicles === next.isLoadingVehicles &&
      prev.fleetVehicles === next.fleetVehicles &&
      prev.fleetJobs === next.fleetJobs &&
      prev.addMode === next.addMode &&
      prev.selectedVehicleId === next.selectedVehicleId &&
      prev.isCalculatingRoute === next.isCalculatingRoute &&
      prev.isTracking === next.isTracking &&
      prev.hasRoute === next.hasRoute &&
      prev.drivers === next.drivers &&
      prev.onAssignDriver === next.onAssignDriver
    );
  },
);
FleetTab.displayName = "FleetTab";

interface LayersTabProps {
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  customPOIs: CustomPOI[];
  onAddPOIClick: () => void;
  removeCustomPOI?: (id: string) => void;
  clearAllCustomPOIs?: () => void;
  onEditZone?: (zoneId: string) => void;
}

const LayersTab = memo(
  ({
    layers,
    toggleLayer,
    customPOIs,
    onAddPOIClick,
    removeCustomPOI,
    clearAllCustomPOIs,
    onEditZone,
  }: LayersTabProps) => {
    // Separate points and zones
    const pointPOIs = useMemo(
      () =>
        customPOIs.filter(
          (poi) => !poi.entityType || poi.entityType === "point",
        ),
      [customPOIs],
    );

    const zonePOIs = useMemo(
      () => customPOIs.filter((poi) => poi.entityType === "zone"),
      [customPOIs],
    );

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
        <div className="p-4 pb-3 flex flex-col gap-1.5 border-b border-border/10 bg-gradient-to-b from-primary/3 to-transparent shrink-0">
          <h2 className="text-lg font-bold tracking-tight text-foreground leading-none">
            Layers
          </h2>
          <p className="text-[9px] uppercase font-semibold text-muted-foreground/50 tracking-wider">
            Personalización del Mapa
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <div className="space-y-6 pb-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-foreground/70 tracking-wide pl-0.5">
                Elementos del Mapa
              </Label>
              <div className="space-y-2 pt-1">
                {Object.entries(layers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30 hover:border-primary/15 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shadow-[0_0_5px]",
                          value
                            ? "bg-primary shadow-primary/40"
                            : "bg-muted shadow-transparent",
                        )}
                      />
                      <span className="text-xs font-medium capitalize text-foreground/85">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </div>
                    <Switch
                      checked={value as boolean}
                      onCheckedChange={() =>
                        toggleLayer(key as keyof LayerVisibility)
                      }
                      className="scale-85 origin-right transition-all data-[state=checked]:bg-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-0.5">
                <Label className="text-[10px] font-semibold uppercase text-foreground/70 tracking-wide">
                  Puntos de Interés
                </Label>
                <Badge
                  variant="outline"
                  className="text-[9px] font-semibold border-primary/15 text-primary h-4 bg-primary/5"
                >
                  {pointPOIs.length}
                </Badge>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start text-[10px] font-semibold uppercase tracking-wide h-9 rounded-lg border-dashed border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={onAddPOIClick}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" /> Nuevo Punto
              </Button>
              {pointPOIs.length > 0 && (
                <div className="max-h-[250px] overflow-y-auto space-y-2 mt-1.5 pr-1">
                  {pointPOIs.map((poi: CustomPOI) => (
                    <div
                      key={poi.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30 hover:border-primary/15 hover:shadow-sm transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3 overflow-hidden relative z-10">
                        <div className="h-8 w-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                          <Warehouse className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {poi.name}
                          </span>
                          <span className="text-[8px] font-medium text-muted-foreground/50 uppercase tracking-tight">
                            {poi.position?.[0].toFixed(4)},{" "}
                            {poi.position?.[1].toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 rounded-md transition-opacity relative z-10"
                        onClick={() => removeCustomPOI?.(poi.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(pointPOIs.length > 0 || zonePOIs.length > 0) && (
                    <div className="pt-3 border-t border-border/10 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-[9px] font-semibold uppercase tracking-wide rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
                        onClick={clearAllCustomPOIs}
                      >
                        Limpiar Todo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Zones Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-0.5">
                <Label className="text-[10px] font-semibold uppercase text-foreground/70 tracking-wide">
                  Zonas Customizadas
                </Label>
                <Badge
                  variant="outline"
                  className="text-[9px] font-semibold border-blue-200 text-blue-600 h-4 bg-blue-50/15"
                >
                  {zonePOIs.length}
                </Badge>
              </div>
              {zonePOIs.length > 0 ? (
                <div className="max-h-[250px] overflow-y-auto space-y-2 mt-1.5 pr-1">
                  {zonePOIs.map((zone: CustomPOI) => (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30 hover:border-blue-200 hover:shadow-sm transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3 overflow-hidden relative z-10">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {zone.name}
                          </span>
                          {zone.description && (
                            <span className="text-[9px] text-muted-foreground/70 line-clamp-1">
                              {zone.description}
                            </span>
                          )}
                          <span className="text-[8px] font-medium text-muted-foreground/50 uppercase tracking-tight">
                            {zone.zoneType || "CUSTOM"} ·{" "}
                            {zone.requiredTags?.length || 0} tags
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-blue-600 rounded-md"
                          onClick={() => onEditZone?.(zone.id)}
                          title="Editar zona"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 rounded-md"
                          onClick={() => removeCustomPOI?.(zone.id)}
                          title="Eliminar zona"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(pointPOIs.length > 0 || zonePOIs.length > 0) && (
                    <div className="pt-3 border-t border-border/10 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-[9px] font-semibold uppercase tracking-wide rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
                        onClick={clearAllCustomPOIs}
                      >
                        Limpiar Todo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/50 p-3 rounded-lg bg-muted/20 text-center">
                  No tienes zonas customizadas
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  },
  (prev: LayersTabProps, next: LayersTabProps) => {
    return prev.layers === next.layers && prev.customPOIs === next.customPOIs;
  },
);
LayersTab.displayName = "LayersTab";

export const Sidebar = memo(
  function Sidebar({
    layers,
    toggleLayer,
    fleetMode,
    setFleetMode,
    clearFleet,
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    setSelectedVehicleId,
    highlightVehicleOnly,
    vehicleAlerts = {},
    addVehicle,
    addStopToVehicle,
    removeVehicle,
    removeJob,
    addMode,
    cancelAddMode,
    startRouting,
    isCalculatingRoute = false,
    customPOIs = [],
    removeCustomPOI,
    clearAllCustomPOIs,
    setIsAddCustomPOIOpen,
    onEditZone,
    isLoadingVehicles = false,
    fetchVehicles,
    setIsAddJobOpen,
    isTracking = false,
    toggleTracking,
    hasRoute = false,
    isAddStopOpen,
    setIsAddStopOpen,
    onStartPickingStop,
    pickedStopCoords,
    gasStations = [],
    onAddStopSubmit,
    drivers = [],
    onAssignDriver,
    isLoadingDrivers = false,
    fetchDrivers,
    addDriver,
    onVehicleSelectFromDrivers,
    onViewDriverProfile,
    navigateToTab,
    navigateToDriverId,
    onNavigateConsumed,
    routeData,
    interactionMode,
  }: SidebarProps) {
    // Local state for sidebar visibility
    const [activeTab, setActiveTabState] = useState<SidebarTab>("fleet");
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
      null,
    );

    // Persisted toggle state for drivers tab dropdowns
    const [driversExpandedGroups, setDriversExpandedGroups] = useState<
      Record<string, boolean>
    >({
      available: false,
      assigned: false,
    });

    const handleToggleDriverGroup = useCallback(
      (group: string, isExpanded: boolean) => {
        setDriversExpandedGroups((prev) => ({ ...prev, [group]: isExpanded }));
      },
      [],
    );

    // Derived state for selected driver (ensures data is always fresh)
    const selectedDriver = useMemo(
      () => (drivers || []).find((d) => d.id === selectedDriverId) || null,
      [drivers, selectedDriverId],
    );

    // Drivers are already fetched in gis-map on mount (independent of fleet)
    // No need to fetch them here based on tab changes

    // Helper to sync tab change with fleet mode
    const setActiveTab = useCallback(
      (tab: SidebarTab) => {
        setActiveTabState(tab);
        if (!isExpanded) {
          setIsExpanded(true);
        }

        // Implicitly handle fleet mode
        if (tab === "fleet") {
          setFleetMode(true);
        }
      },
      [isExpanded, setFleetMode],
    );

    // Sync initial fleet mode
    useEffect(() => {
      if (activeTab === "fleet" && !fleetMode) {
        setFleetMode(true);
      }
    }, [activeTab, fleetMode, setFleetMode]);

    // External navigation: switch tab and optionally select a driver
    useEffect(() => {
      if (navigateToTab) {
        setActiveTab(navigateToTab);
        if (navigateToDriverId) {
          setSelectedDriverId(navigateToDriverId);
        }
        onNavigateConsumed?.();
      }
    }, [navigateToTab, navigateToDriverId, onNavigateConsumed, setActiveTab]);

    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // Derived expansion state based on picking mode
    const finalIsExpanded = useMemo(() => {
      if (interactionMode && interactionMode.startsWith("pick-")) return false;
      return isExpanded;
    }, [isExpanded, interactionMode]);

    const handleShowAddJob = useCallback(() => {
      setIsAddJobOpen?.(true);
    }, [setIsAddJobOpen]);

    const handleShowAddPOI = useCallback(() => {
      setIsAddCustomPOIOpen?.(true);
    }, [setIsAddCustomPOIOpen]);

    // Memoize computed values to prevent unnecessary updates
    const fleetTabHasData = useMemo(
      () => fleetVehicles.length > 0 || fleetJobs.length > 0,
      [fleetVehicles.length, fleetJobs.length],
    );

    // Calculate total number of alerts across all vehicles
    const totalAlerts = useMemo(() => {
      if (!vehicleAlerts) return 0;
      let count = 0;
      Object.values(vehicleAlerts).forEach((alerts) => {
        count += alerts.length;
      });
      return count;
    }, [vehicleAlerts]);

    return (
      <div className="fixed left-3 top-3 z-[1000] flex max-h-[calc(100vh-1.5rem)]">
        <NavigationRail
          activeTab={activeTab}
          isExpanded={finalIsExpanded}
          onSetTab={setActiveTab}
          onToggleExpand={handleToggleExpand}
          totalAlerts={totalAlerts}
        />

        <div
          className={cn(
            "ml-2.5 rounded-2xl border border-border/30 bg-background/95 backdrop-blur-lg shadow-lg transition-all duration-300 ease-out overflow-hidden flex flex-col pointer-events-auto",
            finalIsExpanded
              ? cn(
                "opacity-100 translate-x-0",
                activeTab === "dashboard"
                  ? "w-[calc(100vw-10rem)] h-[calc(100vh-3rem)]"
                  : cn(
                    "h-[calc(100vh-6rem)]",
                    activeTab === "drivers"
                      ? selectedDriver
                        ? "w-80"
                        : "w-80"
                      : "w-72",
                  ),
              )
              : "w-0 opacity-0 -translate-x-8 h-0",
          )}
        >
          {activeTab === "fleet" && (
            <FleetTab
              isLoadingVehicles={isLoadingVehicles}
              fetchVehicles={fetchVehicles ?? STABLE_PROMISE_NOOP}
              clearFleet={clearFleet}
              fleetVehicles={fleetVehicles}
              fleetJobs={fleetJobs}
              addMode={addMode}
              addVehicle={addVehicle}
              onAddJobClick={handleShowAddJob}
              cancelAddMode={cancelAddMode}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              removeVehicle={removeVehicle}
              removeJob={removeJob}
              startRouting={startRouting}
              isCalculatingRoute={isCalculatingRoute}
              isTracking={isTracking ?? false}
              toggleTracking={toggleTracking ?? STABLE_NOOP}
              hasRoute={hasRoute ?? false}
              isAddStopOpen={isAddStopOpen}
              setIsAddStopOpen={setIsAddStopOpen}
              onStartPickingStop={onStartPickingStop}
              pickedStopCoords={pickedStopCoords}
              onAddStopSubmit={onAddStopSubmit}
              drivers={drivers}
              onAssignDriver={onAssignDriver}
              vehicleAlerts={vehicleAlerts}
            />
          )}
          {activeTab === "layers" && (
            <LayersTab
              layers={layers}
              toggleLayer={toggleLayer}
              customPOIs={customPOIs}
              onAddPOIClick={handleShowAddPOI}
              removeCustomPOI={removeCustomPOI}
              clearAllCustomPOIs={clearAllCustomPOIs}
              onEditZone={onEditZone}
            />
          )}
          {activeTab === "drivers" &&
            (selectedDriver ? (
              <DriverDetailsSheet
                driver={selectedDriver}
                onClose={() => setSelectedDriverId(null)}
              />
            ) : (
              <DriversTab
                drivers={drivers || []}
                fleetVehicles={fleetVehicles || []}
                isLoading={isLoadingDrivers || false}
                fetchDrivers={fetchDrivers || (async () => { })}
                addDriver={addDriver || (async () => undefined)}
                onDriverSelect={(d) => setSelectedDriverId(d.id)}
                onVehicleSelect={onVehicleSelectFromDrivers}
                expandedGroups={driversExpandedGroups}
                onToggleGroup={handleToggleDriverGroup}
              />
            ))}
          {activeTab === "dashboard" && (
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              <FleetDashboard
                vehicles={fleetVehicles}
                jobs={fleetJobs}
                gasStations={gasStations}
                vehicleAlerts={vehicleAlerts}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={highlightVehicleOnly || setSelectedVehicleId}
                isGasStationLayerVisible={layers.gasStations}
                onToggleGasStationLayer={() => toggleLayer("gasStations")}
                isTracking={isTracking}
                addStopToVehicle={addStopToVehicle}
                startRouting={startRouting}
                isAddStopOpen={isAddStopOpen}
                setIsAddStopOpen={setIsAddStopOpen}
                onStartPickingStop={onStartPickingStop}
                pickedStopCoords={pickedStopCoords}
                onAddStopSubmit={onAddStopSubmit}
                drivers={drivers}
                onAssignDriver={onAssignDriver}
                routeData={routeData}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev: SidebarProps, next: SidebarProps) => {
    // Custom comparator: only re-render if key props change
    return (
      prev.layers === next.layers &&
      prev.fleetMode === next.fleetMode &&
      prev.fleetVehicles === next.fleetVehicles &&
      prev.fleetJobs === next.fleetJobs &&
      prev.selectedVehicleId === next.selectedVehicleId &&
      prev.vehicleAlerts === next.vehicleAlerts &&
      prev.addMode === next.addMode &&
      prev.isCalculatingRoute === next.isCalculatingRoute &&
      prev.isTracking === next.isTracking &&
      prev.hasRoute === next.hasRoute &&
      prev.customPOIs === next.customPOIs &&
      prev.isLoadingVehicles === next.isLoadingVehicles &&
      prev.isAddStopOpen === next.isAddStopOpen &&
      prev.pickedStopCoords === next.pickedStopCoords &&
      prev.drivers === next.drivers &&
      prev.isLoadingDrivers === next.isLoadingDrivers &&
      prev.onAssignDriver === next.onAssignDriver &&
      prev.gasStations === next.gasStations &&
      prev.navigateToTab === next.navigateToTab &&
      prev.navigateToDriverId === next.navigateToDriverId &&
      prev.interactionMode === next.interactionMode
    );
  },
);
