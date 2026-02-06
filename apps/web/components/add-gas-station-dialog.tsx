"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
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
  Fuel,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Map as MapIcon,
  CheckCircle2,
} from "lucide-react";
import type { POI, FleetVehicle } from "@gis/shared";

// Lazy load solo cuando sea necesario
const MapPreview = dynamic(() => import("@/components/map-preview"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full rounded-2xl bg-muted animate-pulse flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface AddGasStationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gasStation: POI | null;
  vehicles: FleetVehicle[];
  onAddToVehicle: (
    vehicleId: string | number,
    coords: [number, number],
    label: string,
  ) => void;
  isLoading?: boolean;
}

// Step 1: Preview del mapa
const Step1Content = memo(
  ({
    gasStation,
    onNext,
    onCancel,
  }: {
    gasStation: POI;
    onNext: () => void;
    onCancel: () => void;
  }) => (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted shadow-inner group">
        {gasStation && <MapPreview coords={gasStation.position} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-3 right-3 flex gap-2">
          <div className="px-2 py-1 bg-background/90 backdrop-blur-md rounded-lg border border-border/50 shadow-sm flex items-center gap-1.5">
            <MapIcon className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold">Vista Previa</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
          <Fuel className="h-5 w-5 text-primary/70" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
            Gasolinera Seleccionada
          </p>
          <p className="text-xs font-bold text-foreground/80">
            {gasStation.name}
          </p>
          {gasStation.address && (
            <p className="text-[9px] text-muted-foreground">
              {gasStation.address}
            </p>
          )}
        </div>
      </div>

      <DialogFooter className="pt-2 gap-3 flex-col sm:flex-row">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-12 border-dashed hover:bg-muted font-medium transition-all"
        >
          Cancelar
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 h-12 font-bold shadow-lg shadow-primary/25 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Continuar
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step1Content.displayName = "Step1Content";

// Step 2: Seleccionar vehículo
const Step2Content = memo(
  ({
    vehicles,
    isLoading,
    onBack,
    onSubmit,
  }: {
    gasStation: POI;
    vehicles: FleetVehicle[];
    isLoading?: boolean;
    onBack: () => void;
    onSubmit: (vehicleId: string | number) => void;
  }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          Asignar a Vehículo
        </Label>
        <p className="text-[10px] text-muted-foreground/70 italic">
          Selecciona el vehículo donde añadir esta parada de gasolinera
        </p>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border/40 rounded-xl">
            <p className="text-[10px] text-muted-foreground">
              No hay vehículos disponibles
            </p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <Button
              key={vehicle.id}
              variant="outline"
              className="w-full h-12 justify-between px-4 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
              onClick={() => onSubmit(vehicle.id)}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Fuel className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black">{vehicle.label}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">
                    {vehicle.type.label}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Button>
          ))
        )}
      </div>

      <DialogFooter className="pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step2Content.displayName = "Step2Content";

// Step 3: Confirmación
const Step3Content = memo(
  ({
    gasStation,
    selectedVehicle,
    isLoading,
    onSubmit,
  }: {
    gasStation: POI;
    selectedVehicle: FleetVehicle | null;
    isLoading?: boolean;
    onBack: () => void;
    onSubmit: () => void;
  }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl" />
          <div className="relative h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
            <CheckCircle2 className="h-8 w-8 text-primary animate-in zoom-in duration-500" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-foreground">
            Parada Agregada Correctamente
          </p>
          <p className="text-[10px] text-muted-foreground">
            Gasolinera añadida a la ruta del vehículo
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div>
          <p className="text-[9px] font-black uppercase text-muted-foreground/60 mb-1">
            Gasolinera
          </p>
          <p className="text-sm font-bold text-foreground">{gasStation.name}</p>
          {gasStation.address && (
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {gasStation.address}
            </p>
          )}
        </div>
        <div className="border-t border-border/30 pt-3">
          <p className="text-[9px] font-black uppercase text-muted-foreground/60 mb-1">
            Vehículo
          </p>
          <p className="text-sm font-bold text-foreground">
            {selectedVehicle?.label}
          </p>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full h-12 font-bold shadow-lg shadow-primary/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Agregando...
            </>
          ) : (
            "Confirmar y Agregar"
          )}
        </Button>
      </DialogFooter>
    </div>
  ),
);
Step3Content.displayName = "Step3Content";

export const AddGasStationDialog = memo(function AddGasStationDialog({
  isOpen,
  onOpenChange,
  gasStation,
  vehicles,
  onAddToVehicle,
  isLoading = false,
}: AddGasStationDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<
    string | number | null
  >(null);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedVehicleId(null);
    }
  }, [isOpen]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const handleSubmit = useCallback(() => {
    if (!gasStation || !selectedVehicleId) return;
    onAddToVehicle(selectedVehicleId, gasStation.position, gasStation.name);
    onOpenChange(false);
  }, [gasStation, selectedVehicleId, onAddToVehicle, onOpenChange]);

  const handleCloseChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep(1);
        setSelectedVehicleId(null);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  if (!gasStation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Fuel className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Agregar Gasolinera
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                  {step === 1 && "Paso 1: Vista Previa"}
                  {step === 2 && "Paso 2: Seleccionar Vehículo"}
                  {step === 3 && "Paso 3: Confirmación"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {step === 1 && (
            <Step1Content
              gasStation={gasStation}
              onNext={() => setStep(2)}
              onCancel={() => handleCloseChange(false)}
            />
          )}

          {step === 2 && (
            <Step2Content
              gasStation={gasStation}
              vehicles={vehicles}
              isLoading={isLoading}
              onBack={() => setStep(1)}
              onSubmit={(vehicleId) => {
                setSelectedVehicleId(vehicleId);
                setStep(3);
              }}
            />
          )}

          {step === 3 && selectedVehicle && (
            <Step3Content
              gasStation={gasStation}
              selectedVehicle={selectedVehicle}
              isLoading={isLoading}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
