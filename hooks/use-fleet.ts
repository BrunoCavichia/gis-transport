// lib/hooks/use-fleet.ts
import { useState, useCallback } from "react";
import type { VehicleType } from "@/lib/types";

// Hook interfaces
export interface FleetJob {
  id: string;
  coords: [number, number];
  label: string;
}

export interface FleetVehicle {
  id: string;
  coords: [number, number];
  type: VehicleType;
}

/**
 * Custom hook to manage fleet state and operations
 * @param initialVehicles - Optional initial vehicles
 * @param initialJobs - Optional initial jobs
 * @returns Object with state and functions to manipulate the fleet
 */
export function useFleet(
  initialVehicles: FleetVehicle[] = [],
  initialJobs: FleetJob[] = []
) {
  // Hook states
  const [fleetVehicles, setFleetVehicles] =
    useState<FleetVehicle[]>(initialVehicles);
  const [fleetJobs, setFleetJobs] = useState<FleetJob[]>(initialJobs);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [addMode, setAddMode] = useState<"vehicle" | "job" | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  // Function to clear all fleet data
  const clearFleet = useCallback(() => {
    setFleetVehicles([]);
    setFleetJobs([]);
    setSelectedVehicleId(null);
    setAddMode(null);
  }, []);

  // Simulate vehicle fetching from a physical device
  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      // Simulating network/device delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For now, generate some test vehicles or keep current ones
      // In the future, this will do a real fetch: fetch('http://physical-device/api/vehicles')
      const mockVehicles: FleetVehicle[] = [
        {
          id: `phys-${Date.now()}-1`,
          coords: [40.4233, -3.7121],
          type: initialVehicles[0]?.type || {
            id: "zero",
            label: "Zero Emission Vehicle",
            tags: ["0", "eco"],
            description: "Full electric",
            vroomType: "car",
          },
        },
        {
          id: `phys-${Date.now()}-2`,
          coords: [40.415, -3.702],
          type: initialVehicles[0]?.type || {
            id: "eco",
            label: "ECO Vehicle",
            tags: ["eco"],
            description: "Hybrid",
            vroomType: "car",
          },
        },
      ];

      setFleetVehicles((prev) => [...prev, ...mockVehicles]);
    } catch (error) {
      console.error("Failed to fetch vehicles from device:", error);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [initialVehicles]);

  // Function to add a vehicle at specific coordinates
  const addVehicleAt = useCallback(
    (coords: [number, number], type: VehicleType) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : `vehicle-${Date.now()}`;
      const newVehicle: FleetVehicle = { id, coords, type };
      setFleetVehicles((prev) => {
        const next = [...prev, newVehicle];
        // Automatically select the new vehicle
        setSelectedVehicleId(newVehicle.id);
        return next;
      });
      setAddMode(null);
    },
    []
  );

  // Function to add a job at specific coordinates
  const addJobAt = useCallback((coords: [number, number]) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `job-${Date.now()}`;
    setFleetJobs((prev) => {
      const next = [...prev, { id, coords, label: `Job ${prev.length + 1}` }];
      return next;
    });
    setAddMode(null);
  }, []);

  // Function to remove a vehicle by ID
  const removeVehicle = useCallback((vehicleId: string) => {
    setFleetVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId);
      // If the selected vehicle is removed, select the first available one
      setSelectedVehicleId((curr) =>
        curr === vehicleId ? remaining[0]?.id ?? null : curr
      );
      return remaining;
    });
  }, []);

  // Function to remove a job by ID
  const removeJob = useCallback((jobId: string) => {
    setFleetJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  // Return state and functions that other components can use
  return {
    // State
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    addMode,
    isLoadingVehicles,

    // Direct setters
    setAddMode,
    setSelectedVehicleId,

    // Manipulation functions
    clearFleet,
    fetchVehicles,
    addVehicleAt,
    addJobAt,
    removeVehicle,
    removeJob,
  };
}
