"use client";

import { useState, useCallback } from "react";
import { Driver } from "@gis/shared";

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers", {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data.success ? data.data || [] : []);
    } catch (err) {
      console.error("Fetch drivers error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setDrivers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addDriver = useCallback(async (driverData: Partial<Driver>) => {
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driverData),
      });
      if (!res.ok) throw new Error("Failed to add driver");
      const data = await res.json();
      if (data.success) {
        setDrivers((prev) => [...prev, data.data]);
        return data.data;
      }
      throw new Error(data.error);
    } catch (err) {
      console.error("Add driver error:", err);
      throw err;
    }
  }, []);

  const updateDriver = useCallback(
    async (id: string, updateData: Partial<Driver>) => {
      try {
        const res = await fetch(`/api/drivers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error("Failed to update driver");
        const data = await res.json();
        if (data.success) {
          setDrivers((prev) => prev.map((d) => (d.id === id ? data.data : d)));
          return data.data;
        }
        throw new Error(data.error);
      } catch (err) {
        console.error("Update driver error:", err);
        throw err;
      }
    },
    [],
  );

  const optimisticUpdateDriver = useCallback((id: string, updates: Partial<Driver>) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    );
  }, []);

  return { drivers, isLoading, error, fetchDrivers, addDriver, updateDriver, optimisticUpdateDriver };
}
