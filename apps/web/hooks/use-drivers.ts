"use client";

import { useState, useCallback } from "react";
import { Driver } from "@gis/shared";

export function useDrivers() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchDrivers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/drivers");
            if (!res.ok) throw new Error("Failed to fetch drivers");
            const data = await res.json();
            if (data.success) {
                setDrivers(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch drivers:", error);
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
        } catch (error) {
            console.error("Failed to add driver:", error);
            throw error;
        }
    }, []);

    const updateDriver = useCallback(async (id: string, updateData: Partial<Driver>) => {
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
        } catch (error) {
            console.error("Failed to update driver:", error);
            throw error;
        }
    }, []);

    // No auto-fetch on mount - only fetch when explicitly called
    return { drivers, isLoading, fetchDrivers, addDriver, updateDriver };
}
