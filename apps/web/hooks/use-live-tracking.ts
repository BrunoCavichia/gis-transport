import { useState, useCallback, useRef, useEffect } from "react";
import type { RouteData, VehicleRoute } from "@/lib/types";
import { VehicleMetrics, FleetVehicle } from "@gis/shared";

interface UseLiveTrackingProps {
  routeData: RouteData | null;
  selectedVehicleId: string | number | null;
  updateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
  updateVehicleMetrics: (vehicleId: string, metrics: VehicleMetrics) => void;
  fleetVehicles: FleetVehicle[];
}

export function useLiveTracking({
  routeData,
  selectedVehicleId,
  updateVehiclePosition,
  updateVehicleMetrics,
  fleetVehicles,
}: UseLiveTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef(0);

  // Refs for stable callback
  const isTrackingRef = useRef(isTracking);
  const routeDataRef = useRef(routeData);
  const updateVehiclePositionRef = useRef(updateVehiclePosition);
  const updateVehicleMetricsRef = useRef(updateVehicleMetrics);
  const selectedVehicleIdRef = useRef(selectedVehicleId);
  const fleetVehiclesRef = useRef(fleetVehicles);

  // Keep refs in sync
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);
  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);
  useEffect(() => {
    updateVehiclePositionRef.current = updateVehiclePosition;
  }, [updateVehiclePosition]);
  useEffect(() => {
    updateVehicleMetricsRef.current = updateVehicleMetrics;
  }, [updateVehicleMetrics]);
  useEffect(() => {
    selectedVehicleIdRef.current = selectedVehicleId;
  }, [selectedVehicleId]);
  useEffect(() => {
    fleetVehiclesRef.current = fleetVehicles;
  }, [fleetVehicles]);

  const fetchPositions = useCallback(async () => {
    const updatePos = updateVehiclePositionRef.current;
    const updateMet = updateVehicleMetricsRef.current;
    const vehicleId = selectedVehicleIdRef.current;

    try {
      const url = vehicleId
        ? `/api/gps/positions?vehicleId=${vehicleId}`
        : "/api/gps/positions";
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();

        // Ignore out-of-order or stale responses
        if (data.timestamp && data.timestamp < lastTimestampRef.current) {
          return;
        }
        lastTimestampRef.current = data.timestamp;

        // Update each vehicle's position and metrics
        if (data.positions) {
          Object.entries(data.positions).forEach(([vid, coords]) => {
            updatePos(vid, coords as [number, number]);
          });
        }

        if (data.metrics) {
          Object.entries(data.metrics).forEach(([vid, metrics]) => {
            updateMet(vid, metrics as VehicleMetrics);
          });
        }
      }
    } catch (err) {
      console.error("GPS poll error:", err);
    }
  }, []);

  // Immediate fetch when selected vehicle changes for snappier UI
  useEffect(() => {
    if (isTracking && selectedVehicleId) {
      fetchPositions();
    }
  }, [selectedVehicleId, isTracking, fetchPositions]);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  // When routeData changes while tracking is active, restart simulation with new routes
  useEffect(() => {
    if (isTracking && routeData?.vehicleRoutes) {
      const simulationData: Record<string, any> = {};
      routeData.vehicleRoutes.forEach((route: any) => {
        if (route.vehicleId && route.coordinates) {
          const v = fleetVehiclesRef.current.find(
            (fv) => String(fv.id) === String(route.vehicleId),
          );
          simulationData[route.vehicleId] = {
            coordinates: route.coordinates,
            typeId: v?.type.id || "eco",
          };
        }
      });

      fetch("/api/gps/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: simulationData, action: "update" }),
      }).catch((err) => console.error("Failed to update simulation:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, routeData]);

  // STABLE callback - uses refs
  const toggleTracking = useCallback(() => {
    const tracking = isTrackingRef.current;
    const routes = routeDataRef.current;

    if (tracking) {
      // Stop tracking
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      setIsTracking(false);
    } else {
      // Start tracking - pass route data to the API for simulation
      if (routes?.vehicleRoutes) {
        const simulationData: Record<string, any> = {};
        routes.vehicleRoutes.forEach((route: any) => {
          if (route.vehicleId && route.coordinates) {
            const v = fleetVehiclesRef.current.find(
              (fv) => String(fv.id) === String(route.vehicleId),
            );
            simulationData[route.vehicleId] = {
              coordinates: route.coordinates,
              typeId: v?.type.id || "eco",
            };
          }
        });

        fetch("/api/gps/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes: simulationData, action: "start" }),
        }).catch((err) => console.error("Failed to start simulation:", err));
      }

      setIsTracking(true);

      // Start polling for updates
      trackingIntervalRef.current = setInterval(fetchPositions, 4000);

      // Initial fetch
      fetchPositions();
    }
  }, [fetchPositions]);

  return {
    isTracking,
    toggleTracking,
    setIsTracking,
  };
}
