// app/api/gps/positions/route.ts
// 
// GPS Position API - Returns current vehicle positions
// 
// ARCHITECTURE NOTE:
// This endpoint is designed to be the ONLY place that needs modification
// when switching from mock data to real GPS devices.
// 
// Currently: Returns simulated positions along calculated routes
// Future: Replace the response with real GPS device data fetch
//
// The frontend polling mechanism and vehicle position updates
// will continue to work without any changes.

import { NextResponse } from "next/server";

// Reference to global simulation state
declare global {
    // eslint-disable-next-line no-var
    var gpsSimulation: {
        routes: Record<string, [number, number][]>;
        positions: Record<string, { coords: [number, number]; routeIndex: number }>;
        isRunning: boolean;
    } | undefined;
}

export async function GET() {
    // ============================================
    // FUTURE GPS INTEGRATION POINT
    // ============================================
    // Replace this block with:
    // const gpsData = await fetch('http://your-gps-device/api/positions');
    // const positions = await gpsData.json();
    // return NextResponse.json({ positions });
    // ============================================

    if (!global.gpsSimulation || !global.gpsSimulation.isRunning) {
        return NextResponse.json({ positions: {}, timestamp: Date.now() });
    }

    const positions: Record<string, [number, number]> = {};

    Object.entries(global.gpsSimulation.positions).forEach(([vehicleId, data]) => {
        const route = global.gpsSimulation!.routes[vehicleId];
        if (route && route.length > 0) {
            // Move to next point in route (simulate movement)
            // Skip some points for faster simulation
            const step = Math.max(1, Math.floor(route.length / 50));
            const nextIndex = Math.min(data.routeIndex + step, route.length - 1);

            global.gpsSimulation!.positions[vehicleId] = {
                coords: route[nextIndex],
                routeIndex: nextIndex
            };
            positions[vehicleId] = route[nextIndex];
        } else {
            positions[vehicleId] = data.coords;
        }
    });

    return NextResponse.json({ positions, timestamp: Date.now() });
}
