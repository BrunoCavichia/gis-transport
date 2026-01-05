import { NextResponse } from "next/server";
import { SupplyRiskEngine } from "@/lib/supply-risk-engine";
import { VehicleRoute, FleetVehicle, SupplyRiskResult, POI, LayerVisibility } from "@/lib/types";

export interface SupplyRiskRequest {
    vehicleRoutes: VehicleRoute[];
    fleetVehicles: FleetVehicle[];
    layers: LayerVisibility;
}

function normalizeCoords(coords: [number, number]): [number, number] {
    const [a, b] = coords;
    return a < -90 || a > 90 ? [b, a] : [a, b];
}

export async function POST(req: Request) {
    try {
        const { vehicleRoutes, fleetVehicles, layers }: SupplyRiskRequest = await req.json();

        if (!vehicleRoutes || !fleetVehicles) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        const apiKey = process.env.OPENROUTESERVICE_API_KEY;
        const results: SupplyRiskResult[] = [];

        for (const route of vehicleRoutes) {
            const vehicle = fleetVehicles[route.vehicleId];
            if (!vehicle) continue;

            const isElectric = vehicle.type.tags.includes("zero") || vehicle.type.tags.includes("eco");

            // Config thresholds
            const config = {
                mediumRiskThreshold: 40,
                highRiskThreshold: 20,
                baseConsumptionRate: isElectric ? 0.3 : 0.22,
                bufferDistance: 25
            };

            const analysis = SupplyRiskEngine.analyzeRoute(route, vehicle, undefined, config);

            // Consolidate: Keep first occurrence of each risk level
            const uniqueAlerts: typeof analysis.alerts = [];
            const seenLevels = new Set<string>();
            for (const alert of analysis.alerts) {
                if (!seenLevels.has(alert.riskLevel)) {
                    uniqueAlerts.push(alert);
                    seenLevels.add(alert.riskLevel);
                }
            }
            analysis.alerts = uniqueAlerts;

            // 2. If risk detected, fetch stations and suggest for the first alert
            if (analysis.overallRisk !== "LOW" && analysis.alerts.length > 0) {
                const highAlert = analysis.alerts.find(a => a.riskLevel === "HIGH");
                const firstAlert = highAlert || analysis.alerts[0];
                const riskPoint = normalizeCoords(firstAlert.coords);
                const stationType = isElectric ? "ev" : "gas";

                const host = req.headers.get("host") || "localhost:3000";
                const protocol = host.includes("localhost") ? "http" : "https";
                const baseUrl = `${protocol}://${host}`;

                const stationsUrl = stationType === "ev"
                    ? `${baseUrl}/api/ev-stations?lat=${riskPoint[0]}&lon=${riskPoint[1]}&distance=100`
                    : `${baseUrl}/api/gas-stations?lat=${riskPoint[0]}&lon=${riskPoint[1]}&radius=100000`;

                try {
                    const res = await fetch(stationsUrl);
                    if (res.ok) {
                        const data = await res.json();
                        const stations: POI[] = data.stations || [];

                        const preRiskRoute = route.coordinates.slice(0, (firstAlert.segmentIndex || 0) + 1);
                        const suggestion = SupplyRiskEngine.suggestBestStation(riskPoint, stations, 100, preRiskRoute);
                        if (suggestion) {
                            analysis.suggestedStations.push(suggestion);
                        }
                    }
                } catch (err) {
                    console.error(`[SupplyRisk] Failed to fetch stations for vehicle ${route.vehicleId}:`, err);
                }
            }

            results.push(analysis);
        }

        return NextResponse.json({ results });
    } catch (err) {
        console.error("Supply Risk API Error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
