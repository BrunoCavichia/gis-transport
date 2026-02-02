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
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  LayerVisibility,
  VehicleType,
  CustomPOI,
  FleetJob,
  FleetVehicle,
} from "@gis/shared";
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
  addVehicle: () => void;
  addJob: () => void;
  addStopToVehicle?: (
    vehicleId: string | number,
    position: [number, number],
    label?: string,
  ) => void;
  addJobDirectly?: (coords: [number, number], label: string) => void;
  removeVehicle: (vehicleId: string | number) => void;
  removeJob: (jobId: string | number) => void;
  addMode: "vehicle" | "job" | null;
  cancelAddMode: () => void;
  startRouting: () => void;
  isCalculatingRoute?: boolean;
  setMapCenter: (coords: [number, number]) => void;
  customPOIs?: CustomPOI[];
  removeCustomPOI?: (id: string) => void;
  clearAllCustomPOIs?: () => void;
  showCustomPOIs?: boolean;
  setShowCustomPOIs?: (value: boolean) => void;
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
  setIsAddStopOpen?: (open: boolean) => void;
  onStartPickingStop?: () => void;
  pickedStopCoords?: [number, number] | null;
  onAddStopSubmit?: (coords: [number, number], label: string) => void;
  drivers?: any[];
  onAssignDriver?: (vehicleId: string | number, driver: any) => void;
  isLoadingDrivers?: boolean;
  fetchDrivers?: () => Promise<void>;
  addDriver?: (data: Partial<any>) => Promise<any>;
}

type SidebarTab = "fleet" | "layers" | "dashboard" | "drivers" | "settings";

interface NavigationRailProps {
  activeTab: SidebarTab;
  isExpanded: boolean;
  onSetTab: (tab: SidebarTab) => void;
  onToggleExpand: () => void;
}

const NavigationRail = memo(
  ({
    activeTab,
    isExpanded,
    onSetTab,
    onToggleExpand,
  }: NavigationRailProps) => (
    <div className="w-16 h-full bg-background/95 backdrop-blur-md border border-white/20 rounded-3xl flex flex-col items-center py-6 gap-4 shadow-xl pointer-events-auto z-[1002] transition-all duration-300">
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
  addMode: "vehicle" | "job" | null;
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
  drivers?: any[];
  onAssignDriver?: (vehicleId: string | number, driver: any) => void;
}

const FleetTab = memo(
  ({
    isLoadingVehicles,
    fetchVehicles,
    clearFleet,
    fleetVehicles,
    fleetJobs,
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
    isAddStopOpen,
    setIsAddStopOpen,
    onStartPickingStop,
    pickedStopCoords,
    onAddStopSubmit,
    drivers,
    onAssignDriver,
  }: FleetTabProps) => (
    <div className="flex flex-col h-auto min-h-0 min-w-0">
      <div className="p-5 border-b border-border/10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black tracking-tight text-foreground">
            Flota
          </h2>
          <FleetHeaderButtons
            isLoading={isLoadingVehicles}
            hasData={fleetVehicles.length > 0 || fleetJobs.length > 0}
            onRefresh={fetchVehicles}
            onClear={clearFleet}
          />
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Gestión de rutas y vehículos
        </p>
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

      <FleetActionButtons
        addMode={addMode}
        isRouting={isCalculatingRoute}
        onAddVehicle={addVehicle}
        onAddJob={onAddJobClick}
      />

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
              <VehiclesList
                vehicles={fleetVehicles}
                selectedVehicleId={selectedVehicleId}
                onSelect={setSelectedVehicleId}
                onRemove={removeVehicle}
              />
            )}
          </div>
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
              <JobsList jobs={fleetJobs} onRemove={removeJob} />
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
  ),
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
}

const LayersTab = memo(
  ({
    layers,
    toggleLayer,
    customPOIs,
    onAddPOIClick,
    removeCustomPOI,
    clearAllCustomPOIs,
  }: LayersTabProps) => (
    <div className="flex flex-col h-auto min-h-0 min-w-0">
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
                  checked={value as boolean}
                  onCheckedChange={() =>
                    toggleLayer(key as keyof LayerVisibility)
                  }
                  className="scale-75 origin-right"
                />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Puntos de Interés
              </Label>
              <Badge variant="secondary" className="text-[10px] font-bold h-5">
                {customPOIs.length}
              </Badge>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-xs font-bold h-10 rounded-xl"
              onClick={onAddPOIClick}
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> Nuevo Punto
            </Button>
            {customPOIs.length > 0 && (
              <div className="space-y-2 mt-2">
                {customPOIs.map((poi: CustomPOI) => (
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
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  ),
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
    onAddStopSubmit,
    drivers = [],
    onAssignDriver,
    isLoadingDrivers = false,
    fetchDrivers,
    addDriver,
  }: SidebarProps) {

    // Local state for sidebar visibility
    const [activeTab, setActiveTabState] = useState<SidebarTab>("fleet");
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

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
        if (!isExpanded) setIsExpanded(true);

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

    const handleToggleExpand = useCallback(
      () => setIsExpanded((prev) => !prev),
      [],
    );

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

    return (
      <div className="fixed left-4 top-4 z-[1000] flex pointer-events-none max-h-[calc(100vh-2rem)]">
        <NavigationRail
          activeTab={activeTab}
          isExpanded={isExpanded}
          onSetTab={setActiveTab}
          onToggleExpand={handleToggleExpand}
        />

        <div
          className={cn(
            "ml-3 rounded-3xl border border-white/20 bg-background/90 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden flex flex-col pointer-events-auto h-auto max-h-full",
            isExpanded
              ? cn(
                "opacity-100 translate-x-0",
                activeTab === "dashboard"
                  ? selectedVehicleId !== null
                    ? "w-[32rem]"
                    : fleetVehicles.length > 3
                      ? "w-[28rem]"
                      : "w-80"
                  : "w-80",
              )
              : "w-0 opacity-0 -translate-x-10",
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
            />
          )}
          {activeTab === "drivers" && (
            selectedDriver ? (
              <DriverDetailsSheet
                driver={selectedDriver}
                onClose={() => setSelectedDriverId(null)}
              />
            ) : (
              <DriversTab
                drivers={drivers || []}
                isLoading={isLoadingDrivers || false}
                fetchDrivers={fetchDrivers || (async () => { })}
                addDriver={addDriver || (async () => undefined)}
                onDriverSelect={(d) => setSelectedDriverId(d.id)}
              />
            )
          )}
          {activeTab === "dashboard" && (
            <ScrollArea className="flex-1 h-auto min-h-0 min-w-0">
              <FleetDashboard
                vehicles={fleetVehicles}
                jobs={fleetJobs}
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
              />
            </ScrollArea>
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
      prev.onAssignDriver === next.onAssignDriver
    );
  },
);
