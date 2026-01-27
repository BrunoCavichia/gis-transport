import { useState, useCallback, useRef, useEffect } from "react";
import type { RouteData } from "@/lib/types";

interface UseLiveTrackingProps {
    routeData: RouteData | null;
    updateVehiclePosition: (vehicleId: string, coords: [number, number]) => void;
}

export function useLiveTracking({
    routeData,
    updateVehiclePosition,
}: UseLiveTrackingProps) {
    const [isTracking, setIsTracking] = useState(false);
    const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for stable callback
    const isTrackingRef = useRef(isTracking);
    const routeDataRef = useRef(routeData);
    const updateVehiclePositionRef = useRef(updateVehiclePosition);

    // Keep refs in sync
    useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);
    useEffect(() => { routeDataRef.current = routeData; }, [routeData]);
    useEffect(() => { updateVehiclePositionRef.current = updateVehiclePosition; }, [updateVehiclePosition]);

    // Cleanup tracking on unmount
    useEffect(() => {
        return () => {
            if (trackingIntervalRef.current) {
                clearInterval(trackingIntervalRef.current);
            }
        };
    }, []);

    // STABLE callback - uses refs
    const toggleTracking = useCallback(() => {
        const tracking = isTrackingRef.current;
        const routes = routeDataRef.current;
        const updatePos = updateVehiclePositionRef.current;

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
                routes.vehicleRoutes.forEach((route) => {
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

            // Start polling for GPS updates
            trackingIntervalRef.current = setInterval(async () => {
                try {
                    const res = await fetch("/api/gps/positions");
                    if (res.ok) {
                        const data = await res.json();
                        // Update each vehicle's position
                        Object.entries(data.positions || {}).forEach(([vehicleId, coords]) => {
                            updatePos(vehicleId, coords as [number, number]);
                        });
                    }
                } catch (err) {
                    console.error("GPS poll error:", err);
                }
            }, 2000); // Poll every 2 seconds
        }
    }, []); // Empty deps = stable reference

    return {
        isTracking,
        toggleTracking,
        setIsTracking,
    };
}

