// lib/hooks/use-fleet.ts
import { useState, useCallback, useRef, useEffect } from "react";
import type {
  VehicleType,
  FleetJob,
  FleetVehicle,
  VehicleMetrics,
} from "@gis/shared";

const EMPTY_VEHICLES: FleetVehicle[] = [];
const EMPTY_JOBS: FleetJob[] = [];

/**
 * Custom hook to manage fleet state and operations
 * @param initialVehicles - Optional initial vehicles
 * @param initialJobs - Optional initial jobs
 * @returns Object with state and functions to manipulate the fleet
 */
export function useFleet(
  initialVehicles: FleetVehicle[] = EMPTY_VEHICLES,
  initialJobs: FleetJob[] = EMPTY_JOBS,
) {
  // Hook states
  const [fleetVehicles, setFleetVehicles] =
    useState<FleetVehicle[]>(initialVehicles);
  const [fleetJobs, setFleetJobs] = useState<FleetJob[]>(initialJobs);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  // Ref to stabilize fetchVehicles callback
  const initialVehiclesRef = useRef(initialVehicles);
  useEffect(() => {
    initialVehiclesRef.current = initialVehicles;
  }, [initialVehicles]);

  // Function to clear all fleet data
  const clearFleet = useCallback(() => {
    setFleetVehicles([]);
    setFleetJobs([]);
    setSelectedVehicleId(null);
  }, []);

  // Simulate vehicle fetching from a physical device - STABLE callback
  const fetchVehicles = useCallback(async () => {
    const initVehicles = initialVehiclesRef.current;
    setIsLoadingVehicles(true);
    try {
      // Simulating network/device delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockVehicles: FleetVehicle[] = [
        {
          id: `phys-${Date.now()}-1`,
          position: initVehicles[0]?.position || [40.4233, -3.7121],
          label: "Phys Vehicle 1",
          type: initVehicles[0]?.type || {
            id: "zero",
            label: "Zero Emission Vehicle",
            tags: ["0", "eco"],
            description: "Full electric",
            vroomType: "car",
          },
          metrics: {
            speed: 85,
            batteryLevel: 15,
            distanceTotal: 12450,
            status: "active",
            movementState: "moving",
            health: 45,
            updatedAt: Date.now(),
          } as VehicleMetrics,
        },
        {
          id: `phys-${Date.now()}-2`,
          position: initVehicles[0]?.position || [40.415, -3.702],
          label: "Phys Vehicle 2",
          type: initVehicles[0]?.type || {
            id: "eco",
            label: "ECO Vehicle",
            tags: ["eco"],
            description: "Hybrid",
            vroomType: "car",
          },
          metrics: {
            speed: 75,
            fuelLevel: 8,
            distanceTotal: 45120,
            status: "active",
            movementState: "moving",
            health: 88,
            updatedAt: Date.now(),
          } as VehicleMetrics,
        },
      ];

      setFleetVehicles((prev) => [...prev, ...mockVehicles]);
    } catch (error) {
      console.error("Failed to fetch vehicles from device:", error);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []); // Empty deps = stable reference

  const generateId = (prefix = "id"): string => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    const time = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${time}-${random}`;
  };

  // Function to add a vehicle at specific coordinates
  const addVehicleAt = useCallback(
    (position: [number, number], type: VehicleType) => {
      const id = generateId("vehicle");
      const label = `Vehicle ${fleetVehicles.length + 1}`;
      const newVehicle: FleetVehicle = { id, position, type, label };
      setFleetVehicles((prev) => {
        const next = [...prev, newVehicle];
        // Automatically select the new vehicle
        setSelectedVehicleId(String(newVehicle.id));
        return next;
      });
    },
    [fleetVehicles.length],
  );

  // Function to add a job at specific coordinates
  const addJobAt = useCallback((position: [number, number], label?: string) => {
    const id = generateId("job");
    setFleetJobs((prev) => {
      const next: FleetJob[] = [
        ...prev,
        {
          id,
          position,
          label: label || `Job ${prev.length + 1}`,
          status: "pending",
        },
      ];
      return next;
    });
  }, []);

  // Function to add a stop (pinned job) to a specific vehicle
  const addStopToVehicle = useCallback(
    (
      vehicleId: string | number,
      position: [number, number],
      label?: string,
    ) => {
      const id = generateId("stop");
      setFleetJobs((prev) => {
        const next: FleetJob[] = [
          ...prev,
          {
            id,
            position,
            label: label || `Stop for ${vehicleId}`,
            assignedVehicleId: vehicleId,
            status: "pending",
          },
        ];
        return next;
      });
    },
    [],
  );

  // Function to remove a vehicle by ID
  const removeVehicle = useCallback((vehicleId: string | number) => {
    setFleetVehicles((prev) => {
      const remaining = prev.filter((v) => v.id !== vehicleId);
      // If the selected vehicle is removed, select the first available one
      setSelectedVehicleId((curr) =>
        curr === vehicleId
          ? remaining[0]?.id
            ? String(remaining[0].id)
            : null
          : curr,
      );
      return remaining;
    });
  }, []);

  // Function to remove a job by ID
  const removeJob = useCallback((jobId: string | number) => {
    setFleetJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  /**
   * Update a vehicle's position (used for live GPS tracking)
   */
  const updateVehiclePosition = useCallback(
    (vehicleId: string | number, newPosition: [number, number]) => {
      setFleetVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId ? { ...v, position: newPosition } : v,
        ),
      );
    },
    [],
  );

  /**
   * Update a vehicle's telemetry metrics
   */
  const updateVehicleMetrics = useCallback(
    (vehicleId: string | number, metrics: VehicleMetrics) => {
      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, metrics } : v)),
      );
    },
    [],
  );

  /**
   * Update a vehicle's type (label/tag)
   */
  const updateVehicleType = useCallback(
    (vehicleId: string | number, newType: VehicleType) => {
      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, type: newType } : v)),
      );
    },
    [],
  );

  /**
   * Assign a driver to a vehicle
   */
  const assignDriverToVehicle = useCallback(
    (vehicleId: string | number, driver: any) => {
      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, driver: driver } : v)),
      );
    },
    [],
  );

  // Return state and functions that other components can use
  return {
    // State
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    isLoadingVehicles,

    // Direct setters
    setSelectedVehicleId,

    // Manipulation functions
    clearFleet,
    fetchDrivers: fetchVehicles, // Matching the requested naming in plan if needed
    fetchVehicles,
    addVehicleAt,
    addJobAt,
    addStopToVehicle,
    removeVehicle,
    removeJob,
    updateVehiclePosition,
    updateVehicleMetrics,
    updateVehicleType,
    assignDriverToVehicle,
  };
}
