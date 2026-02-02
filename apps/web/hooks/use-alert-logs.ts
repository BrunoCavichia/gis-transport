import { useCallback, useEffect, useState } from "react";
import type { Alert } from "@/lib/utils";

export interface AlertLog {
  id: string;
  vehicleId: string | number;
  alertType: string;
  alertTitle: string;
  severity: "info" | "warning" | "critical";
  timestamp: number;
  message: string;
}

const STORAGE_KEY = "alert-logs";
const MAX_LOGS = 500;

export function useAlertLogs() {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AlertLog[];
        setLogs(parsed);
      }
    } catch (error) {
      console.error("Failed to load alert logs from localStorage:", error);
    }
    setIsInitialized(true);
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
      } catch (error) {
        console.error("Failed to save alert logs to localStorage:", error);
      }
    }
  }, [logs, isInitialized]);

  // Add new alert to logs
  const addAlertLog = useCallback((alert: Alert) => {
    const newLog: AlertLog = {
      id: alert.id,
      vehicleId: alert.vehicleId || "unknown",
      alertType: alert.type,
      alertTitle: alert.title,
      severity: alert.severity,
      timestamp: alert.timestamp,
      message: alert.message,
    };

    setLogs((prev) => {
      // Avoid duplicates based on ID and timestamp
      const isDuplicate = prev.some(
        (log) => log.id === newLog.id && log.timestamp === newLog.timestamp,
      );

      if (isDuplicate) return prev;

      // Keep only the latest MAX_LOGS entries
      const updated = [newLog, ...prev].slice(0, MAX_LOGS);
      return updated;
    });
  }, []);

  // Get logs for a specific vehicle
  const getVehicleLogs = useCallback(
    (vehicleId: string | number) => {
      return logs.filter((log) => String(log.vehicleId) === String(vehicleId));
    },
    [logs],
  );

  // Clear logs for a specific vehicle
  const clearVehicleLogs = useCallback((vehicleId: string | number) => {
    setLogs((prev) =>
      prev.filter((log) => String(log.vehicleId) !== String(vehicleId)),
    );
  }, []);

  // Clear all logs
  const clearAllLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    addAlertLog,
    getVehicleLogs,
    clearVehicleLogs,
    clearAllLogs,
    isInitialized,
  };
}
