// lib/services/routing-service.ts
import { FleetVehicle, FleetJob, RouteData, WeatherData, POI } from "@/lib/types";

const OPENROUTESERVICE_URL = "https://api.openrouteservice.org/v2";
const VROOM_INTERNAL_URL = "http://localhost:3002";
const SNAP_INTERNAL_URL = "http://localhost:3005/api/snap-to-road";

export interface OptimizeOptions {
    startTime?: string;
}

export class RoutingService {
    private static getApiKey() {
        const key = process.env.OPENROUTESERVICE_API_KEY;
        if (!key) console.warn("⚠️ OPENROUTESERVICE_API_KEY is not defined");
        return key;
    }

    private static getWeatherApiKey() {
        return process.env.OPENWEATHERMAP_API_KEY;
    }

    /**
     * Main orchestrator function: Snap -> Matrix -> VROOM -> Routing -> Weather
     */
    static async optimize(
        vehicles: FleetVehicle[],
        jobs: (FleetJob | { id: string; coords: [number, number]; label: string })[],
        options: OptimizeOptions = {}
    ): Promise<RouteData> {
        console.log(`🚀 Starting optimization for ${vehicles.length} vehicles and ${jobs.length} jobs`);
        const startTime = options.startTime || new Date().toISOString();

        // 1. Collect all coordinates
        const allCoords = [
            ...vehicles.map(v => v.coords),
            ...jobs.map(j => j.coords)
        ];

        // 2. Snap to road
        const snappedLocations = await this.snapCoordinates(allCoords);

        // 3. Matrix (Wait times / Distances)
        const costMatrix = await this.getMatrix(snappedLocations);

        // 4. VROOM Optimization
        const vroomResult = await this.runVroom(vehicles, jobs, costMatrix);

        // 5. Individual Routing & Stats Calculation
        const vehicleRoutes = await this.calculateVehicleRoutes(vroomResult, snappedLocations);

        // 6. Weather Analysis
        const weatherRoutes = await this.getWeatherAlerts(vehicleRoutes, startTime);

        const totalDistance = vehicleRoutes.reduce((acc, r) => acc + r.distance, 0);
        const totalDuration = vehicleRoutes.reduce((acc, r) => acc + r.duration, 0);

        return {
            coordinates: [], // Legacy field, not used in multi-vehicle view
            distance: totalDistance,
            duration: totalDuration,
            vehicleRoutes,
            weatherRoutes
        };
    }

    private static async snapCoordinates(coordinates: [number, number][]): Promise<[number, number][]> {
        try {
            const res = await fetch(SNAP_INTERNAL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates })
            });
            if (!res.ok) return coordinates;
            const data = await res.json();
            return data.snapped.map((s: any, idx: number) => s.snapped ? s.location : coordinates[idx]);
        } catch (e) {
            console.warn("Snap service failed, using original coordinates", e);
            return coordinates;
        }
    }

    private static async getMatrix(locations: [number, number][]): Promise<number[][]> {
        if (!this.getApiKey()) throw new Error("ORS API key missing");

        // ORS expects [lon, lat]
        const orsLocations = locations.map(([lat, lon]) => [lon, lat]);

        const res = await fetch(`${OPENROUTESERVICE_URL}/matrix/driving-car`, {
            method: "POST",
            headers: {
                Authorization: this.getApiKey()!,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                locations: orsLocations,
                metrics: ["distance", "duration"],
                units: "m"
            })
        });

        if (!res.ok) throw new Error(`ORS Matrix failed: ${await res.text()}`);
        const data = await res.json();

        // Create cost matrix (distance * 1 + duration * 0.3 as per your logic)
        return Array.from({ length: locations.length }, (_, i) =>
            Array.from({ length: locations.length }, (_, j) => {
                if (i === j) return 0;
                const d = data.distances[i][j];
                const t = data.durations[i][j];
                return Math.round(d * 1 + t * 0.3);
            })
        );
    }

    private static async runVroom(vehicles: FleetVehicle[], jobs: any[], matrix: number[][]): Promise<any> {
        const jobsPerVehicle = Math.ceil(jobs.length / vehicles.length);
        const payload = {
            vehicles: vehicles.map((_, idx) => ({
                id: idx,
                start_index: idx,
                profile: "car",
                capacity: [jobsPerVehicle + 1]
            })),
            jobs: jobs.map((_, jidx) => ({
                id: vehicles.length + jidx,
                location_index: vehicles.length + jidx,
                service: 300,
                delivery: [1]
            })),
            matrix
        };

        const res = await fetch(VROOM_INTERNAL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`VROOM failed: ${await res.text()}`);
        const data = await res.json();
        if (data.code !== 0) {
            throw new Error(`VROOM optimization failed (code ${data.code}): ${data.error || "Problem is likely infeasible"}`);
        }
        return data;
    }

    private static async calculateVehicleRoutes(vroomResult: any, allLocations: [number, number][]): Promise<any[]> {
        const ROUTE_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
        const results = [];

        for (const route of vroomResult.routes) {
            const waypoints = route.steps
                .filter((s: any) => typeof s.location_index === "number")
                .map((s: any) => allLocations[s.location_index]);

            if (waypoints.length < 2) continue;

            // Directions request (LatLon to LonLat for ORS)
            const orsWaypoints = waypoints.map(([lat, lon]: [number, number]) => [lon, lat]);

            const res = await fetch(`${OPENROUTESERVICE_URL}/directions/driving-car/geojson`, {
                method: "POST",
                headers: {
                    Authorization: this.getApiKey()!,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    coordinates: orsWaypoints,
                    instructions: false,
                    preference: "recommended"
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const feat = data.features[0];
                    results.push({
                        vehicleId: route.vehicle,
                        coordinates: feat.geometry.coordinates.map(([lon, lat]: any) => [lat, lon]),
                        distance: Math.round(feat.properties.summary.distance),
                        duration: Math.round(feat.properties.summary.duration),
                        color: ROUTE_COLORS[route.vehicle % ROUTE_COLORS.length],
                        jobsAssigned: route.steps.filter((s: any) => s.type === "job").length
                    });
                } else {
                    console.warn(`⚠️ No features found for vehicle ${route.vehicle}, using straight line`);
                    results.push({
                        vehicleId: route.vehicle,
                        coordinates: waypoints,
                        distance: 0,
                        duration: route.duration,
                        color: ROUTE_COLORS[route.vehicle % ROUTE_COLORS.length],
                        jobsAssigned: route.steps.filter((s: any) => s.type === "job").length
                    });
                }
            } else {
                // Fallback straight lines
                results.push({
                    vehicleId: route.vehicle,
                    coordinates: waypoints,
                    distance: 0,
                    duration: route.duration,
                    color: ROUTE_COLORS[route.vehicle % ROUTE_COLORS.length],
                    jobsAssigned: route.steps.filter((s: any) => s.type === "job").length
                });
            }
        }
        return results;
    }

    private static async getWeatherAlerts(vehicleRoutes: any[], startTime: string): Promise<any[]> {
        const weatherKey = this.getWeatherApiKey();
        if (!weatherKey) return [];

        // We sample indices as in original code
        const results = [];
        const startDate = new Date(startTime);

        for (const vr of vehicleRoutes) {
            const alerts: any[] = [];
            const coords = vr.coordinates;
            const samples = [0, Math.floor(coords.length / 2), coords.length - 1]; // Simplified sampling

            for (const idx of samples) {
                const point = coords[idx];
                if (!point) continue;
                const [lat, lon] = point;
                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${weatherKey}`
                );
                if (!res.ok) continue;

                const data = await res.json();
                const frac = idx / (coords.length - 1);
                const eta = new Date(startDate.getTime() + (vr.duration * frac * 1000)).getTime() / 1000;

                // Find closest forecast item
                const closest = data.list.reduce((prev: any, curr: any) =>
                    Math.abs(curr.dt - eta) < Math.abs(prev.dt - eta) ? curr : prev
                );

                if (closest.rain?.["3h"] > 10) {
                    alerts.push({ event: "RAIN", severity: "MEDIUM", message: "Rain expected", lat, lon });
                }
                if (closest.snow?.["3h"] > 0) {
                    alerts.push({ event: "SNOW", severity: "HIGH", message: "Snow expected", lat, lon });
                }
            }
            results.push({
                vehicle: vr.vehicleId,
                riskLevel: alerts.some(a => a.severity === "HIGH") ? "HIGH" : alerts.length > 0 ? "MEDIUM" : "LOW",
                alerts
            });
        }
        return results;
    }
}
