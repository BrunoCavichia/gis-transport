"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FleetVehicle, Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Truck,
  X,
  Tag,
  Edit2,
  Check,
  MapPin,
  Gauge,
  Copy,
  CheckCircle2,
  Camera,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_TYPES } from "@/lib/types";
import type { SvState, KartaViewPhoto } from "@/lib/types/kartaview";
import { KartaViewClientResponseSchema } from "@/lib/types/kartaview";
import { StreetViewLightbox } from "@/components/street-view-lightbox";

interface VehicleDetailSheetProps {
  vehicle: FleetVehicle | null;
  onClose: () => void;
  isOpen?: boolean;
  drivers?: Driver[];
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  onChangeEnvironmentalTag?: (
    vehicleId: string | number,
    tagId: string,
  ) => void;
  onUpdateLabel?: (vehicleId: string | number, label: string) => void;
  onUpdateLicensePlate?: (
    vehicleId: string | number,
    licensePlate: string,
  ) => void;
  onViewDriverProfile?: (driverId: string) => void;
}

const ENVIRONMENTAL_TAGS = VEHICLE_TYPES.map((vehicleType) => {
  const id = vehicleType.id === "noLabel" ? "none" : vehicleType.id || "";
  const label =
    vehicleType.id === "noLabel"
      ? "Sin etiqueta"
      : (vehicleType.id || "").toUpperCase();
  const color = (() => {
    switch (vehicleType.id) {
      case "zero":
        return "bg-green-500";
      case "eco":
        return "bg-blue-500";
      case "c":
        return "bg-yellow-500";
      case "b":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  })();
  return { id, label, color };
});

export function VehicleDetailsPanel({
  vehicle,
  onClose,
  isOpen = true,
  drivers = [],
  onAssignDriver,
  onChangeEnvironmentalTag,
  onUpdateLabel,
  onUpdateLicensePlate,
  onViewDriverProfile,
}: VehicleDetailSheetProps) {
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState("");
  const [editingLicensePlate, setEditingLicensePlate] = useState(false);
  const [licensePlateValue, setLicensePlateValue] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── KartaView street-level imagery (simplified: fetch 1 image) ──
  const [svState, setSvState] = useState<SvState>({ status: "idle" });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lastFetchedKeyRef = useRef("");
  const lastFetchTimeRef = useRef(0);

  // Close lightbox when vehicle changes
  useEffect(() => setLightboxOpen(false), [vehicle?.id]);

  // Sync state when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setAliasValue(vehicle.label || "");
      setLicensePlateValue(vehicle.licensePlate || "");
      setEditingAlias(false);
      setEditingLicensePlate(false);
    }
  }, [vehicle?.id, vehicle?.label, vehicle?.licensePlate]);

  // Fetch KartaView image when position changes
  // When moving: throttle to every 30s so user can actually view the image
  // When stopped: fetch immediately on grid change
  useEffect(() => {
    if (!vehicle?.position) {
      setSvState({ status: "idle" });
      return;
    }
    const [vLat, vLon] = vehicle.position;
    // Round to ~100m grid to avoid excessive fetches
    const key = `${vLat.toFixed(3)},${vLon.toFixed(3)}`;
    if (key === lastFetchedKeyRef.current) return;

    // Throttle when vehicle is moving/on_route
    const isMoving =
      vehicle.metrics?.movementState === "moving" ||
      vehicle.metrics?.movementState === "on_route";
    const elapsed = Date.now() - lastFetchTimeRef.current;
    const THROTTLE_MS = 30_000; // 30 seconds when moving

    if (isMoving && elapsed < THROTTLE_MS) {
      // Skip fetch, keep current image stable
      return;
    }

    lastFetchedKeyRef.current = key;
    lastFetchTimeRef.current = Date.now();

    const controller = new AbortController();
    setSvState({ status: "searching" });

    (async () => {
      try {
        const res = await fetch(`/api/kartaview?lat=${vLat}&lng=${vLon}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const parsed = KartaViewClientResponseSchema.safeParse(json);
        // Take only the first (best) photo
        const photos: KartaViewPhoto[] = parsed.success
          ? parsed.data.data.slice(0, 1)
          : [];
        setSvState(
          photos.length > 0
            ? { status: "resolved", photos, activeIndex: 0, imgLoaded: false }
            : { status: "empty" },
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSvState({ status: "empty" });
      }
    })();

    return () => controller.abort();
  }, [vehicle?.position?.[0], vehicle?.position?.[1]]);

  if (!vehicle) return null;

  const [lat, lon] = vehicle?.position || [0, 0];
  const metrics = vehicle?.metrics;
  const driver = vehicle?.driver;

  const isElectric =
    vehicle.type.id.includes("electric") ||
    vehicle.type.id === "zero" ||
    metrics?.batteryLevel !== undefined;

  // Determine current environmental tag
  const getCurrentTag = () => {
    const typeId = vehicle.type.id?.toLowerCase() || "";
    if (typeId === "nolabel" || typeId === "none") {
      return ENVIRONMENTAL_TAGS.find((tag) => tag.id === "none")!;
    }
    const matchedTag = ENVIRONMENTAL_TAGS.find(
      (tag) =>
        tag.id !== "none" && (typeId === tag.id || typeId.includes(tag.id)),
    );
    return matchedTag || ENVIRONMENTAL_TAGS.find((tag) => tag.id === "none")!;
  };

  const currentTag = getCurrentTag();

  const lastUpdateTime = metrics?.updatedAt
    ? new Date(metrics.updatedAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const odometerKm = metrics?.distanceTotal
    ? (metrics.distanceTotal / 1000).toFixed(1)
    : null;

  const handleSaveAlias = () => {
    if (onUpdateLabel && aliasValue !== vehicle.label) {
      onUpdateLabel(vehicle.id, aliasValue);
    }
    setEditingAlias(false);
  };

  const handleSaveLicensePlate = () => {
    if (onUpdateLicensePlate && licensePlateValue !== vehicle.licensePlate) {
      onUpdateLicensePlate(vehicle.id, licensePlateValue);
    }
    setEditingLicensePlate(false);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-3 right-3 bottom-3 w-[360px] max-w-[calc(100vw-100px)] bg-background/95 backdrop-blur-lg border border-border/30 rounded-2xl shadow-lg z-40 transition-all duration-200 ease-out transform flex flex-col overflow-hidden",
          isOpen && !lightboxOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="p-4 pb-3 flex flex-col gap-3 border-b border-border/10 bg-gradient-to-b from-primary/3 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">
                Ficha del Vehículo
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase opacity-70 mt-1">
                ID: {String(vehicle.id).slice(0, 20)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Card className="bg-card border border-border/30 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/20 flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Identidad del Vehículo
              </span>
            </div>
            <div className="p-3 space-y-2.5">
              {/* Alias - PRIMARY */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 hover:shadow-sm transition-all group">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Alias / Nombre
                  </Label>
                  {editingAlias ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Input
                        value={aliasValue}
                        onChange={(e) => setAliasValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveAlias();
                          if (e.key === "Escape") {
                            setAliasValue(vehicle.label || "");
                            setEditingAlias(false);
                          }
                        }}
                        className="h-6 text-xs flex-1"
                        placeholder="Nombre del vehículo..."
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleSaveAlias}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-foreground mt-0.5 tracking-wider">
                      {vehicle.label || "Sin alias"}
                    </p>
                  )}
                </div>
                {!editingAlias && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setEditingAlias(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* License Plate - SECONDARY */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30 hover:border-primary/15 hover:shadow-sm transition-all group">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Matrícula
                  </Label>
                  {editingLicensePlate ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Input
                        value={licensePlateValue}
                        onChange={(e) =>
                          setLicensePlateValue(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLicensePlate();
                          if (e.key === "Escape") {
                            setLicensePlateValue(vehicle.licensePlate || "");
                            setEditingLicensePlate(false);
                          }
                        }}
                        className="h-6 text-xs uppercase flex-1"
                        placeholder="0000 ABC"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleSaveLicensePlate}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm  font-bold text-foreground mt-0.5 tracking-wider">
                      {vehicle.licensePlate || "Sin matrícula"}
                    </p>
                  )}
                </div>
                {!editingLicensePlate && (
                  <div className="flex items-center gap-0.5">
                    {vehicle.licensePlate && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          copyToClipboard(vehicle.licensePlate!, "plate")
                        }
                      >
                        {copiedField === "plate" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => setEditingLicensePlate(true)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Vehicle Status (Prominent) */}
          <Card className="bg-gradient-to-r from-emerald-50/10 via-card to-card border border-emerald-200/20 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-emerald-200/10 bg-gradient-to-r from-emerald-50/20 to-transparent flex items-center gap-1.5">
              <div
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center",
                  metrics?.status === "active"
                    ? "bg-emerald-100 border border-emerald-300"
                    : metrics?.status === "maintenance"
                      ? "bg-orange-100 border border-orange-300"
                      : "bg-zinc-100 border border-zinc-300",
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    metrics?.status === "active"
                      ? "bg-emerald-500"
                      : metrics?.status === "maintenance"
                        ? "bg-orange-500"
                        : "bg-zinc-500",
                  )}
                />
              </div>
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Estado Operativo
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {metrics?.status === "active"
                    ? "Operativo"
                    : metrics?.status === "maintenance"
                      ? "En Mantenimiento"
                      : metrics?.status === "offline"
                        ? "Desconectado"
                        : "Inactivo"}
                </p>
                <p className="text-[8px] text-muted-foreground/60 font-medium mt-0.5">
                  {lastUpdateTime
                    ? `Actualizado: ${lastUpdateTime}`
                    : "Sin historial"}
                </p>
              </div>
              <div
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold text-[9px] text-white",
                  metrics?.status === "active"
                    ? "bg-emerald-500/80"
                    : metrics?.status === "maintenance"
                      ? "bg-orange-500/80"
                      : "bg-zinc-500/80",
                )}
              >
                {metrics?.status === "active"
                  ? "OK"
                  : metrics?.status === "maintenance"
                    ? "MANT"
                    : "OFF"}
              </div>
            </div>
          </Card>

          {/* Vehicle Specs: Category, Propulsion, Odometer */}
          <Card className="bg-card border border-border/30 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/20 flex items-center gap-1.5">
              <Gauge className="h-3 w-3 text-muted-foreground/70" />
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Especificaciones
              </span>
            </div>
            <div className="p-3 space-y-2.5">
              {/* Category + Propulsion */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2.5 bg-card rounded-lg border border-border/30 hover:border-primary/15 transition-all">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Categoría
                  </Label>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {vehicle.type.label}
                  </p>
                </div>
                <div className="p-2.5 bg-card rounded-lg border border-border/30 hover:border-primary/15 transition-all">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Propulsión
                  </Label>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {isElectric ? "Eléctrico" : "Combustión"}
                  </p>
                </div>
              </div>
              {/* Odometer - Prominent */}
              <div className="p-3 rounded-lg border border-border/20">
                <Label className="text-xs font-medium text-foreground/70">
                  Distancia Total
                </Label>
                <p className="text-sm font-bold text-foreground mt-1">
                  {odometerKm ? `${odometerKm} km` : "Sin datos"}
                </p>
              </div>
            </div>
          </Card>

          {/* Driver Assignment */}
          <Card className="bg-card border border-border/30 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/20 flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground/70" />
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Conductor
              </span>
            </div>
            <div className="p-3">
              {driver ? (
                <div
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() =>
                    onViewDriverProfile && onViewDriverProfile(driver.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {driver.name}
                    </p>
                    <p className="text-[8px] text-muted-foreground/60 font-medium mt-0.5">
                      {driver.licenseNumber || `ID: ${driver.id.slice(-6)}`}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-semibold ml-2 flex-shrink-0"
                  >
                    {driver.isAvailable ? "Disponible" : "Asignado"}
                  </Badge>
                </div>
              ) : (
                <div className="p-3 text-center rounded-lg bg-muted/20 border border-border/20">
                  <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                    Sin conductor asignado
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Environmental Label */}
          <Card className="bg-card border border-border/30 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-muted-foreground/70" />
                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                  Etiqueta Ambiental
                </span>
              </div>
              <Badge
                className={cn(
                  currentTag.color,
                  "text-gray-900 dark:text-gray-50 font-semibold text-[8px] px-1.5 h-4",
                )}
              >
                {currentTag.label}
              </Badge>
            </div>
            <div className="p-3 space-y-3">
              {/* Current Selection Display */}
              <div className="p-3 text-center rounded-lg bg-muted/20 border border-border/20">
                <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                  Etiqueta:
                </p>
              </div>
              {/* Tag Selection Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {ENVIRONMENTAL_TAGS.map((tag) => {
                  const isSelected = currentTag.id === tag.id;
                  return (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-[12px] font-bold px-1 rounded-lg transition-all duration-200 relative overflow-hidden group",
                        isSelected
                          ? cn(
                              tag.color,
                              "text-black",
                              "shadow-lg ring-2 ring-offset-1 ring-white/30 scale-105",
                            )
                          : "border-border/40 text-gray-600", // también negro cuando no está seleccionado
                      )}
                      onClick={() => {
                        if (onChangeEnvironmentalTag && !isSelected) {
                          onChangeEnvironmentalTag(vehicle.id, tag.id);
                        }
                      }}
                      title={tag.label}
                    >
                      <span className="relative z-10 font-semibold">
                        {tag.id === "none" ? "—" : tag.label.substring(0, 2)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Position & Coordinates */}
          <Card className="bg-card border border-border/30 rounded-xl p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/20 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground/70" />
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Posición
              </span>
            </div>
            <div className="p-3 space-y-2">
              {/* Street-Level Imagery — KartaView */}
              <div
                className={cn(
                  "relative rounded-lg overflow-hidden border transition-all aspect-[16/9]",
                  svState.status === "resolved"
                    ? "border-primary/30 cursor-pointer group/sv bg-muted/10 hover:border-primary/50 hover:shadow-md"
                    : "border-border/20 bg-muted/5",
                )}
                onClick={() =>
                  svState.status === "resolved" && setLightboxOpen(true)
                }
              >
                {/* State: Searching — animated placeholder */}
                {svState.status === "searching" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-muted/5 to-muted/10">
                    <div className="p-3 bg-primary/10 rounded-full animate-pulse">
                      <Camera className="h-5 w-5 text-primary/50" />
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 font-medium">
                      Buscando vista de calle…
                    </span>
                  </div>
                )}

                {/* State: Resolved — show the best (first) image immediately */}
                {svState.status === "resolved" &&
                  svState.photos[svState.activeIndex] && (
                    <>
                      {!svState.imgLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-muted/10 to-muted/5 z-10">
                          <div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <span className="text-[8px] text-muted-foreground/40 font-medium">
                            Cargando imagen…
                          </span>
                        </div>
                      )}
                      <img
                        key={`${svState.activeIndex}-${svState.photos[svState.activeIndex].imageUrl}`}
                        src={svState.photos[svState.activeIndex].imageUrl}
                        alt={`Street view de ${vehicle.label || vehicle.licensePlate}`}
                        className="w-full h-full object-cover"
                        onLoad={() =>
                          setSvState((s) => ({ ...s, imgLoaded: true }))
                        }
                      />
                      {/* Image Counter + Fullscreen Hint */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 flex items-center justify-between">
                        <div className="text-[10px] text-white font-semibold">
                          {svState.activeIndex + 1} de {svState.photos.length}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-white/70">
                            Click para ampliar
                          </span>
                          <ZoomIn className="h-4 w-4 text-white/70 opacity-0 group-hover/sv:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </>
                  )}

                {/* State: Empty — No images available for this location */}
                {svState.status === "empty" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-muted/8 to-muted/5">
                    <div className="p-2.5 bg-muted/20 rounded-full">
                      <Camera className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <div className="text-center px-4">
                      <span className="text-[9px] text-muted-foreground/60 font-medium block">
                        Sin cobertura de imágenes
                      </span>
                      <span className="text-[8px] text-muted-foreground/40">
                        en esta ubicación
                      </span>
                    </div>
                  </div>
                )}

                {/* State: Error — Failed to fetch images */}
                {svState.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-red-50/10 to-muted/5">
                    <div className="p-2.5 bg-red-500/10 rounded-full">
                      <Camera className="h-5 w-5 text-red-500/40" />
                    </div>
                    <span className="text-[9px] text-red-600/50 font-medium">
                      Error al cargar imagen
                    </span>
                  </div>
                )}

                {/* State: Idle — Initial state, no request sent yet */}
                {svState.status === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted/3">
                    <Camera className="h-5 w-5 text-muted-foreground/15" />
                    <span className="text-[8px] text-muted-foreground/20 font-medium">
                      Sin cargador activo
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="h-1" />
        </div>
      </div>

      {/* KartaView lightbox — zoom, pan, full-res, external viewer link */}
      {lightboxOpen && svState.status === "resolved" && (
        <StreetViewLightbox
          photos={svState.photos}
          initialIndex={svState.activeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
