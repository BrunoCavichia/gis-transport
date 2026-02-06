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
  Hash,
  Gauge,
  Copy,
  CheckCircle2,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_TYPES } from "@/lib/types";

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
  return { id, label, color, description: vehicleType.description };
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
}: VehicleDetailSheetProps) {
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState("");
  const [editingLicensePlate, setEditingLicensePlate] = useState(false);
  const [licensePlateValue, setLicensePlateValue] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // KartaView street-level imagery
  const [streetViewPhotos, setStreetViewPhotos] = useState<
    { imageUrl: string; thumbUrl: string; heading: number; shotDate: string }[]
  >([]);
  const [streetViewIdx, setStreetViewIdx] = useState(0);
  const [streetViewLoading, setStreetViewLoading] = useState(false);
  const [streetViewImgLoaded, setStreetViewImgLoaded] = useState(false);
  const streetViewKeyRef = useRef("");

  // Sync state when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setAliasValue(vehicle.label || "");
      setLicensePlateValue(vehicle.licensePlate || "");
      setEditingAlias(false);
      setEditingLicensePlate(false);
    }
  }, [vehicle?.id, vehicle?.label, vehicle?.licensePlate]);

  // Fetch nearest KartaView imagery when position changes (~110m grid)
  useEffect(() => {
    if (!vehicle?.position) {
      setStreetViewPhotos([]);
      streetViewKeyRef.current = "";
      return;
    }
    const [vLat, vLon] = vehicle.position;
    const key = `${vLat.toFixed(3)},${vLon.toFixed(3)}`;
    if (key === streetViewKeyRef.current) return;
    streetViewKeyRef.current = key;

    const controller = new AbortController();
    setStreetViewLoading(true);
    setStreetViewImgLoaded(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/kartaview?lat=${vLat}&lng=${vLon}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        const valid = (data || []).filter((p: any) => p.imageUrl);
        setStreetViewPhotos(valid);
        setStreetViewIdx(0);
      } catch (err: any) {
        if (err?.name !== "AbortError") setStreetViewPhotos([]);
      } finally {
        setStreetViewLoading(false);
        setStreetViewImgLoaded(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vehicle?.id, vehicle?.position]);

  const streetViewNav = useCallback(
    (dir: 1 | -1) => {
      setStreetViewIdx((i) => {
        const next = i + dir;
        return next < 0
          ? streetViewPhotos.length - 1
          : next >= streetViewPhotos.length
            ? 0
            : next;
      });
      setStreetViewImgLoaded(false);
    },
    [streetViewPhotos.length],
  );

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

  const handleUnassignDriver = () => {
    if (onAssignDriver && driver) {
      onAssignDriver(vehicle.id, null);
    }
  };

  const handleAssignDriver = (newDriver: Driver) => {
    if (onAssignDriver) {
      onAssignDriver(vehicle.id, newDriver);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  const availableDrivers = drivers.filter(
    (d: Driver) => d.isAvailable === true && d.id !== driver?.id,
  );

  return (
    <div
      className={cn(
        "fixed top-4 right-4 bottom-4 w-[420px] max-w-[calc(100vw-120px)] bg-background border-2 border-border rounded-3xl shadow-2xl z-40 transition-all duration-300 ease-out transform flex flex-col overflow-hidden",
        isOpen
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground leading-none">
              Ficha del Vehículo
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {String(vehicle.id).slice(0, 24)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Identity & Registration */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Identificación
            </span>
          </div>
          <div className="p-4 space-y-3">
            {/* License Plate */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg group">
              <div className="flex-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Matrícula
                </Label>
                {editingLicensePlate ? (
                  <div className="flex items-center gap-2 mt-1">
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
                      className="h-7 text-sm font-mono uppercase flex-1"
                      placeholder="0000 ABC"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSaveLicensePlate}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-bold font-mono text-foreground mt-0.5 tracking-wide">
                    {vehicle.licensePlate || "Sin matrícula"}
                  </p>
                )}
              </div>
              {!editingLicensePlate && (
                <div className="flex items-center gap-1">
                  {vehicle.licensePlate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        copyToClipboard(vehicle.licensePlate!, "plate")
                      }
                    >
                      {copiedField === "plate" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setEditingLicensePlate(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Alias */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex-1">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Alias / Nombre
                </Label>
                {editingAlias ? (
                  <div className="flex items-center gap-2 mt-1">
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
                      className="h-7 text-sm flex-1"
                      placeholder="Nombre del vehículo..."
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSaveAlias}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {vehicle.label || "Sin alias"}
                  </p>
                )}
              </div>
              {!editingAlias && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setEditingAlias(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Vehicle Type + Powertrain (read-only metadata) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-muted/10 rounded-lg border border-border/20">
                <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                  Categoría
                </Label>
                <p className="text-[11px] font-bold text-foreground mt-0.5">
                  {vehicle.type.label}
                </p>
              </div>
              <div className="p-2.5 bg-muted/10 rounded-lg border border-border/20">
                <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                  Propulsión
                </Label>
                <p className="text-[11px] font-bold text-foreground mt-0.5">
                  {isElectric ? "Eléctrico" : "Combustión"}
                </p>
              </div>
            </div>

            {/* Status + Odometer row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-muted/10 rounded-lg border border-border/20">
                <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                  Estado
                </Label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      metrics?.status === "active"
                        ? "bg-emerald-500"
                        : metrics?.status === "maintenance"
                          ? "bg-orange-500"
                          : "bg-zinc-400",
                    )}
                  />
                  <p className="text-[11px] font-bold text-foreground">
                    {metrics?.status === "active"
                      ? "Activo"
                      : metrics?.status === "maintenance"
                        ? "Mantenimiento"
                        : metrics?.status === "offline"
                          ? "Offline"
                          : "Inactivo"}
                  </p>
                </div>
              </div>
              <div className="p-2.5 bg-muted/10 rounded-lg border border-border/20">
                <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                  Odómetro
                </Label>
                <p className="text-[11px] font-bold text-foreground mt-0.5 font-mono">
                  {odometerKm ? `${odometerKm} km` : "—"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Position & Coordinates */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Posición
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20 group">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div>
                    <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                      Lat
                    </Label>
                    <p className="text-[11px] font-bold font-mono text-foreground">
                      {lat.toFixed(6)}°
                    </p>
                  </div>
                  <div className="h-6 w-px bg-border/30" />
                  <div>
                    <Label className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                      Lon
                    </Label>
                    <p className="text-[11px] font-bold font-mono text-foreground">
                      {lon.toFixed(6)}°
                    </p>
                  </div>
                </div>
                {lastUpdateTime && (
                  <p className="text-[9px] text-muted-foreground/50 font-mono">
                    Última act: {lastUpdateTime}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() =>
                  copyToClipboard(
                    `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                    "coords",
                  )
                }
              >
                {copiedField === "coords" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Street-Level Imagery — KartaView */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    Vista de Calle
                  </span>
                </div>
                {streetViewPhotos.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground/50 hover:text-foreground"
                      onClick={() => streetViewNav(-1)}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[8px] font-mono text-muted-foreground/40 tabular-nums">
                      {streetViewIdx + 1}/{streetViewPhotos.length}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground/50 hover:text-foreground"
                      onClick={() => streetViewNav(1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 aspect-[16/9]">
                {streetViewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : streetViewPhotos.length > 0 && streetViewPhotos[streetViewIdx] ? (
                  <>
                    {!streetViewImgLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center z-0">
                        <div className="h-4 w-4 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
                      </div>
                    )}
                    <img
                      key={streetViewIdx}
                      src={streetViewPhotos[streetViewIdx].imageUrl}
                      alt="Vista de calle"
                      className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        streetViewImgLoaded ? "opacity-100" : "opacity-0",
                      )}
                      loading="lazy"
                      onLoad={() => setStreetViewImgLoaded(true)}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const thumb = streetViewPhotos[streetViewIdx].thumbUrl;
                        if (thumb && img.src !== thumb) {
                          img.src = thumb;
                        } else {
                          setStreetViewImgLoaded(true);
                        }
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-1.5 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-white/90">
                          {streetViewPhotos[streetViewIdx].shotDate
                            ? new Date(
                                streetViewPhotos[streetViewIdx].shotDate,
                              ).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                        <span className="text-[8px] font-mono text-white/70">
                          {streetViewPhotos[streetViewIdx].heading.toFixed(0)}°
                          hdg
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Camera className="h-5 w-5 text-muted-foreground/15" />
                    <span className="text-[9px] text-muted-foreground/35 font-medium">
                      Sin imágenes de vía disponibles
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[7px] text-muted-foreground/25 mt-1 text-right tracking-wide">
                KartaView / OpenStreetCam
              </p>
            </div>
          </div>
        </Card>

        {/* Environmental Label */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Etiqueta Ambiental
              </span>
            </div>
            <Badge
              className={cn(
                currentTag.color,
                "text-white font-black text-[9px] px-2 h-5",
              )}
            >
              {currentTag.label}
            </Badge>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {ENVIRONMENTAL_TAGS.map((tag) => {
                const isSelected = currentTag.id === tag.id;
                return (
                  <Button
                    key={tag.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 text-xs font-bold px-1 rounded-lg transition-all",
                      isSelected
                        ? cn(tag.color, "text-black ring-2")
                        : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (onChangeEnvironmentalTag && !isSelected) {
                        onChangeEnvironmentalTag(vehicle.id, tag.id);
                      }
                    }}
                  >
                    {tag.id === "none" ? "—" : tag.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground/50 mt-2 leading-relaxed">
              {currentTag.description ||
                "Sin clasificación ambiental asignada."}
            </p>
          </div>
        </Card>

        {/* Driver Assignment */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Conductor Asignado
            </span>
          </div>
          <div className="p-4">
            {driver ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.imageUrl ? (
                      <img
                        src={driver.imageUrl}
                        alt={driver.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {driver.name}
                    </h4>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-semibold">Licencia:</span>{" "}
                        {driver.licenseType || "Cat. B"}
                        {driver.licenseNumber && ` · ${driver.licenseNumber}`}
                      </p>
                      {driver.phoneNumber && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-semibold">Tel:</span>{" "}
                          {driver.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500/70 hover:text-red-600 hover:bg-red-50"
                    onClick={handleUnassignDriver}
                    title="Desasignar conductor"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {availableDrivers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium uppercase tracking-wide">
                      Reasignar a
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableDrivers.slice(0, 6).map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-bold px-2.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                          onClick={() => handleAssignDriver(d)}
                        >
                          {d.name.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="p-3 bg-muted/10 rounded-lg text-center mb-3 border border-dashed border-border/30">
                  <Gauge className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground/50 font-medium">
                    Sin conductor asignado
                  </p>
                </div>
                {availableDrivers.length > 0 ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium uppercase tracking-wide">
                      Asignar conductor
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableDrivers.map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-bold px-2.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                          onClick={() => handleAssignDriver(d)}
                        >
                          {d.name.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-orange-500 text-center py-1 font-bold uppercase tracking-wide">
                    No hay conductores disponibles
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="h-2" />
      </div>
    </div>
  );
}
