import { useState, useCallback, useRef, useEffect } from "react";
import type { RouteData, VehicleRoute } from "@/lib/types";
import { VehicleMetrics } from "@gis/shared";

interface UseLiveTrackingProps {
  routeData: RouteData | null;
  selectedVehicleId: string | number | null;
  updateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
  updateVehicleMetrics: (vehicleId: string, metrics: VehicleMetrics) => void;
}

export function useLiveTracking({
  routeData,
  selectedVehicleId,
  updateVehiclePosition,
  updateVehicleMetrics,
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
      const activeRoutes: Record<string, [number, number][]> = {};
      routeData.vehicleRoutes.forEach((route: VehicleRoute) => {
        if (route.vehicleId && route.coordinates) {
          activeRoutes[route.vehicleId] = route.coordinates;
        }
      });

      // Update simulation with new routes
      fetch("/api/gps/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: activeRoutes, action: "update" }),
      }).catch((err) => console.error("Failed to update simulation:", err));
    }
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
        const activeRoutes: Record<string, [number, number][]> = {};
        routes.vehicleRoutes.forEach((route: VehicleRoute) => {
          if (route.vehicleId && route.coordinates) {
            activeRoutes[route.vehicleId] = route.coordinates;
          }
        });

        // Initialize simulation with routes
        fetch("/api/gps/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes: activeRoutes, action: "start" }),
        }).catch((err) => console.error("Failed to start simulation:", err));
      }

      setIsTracking(true);

      // Start polling for updates
      trackingIntervalRef.current = setInterval(fetchPositions, 4000);

      // Initial fetch
      fetchPositions();
    }
  }, [fetchPositions]); // Empty deps = stable reference

  return {
    isTracking,
    toggleTracking,
    setIsTracking,
  };
}
