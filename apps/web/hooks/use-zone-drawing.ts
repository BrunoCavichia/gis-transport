"use client";
import { useState, useCallback } from "react";
import type { CustomPOI } from "@gis/shared";

interface UseZoneDrawingProps {
  dispatch: any;
  zonePoints: [number, number][];
  customPOIs: CustomPOI[];
  addCustomZone: (
    name: string,
    coordinates: any,
    desc?: string,
    zoneType?: string,
    requiredTags?: string[],
  ) => void;
  updateCustomPOI: (id: string, updates: Partial<CustomPOI>) => void;
}

interface EditingZoneData {
  id: string;
  name: string;
  description?: string;
  zoneType?: string;
  requiredTags?: string[];
}

export function useZoneDrawing({
  dispatch,
  zonePoints,
  customPOIs,
  addCustomZone,
  updateCustomPOI,
}: UseZoneDrawingProps) {
  // Zone drawing state
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [isEditingZone, setIsEditingZone] = useState(false);
  const [zoneIsClosed, setZoneIsClosed] = useState(false);
  const [editingZoneData, setEditingZoneData] =
    useState<EditingZoneData | null>(null);

  // Start picking zone points (new zone)
  const handleStartZonePicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });
    dispatch({ type: "CLEAR_ZONE_POINTS" });
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
    setIsDrawingZone(true);
    setZoneIsClosed(false);
    setEditingZoneData(null);
    setIsEditingZone(false);
  }, [dispatch]);

  // Continue picking zone points (resume after dialog)
  const handleContinueZonePicking = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });
    dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
    setIsDrawingZone(true);
  }, [dispatch]);

  // Close zone shape (connect last point to first)
  const handleCloseZoneShape = useCallback(() => {
    setZoneIsClosed(true);
  }, []);

  // Confirm zone drawing and open dialog for metadata
  const handleConfirmZoneDrawing = useCallback(() => {
    if (zonePoints.length >= 3) {
      setIsDrawingZone(false);
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: true });
    }
  }, [zonePoints.length, dispatch]);

  // Undo last zone point
  const handleUndoZonePoint = useCallback(() => {
    if (zonePoints.length > 0) {
      const newPoints = zonePoints.slice(0, -1);
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point: [number, number]) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
    }
  }, [zonePoints, dispatch]);

  // Remove specific zone point by index
  const handleRemoveZonePoint = useCallback(
    (index: number) => {
      const newPoints = zonePoints.filter(
        (_: [number, number], i: number) => i !== index,
      );
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point: [number, number]) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
      // Exit editing mode if less than 3 points
      if (newPoints.length < 3) {
        setIsEditingZone(false);
      }
    },
    [zonePoints, dispatch],
  );

  // Update zone point coordinates
  const handleUpdateZonePoint = useCallback(
    (index: number, newCoords: [number, number]) => {
      const newPoints = [...zonePoints];
      newPoints[index] = newCoords;
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      newPoints.forEach((point: [number, number]) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });
    },
    [zonePoints, dispatch],
  );

  // Cancel zone drawing
  const handleCancelZoneDrawing = useCallback(() => {
    if (zonePoints.length > 0) {
      const confirmCancel = window.confirm(
        "¿Descartar los puntos dibujados y cancelar la zona?",
      );
      if (!confirmCancel) return;
    }
    setIsDrawingZone(false);
    setZoneIsClosed(false);
    setEditingZoneData(null);
    setIsEditingZone(false);
    dispatch({ type: "CLEAR_ZONE_POINTS" });
    dispatch({ type: "SET_INTERACTION_MODE", payload: null });
  }, [zonePoints.length, dispatch]);

  // Edit existing zone
  const handleEditZone = useCallback(
    (zoneId: string) => {
      const zoneToEdit = customPOIs.find(
        (poi) => poi.id === zoneId && poi.entityType === "zone",
      );
      if (!zoneToEdit || !zoneToEdit.coordinates) return;

      // Load zone points into drawing state
      dispatch({ type: "CLEAR_ZONE_POINTS" });

      // Convert coordinates to [lat, lon] format if needed
      const coords = zoneToEdit.coordinates;
      let points: [number, number][] = [];

      if (Array.isArray(coords) && coords.length > 0) {
        const firstCoord = coords[0];
        if (Array.isArray(firstCoord) && Array.isArray(firstCoord[0])) {
          const secondLevelCoord = firstCoord[0];
          if (
            Array.isArray(secondLevelCoord) &&
            Array.isArray(secondLevelCoord[0])
          ) {
            // 4D coords format (MultiPolygon)
            points = coords[0][0] as [number, number][];
          } else {
            // 3D coords format
            points = coords[0] as [number, number][];
          }
        } else if (Array.isArray(firstCoord)) {
          // 2D coords format
          points = coords as [number, number][];
        }
      }

      // Dispatch points to state
      points.forEach((point: [number, number]) => {
        dispatch({ type: "ADD_ZONE_POINT", payload: point });
      });

      // Set interaction mode to pick-zone
      dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-zone" });

      // Save zone data for editing
      setEditingZoneData({
        id: zoneToEdit.id,
        name: zoneToEdit.name,
        description: zoneToEdit.description,
        zoneType: zoneToEdit.zoneType,
        requiredTags: zoneToEdit.requiredTags,
      });

      setIsEditingZone(true);
      setIsDrawingZone(true);
    },
    [customPOIs, dispatch],
  );

  // Submit zone (create or update)
  const handleAddCustomZoneSubmit = useCallback(
    (
      name: string,
      coordinates: any,
      desc?: string,
      zoneType?: string,
      requiredTags?: string[],
    ) => {
      if (editingZoneData) {
        // Update existing zone
        updateCustomPOI(editingZoneData.id, {
          name,
          coordinates,
          description: desc,
          zoneType,
          requiredTags,
        });
      } else {
        // Create new zone
        addCustomZone(name, coordinates, desc, zoneType, requiredTags);
      }

      // Clean up state
      dispatch({ type: "SET_IS_ADD_CUSTOM_POI_OPEN", payload: false });
      dispatch({ type: "CLEAR_ZONE_POINTS" });
      dispatch({ type: "SET_INTERACTION_MODE", payload: null });
      setIsDrawingZone(false);
      setZoneIsClosed(false);
      setEditingZoneData(null);
      setIsEditingZone(false);
    },
    [addCustomZone, updateCustomPOI, editingZoneData, dispatch],
  );

  // Toggle editing mode
  const toggleEditingMode = useCallback(() => {
    setIsEditingZone((prev) => !prev);
  }, []);

  return {
    // State
    isDrawingZone,
    isEditingZone,
    zoneIsClosed,
    editingZoneData,
    // Handlers
    handleStartZonePicking,
    handleContinueZonePicking,
    handleCloseZoneShape,
    handleConfirmZoneDrawing,
    handleUndoZonePoint,
    handleRemoveZonePoint,
    handleUpdateZonePoint,
    handleCancelZoneDrawing,
    handleEditZone,
    handleAddCustomZoneSubmit,
    toggleEditingMode,
  };
}
