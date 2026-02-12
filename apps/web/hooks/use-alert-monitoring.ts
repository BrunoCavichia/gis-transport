"use client";
import { useMemo, useEffect, useRef } from "react";
import { generateVehicleAlerts } from "@/lib/utils";
import type { Alert } from "@/lib/utils";
import type { FleetVehicle, RouteData } from "@gis/shared";
import { useAlertLogs } from "@/hooks/use-alert-logs";

export function useAlertMonitoring(
  fleetVehicles: FleetVehicle[] | null,
  routeData: RouteData | null,
  isTracking: boolean,
) {
  const { addAlertLog } = useAlertLogs();

  // Generate alerts for all vehicles based on their metrics
  const vehicleAlerts = useMemo(() => {
    if (!fleetVehicles) return {};
    
    const alerts: Record<string | number, Alert[]> = {};
    fleetVehicles.forEach((vehicle: FleetVehicle) => {
      // Find weather route for this vehicle
      const weatherRoute = routeData?.weatherRoutes?.find(
        (wr) => String(wr.vehicle) === String(vehicle.id),
      );

      alerts[vehicle.id] = generateVehicleAlerts(
        vehicle.id,
        vehicle.metrics || null,
        vehicle.metrics?.maxSpeed,
        weatherRoute,
      );
    });
    return alerts;
  }, [fleetVehicles, routeData?.weatherRoutes]);

  // Save new alerts to logs
  useEffect(() => {
    Object.values(vehicleAlerts).forEach((alerts) => {
      alerts.forEach((alert) => {
        addAlertLog(alert);
      });
    });
  }, [vehicleAlerts, addAlertLog]);

  // Persist speeding events to DB for driver profiles
  const loggedSpeedingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isTracking || !fleetVehicles) return;
    Object.entries(vehicleAlerts).forEach(([vehicleId, alerts]) => {
      const speedingAlert = alerts.find((a) => a.type === "speeding");
      if (!speedingAlert) return;

      const vehicle = fleetVehicles.find(
        (v: FleetVehicle) => String(v.id) === String(vehicleId),
      );
      if (!vehicle?.driver?.id) return;

      // Debounce: don't log same driver+vehicle combo within 60 seconds
      const dedupeKey = `${vehicle.driver.id}-${vehicleId}`;
      if (loggedSpeedingRef.current.has(dedupeKey)) return;
      loggedSpeedingRef.current.add(dedupeKey);
      setTimeout(() => loggedSpeedingRef.current.delete(dedupeKey), 60_000);

      const data = speedingAlert.data as {
        currentSpeed: number;
        speedLimit: number;
      };
      const [lat, lon] = vehicle.position;

      fetch("/api/drivers/speeding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: vehicle.driver.id,
          speed: data.currentSpeed,
          limit: data.speedLimit,
          latitude: lat,
          longitude: lon,
        }),
      }).catch((err) => console.error("Failed to log speeding event:", err));
    });
  }, [vehicleAlerts, fleetVehicles, isTracking]);

  return {
    vehicleAlerts,
  };
}
