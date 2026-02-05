"use client";

import { useState, useEffect } from "react";
import { FleetVehicle, Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Activity,
  Users,
  Truck,
  X,
  Tag,
  Edit2,
  Check,
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
  return { id, label, color };
});

export function VehicleDetailSheet({
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

  // Sync state when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setAliasValue(vehicle.label || "");
      setLicensePlateValue(vehicle.licensePlate || "");
      setEditingAlias(false);
      setEditingLicensePlate(false);
    }
  }, [vehicle?.id, vehicle?.label, vehicle?.licensePlate]);

  if (!vehicle) return null;

  const [lat, lon] = vehicle?.position || [0, 0];
  const metrics = vehicle?.metrics;
  const driver = vehicle?.driver;
  const isHealthy = metrics?.health ? metrics.health >= 70 : true;

  // Determine current environmental tag - Fixed logic for "none" selection
  const getCurrentTag = () => {
    const typeId = vehicle.type.id?.toLowerCase() || "";

    // Check for "noLabel" or "none" explicitly
    if (typeId === "nolabel" || typeId === "none") {
      return ENVIRONMENTAL_TAGS.find((tag) => tag.id === "none")!;
    }

    // Find matching tag by ID
    const matchedTag = ENVIRONMENTAL_TAGS.find(
      (tag) =>
        tag.id !== "none" && (typeId === tag.id || typeId.includes(tag.id)),
    );

    return matchedTag || ENVIRONMENTAL_TAGS.find((tag) => tag.id === "none")!;
  };

  const currentTag = getCurrentTag();

  // Format timestamp if available
  const lastUpdateTime = metrics?.updatedAt
    ? new Date(metrics.updatedAt).toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "N/A";

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

  // Get available drivers (excluding the currently assigned driver)
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
      <div className="px-6 py-4 border-b-2 border-border/40 flex items-center justify-between shrink-0 bg-gradient-to-b from-primary/5 to-transparent">
        <div>
          <h2 className="text-xl font-black italic tracking-tighter text-foreground leading-none">
            DETALLES DEL VEHÍCULO
          </h2>
          <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] mt-1 ml-0.5">
            Editar y gestionar información
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Primary Editable Fields Card */}
        <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-7 w-7 text-primary/30" />
              </div>
              <div className="flex-1">
                {/* License Plate - Primary Field */}
                <div className="mb-3">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
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
                        className="h-8 text-sm font-mono uppercase tracking-wider flex-1"
                        placeholder="0000 ABC"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSaveLicensePlate}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[15px] font-black tracking-tight text-foreground">
                        {vehicle.licensePlate || "Sin matrícula"}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-60 hover:opacity-100"
                        onClick={() => setEditingLicensePlate(true)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Vehicle Alias - Secondary Field */}
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Alias del Vehículo
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
                        className="h-8 text-sm flex-1"
                        placeholder="Nombre..."
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSaveAlias}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] font-bold text-foreground">
                        {vehicle.label || "Sin alias"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-60 hover:opacity-100"
                        onClick={() => setEditingAlias(true)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/70 uppercase mt-2">
                  <span>{vehicle.type.label}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <Badge
                    variant={
                      metrics?.status === "active" ? "outline" : "secondary"
                    }
                    className="text-[8px] uppercase font-black px-2 h-4"
                  >
                    {metrics?.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Vehicle Metrics Grid */}
            {metrics && (
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/30">
                {/* Speed */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Velocidad
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {metrics.speed}{" "}
                    <span className="text-xs text-muted-foreground">km/h</span>
                  </p>
                </div>

                {/* Health */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Salud
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-lg font-black",
                        isHealthy ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {metrics.health}%
                    </p>
                    <Activity
                      className={cn(
                        "h-4 w-4",
                        isHealthy ? "text-green-500" : "text-red-500",
                      )}
                    />
                  </div>
                </div>

                {/* Fuel / Battery */}
                {metrics.fuelLevel !== undefined && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      Combustible
                    </p>
                    <div className="space-y-1.5">
                      <p className="text-sm font-black text-foreground">
                        {metrics.fuelLevel}%
                      </p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${metrics.fuelLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {metrics.batteryLevel !== undefined && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      Batería
                    </p>
                    <div className="space-y-1.5">
                      <p className="text-sm font-black text-foreground">
                        {metrics.batteryLevel}%
                      </p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${metrics.batteryLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Environmental Label Selector */}
        <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                <Tag className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wide mb-1">
                  Etiqueta Actual
                </p>
                <Badge
                  className={cn(
                    currentTag.color,
                    "text-white font-black px-3 py-1",
                  )}
                >
                  {currentTag.label}
                </Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-border/30">
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">
                Cambiar Etiqueta
              </p>
              <div className="grid grid-cols-5 gap-2">
                {ENVIRONMENTAL_TAGS.map((tag) => {
                  const isSelected = currentTag.id === tag.id;
                  return (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 text-xs font-bold px-2 rounded-lg transition-all relative",
                        isSelected
                          ? cn(
                              tag.color,
                              "text-white border-0 shadow-md dark:text-white",
                            )
                          : "border border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5",
                      )}
                      onClick={() => {
                        if (onChangeEnvironmentalTag && !isSelected) {
                          onChangeEnvironmentalTag(vehicle.id, tag.id);
                        }
                      }}
                    >
                      <span className="drop-shadow-sm">
                        {tag.id === "none" ? "—" : tag.label}
                      </span>
                      {isSelected && (
                        <Check className="h-3 w-3 absolute top-0.5 right-0.5 drop-shadow-sm" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Vehicle Metrics */}
        {metrics && (
          <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden">
            <div className="p-5">
              <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest mb-4">
                Métricas en Tiempo Real
              </h3>
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-foreground">
                    {metrics?.movementState === "on_route"
                      ? "En Ruta"
                      : metrics?.movementState === "moving"
                        ? "En Movimiento"
                        : "Parado"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Driver Section */}
        <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group h-fit">
          <div className="p-5">
            <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest mb-4">
              Conductor Asignado
            </h3>
            {driver ? (
              <div className="space-y-4">
                {/* Current Driver Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.imageUrl ? (
                      <img
                        src={driver.imageUrl}
                        alt={driver.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-primary/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-black tracking-tight text-foreground mb-1">
                      {driver.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 uppercase">
                      <span>{driver.licenseType || "Cat. B"}</span>
                      {driver.licenseNumber && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="font-mono text-[10px]">
                            {driver.licenseNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleUnassignDriver}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Driver Details Grid */}
                <div className="space-y-3 pt-4 border-t border-border/30">
                  {/* Phone Number */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">
                      Teléfono
                    </p>
                    {driver.phoneNumber ? (
                      <a
                        href={`tel:${driver.phoneNumber}`}
                        className="text-sm text-blue-600 hover:underline font-mono font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {driver.phoneNumber}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground font-mono">
                        No disponible
                      </p>
                    )}
                  </div>

                  {/* License Number */}
                  {driver.licenseNumber && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">
                        Número de Licencia
                      </p>
                      <p className="text-sm font-mono font-black text-foreground">
                        {driver.licenseNumber}
                      </p>
                    </div>
                  )}

                  {/* Performance - On Time Delivery Rate */}
                  {driver.onTimeDeliveryRate !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                          Puntualidad
                        </p>
                        <span className="text-sm font-black text-foreground">
                          {driver.onTimeDeliveryRate}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            driver.onTimeDeliveryRate >= 90
                              ? "bg-emerald-500"
                              : driver.onTimeDeliveryRate >= 75
                                ? "bg-orange-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${driver.onTimeDeliveryRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Availability Status */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-xl border border-border/30">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        driver.isAvailable ? "bg-emerald-500" : "bg-gray-500",
                      )}
                    />
                    <span className="text-xs font-bold text-foreground">
                      {driver.isAvailable ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                </div>

                {/* Change Driver Option */}
                {availableDrivers.length > 0 && (
                  <div className="pt-3 border-t border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                      Cambiar Conductor
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {availableDrivers.slice(0, 6).map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-bold px-2 rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/40"
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
              <div className="flex flex-col items-center justify-center py-4 text-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-bold text-muted-foreground/60">
                  Sin conductor asignado
                </p>

                {/* Driver Selection */}
                <div className="w-full pt-3 border-t border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                    Asignar Conductor
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {availableDrivers.length > 0 ? (
                      availableDrivers.map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] font-bold px-2 rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                          onClick={() => handleAssignDriver(d)}
                        >
                          {d.name.split(" ")[0]}
                        </Button>
                      ))
                    ) : (
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-center py-2 w-full">
                        No hay conductores disponibles
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Health Warning */}
        {metrics && !isHealthy && (
          <Card className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-0 overflow-hidden border-2 border-red-200/50 dark:border-red-900/50">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
                    Alerta de salud
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70">
                    El vehículo presenta problemas. Salud al {metrics.health}%.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
