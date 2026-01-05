import { FleetVehicle, VehicleRoute, SupplyRiskResult, POI, SupplyRiskAlert, StationSuggestion } from "./types";

export interface TelemetryData {
    fuelLevel?: number; // 0-100
    batteryLevel?: number; // 0-100
    instantConsumption?: number; // L/100km or kWh/100km
    voltage?: number;
    speed?: number;
}

export interface SupplyRiskConfig {
    mediumRiskThreshold: number; // e.g., 25
    highRiskThreshold: number; // e.g., 10
    baseConsumptionRate: number; // e.g., 0.1 per km
    bufferDistance: number; // km to look for stations
}

export class SupplyRiskEngine {
    /**
     * Calculates supply risk along a route based on either estimated or real telemetry data.
     */
    static analyzeRoute(
        route: VehicleRoute,
        vehicle: FleetVehicle,
        telemetry?: TelemetryData,
        config: SupplyRiskConfig = {
            mediumRiskThreshold: 25,
            highRiskThreshold: 15,
            baseConsumptionRate: 0.05, // Default proxy
            bufferDistance: 10
        }
    ): SupplyRiskResult {
        const alerts: SupplyRiskAlert[] = [];
        const isElectric = vehicle.type.tags.includes("zero") || vehicle.type.tags.includes("eco");

        // Initial level: use real telemetry or assume full (100%)
        let currentLevel = telemetry?.batteryLevel ?? telemetry?.fuelLevel ?? 100;

        // Total distance of the route
        const totalDistance = route.distance / 1000; // km
        let accumulatedDistance = 0;

        // Probabilistic estimation along segments
        // In a real scenario, we'd iterate through coordinates to find the exact point
        const coordsCount = route.coordinates.length;
        const distancePerStep = totalDistance / coordsCount;

        let highRiskTriggered = false;
        let mediumRiskTriggered = false;

        for (let i = 0; i < coordsCount; i++) {
            accumulatedDistance += distancePerStep;
            const consumed = distancePerStep * config.baseConsumptionRate;
            currentLevel -= consumed;

            if (currentLevel <= config.highRiskThreshold && !highRiskTriggered) {
                highRiskTriggered = true;
                alerts.push({
                    segmentIndex: i,
                    coords: route.coordinates[i],
                    riskLevel: "HIGH",
                    remainingSupply: Math.max(0, currentLevel),
                    message: "Critical supply level detected. Immediate refuel/recharge required.",
                    reason: `Estimated supply: ${currentLevel.toFixed(1)}%. Below ${config.highRiskThreshold}% threshold.`
                });
            } else if (currentLevel <= config.mediumRiskThreshold && !mediumRiskTriggered) {
                mediumRiskTriggered = true;
                alerts.push({
                    segmentIndex: i,
                    coords: route.coordinates[i],
                    riskLevel: "MEDIUM",
                    remainingSupply: currentLevel,
                    message: "Low supply level alert. Consider refilling soon.",
                    reason: `Estimated supply: ${currentLevel.toFixed(1)}%. Below ${config.mediumRiskThreshold}% threshold.`
                });
            }

            if (currentLevel <= 0) break;
        }

        const overallRisk = highRiskTriggered ? "HIGH" : mediumRiskTriggered ? "MEDIUM" : "LOW";

        return {
            vehicleId: route.vehicleId,
            overallRisk,
            alerts,
            suggestedStations: [] // Will be populated by the orchestrator
        };
    }

    static suggestBestStation(
        riskPoint: [number, number],
        stations: POI[],
        maxDeviationKm: number = 5,
        preRiskRoute?: [number, number][]
    ): StationSuggestion | null {
        if (stations.length === 0) return null;

        let bestStation: POI | null = null;
        let minDistance = Infinity;
        let bestScore = Infinity;

        // We want a station that is "along" the route leading to the risk.
        // We evaluate each station's distance to the route segments.
        for (const station of stations) {
            let minDistanceToAnyPoint = Infinity;
            let bestPointIndex = -1;

            if (preRiskRoute && preRiskRoute.length > 0) {
                // Check distance to the pre-risk route.
                // We prefer points that are within a reasonable "panic" distance of the risk point.
                const lookbackCount = Math.min(preRiskRoute.length, 100);
                for (let j = preRiskRoute.length - lookbackCount; j < preRiskRoute.length; j++) {
                    const d = this.getHaversineDistance(preRiskRoute[j], station.position);
                    if (d < minDistanceToAnyPoint) {
                        minDistanceToAnyPoint = d;
                        bestPointIndex = j;
                    }
                }
            } else {
                minDistanceToAnyPoint = this.getHaversineDistance(riskPoint, station.position);
            }

            // Scoring: proximity to route is primary.
            // But we also prefer stations that are reached "earlier" in the route if they are equally close.
            const score = minDistanceToAnyPoint;

            if (score < bestScore) {
                bestScore = score;
                minDistance = minDistanceToAnyPoint;
                bestStation = station;
            }
        }

        if (bestStation && minDistance <= maxDeviationKm) {
            return {
                station: bestStation,
                deviationDistance: minDistance,
                reason: `Best-fit ${bestStation.type === "ev" ? "charging point" : "gas station"} found along the route (${minDistance.toFixed(1)}km deviation).`
            };
        }

        return null;
    }

    private static getHaversineDistance(p1: [number, number], p2: [number, number]): number {
        const R = 6371; // Earth radius in km
        const dLat = (p2[0] - p1[0]) * Math.PI / 180;
        const dLon = (p2[1] - p1[1]) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
