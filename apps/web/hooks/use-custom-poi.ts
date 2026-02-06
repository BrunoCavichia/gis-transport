"use client";

import { useState, useCallback, useEffect } from "react";
import type { CustomPOI } from "@/lib/types";

const STORAGE_KEY = "gis-custom-pois";
const STORAGE_VERSION = 1;

interface StorageData {
  version: number;
  data: CustomPOI[];
}

// Migration function for future schema changes
function migrateData(stored: any): CustomPOI[] {
  // If it's the new format with version
  if (stored.version !== undefined) {
    return stored.data || [];
  }

  // Old format - array of POIs without version
  if (Array.isArray(stored)) {
    // Migrate old POIs to new format with entityType
    return stored.map((poi: any) => ({
      ...poi,
      entityType: poi.entityType || "point",
      position: poi.position,
    }));
  }

  return [];
}

export function useCustomPOI() {
  const [customPOIs, setCustomPOIs] = useState<CustomPOI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated = migrateData(parsed);
        setCustomPOIs(migrated);
      }
    } catch (error) {
      console.error("Failed to load custom POIs from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever POIs change
  useEffect(() => {
    if (!isLoading) {
      try {
        const storageData: StorageData = {
          version: STORAGE_VERSION,
          data: customPOIs,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      } catch (error) {
        console.error("Failed to save custom POIs to localStorage:", error);
      }
    }
  }, [customPOIs, isLoading]);

  const addCustomPOI = useCallback(
    (name: string, coords: [number, number], description?: string) => {
      const poiName = name.trim() || `Custom POI ${customPOIs.length + 1}`;
      const newPOI: CustomPOI = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: poiName,
        position: coords,
        entityType: "point",
        type: "custom",
        description,
        createdAt: Date.now(),
      };
      setCustomPOIs((prev) => [...prev, newPOI]);
      return newPOI;
    },
    [customPOIs.length],
  );

  const addCustomZone = useCallback(
    (
      name: string,
      coordinates: any,
      description?: string,
      zoneType: string = "LEZ",
      requiredTags?: string[],
    ) => {
      const zoneName = name.trim() || `Custom Zone ${customPOIs.length + 1}`;
      const newZone: CustomPOI = {
        id: `custom-zone-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: zoneName,
        coordinates,
        entityType: "zone",
        type: "custom",
        description,
        zoneType,
        requiredTags,
        createdAt: Date.now(),
      };
      setCustomPOIs((prev) => [...prev, newZone]);
      return newZone;
    },
    [customPOIs.length],
  );

  const removeCustomPOI = useCallback((id: string) => {
    setCustomPOIs((prev) => prev.filter((poi) => poi.id !== id));
  }, []);

  const updateCustomPOI = useCallback(
    (
      id: string,
      updates: Partial<Omit<CustomPOI, "id" | "type" | "createdAt">>,
    ) => {
      setCustomPOIs((prev) =>
        prev.map((poi) => (poi.id === id ? { ...poi, ...updates } : poi)),
      );
    },
    [],
  );

  const clearAllCustomPOIs = useCallback(() => {
    setCustomPOIs([]);
  }, []);

  const togglePOISelectionForFleet = useCallback((id: string) => {
    setCustomPOIs((prev) =>
      prev.map((poi) =>
        poi.id === id
          ? { ...poi, selectedForFleet: !poi.selectedForFleet }
          : poi,
      ),
    );
  }, []);

  // Get only point POIs
  const getPointPOIs = useCallback(() => {
    return customPOIs.filter((poi) => poi.entityType === "point");
  }, [customPOIs]);

  // Get only zone POIs
  const getZonePOIs = useCallback(() => {
    return customPOIs.filter((poi) => poi.entityType === "zone");
  }, [customPOIs]);

  return {
    customPOIs,
    addCustomPOI,
    addCustomZone,
    removeCustomPOI,
    updateCustomPOI,
    clearAllCustomPOIs,
    togglePOISelectionForFleet,
    getPointPOIs,
    getZonePOIs,
    isLoading,
  };
}
