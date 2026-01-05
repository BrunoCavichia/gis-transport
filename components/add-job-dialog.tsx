"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Package, Target, MapPin, Loader2, ChevronRight, ChevronLeft, Map as MapIcon, RefreshCw } from "lucide-react";
import { AddressSearch } from "@/components/address-search";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

interface AddJobDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (coords: [number, number], label: string) => void;
    onStartPicking?: () => void;
    pickedCoords?: [number, number] | null;
    mapCenter?: [number, number];
    isLoading?: boolean;
}

export function AddJobDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    onStartPicking,
    pickedCoords,
    mapCenter = [40.4168, -3.7038],
    isLoading = false,
}: AddJobDialogProps) {
    const [step, setStep] = useState(1);
    const [label, setLabel] = useState("");
    const [latitude, setLatitude] = useState(mapCenter[0].toString());
    const [longitude, setLongitude] = useState(mapCenter[1].toString());
    const [error, setError] = useState<string | null>(null);

    // Sync coords when picked from map
    useEffect(() => {
        if (pickedCoords) {
            setLatitude(pickedCoords[0].toFixed(6));
            setLongitude(pickedCoords[1].toFixed(6));
            setStep(2); // Automatically show preview when map-picked
        }
    }, [pickedCoords]);

    const handleToPreview = () => {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon)) {
            setError("Please enter valid coordinates");
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleConfirmLocation = () => {
        setStep(3);
    };

    const handleSubmit = () => {
        setError(null);
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        onSubmit([lat, lon], label.trim());

        // Reset
        setLabel("");
        setLatitude(mapCenter[0].toString());
        setLongitude(mapCenter[1].toString());
        setStep(1);
        setError(null);
    };

    const handlePickFromMap = () => {
        if (onStartPicking) {
            onStartPicking();
        }
    };

    const handleAddressSelect = (coords: [number, number], address: string) => {
        setLatitude(coords[0].toFixed(6));
        setLongitude(coords[1].toFixed(6));
    };

    const handleCloseChange = (open: boolean) => {
        if (!open) {
            setStep(1);
            setError(null);
        }
        onOpenChange(open);
    };

    const parsedCoords = useMemo(() => {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        return !isNaN(lat) && !isNaN(lon) ? [lat, lon] as [number, number] : null;
    }, [latitude, longitude]);

    return (
        <Dialog open={isOpen} onOpenChange={handleCloseChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Add New Job</DialogTitle>
                                <DialogDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                                    {step === 1 && "Step 1: Location Selection"}
                                    {step === 2 && "Step 2: Confirm Location"}
                                    {step === 3 && "Step 3: Job Details"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    Search Address
                                </Label>
                                <AddressSearch
                                    onSelectLocation={handleAddressSelect}
                                    placeholder="Enter destination address..."
                                    className="w-full shadow-sm"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                                    <span className="bg-background px-3 text-muted-foreground/50">Or coordinate precision</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 ml-1">Latitude</Label>
                                    <Input
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        type="number"
                                        step="any"
                                        className="h-10 text-sm font-mono border-muted bg-muted/30 focus:bg-background transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 ml-1">Longitude</Label>
                                    <Input
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        type="number"
                                        step="any"
                                        className="h-10 text-sm font-mono border-muted bg-muted/30 focus:bg-background transition-all"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all group"
                                onClick={handlePickFromMap}
                                disabled={isLoading}
                            >
                                <Target className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                                Pinpoint exactly on Map
                            </Button>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => handleCloseChange(false)}
                                    disabled={isLoading}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleToPreview}
                                    disabled={isLoading}
                                    className="min-w-[120px] font-bold shadow-lg shadow-primary/20"
                                >
                                    Ready
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted shadow-inner group">
                                {parsedCoords && (
                                    <MapContainer
                                        center={parsedCoords}
                                        zoom={15}
                                        scrollWheelZoom={false}
                                        zoomControl={false}
                                        dragging={false}
                                        touchZoom={false}
                                        doubleClickZoom={false}
                                        className="h-full w-full grayscale-[0.2]"
                                    >
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={parsedCoords} />
                                    </MapContainer>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <div className="px-2 py-1 bg-background/90 backdrop-blur-md rounded-lg border border-border/50 shadow-sm flex items-center gap-1.5">
                                        <MapIcon className="h-3 w-3 text-primary" />
                                        <span className="text-[10px] font-bold">Static Preview</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                                    <Target className="h-5 w-5 text-primary/70" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">Confirm Coordinates</p>
                                    <p className="text-xs font-mono font-bold text-foreground/80">
                                        {latitude}, {longitude}
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="pt-2 gap-3 flex-col sm:flex-row">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    disabled={isLoading}
                                    className="flex-1 h-12 border-dashed hover:bg-muted font-medium transition-all"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Change Localization
                                </Button>
                                <Button
                                    onClick={handleConfirmLocation}
                                    disabled={isLoading}
                                    className="flex-1 h-12 font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Ready
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="job-label" className="text-sm font-semibold">Job Reference Name *</Label>
                                <Input
                                    id="job-label"
                                    placeholder="e.g., Client A Delivery, Zone 4 Pickup..."
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    disabled={isLoading}
                                    className="h-12 text-base font-medium"
                                    autoFocus
                                />
                                <p className="text-[10px] text-muted-foreground/70 ml-1 italic">
                                    Assign a recognizable name for this job in the fleet list.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-4 opacity-70">
                                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                                    <Target className="h-5 w-5 text-muted-foreground/60" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">Locked Position</p>
                                    <p className="text-xs font-mono font-bold text-foreground/80">
                                        {latitude}, {longitude}
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="pt-2 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Review Map
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !label.trim()}
                                    className="flex-1 font-bold shadow-lg shadow-primary/25"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
                                    ) : (
                                        "Finalize & Add"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
