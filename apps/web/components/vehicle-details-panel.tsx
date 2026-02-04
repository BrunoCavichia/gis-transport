"use client";

import { useState } from "react";
import { FleetVehicle, Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  Activity,
  Users,
  Truck,
  X,
  Tag,
  Edit2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const MapPreview = dynamic(() => import("@/components/map-preview"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted/20 animate-pulse rounded-xl" />
  ),
});

interface VehicleDetailSheetProps {
  vehicle: FleetVehicle | null;
  onClose: () => void;
  isOpen?: boolean;
  drivers?: Driver[];
  onAssignDriver?: (vehicleId: string | number, driver: Driver | null) => void;
  onChangeEnvironmentalTag?: (vehicleId: string | number, tagId: string) => void;
  onUpdateLabel?: (vehicleId: string | number, label: string) => void;
  onUpdateLicensePlate?: (vehicleId: string | number, licensePlate: string) => void;
}

const ENVIRONMENTAL_TAGS = [
  { id: "zero", label: "ZERO", color: "bg-green-500" },
  { id: "eco", label: "ECO", color: "bg-blue-500" },
  { id: "c", label: "C", color: "bg-yellow-500" },
  { id: "b", label: "B", color: "bg-orange-500" },
  { id: "none", label: "Sin etiqueta", color: "bg-gray-500" },
];

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
  const [aliasValue, setAliasValue] = useState(vehicle?.label || "");
  const [editingLicensePlate, setEditingLicensePlate] = useState(false);
  const [licensePlateValue, setLicensePlateValue] = useState(vehicle?.licensePlate || "");

  if (!vehicle) return null;

  const [lat, lon] = vehicle?.position || [0, 0];
  const metrics = vehicle?.metrics;
  const driver = vehicle?.driver;
  const isHealthy = metrics?.health ? metrics.health >= 70 : true;

  // Determine current environmental tag - Fixed logic
  const currentTag = ENVIRONMENTAL_TAGS.find((tag) => {
    if (tag.id === "none") {
      return vehicle.type.id === "noLabel" || vehicle.type.id === "none";
    }
    return vehicle.type.id === tag.id || vehicle.type.id.includes(tag.id.toLowerCase());
  }) || ENVIRONMENTAL_TAGS[4];

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

  return (
    <>
      {/* Panel - Slide from right, doesn't overlap sidebar */}
      <div
        className={cn(
          "fixed top-4 right-4 bottom-4 w-[500px] max-w-[calc(100vw-120px)] bg-background border-2 border-border rounded-3xl shadow-2xl z-40 transition-all duration-300 ease-in-out transform flex flex-col",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border/40 flex items-center justify-between shrink-0 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black italic tracking-tighter text-foreground leading-none">
              PANEL DE MODIFICACIÓN
            </h2>
            {editingLicensePlate ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={licensePlateValue}
                  onChange={(e) => setLicensePlateValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveLicensePlate();
                    if (e.key === "Escape") {
                      setLicensePlateValue(vehicle.licensePlate || "");
                      setEditingLicensePlate(false);
                    }
                  }}
                  className="h-6 text-[10px] uppercase font-bold tracking-[0.2em] w-40"
                  placeholder="MATRÍCULA"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={handleSaveLicensePlate}
                >
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em]">
                  {vehicle.licensePlate || "Sin matrícula"}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 opacity-60 hover:opacity-100"
                  onClick={() => setEditingLicensePlate(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
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

        {/* Content - Vertical scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            {/* Vehicle Identification & Alias */}
            <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                    <Truck className="h-7 w-7 text-primary/30" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Alias del Vehículo
                      </Label>
                    </div>
                    {editingAlias ? (
                      <div className="flex items-center gap-2">
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
                          className="h-8 text-sm font-bold"
                          placeholder="Ingrese alias..."
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleSaveAlias}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black tracking-tight text-foreground">
                          {vehicle.label || "Sin alias"}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditingAlias(true)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/70 uppercase mt-1">
                        <span>{vehicle.type.label}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <Badge
                          variant={metrics?.status === "active" ? "outline" : "secondary"}
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
                          {metrics.speed} <span className="text-xs text-muted-foreground">km/h</span>
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
                              isHealthy ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {metrics.health}%
                          </p>
                          <Activity
                            className={cn(
                              "h-4 w-4",
                              isHealthy ? "text-green-500" : "text-red-500"
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
                            <p className="text-sm font-black text-foreground">{metrics.fuelLevel}%</p>
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
                            <p className="text-sm font-black text-foreground">{metrics.batteryLevel}%</p>
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

              {/* Environmental Tag Selector */}
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
                      <Badge className={cn(currentTag.color, "text-white font-black px-3 py-1")}>
                        {currentTag.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">
                      Cambiar Etiqueta
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {ENVIRONMENTAL_TAGS.map((tag) => (
                        <Button
                          key={tag.id}
                          variant={currentTag.id === tag.id ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-9 text-xs font-bold px-3 rounded-xl",
                            currentTag.id === tag.id && tag.color,
                            currentTag.id === tag.id && "text-white border-transparent"
                          )}
                          onClick={() => {
                            if (onChangeEnvironmentalTag) {
                              onChangeEnvironmentalTag(vehicle.id, tag.id);
                            }
                          }}
                        >
                          {tag.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Location Card */}
              <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden">
                <div className="h-[180px] w-full">
                  <MapPreview coords={[lat, lon]} />
                </div>
                <div className="p-4 bg-muted/20 border-t border-border/30">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">Coordenadas</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {lat.toFixed(6)}, {lon.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">Última actualización</p>
                        <p className="text-[10px] text-muted-foreground">{lastUpdateTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

            {/* Driver Info Section */}
            {driver ? (
              <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group h-fit">
                <div className="p-5">
                  <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest mb-4">
                    Conductor Asignado
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
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
                            <span className="font-mono text-[10px]">{driver.licenseNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onAssignDriver?.(vehicle.id, null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                    {/* Driver Contact & Performance */}
                    <div className="space-y-4 pt-4 border-t border-border/30">
                      {/* License Info */}
                      <div className="grid grid-cols-2 gap-3">
                        {driver.licenseType && (
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">
                              Tipo de Licencia
                            </p>
                            <p className="text-sm font-black text-foreground">
                              {driver.licenseType}
                            </p>
                          </div>
                        )}
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
                      </div>

                      {/* Phone Number */}
                      {driver.phoneNumber && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                          <a
                            href={`tel:${driver.phoneNumber}`}
                            className="text-sm font-mono text-blue-600 hover:underline font-bold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {driver.phoneNumber}
                          </a>
                        </div>
                      )}

                      {/* Performance */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
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
                                  : "bg-red-500"
                            )}
                            style={{ width: `${driver.onTimeDeliveryRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Availability Status */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-xl border border-border/30">
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          driver.isAvailable ? "bg-emerald-500" : "bg-gray-500"
                        )} />
                        <span className="text-xs font-bold text-foreground">
                          {driver.isAvailable ? "Disponible" : "No disponible"}
                        </span>
                      </div>

                      {/* Speeding Events */}
                      {driver.speedingEvents && driver.speedingEvents.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200/50 dark:border-orange-900/50">
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                            {driver.speedingEvents.length} excesos de velocidad
                          </span>
                        </div>
                      )}

                      {/* Change Driver Option */}
                      <div className="pt-3 border-t border-border/30">
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">
                          Cambiar Conductor
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {(() => {
                            const availableDrivers = drivers.filter((d: Driver) => d.isAvailable === true && d.id !== driver.id);
                            return availableDrivers.length > 0 ? (
                              availableDrivers.map((d: Driver) => (
                                <Button
                                  key={d.id}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold px-2 rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                                  onClick={() => onAssignDriver?.(vehicle.id, d)}
                                >
                                  {d.name.split(" ")[0]}
                                </Button>
                              ))
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                No hay otros conductores disponibles
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="bg-card border-2 border-border/40 rounded-2xl p-0 overflow-hidden h-fit">
                  <div className="p-5">
                    <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest mb-4">
                      Conductor Asignado
                    </h3>
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
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {(() => {
                            const availableDrivers = drivers.filter((d: Driver) => d.isAvailable === true);

                            return availableDrivers.length > 0 ? (
                              availableDrivers.map((d: Driver) => (
                                <Button
                                  key={d.id}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold px-2 rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                                  onClick={() => onAssignDriver?.(vehicle.id, d)}
                                >
                                  {d.name.split(" ")[0]}
                                </Button>
                              ))
                            ) : (
                              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-center py-2">
                                No hay conductores disponibles
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

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
      </div>
    </>
  );
}
