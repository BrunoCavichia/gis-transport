"use client";
import React from "react";
import { AddJobDialog } from "@/components/add-job-dialog";
import { AddCustomPOIDialogV2 } from "@/components/add-custom-drawing-zone";
import {
  RouteErrorAlert,
  type RouteError,
} from "@/components/route-error-alert";
import type { RouteNotice } from "@gis/shared";

interface EditingZoneData {
  id: string;
  name: string;
  description?: string;
  zoneType?: string;
  requiredTags?: string[];
}

interface GISMapDialogsProps {
  // Job Dialog
  isAddJobOpen: boolean;
  onOpenAddJobChange: (open: boolean) => void;
  onAddJobSubmit: (coords: [number, number], label: string) => void;
  mapCenter: [number, number];
  onStartPickingJob: () => void;
  pickedJobCoords: [number, number] | null;

  // POI/Zone Dialog
  isAddCustomPOIOpen: boolean;
  onOpenAddCustomPOIChange: (open: boolean) => void;
  onSubmitPOI: (name: string, coords: [number, number], desc?: string) => void;
  onSubmitZone: (
    name: string,
    coordinates: any,
    desc?: string,
    zoneType?: string,
    requiredTags?: string[],
  ) => void;
  onStartPicking: () => void;
  onStartZonePicking: () => void;
  onContinueZonePicking: () => void;
  onCloseShape: () => void;
  pickedPOICoords: [number, number] | null;
  zonePoints: [number, number][];
  zoneIsClosed: boolean;
  isDrawingZone: boolean;
  isEditingZone: boolean;
  editingZoneData: EditingZoneData | null;

  // Route Errors
  routeErrors: RouteError[];
  routeNotices: RouteNotice[];
  onClearRouteErrors: () => void;
}

export function GISMapDialogs({
  isAddJobOpen,
  onOpenAddJobChange,
  onAddJobSubmit,
  mapCenter,
  onStartPickingJob,
  pickedJobCoords,
  isAddCustomPOIOpen,
  onOpenAddCustomPOIChange,
  onSubmitPOI,
  onSubmitZone,
  onStartPicking,
  onStartZonePicking,
  onContinueZonePicking,
  onCloseShape,
  pickedPOICoords,
  zonePoints,
  zoneIsClosed,
  isDrawingZone,
  isEditingZone,
  editingZoneData,
  routeErrors,
  routeNotices,
  onClearRouteErrors,
}: GISMapDialogsProps) {
  return (
    <>
      <AddJobDialog
        isOpen={isAddJobOpen}
        onOpenChange={onOpenAddJobChange}
        onSubmit={onAddJobSubmit}
        mapCenter={mapCenter}
        onStartPicking={onStartPickingJob}
        pickedCoords={pickedJobCoords}
      />

      <AddCustomPOIDialogV2
        isOpen={isAddCustomPOIOpen}
        onOpenChange={onOpenAddCustomPOIChange}
        onSubmitPOI={onSubmitPOI}
        onSubmitZone={onSubmitZone}
        mapCenter={mapCenter}
        onStartPicking={onStartPicking}
        onStartZonePicking={onStartZonePicking}
        onContinueZonePicking={onContinueZonePicking}
        onCloseShape={onCloseShape}
        pickedCoords={pickedPOICoords}
        zonePoints={zonePoints}
        zoneIsClosed={zoneIsClosed}
        isDrawingZone={isDrawingZone}
        isEditingZone={isEditingZone}
        editingZoneData={editingZoneData}
      />

      <RouteErrorAlert
        errors={routeErrors}
        notices={routeNotices}
        onClear={onClearRouteErrors}
      />
    </>
  );
}
