"use client";

import { MAP_CENTER } from "@/lib/config";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
import {
  MapPin,
  Target,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Map as MapIcon,
  RefreshCw,
} from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import {
  Step1ContentProps,
  Step2ContentProps,
  Step3ContentProps,
} from "@/lib/types";

// Lazy load solo cuando sea necesario
const MapPreview = dynamic(() => import("@/components/map-preview"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full rounded-2xl bg-muted animate-pulse flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface AddCustomPOIDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    label: string,
    coords: [number, number],
    description?: string,
  ) => void;
  onStartPicking?: () => void;
  pickedCoords?: [number, number] | null;
  mapCenter?: [number, number];
  isLoading?: boolean;
}

const Step1Content = memo(
  ({
    latitude,
    longitude,
    isLoading,
    error,
    onLatitudeChange,
    onLongitudeChange,
    onAddressSelect,
    onPickFromMap,
    onCancel,
    onNext,
  }: Step1ContentProps) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Search Address
        </Label>
        <AddressSearch
          onSelectLocation={onAddressSelect}
          placeholder="Enter destination address..."
          className="w-full shadow-sm"
        />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
          <span className="bg-background px-3 text-muted-foreground/50">
            Or coordinate precision
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 ml-1">
            Latitude
          </Label>
          <Input
            value={latitude}
            onChange={(e) => onLatitudeChange(e.target.value)}
            type="number"
            step="any"
            className="h-10 text-sm font-mono border-muted bg-muted/30 focus:bg-background transition-all"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 ml-1">
            Longitude
          </Label>
          <Input
            value={longitude}
            onChange={(e) => onLongitudeChange(e.target.value)}
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
        onClick={onPickFromMap}
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
          onClick={onCancel}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="min-w-[120px] font-bold shadow-lg shadow-primary/20"
        >
          Ready
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step1Content.displayName = "Step1Content";

const Step2Content = memo(
  ({
    latitude,
    longitude,
    parsedCoords,
    isLoading,
    onBack,
    onNext,
  }: Step2ContentProps) => (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted shadow-inner group">
        {parsedCoords && <MapPreview coords={parsedCoords} />}
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
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
            Confirm Coordinates
          </p>
          <p className="text-xs font-mono font-bold text-foreground/80">
            {latitude}, {longitude}
          </p>
        </div>
      </div>

      <DialogFooter className="pt-2 gap-3 flex-col sm:flex-row">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 h-12 border-dashed hover:bg-muted font-medium transition-all"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Change Localization
        </Button>
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="flex-1 h-12 font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Ready
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step2Content.displayName = "Step2Content";

const Step3Content = memo(
  ({
    label,
    description,
    latitude,
    longitude,
    isLoading,
    onLabelChange,
    onDescriptionChange,
    onBack,
    onSubmit,
  }: Step3ContentProps) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="poi-label" className="text-sm font-semibold">
            POI Reference Name
          </Label>
          <Input
            id="poi-label"
            placeholder="e.g., Restaurant A, Warehouse 4..."
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            disabled={isLoading}
            className="h-12 text-base font-medium"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="poi-desc" className="text-sm font-semibold">
            Description (Optional)
          </Label>
          <Input
            id="poi-desc"
            placeholder="Additional details..."
            value={description}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            disabled={isLoading}
            className="h-12 text-base font-medium"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-4 opacity-70">
        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
          <Target className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
            Locked Position
          </p>
          <p className="text-xs font-mono font-bold text-foreground/80">
            {latitude}, {longitude}
          </p>
        </div>
      </div>

      <DialogFooter className="pt-2 gap-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Review Map
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isLoading}
          className="flex-1 font-bold shadow-lg shadow-primary/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...
            </>
          ) : (
            "Finalize & Add"
          )}
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step3Content.displayName = "Step3Content";

export const AddCustomPOIDialog = memo(function AddCustomPOIDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onStartPicking,
  pickedCoords,
  mapCenter = MAP_CENTER,
  isLoading = false,
}: AddCustomPOIDialogProps) {
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(mapCenter[0].toString());
  const [longitude, setLongitude] = useState(mapCenter[1].toString());
  const [error, setError] = useState<string | null>(null);

  // Sync coords when picked from map
  useEffect(() => {
    if (pickedCoords) {
      setLatitude(pickedCoords[0].toFixed(6));
      setLongitude(pickedCoords[1].toFixed(6));
      setStep(2);
    }
  }, [pickedCoords]);

  // Memoizar coordenadas parseadas
  const parsedCoords = useMemo(() => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    return !isNaN(lat) && !isNaN(lon) ? ([lat, lon] as [number, number]) : null;
  }, [latitude, longitude]);

  // Callbacks memoizados para evitar re-renders en componentes hijo
  const handleToPreview = useCallback(() => {
    if (!parsedCoords) {
      setError("Please enter valid coordinates");
      return;
    }
    setError(null);
    setStep(2);
  }, [parsedCoords]);

  const handleConfirmLocation = useCallback(() => {
    setStep(3);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!parsedCoords) return;

    setError(null);
    onSubmit(label.trim(), parsedCoords, description.trim());

    // Reset
    setLabel("");
    setDescription("");
    setLatitude(mapCenter[0].toString());
    setLongitude(mapCenter[1].toString());
    setStep(1);
    setError(null);
  }, [parsedCoords, label, description, onSubmit, mapCenter]);

  const handleAddressSelect = useCallback(
    (coords: [number, number], address: string) => {
      setLatitude(coords[0].toFixed(6));
      setLongitude(coords[1].toFixed(6));
    },
    [],
  );

  const handleCloseChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep(1);
        setError(null);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const handleCancel = useCallback(
    () => handleCloseChange(false),
    [handleCloseChange],
  );
  const handleBackToStep1 = useCallback(() => setStep(1), []);
  const handleBackToStep2 = useCallback(() => setStep(2), []);

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Add Custom POI
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                  {step === 1 && "Step 1: Location Selection"}
                  {step === 2 && "Step 2: Confirm Location"}
                  {step === 3 && "Step 3: POI Details"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {step === 1 && (
            <Step1Content
              latitude={latitude}
              longitude={longitude}
              isLoading={isLoading}
              error={error}
              onLatitudeChange={setLatitude}
              onLongitudeChange={setLongitude}
              onAddressSelect={handleAddressSelect}
              onPickFromMap={onStartPicking}
              onCancel={handleCancel}
              onNext={handleToPreview}
            />
          )}

          {step === 2 && (
            <Step2Content
              latitude={latitude}
              longitude={longitude}
              parsedCoords={parsedCoords}
              isLoading={isLoading}
              onBack={handleBackToStep1}
              onNext={handleConfirmLocation}
            />
          )}

          {step === 3 && (
            <Step3Content
              label={label}
              description={description}
              latitude={latitude}
              longitude={longitude}
              isLoading={isLoading}
              onLabelChange={setLabel}
              onDescriptionChange={setDescription}
              onBack={handleBackToStep2}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
