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

const STABLE_NOOP = () => {};
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
  vehicleAlerts?: Record<string | number, Alert[]>;
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
  setIsAddStopOpen?: (value: boolean) => void;
  addDriver?: (data: Partial<Driver>) => Promise<Driver | undefined>;
  gasStations?: POI[];
  onStartPickingStop: () => void;
  addMode: "vehicle" | "job" | null;
  isLoadingDrivers?: boolean;
  fetchDrivers?: () => Promise<void>;
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  drivers?: Driver[];
  onAddStopSubmit?: (coords: [number, number], label: string) => void;
  pickedStopCoords?: [number, number] | null;
  isGasStationLayerVisible?: boolean;
  onToggleGasStationLayer?: () => void;
}

type SidebarTab = "fleet" | "layers" | "dashboard" | "drivers" | "settings";

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
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <div className="p-6 pb-4 flex flex-col gap-5 border-b border-border/10 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter text-foreground leading-none">
                FLEET
              </h2>
              <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] mt-1 ml-0.5">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar vehículo o pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/30 border-border/40 hover:border-primary/20 focus:bg-background transition-all rounded-xl text-xs"
            />
          </div>
        </div>

        <FleetActionButtons
          addMode={addMode}
          isRouting={isCalculatingRoute}
          onAddVehicle={addVehicle}
          onAddJob={onAddJobClick}
        />

        <ScrollArea className="flex-1 min-h-0 px-5 py-4">
          <div className="space-y-8 pb-8">
            {addMode && (
              <div className="bg-primary text-primary-foreground p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-primary/20 animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-black uppercase tracking-tight">
                  Selecciona el punto en el mapa
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                  onClick={cancelAddMode}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Vehicles Group */}
            <div className="space-y-3">
              <button
                onClick={() => toggleGroup("vehicles")}
                className="w-full flex items-center justify-between px-1 hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground/70">
                    Vehículos Activos ({filteredVehicles.length})
                  </span>
                </div>
                {expandedGroups.vehicles ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedGroups.vehicles && (
                <div className="space-y-4 pt-1">
                  {filteredVehicles.length === 0 ? (
                    <div className="py-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/40">
                      <Car className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
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
            <div className="space-y-3">
              <button
                onClick={() => toggleGroup("jobs")}
                className="w-full flex items-center justify-between px-1 hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground/70">
                    Lista de Pedidos ({filteredJobs.length})
                  </span>
                </div>
                {expandedGroups.jobs ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedGroups.jobs && (
                <div className="space-y-4 pt-1">
                  {filteredJobs.length === 0 ? (
                    <div className="py-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/40">
                      <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
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
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="p-6 pb-4 flex flex-col gap-2 border-b border-border/10 bg-gradient-to-b from-primary/5 to-transparent">
        <h2 className="text-2xl font-black italic tracking-tighter text-foreground leading-none">
          LAYERS
        </h2>
        <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] mt-1 ml-0.5">
          Personalización del Mapa
        </p>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-5 py-4">
        <div className="space-y-10 pb-8">
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase text-foreground/70 tracking-widest pl-1">
              Elementos del Mapa
            </Label>
            <div className="space-y-3 pt-1">
              {Object.entries(layers).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shadow-[0_0_8px]",
                        value
                          ? "bg-primary shadow-primary/50"
                          : "bg-muted shadow-transparent",
                      )}
                    />
                    <span className="text-[13px] font-bold capitalize text-foreground/90">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </div>
                  <Switch
                    checked={value as boolean}
                    onCheckedChange={() =>
                      toggleLayer(key as keyof LayerVisibility)
                    }
                    className="scale-90 origin-right transition-all data-[state=checked]:bg-primary"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between pl-1">
              <Label className="text-[11px] font-black uppercase text-foreground/70 tracking-widest">
                Puntos de Interés
              </Label>
              <Badge
                variant="outline"
                className="text-[10px] font-black border-primary/20 text-primary h-5 bg-primary/5"
              >
                {customPOIs.length}
              </Badge>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-[11px] font-black uppercase tracking-wider h-11 rounded-xl border-dashed border-2 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={onAddPOIClick}
            >
              <Plus className="h-4 w-4 mr-2 text-primary" /> Nuevo Punto de
              Gestión
            </Button>
            {customPOIs.length > 0 && (
              <div className="space-y-3 mt-2">
                {customPOIs.map((poi: CustomPOI) => (
                  <div
                    key={poi.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 overflow-hidden relative z-10">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                        <Warehouse className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-black text-foreground truncate">
                          {poi.name}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                          GPS: {poi.position?.[0].toFixed(4)},{" "}
                          {poi.position?.[1].toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 rounded-lg transition-opacity relative z-10"
                      onClick={() => removeCustomPOI?.(poi.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="pt-4 border-t border-border/10 mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
                    onClick={clearAllCustomPOIs}
                  >
                    Limpiar Todo
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
  }: SidebarProps) {
    // Local state for sidebar visibility
    const [activeTab, setActiveTabState] = useState<SidebarTab>("fleet");
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
      null,
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

    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

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
      <div className="fixed left-4 top-4 z-[1000] flex max-h-[calc(100vh-2rem)]">
        <NavigationRail
          activeTab={activeTab}
          isExpanded={isExpanded}
          onSetTab={setActiveTab}
          onToggleExpand={handleToggleExpand}
          totalAlerts={totalAlerts}
        />

        <div
          className={cn(
            "ml-3 rounded-3xl border border-white/20 bg-background/90 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden flex flex-col pointer-events-auto h-auto max-h-full",
            isExpanded
              ? cn(
                  "opacity-100 translate-x-0",
                  activeTab === "dashboard"
                    ? selectedVehicleId !== null
                      ? "w-[40rem]" // Increased from 32rem
                      : fleetVehicles.length > 3
                        ? "w-[36rem]" // Increased from 28rem
                        : "w-96" // Increased from w-80 (24rem)
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
                fetchDrivers={fetchDrivers || (async () => {})}
                addDriver={addDriver || (async () => undefined)}
                onDriverSelect={(d) => setSelectedDriverId(d.id)}
              />
            ))}
          {activeTab === "dashboard" && (
            <ScrollArea className="flex-1 h-auto min-h-0 min-w-0">
              <FleetDashboard
                vehicles={fleetVehicles}
                jobs={fleetJobs}
                gasStations={gasStations}
                vehicleAlerts={vehicleAlerts}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={setSelectedVehicleId}
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
      prev.gasStations === next.gasStations
    );
  },
);
