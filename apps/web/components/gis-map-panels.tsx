"use client";
import React from "react";
import { DriverDetailsSheet } from "@/components/driver-details-sheet";
import { VehicleDetailsPanel } from "@/components/vehicle-details-panel";
import { VehicleDetailSheet } from "@/components/vehicle-detail-sheet";
import type { Driver, FleetVehicle, FleetJob, VehicleType } from "@gis/shared";

interface GISMapPanelsProps {
  // Driver Details Sheet
  selectedDriver: Driver | null;
  isDriverDetailsOpen: boolean;
  onDriverDetailsOpenChange: (open: boolean) => void;
  onDriverDetailsClose: () => void;

  // Vehicle Properties Panel
  showVehiclePropertiesPanel: boolean;
  selectedVehicleId: string | number | null;
  selectedVehicleObject: FleetVehicle | null;
  isVehicleDetailsOpen: boolean;
  onCloseVehiclePropertiesPanel: () => void;
  drivers: Driver[];
  onAssignDriver: (vehicleId: string | number, newDriver: Driver | null) => Promise<void>;
  onChangeEnvironmentalTag: (vehicleId: string | number, tagId: string) => void;
  onUpdateLabel: (vehicleId: string | number, label: string) => void;
  onUpdateLicensePlate: (vehicleId: string | number, plate: string) => void;
  onViewDriverProfile: (driverId: string) => void;

  // Vehicle Detail Sheet
  onCloseVehicleDetails: () => void;
  fleetJobs: FleetJob[];
  addStopToVehicle: (
    vehicleId: string | number,
    coords: [number, number],
    label?: string,
  ) => void;
  startRouting: () => void;
  isAddStopOpen: boolean;
  setIsAddStopOpen: (open: boolean) => void;
  onStartPickingStop: () => void;
  pickedStopCoords: [number, number] | null;
  onAddStopSubmit: (coords: [number, number], label: string) => void;
}

export function GISMapPanels({
  selectedDriver,
  isDriverDetailsOpen,
  onDriverDetailsOpenChange,
  onDriverDetailsClose,
  showVehiclePropertiesPanel,
  selectedVehicleId,
  selectedVehicleObject,
  isVehicleDetailsOpen,
  onCloseVehiclePropertiesPanel,
  drivers,
  onAssignDriver,
  onChangeEnvironmentalTag,
  onUpdateLabel,
  onUpdateLicensePlate,
  onViewDriverProfile,
  onCloseVehicleDetails,
  fleetJobs,
  addStopToVehicle,
  startRouting,
  isAddStopOpen,
  setIsAddStopOpen,
  onStartPickingStop,
  pickedStopCoords,
  onAddStopSubmit,
}: GISMapPanelsProps) {
  return (
    <>
      <DriverDetailsSheet
        driver={selectedDriver}
        isOpen={isDriverDetailsOpen}
        onOpenChange={onDriverDetailsOpenChange}
        onClose={onDriverDetailsClose}
      />

      {/* Vehicle Properties Panel - opens explicitly from sidebar or popup */}
      {showVehiclePropertiesPanel &&
        selectedVehicleObject &&
        !isVehicleDetailsOpen && (
          <VehicleDetailsPanel
            vehicle={selectedVehicleObject}
            isOpen={true}
            onClose={onCloseVehiclePropertiesPanel}
            drivers={drivers}
            onAssignDriver={onAssignDriver}
            onChangeEnvironmentalTag={onChangeEnvironmentalTag}
            onUpdateLabel={onUpdateLabel}
            onUpdateLicensePlate={onUpdateLicensePlate}
            onViewDriverProfile={onViewDriverProfile}
          />
        )}

      {/* Vehicle Route Management Panel - opens from map popup "Ver detalles" */}
      {isVehicleDetailsOpen && selectedVehicleObject && (
        <div className="fixed inset-0 right-0 left-auto w-72 h-full z-40 bg-background border-l border-border/40 shadow-lg overflow-hidden">
          <VehicleDetailSheet
            vehicle={selectedVehicleObject}
            metrics={selectedVehicleObject.metrics || null}
            onClose={onCloseVehicleDetails}
            drivers={drivers}
            onAssignDriver={onAssignDriver}
            jobs={fleetJobs}
            addStopToVehicle={addStopToVehicle}
            startRouting={startRouting}
            isAddStopOpen={isAddStopOpen}
            setIsAddStopOpen={setIsAddStopOpen}
            onStartPickingStop={onStartPickingStop}
            pickedStopCoords={pickedStopCoords}
            onAddStopSubmit={onAddStopSubmit}
          />
        </div>
      )}
    </>
  );
}
