// app/api/gps/simulate/route.ts
//
// GPS Simulation Control API
// 
// This endpoint manages the simulation of vehicle movement along routes.
// When real GPS devices are integrated, this endpoint can be removed
// or repurposed for testing.

import { NextResponse } from "next/server";

// Shared in-memory store (same reference as positions endpoint for simulation)
// In a real scenario, this would be in a database or Redis
declare global {
    // eslint-disable-next-line no-var
    var gpsSimulation: {
        routes: Record<string, [number, number][]>;
        positions: Record<string, { coords: [number, number]; routeIndex: number }>;
        isRunning: boolean;
    } | undefined;
}

if (!global.gpsSimulation) {
    global.gpsSimulation = {
        routes: {},
        positions: {},
        isRunning: false
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { routes, action } = body;

        if (action === "start" && routes) {
            // Initialize simulation with provided routes
            global.gpsSimulation!.routes = routes;
            global.gpsSimulation!.isRunning = true;

            // Set initial positions at the start of each route
            Object.entries(routes as Record<string, [number, number][]>).forEach(([vehicleId, route]) => {
                if (route && route.length > 0) {
                    global.gpsSimulation!.positions[vehicleId] = {
                        coords: route[0],
                        routeIndex: 0
                    };
                }
            });

            return NextResponse.json({
                success: true,
                message: "Simulation started",
                vehicles: Object.keys(routes).length
            });
        }

        if (action === "stop") {
            global.gpsSimulation!.isRunning = false;
            global.gpsSimulation!.routes = {};
            global.gpsSimulation!.positions = {};

            return NextResponse.json({ success: true, message: "Simulation stopped" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("GPS Simulation error:", err);
        return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
    }
}
