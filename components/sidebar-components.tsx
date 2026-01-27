"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    Route,
    Layers,
    ChevronLeft,
    Loader2,
    Trash2,
    Plus,
    Navigation,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// --- SidebarLogo ---
export const SidebarLogo = memo(() => (
    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
        <MapPin className="h-6 w-6 text-primary" />
    </div>
), () => true);
SidebarLogo.displayName = "SidebarLogo";

// --- NavigationButton ---
interface NavigationButtonProps {
    tabId: "fleet" | "layers";
    activeTab: "fleet" | "layers" | "settings";
    isExpanded: boolean;
    onClick: (tab: "fleet" | "layers" | "settings") => void;
    label: string;
    icon: React.ElementType;
}

export const NavigationButton = memo(({ tabId, activeTab, isExpanded, onClick, label, icon: Icon }: NavigationButtonProps) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <button
                onClick={() => onClick(tabId)}
                className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative group",
                    activeTab === tabId && isExpanded
                        ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
            >
                <Icon className="h-5 w-5" />
                {activeTab === tabId && isExpanded && tabId === "fleet" && (
                    <span className="absolute -right-1 top-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                )}
            </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-bold ml-2">
            {label}
        </TooltipContent>
    </Tooltip>
), (prev, next) => {
    return prev.activeTab === next.activeTab && prev.isExpanded === next.isExpanded && prev.tabId === next.tabId;
});
NavigationButton.displayName = "NavigationButton";

// --- ExpandButton ---
interface ExpandButtonProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export const ExpandButton = memo(({ isExpanded, onToggle }: ExpandButtonProps) => (
    <button
        onClick={onToggle}
        className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
    >
        <ChevronLeft
            className={cn(
                "h-5 w-5 transition-transform duration-300",
                !isExpanded && "rotate-180",
            )}
        />
    </button>
), (prev, next) => prev.isExpanded === next.isExpanded);
ExpandButton.displayName = "ExpandButton";

// --- FleetHeaderButtons ---
interface FleetHeaderButtonsProps {
    isLoading: boolean;
    hasData: boolean;
    onRefresh: () => void;
    onClear: () => void;
}

export const FleetHeaderButtons = memo(({ isLoading, hasData, onRefresh, onClear }: FleetHeaderButtonsProps) => (
    <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onRefresh} disabled={isLoading}>
            <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClear} disabled={!hasData}>
            <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
    </div>
), (prev, next) => prev.isLoading === next.isLoading && prev.hasData === next.hasData);
FleetHeaderButtons.displayName = "FleetHeaderButtons";

// --- FleetActionButtons ---
interface FleetActionButtonsProps {
    addMode: "vehicle" | "job" | null;
    isRouting: boolean;
    onAddVehicle: () => void;
    onAddJob: () => void;
}

export const FleetActionButtons = memo(({ addMode, isRouting, onAddVehicle, onAddJob }: FleetActionButtonsProps) => (
    <div className="p-3 grid grid-cols-2 gap-2">
        <Button variant={addMode === "vehicle" ? "default" : "secondary"} className="h-10 rounded-xl text-xs font-bold transition-all" onClick={onAddVehicle} disabled={!!addMode || isRouting}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Vehículo
        </Button>
        <Button variant={addMode === "job" ? "default" : "secondary"} className="h-10 rounded-xl text-xs font-bold transition-all" onClick={onAddJob} disabled={!!addMode || isRouting}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Pedido
        </Button>
    </div>
), (prev, next) => prev.addMode === next.addMode && prev.isRouting === next.isRouting);
FleetActionButtons.displayName = "FleetActionButtons";

// --- FleetFooterButtons ---
interface FleetFooterButtonsProps {
    isRouting: boolean;
    hasData: boolean;
    hasRoute: boolean;
    isTracking: boolean;
    onStartRouting: () => void;
    onToggleTracking: () => void;
}

export const FleetFooterButtons = memo(({ isRouting, hasData, hasRoute, isTracking, onStartRouting, onToggleTracking }: FleetFooterButtonsProps) => (
    <div className="p-4 border-t border-border/10 bg-background/50 space-y-2">
        <Button className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98]" onClick={onStartRouting} disabled={!hasData || isRouting}>
            {isRouting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando...</> : <><Route className="h-4 w-4 mr-2" /> Optimizar Rutas</>}
        </Button>
        {hasRoute && (
            <Button
                variant={isTracking ? "destructive" : "secondary"}
                className="w-full h-10 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                onClick={onToggleTracking}
            >
                <Navigation className={cn("h-4 w-4 mr-2", isTracking && "animate-pulse")} />
                {isTracking ? "Detener Tracking" : "Iniciar Live Tracking"}
            </Button>
        )}
    </div>
), (prev, next) => {
    return prev.isRouting === next.isRouting &&
        prev.hasData === next.hasData &&
        prev.hasRoute === next.hasRoute &&
        prev.isTracking === next.isTracking;
});
FleetFooterButtons.displayName = "FleetFooterButtons";
