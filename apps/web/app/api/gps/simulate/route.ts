// app/api/gps/simulate/route.ts
//
// GPS Simulation Control API
// 
// This endpoint manages the simulation of vehicle movement along routes.
// When real GPS devices are integrated, this endpoint can be removed
// or repurposed for testing.

import { NextResponse } from "next/server";

// Shared in-memory store (same reference as positions endpoint for simulation)
declare global {
    // eslint-disable-next-line no-var
    var gpsSimulation: {
        routes: Record<string, [number, number][]>;
        positions: Record<string, { coords: [number, number]; routeIndex: number }>;
        telemetry: Record<string, {
            fuel?: number;
            battery?: number;
            distance: number;
            isElectric: boolean;
        }>;
        isRunning: boolean;
        intervalId?: NodeJS.Timeout;
    } | undefined;
}

if (!global.gpsSimulation) {
    global.gpsSimulation = {
        routes: {},
        positions: {},
        telemetry: {},
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

            // Set initial positions and telemetry
            Object.entries(routes as Record<string, [number, number][]>).forEach(([vehicleId, route]) => {
                const isElectric = vehicleId.includes("phys")
                    ? (parseInt(vehicleId.split("-").pop() || "0") % 2 === 1)
                    : vehicleId.includes("eco") || vehicleId.includes("zero");

                if (route && route.length > 0) {
                    global.gpsSimulation!.positions[vehicleId] = {
                        coords: route[0],
                        routeIndex: 0
                    };
                }

                global.gpsSimulation!.telemetry[vehicleId] = {
                    fuel: isElectric ? undefined : 80 + Math.random() * 20,
                    battery: isElectric ? 80 + Math.random() * 20 : undefined,
                    distance: 10000 + Math.floor(Math.random() * 50000),
                    isElectric
                };
            });

            // Start background simulation loop if not already running
            if (!global.gpsSimulation!.intervalId) {
                global.gpsSimulation!.intervalId = setInterval(() => {
                    if (!global.gpsSimulation || !global.gpsSimulation.isRunning) return;

                    Object.entries(global.gpsSimulation.positions).forEach(([vehicleId, data]) => {
                        const route = global.gpsSimulation!.routes[vehicleId];
                        const tel = global.gpsSimulation!.telemetry[vehicleId];

                        if (route && route.length > 0 && tel) {
                            const step = Math.max(1, Math.floor(route.length / 100));
                            const nextIndex = Math.min(data.routeIndex + step, route.length - 1);
                            const isMoving = nextIndex > data.routeIndex;

                            const dLat = (route[nextIndex][0] - data.coords[0]);
                            const dLon = (route[nextIndex][1] - data.coords[1]);
                            const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;

                            global.gpsSimulation!.positions[vehicleId] = {
                                coords: route[nextIndex],
                                routeIndex: nextIndex
                            };

                            if (isMoving) {
                                tel.distance += distKm;
                                if (tel.isElectric && tel.battery) {
                                    tel.battery = Math.max(5, tel.battery - distKm * 0.2);
                                } else if (tel.fuel) {
                                    tel.fuel = Math.max(5, tel.fuel - distKm * 0.1);
                                }
                            }
                        }
                    });
                }, 2000);
            }

            return NextResponse.json({
                success: true,
                message: "Simulation started",
                vehicles: Object.keys(routes).length
            });
        }

        if (action === "stop") {
            global.gpsSimulation!.isRunning = false;
            if (global.gpsSimulation!.intervalId) {
                clearInterval(global.gpsSimulation!.intervalId);
                global.gpsSimulation!.intervalId = undefined;
            }
            return NextResponse.json({ success: true, message: "Simulation stopped" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("GPS Simulation error:", err);
        return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
    }
}
