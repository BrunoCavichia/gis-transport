"use client";

import { useState, useCallback, useEffect } from "react";
import type { CustomPOI } from "@/lib/types";

const STORAGE_KEY = "gis-custom-pois";

export function useCustomPOI() {
  const [customPOIs, setCustomPOIs] = useState<CustomPOI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomPOIs(JSON.parse(stored));
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customPOIs));
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
        type: "custom",
        description,
        createdAt: Date.now(),
      };
      setCustomPOIs((prev) => [...prev, newPOI]);
      return newPOI;
    },
    []
  );

  const removeCustomPOI = useCallback((id: string) => {
    setCustomPOIs((prev) => prev.filter((poi) => poi.id !== id));
  }, []);

  const updateCustomPOI = useCallback(
    (id: string, updates: Partial<Omit<CustomPOI, "id" | "type" | "createdAt">>) => {
      setCustomPOIs((prev) =>
        prev.map((poi) =>
          poi.id === id ? { ...poi, ...updates } : poi
        )
      );
    },
    []
  );

  const clearAllCustomPOIs = useCallback(() => {
    setCustomPOIs([]);
  }, []);

  const togglePOISelectionForFleet = useCallback((id: string) => {
    setCustomPOIs((prev) =>
      prev.map((poi) =>
        poi.id === id ? { ...poi, selectedForFleet: !poi.selectedForFleet } : poi
      )
    );
  }, []);

  return {
    customPOIs,
    addCustomPOI,
    removeCustomPOI,
    updateCustomPOI,
    clearAllCustomPOIs,
    togglePOISelectionForFleet,
    isLoading,
  };
}
