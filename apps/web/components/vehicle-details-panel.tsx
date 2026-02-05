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
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground leading-none">
              Detalles del Vehículo
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {vehicle.licensePlate ||
                vehicle.label ||
                `Vehículo #${vehicle.id}`}
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
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Basic Information */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="space-y-3">
              {/* License Plate */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">
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
                    <p className="text-sm font-bold text-foreground mt-1">
                      {vehicle.licensePlate || "Sin matrícula"}
                    </p>
                  )}
                </div>
                {!editingLicensePlate && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setEditingLicensePlate(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Alias */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">
                    Alias
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
                        placeholder="Nombre..."
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
                    <p className="text-sm font-bold text-foreground mt-1">
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

              {/* Type and Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {vehicle.type.label}
                </span>
                <Badge
                  variant={
                    metrics?.status === "active" ? "default" : "secondary"
                  }
                  className="text-[10px] font-medium"
                >
                  {metrics?.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics */}
        {metrics && (
          <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Speed */}
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                    Velocidad
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {metrics.speed}
                    <span className="text-xs text-muted-foreground ml-1">
                      km/h
                    </span>
                  </p>
                </div>

                {/* Health */}
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                    Estado
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-xl font-bold",
                        isHealthy ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {metrics.health}%
                    </p>
                  </div>
                </div>

                {/* Fuel */}
                {metrics.fuelLevel !== undefined && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        Combustible
                      </p>
                      <span className="text-xs font-bold text-foreground">
                        {metrics.fuelLevel}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${metrics.fuelLevel}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Battery */}
                {metrics.batteryLevel !== undefined && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        Batería
                      </p>
                      <span className="text-xs font-bold text-foreground">
                        {metrics.batteryLevel}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${metrics.batteryLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Environmental Label */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Etiqueta Ambiental
                </span>
              </div>
              <Badge className={cn(currentTag.color, "text-white font-bold")}>
                {currentTag.label}
              </Badge>
            </div>
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
                        ? cn(tag.color, "text-black ring-2 ")
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
          </div>
        </Card>

        {/* Driver Section */}
        <Card className="bg-card border border-border/40 rounded-xl p-0 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Conductor
              </span>
            </div>
            {driver ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.imageUrl ? (
                      <img
                        src={driver.imageUrl}
                        alt={driver.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {driver.name}
                    </h4>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Licencia:</span>{" "}
                        {driver.licenseType || "Cat. B"}
                        {driver.licenseNumber && ` (${driver.licenseNumber})`}
                      </p>
                      {driver.phoneNumber && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Teléfono:</span>{" "}
                          {driver.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={handleUnassignDriver}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {driver.onTimeDeliveryRate !== undefined && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        Puntualidad
                      </span>
                      <span className="text-xs font-bold text-foreground">
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

                {availableDrivers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Cambiar a:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableDrivers.slice(0, 6).map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium px-3 rounded-lg hover:bg-primary hover:text-white"
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
                <div className="p-3 bg-muted/20 rounded-lg text-center mb-3">
                  <p className="text-sm text-muted-foreground">
                    Sin conductor asignado
                  </p>
                </div>
                {availableDrivers.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Asignar conductor:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableDrivers.map((d: Driver) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium px-3 rounded-lg hover:bg-primary hover:text-white"
                          onClick={() => handleAssignDriver(d)}
                        >
                          {d.name.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-orange-500 text-center py-2">
                    No hay conductores disponibles
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {metrics && !isHealthy && (
          <Card className="bg-red-50 dark:bg-red-950/20 rounded-xl p-0 overflow-hidden border border-red-200 dark:border-red-900">
            <div className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    Alerta de salud
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70">
                    Salud al {metrics.health}%
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
