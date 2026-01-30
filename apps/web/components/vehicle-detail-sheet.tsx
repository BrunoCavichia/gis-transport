"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    Fuel,
    Battery,
    User,
    MapPin,
    Zap,
    Gauge,
    Activity,
    ShieldCheck,
    ArrowLeft,
    AlertTriangle,
    Info,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { FleetVehicle, VehicleMetrics, FleetJob } from "@gis/shared";
import { GeocodingService } from "@/lib/services/geocoding-service";

interface VehicleDetailSheetProps {
    vehicle: FleetVehicle | null;
    metrics: VehicleMetrics | null;
    jobs?: FleetJob[];
    onClose: () => void;
}

export function VehicleDetailSheet({
    vehicle,
    metrics,
    jobs = [],
    onClose,
}: VehicleDetailSheetProps) {
    const [address, setAddress] = useState<string | null>(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Reset local address state when vehicle changes
        setAddress(null);
        setIsLoadingAddress(false);

        const isMoving = (metrics?.speed ?? 0) > 0;

        if (vehicle?.position && isMoving) {
            if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);

            geocodeTimeoutRef.current = setTimeout(async () => {
                setIsLoadingAddress(true);
                try {
                    const resolvedAddress = await GeocodingService.reverse(vehicle.position![0], vehicle.position![1]);
                    setAddress(resolvedAddress);
                } catch (err) {
                    console.error("Geocoding error:", err);
                } finally {
                    setIsLoadingAddress(false);
                }
            }, 10000); // Debounce geocoding for 10s to respect API limits

            return () => {
                if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
            };
        }
    }, [vehicle?.id, metrics?.speed === 0]); // Re-run when vehicle changes OR it stops/starts

    if (!vehicle) return null;

    const isElectric = vehicle.type.id.includes("electric") || vehicle.type.id === "zero" || metrics?.batteryLevel !== undefined;

    const speed = metrics?.speed || 0;
    const maxSpeed = metrics?.maxSpeed;
    const isOverSpeeding = maxSpeed ? speed > maxSpeed : false;
    const energyLevel = (isElectric ? metrics?.batteryLevel : metrics?.fuelLevel) ?? 100;
    const movement = metrics?.movementState || "stopped";

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden animate-in slide-in-from-right-4 duration-300 font-sans text-xs">
            {/* Header - Minimalist */}
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0 bg-background/50 sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1.5 text-muted-foreground hover:text-foreground rounded-full" onClick={onClose}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-none">{vehicle.label}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-70">{vehicle.licensePlate}</span>
                            <span className="text-[9px] text-muted-foreground/30">•</span>
                            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-tighter opacity-70">
                                {isElectric ? "Electric" : "Combustion"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black border tracking-wider",
                    movement === 'on_route' ? "bg-emerald-100/80 text-emerald-800 border-emerald-200" :
                        movement === 'moving' ? "bg-blue-100/80 text-blue-800 border-blue-200" :
                            "bg-zinc-100/80 text-zinc-600 border-zinc-200"
                )}>
                    {movement === 'on_route' ? 'ON ROUTE' : movement === 'moving' ? 'MOVING' : 'STOPPED'}
                </div>
            </div>

            {/* Scrollable Body - High Density */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* Unified Monitor Block (Speed + Location + Energy) */}
                <div className="space-y-1.5">
                    <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                        <ShieldCheck className="h-3 w-3" /> Monitor de Seguridad
                    </h3>

                    <div className={cn(
                        "relative border rounded-xl p-4 shadow-sm min-h-[160px] flex flex-col justify-between overflow-hidden transition-all duration-300",
                        isOverSpeeding ? "bg-red-50/40 border-red-200/60 ring-1 ring-red-500/5" : "bg-card border-border/50"
                    )}>
                        <div className="flex justify-between items-start relative z-10 gap-4">
                            <div className="space-y-3 flex-1 min-w-0">
                                {/* Current Speed */}
                                <div className="space-y-0.5">
                                    <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Velocidad Actual</div>
                                    <div className={cn(
                                        "text-3xl font-black tracking-tighter leading-none",
                                        isOverSpeeding ? "text-red-600" : "text-foreground"
                                    )}>
                                        {speed}
                                        <span className="text-[10px] font-bold text-muted-foreground/40 ml-1 uppercase">km/h</span>
                                    </div>
                                </div>

                                {/* Integrated Location */}
                                <div className="space-y-0.5">
                                    <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Ubicación</div>
                                    <div className={cn(
                                        "text-[10px] font-bold text-foreground leading-tight truncate transition-opacity duration-500",
                                        isLoadingAddress ? "opacity-50 animate-pulse" : "opacity-100"
                                    )}>
                                        {metrics?.address || address || (isLoadingAddress ? "Consultando..." : speed > 0 ? "Detectando vía..." : "Sin movimiento")}
                                    </div>
                                </div>
                            </div>

                            {/* Speed Limit Sign */}
                            <div className="flex flex-col items-end shrink-0">
                                <div className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Límite</div>
                                <div className="relative inline-flex items-center justify-center h-10 w-10 rounded-full border-[3px] border-red-600 bg-white shadow-sm">
                                    <span className="text-base font-black text-zinc-900 leading-none">{maxSpeed || "--"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status/Alert Section - Fixed position at bottom */}
                        <div className="mt-3 relative z-10">
                            {isOverSpeeding ? (
                                <div className="flex items-center gap-2 bg-red-600 text-white px-2.5 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-md">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span className="text-[9px] font-black uppercase tracking-wider">Límite de vía excedido</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/20">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Velocidad dentro de rango legal</span>
                                </div>
                            )}
                        </div>

                        <Zap className={cn(
                            "absolute -top-4 -right-4 h-20 w-20 opacity-[0.02] rotate-12 transition-colors",
                            isOverSpeeding ? "text-red-500" : "text-primary"
                        )} />
                    </div>
                </div>

                {/* Simplified Data Grid (Energy Only) */}
                <div className="space-y-1.5">
                    <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                        <Activity className="h-3 w-3" /> Telemetría
                    </h3>
                    <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm space-y-2 group hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-black text-[9px] uppercase tracking-wider opacity-60">
                                {isElectric ? <Battery className="h-3 w-3 text-blue-500" /> : <Fuel className="h-3 w-3 text-orange-500" />}
                                {isElectric ? 'Estado de Batería' : 'Nivel de Combustible'}
                            </div>
                            <div className="flex items-baseline gap-0.5">
                                <span className={cn("text-lg font-black tracking-tighter", energyLevel < 20 ? "text-red-500" : "text-foreground")}>
                                    {energyLevel}
                                </span>
                                <span className="text-[9px] text-muted-foreground/60 font-black">%</span>
                            </div>
                        </div>
                        <Progress value={energyLevel} className={cn("h-1.5 bg-muted/50 rounded-full", isElectric ? "[&>div]:bg-blue-500" : "[&>div]:bg-orange-500")} />
                    </div>
                </div>

                {/* Operator Profile - Ultra Compact */}
                <div className="bg-card border border-border/50 rounded-xl p-2.5 shadow-sm flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200/50">
                        <User className="h-3.5 w-3.5 text-zinc-500 opacity-60" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-0.5">Conductor</div>
                        <div className="font-bold text-[10px] text-foreground truncate">{vehicle.driver?.name || "No asignado"}</div>
                    </div>
                    <div className="shrink-0 text-right">
                        <div className="text-[7px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-0.5">Licencia</div>
                        <div className="text-[9px] font-mono font-bold text-muted-foreground/70">{vehicle.driver?.licenseNumber || "---"}</div>
                    </div>
                </div>

                <div className="h-2" />
            </div>
        </div>
    );
}
