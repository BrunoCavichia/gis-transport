"use client";

import { MAP_CENTER } from "@/lib/config";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  FormEvent,
} from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_TYPES } from "@/lib/types";

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
  onContinueZonePicking?: () => void;
  pickedCoords?: [number, number] | null;
  zonePoints?: [number, number][];
  mapCenter?: [number, number];
  isLoading?: boolean;
  isDrawingZone?: boolean;
  isEditingZone?: boolean;
  editingZoneData?: {
    id: string;
    name: string;
    description?: string;
    zoneType?: string;
    requiredTags?: string[];
  } | null;
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
  isLoading = false,
  isDrawingZone = false,
  isEditingZone = false,
  editingZoneData = null,
}: AddCustomPOIDialogV2Props) {
  const [mode, setMode] = useState<EntityMode>("point");
  const [step, setStep] = useState(1);

  // Point POI fields
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Zone fields
  const [zoneType] = useState("CUSTOM");
  const [requiredTags, setRequiredTags] = useState<string[]>([]);

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

  // Pre-fill form when editing a zone
  useEffect(() => {
    if (editingZoneData) {
      setMode("zone");
      setLabel(editingZoneData.name);
      setDescription(editingZoneData.description || "");
      setRequiredTags(editingZoneData.requiredTags || []);
    }
  }, [editingZoneData]);

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
    setRequiredTags([]);
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

  const handleModeChange = useCallback(
    (newMode: EntityMode) => {
      setMode(newMode);
      handleReset();
    },
    [handleReset],
  );

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
    (e: FormEvent<HTMLFormElement>) => {
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
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (zonePoints.length < 3) {
        setError("A zone requires at least 3 points");
        return;
      }

      // Convert points to Leaflet polygon format [[lat, lon], ...]
      const coordinates = zonePoints.map((point) => [point[0], point[1]]);

      // Close the polygon by adding first point at the end if not already closed
      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push([...firstPoint]);
      }

      onSubmitZone(
        label,
        [[coordinates]], // Wrap in double array for MultiPolygon 4D format (matches API zones)
        description,
        zoneType,
        requiredTags.length > 0 ? requiredTags : undefined,
      );

      handleReset();
      onOpenChange(false);
    },
    [
      zonePoints,
      label,
      description,
      zoneType,
      requiredTags,
      onSubmitZone,
      handleReset,
      onOpenChange,
    ],
  );

  const handleToggleTag = useCallback((tag: string) => {
    setRequiredTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
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
                  {editingZoneData
                    ? "Editar Zona de Gestión"
                    : `Add Custom ${mode === "point" ? "POI" : "Zone"}`}
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
            <Tabs
              value={mode}
              onValueChange={(v: string) => handleModeChange(v as EntityMode)}
            >
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
                        className="h-10 text-sm font-mono bg-muted/30 border-border/50 focus:bg-background transition-all"
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
                        className="h-10 text-sm font-mono bg-muted/30 border-border/50 focus:bg-background transition-all"
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
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted shadow-inner group">
                    {parsedCoords && <MapPreview coords={parsedCoords} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <div className="px-2 py-1 bg-background/90 backdrop-blur-md rounded-lg border border-border/50 shadow-sm flex items-center gap-1.5">
                        <MapIcon className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold">
                          Vista Previa
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                      <MapPin className="h-5 w-5 text-primary/70" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                        Confirmar Coordenadas
                      </p>
                      <p className="text-xs font-mono font-bold text-foreground/80">
                        {latitude}, {longitude}
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="pt-2 gap-3 flex-col sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={handleBackToStep1}
                      className="flex-1 h-12 border-dashed hover:bg-muted font-medium transition-all"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Cambiar Ubicación
                    </Button>
                    <Button
                      onClick={handleConfirmLocation}
                      className="flex-1 h-12 font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {step === 3 && (
                <form
                  onSubmit={handleSubmitPoint}
                  className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="poi-label"
                        className="text-sm font-semibold"
                      >
                        Nombre del POI
                      </Label>
                      <Input
                        id="poi-label"
                        placeholder="Ej: Restaurante A, Almacén 4..."
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="h-12 text-base font-medium bg-muted/30 border-border/50 focus:bg-background transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="poi-desc"
                        className="text-sm font-semibold"
                      >
                        Descripción (Opcional)
                      </Label>
                      <Input
                        id="poi-desc"
                        placeholder="Detalles adicionales..."
                        value={description}
                        onChange={(e) => setDescription?.(e.target.value)}
                        className="h-12 text-base font-medium bg-muted/30 border-border/50 focus:bg-background transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-4 opacity-70">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                      <MapPin className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                        Ubicación Bloqueada
                      </p>
                      <p className="text-xs font-mono font-bold text-foreground/80">
                        {latitude}, {longitude}
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <DialogFooter className="pt-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToStep2}
                      className="flex-1 h-12 border-dashed hover:bg-muted font-medium transition-all"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Revisar Mapa
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-12 font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Agregando...
                        </>
                      ) : (
                        "Finalizar y Crear"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}

          {/* Zone Mode */}
          {mode === "zone" && (
            <>
              {!isDrawingZone ? (
                // Show form when not actively drawing
                <form
                  onSubmit={handleSubmitZone}
                  className="space-y-6 animate-in fade-in duration-300"
                >
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                      <Pentagon className="h-5 w-5 text-primary/70" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                        Puntos Recopilados
                      </p>
                      <p className="text-sm font-bold text-foreground/80">
                        {zonePoints.length}{" "}
                        <span className="text-xs font-semibold text-muted-foreground">
                          {zonePoints.length < 3 ? `/ 3 mínimo` : "/ Listo"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all group"
                    onClick={
                      zonePoints.length === 0
                        ? onStartZonePicking
                        : onContinueZonePicking
                    }
                    disabled={isLoading}
                  >
                    <Pentagon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    {zonePoints.length === 0
                      ? "Comenzar a Dibujar"
                      : "Continuar Dibujando"}
                  </Button>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Nombre de la Zona
                    </Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Ej: Zona Restringida, LEZ Madrid..."
                      className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Descripción (Opcional)
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDescription(e.target.value)
                      }
                      placeholder="Detalles sobre la zona..."
                      className="min-h-[80px] bg-muted/30 border-border/50 focus:bg-background transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Etiquetas Ambientales Permitidas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Solo los vehículos con al menos una de estas etiquetas
                      podrán acceder a la zona.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        // Derive unique tags with labels from VEHICLE_TYPES
                        const TAG_LABELS: Record<string, string> = {
                          "0": "Zero Emisiones (0)",
                          eco: "ECO",
                          zero: "ZERO",
                          b: "Etiqueta B",
                          c: "Etiqueta C",
                        };
                        const uniqueTags = Array.from(
                          new Set(VEHICLE_TYPES.flatMap((v) => v.tags)),
                        );
                        return uniqueTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`h-10 px-3 rounded-lg border text-sm font-semibold transition-all ${
                              requiredTags.includes(tag)
                                ? "bg-primary/15 border-primary/40 text-primary ring-1 ring-primary/20"
                                : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-border"
                            }`}
                          >
                            {TAG_LABELS[tag] || tag}
                          </button>
                        ));
                      })()}
                    </div>
                    {requiredTags.length > 0 && (
                      <p className="text-xs text-primary font-medium mt-1">
                        {requiredTags.length} etiqueta
                        {requiredTags.length > 1 ? "s" : ""} seleccionada
                        {requiredTags.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-bold flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancel}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || zonePoints.length < 3}
                      className="min-w-[120px] font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:hover:scale-100"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {editingZoneData ? "Actualizar Zona" : "Crear Zona"}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                // Show status when actively drawing
                <div className="space-y-6 animate-in fade-in duration-300 py-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 text-center">
                    <div className="mb-3 flex justify-center">
                      <div
                        className={
                          isEditingZone ? "animate-bounce" : "animate-pulse"
                        }
                      >
                        <Pentagon className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground mb-2">
                      {isEditingZone
                        ? "Ajustando Polígono"
                        : "Dibujando en Progreso"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isEditingZone
                        ? "Haz clic en los puntos para eliminarlos o arrástralos para ajustarlos"
                        : "Revisa la barra flotante en la parte inferior del mapa para finalizar tu zona."}
                    </p>
                    <div className="inline-block px-4 py-2 bg-primary/20 rounded-lg border border-primary/30">
                      <p className="text-sm font-semibold text-primary">
                        Puntos: {zonePoints.length} / 3+
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-center">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {isEditingZone
                        ? "Controles de Edición:"
                        : "Atajos de Teclado:"}
                    </p>
                    <div
                      className={`grid ${isEditingZone ? "grid-cols-2" : "grid-cols-3"} gap-2 text-xs`}
                    >
                      {!isEditingZone && (
                        <>
                          <div className="p-2 rounded bg-secondary/50 border border-border/30">
                            <p className="font-mono font-bold text-foreground">
                              Esc
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              Cancelar
                            </p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50 border border-border/30">
                            <p className="font-mono font-bold text-foreground">
                              Ctrl+Z
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              Deshacer
                            </p>
                          </div>
                          <div className="p-2 rounded bg-secondary/50 border border-border/30">
                            <p className="font-mono font-bold text-foreground">
                              Enter
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              Confirmar
                            </p>
                          </div>
                        </>
                      )}
                      {isEditingZone && (
                        <>
                          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                            <p className="font-bold text-blue-600">Arrastra</p>
                            <p className="text-muted-foreground text-[10px]">
                              Mover puntos
                            </p>
                          </div>
                          <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
                            <p className="font-bold text-red-600">Clic</p>
                            <p className="text-muted-foreground text-[10px]">
                              Eliminar punto
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
