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
  Pentagon,
  Circle,
} from "lucide-react";
import { AddressSearch } from "@/components/address-search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const MapPreview = dynamic(() => import("@/components/map-preview"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full rounded-2xl bg-muted animate-pulse flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

type EntityMode = "point" | "zone";

interface AddCustomPOIDialogV2Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitPOI: (
    label: string,
    coords: [number, number],
    description?: string,
  ) => void;
  onSubmitZone: (
    label: string,
    coordinates: any,
    description?: string,
    zoneType?: string,
    requiredTags?: string[],
  ) => void;
  onStartPicking?: () => void;
  onStartZonePicking?: () => void;
  onContinueZonePicking?: () => void; // New: for continuing without clearing points
  pickedCoords?: [number, number] | null;
  zonePoints?: [number, number][];
  mapCenter?: [number, number];
  isLoading?: boolean;
}

export function AddCustomPOIDialogV2({
  isOpen,
  onOpenChange,
  onSubmitPOI,
  onSubmitZone,
  onStartPicking,
  onStartZonePicking,
  onContinueZonePicking,
  pickedCoords,
  zonePoints = [],
  mapCenter = MAP_CENTER,
  isLoading = false,
}: AddCustomPOIDialogV2Props) {
  const [mode, setMode] = useState<EntityMode>("point");
  const [step, setStep] = useState(1);
  
  // Point POI fields
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  
  // Zone fields
  const [zoneType, setZoneType] = useState("LEZ");
  const [requiredTags, setRequiredTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Common fields
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Sync picked coordinates for point mode
  useEffect(() => {
    if (mode === "point" && pickedCoords) {
      setLatitude(pickedCoords[0].toString());
      setLongitude(pickedCoords[1].toString());
      setError("");
    }
  }, [pickedCoords, mode]);

  const parsedCoords: [number, number] | null = useMemo(() => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return [lat, lon];
  }, [latitude, longitude]);

  const handleReset = useCallback(() => {
    setStep(1);
    setLatitude("");
    setLongitude("");
    setLabel("");
    setDescription("");
    setError("");
    setZoneType("LEZ");
    setRequiredTags([]);
    setTagInput("");
  }, []);

  const handleCancel = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  const handleAddressSelect = useCallback((coords: [number, number]) => {
    setLatitude(coords[0].toString());
    setLongitude(coords[1].toString());
    setError("");
  }, []);

  const handleModeChange = useCallback((newMode: EntityMode) => {
    setMode(newMode);
    handleReset();
  }, [handleReset]);

  // Point POI flow
  const handleToPreview = useCallback(() => {
    if (!parsedCoords) {
      setError("Please enter valid coordinates");
      return;
    }
    setStep(2);
  }, [parsedCoords]);

  const handleBackToStep1 = useCallback(() => setStep(1), []);

  const handleConfirmLocation = useCallback(() => {
    if (!parsedCoords) {
      setError("Invalid coordinates");
      return;
    }
    setStep(3);
  }, [parsedCoords]);

  const handleBackToStep2 = useCallback(() => setStep(2), []);

  const handleSubmitPoint = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!parsedCoords) {
        setError("Invalid coordinates");
        return;
      }
      onSubmitPOI(label, parsedCoords, description);
      handleReset();
      onOpenChange(false);
    },
    [parsedCoords, label, description, onSubmitPOI, handleReset, onOpenChange],
  );

  // Zone flow
  const handleSubmitZone = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      
      if (zonePoints.length < 3) {
        setError("A zone requires at least 3 points");
        return;
      }

      // Convert points to Leaflet polygon format [[lat, lon], ...]
      const coordinates = zonePoints.map(point => [point[0], point[1]]);
      
      // Close the polygon by adding first point at the end if not already closed
      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push([...firstPoint]);
      }

      onSubmitZone(
        label,
        [coordinates], // Wrap in array for Leaflet Polygon format
        description,
        zoneType,
        requiredTags.length > 0 ? requiredTags : undefined
      );
      
      handleReset();
      onOpenChange(false);
    },
    [zonePoints, label, description, zoneType, requiredTags, onSubmitZone, handleReset, onOpenChange],
  );

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !requiredTags.includes(tag)) {
      setRequiredTags(prev => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, requiredTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setRequiredTags(prev => prev.filter(t => t !== tag));
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Add Custom {mode === "point" ? "POI" : "Zone"}
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                  {mode === "point" ? (
                    <>
                      {step === 1 && "Step 1: Location Selection"}
                      {step === 2 && "Step 2: Confirm Location"}
                      {step === 3 && "Step 3: POI Details"}
                    </>
                  ) : (
                    "Define Custom Zone Polygon"
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Mode Selector */}
            <Tabs value={mode} onValueChange={(v: string) => handleModeChange(v as EntityMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="point" className="flex items-center gap-2">
                  <Circle className="h-3 w-3" />
                  Point POI
                </TabsTrigger>
                <TabsTrigger value="zone" className="flex items-center gap-2">
                  <Pentagon className="h-3 w-3" />
                  Custom Zone
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          {/* Point POI Mode */}
          {mode === "point" && (
            <>
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
                        onChange={(e) => setLatitude(e.target.value)}
                        type="number"
                        step="any"
                        className="h-10 text-sm font-mono"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 ml-1">
                        Longitude
                      </Label>
                      <Input
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        type="number"
                        step="any"
                        className="h-10 text-sm font-mono"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed"
                    onClick={onStartPicking}
                    disabled={isLoading}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Pick from Map
                  </Button>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold">
                      {error}
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="ghost" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleToPreview} disabled={isLoading}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-primary/20">
                    {parsedCoords && <MapPreview coords={parsedCoords} />}
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs font-mono font-bold">
                      {latitude}, {longitude}
                    </p>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={handleBackToStep1}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleConfirmLocation}>
                      Confirm
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={handleSubmitPoint} className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label>POI Name</Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g., Meeting Point"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                      placeholder="Additional details..."
                      className="min-h-[80px]"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold">
                      {error}
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleBackToStep2}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create POI
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}

          {/* Zone Mode */}
          {mode === "zone" && (
            <form onSubmit={handleSubmitZone} className="space-y-6 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Click on the map to add points
                </p>
                <p className="text-xs text-muted-foreground">
                  Points selected: <span className="font-bold">{zonePoints.length}</span>
                  {zonePoints.length < 3 && <span className="text-orange-600 ml-2">(minimum 3 required)</span>}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-dashed"
                onClick={zonePoints.length === 0 ? onStartZonePicking : onContinueZonePicking}
                disabled={isLoading}
              >
                <Pentagon className="h-4 w-4 mr-2" />
                {zonePoints.length === 0 ? "Start Drawing Zone" : "Continue Drawing"}
              </Button>

              <div className="space-y-2">
                <Label>Zone Name</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Restricted Area"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="Zone details..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Zone Type</Label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="LEZ">Low Emission Zone (LEZ)</option>
                  <option value="RESTRICTED">Restricted Zone</option>
                  <option value="CUSTOM">Custom Zone</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Required Vehicle Tags (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="e.g., eco, zero, 0"
                    className="h-10"
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
                {requiredTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {requiredTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-primary/10 rounded-md text-xs font-medium flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || zonePoints.length < 3}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Zone
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
