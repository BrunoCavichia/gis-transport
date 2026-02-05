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
          Pragma: "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
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
      // Filter out fields that are no longer stored directly on Driver
      // (isAvailable, onTimeDeliveryRate, currentVehicleId are now derived)
      const { name, licenseType, licenseNumber, phoneNumber, imageUrl } =
        driverData;

      // Only include fields that have values
      const payload: Partial<Driver> = { name };
      if (licenseType) payload.licenseType = licenseType;
      if (licenseNumber) payload.licenseNumber = licenseNumber;
      if (phoneNumber && phoneNumber.trim())
        payload.phoneNumber = phoneNumber.trim();
      if (imageUrl) payload.imageUrl = imageUrl;

      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || "Failed to add driver");
      }

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
        // Filter out fields that are derived or handled via VehicleAssignment
        const { name, licenseType, licenseNumber, phoneNumber, imageUrl } =
          updateData;
        const payload: Partial<Driver> = {};

        if (name !== undefined) payload.name = name;
        if (licenseType !== undefined) payload.licenseType = licenseType;
        if (licenseNumber !== undefined) payload.licenseNumber = licenseNumber;
        if (phoneNumber !== undefined && phoneNumber.trim())
          payload.phoneNumber = phoneNumber.trim();
        if (imageUrl !== undefined) payload.imageUrl = imageUrl;

        // Handle assignment changes via isAvailable/currentVehicleId
        if (updateData.isAvailable !== undefined) {
          payload.isAvailable = updateData.isAvailable;
        }
        if (updateData.currentVehicleId !== undefined) {
          payload.currentVehicleId = updateData.currentVehicleId;
        }

        const res = await fetch(`/api/drivers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.error || "Failed to update driver");
        }
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

  const optimisticUpdateDriver = useCallback(
    (id: string, updates: Partial<Driver>) => {
      setDrivers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      );
    },
    [],
  );

  return {
    drivers,
    isLoading,
    error,
    fetchDrivers,
    addDriver,
    updateDriver,
    optimisticUpdateDriver,
  };
}
