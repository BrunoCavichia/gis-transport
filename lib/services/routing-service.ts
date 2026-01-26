// lib/services/routing-service.ts
import { FleetVehicle, FleetJob, RouteData, Zone } from "@/lib/types";
import { THEME } from "@/lib/theme";
const { route: ROUTE_COLORS } = THEME.colors;

import { ORS_URL, VROOM_URL, SNAP_URL, TIMEOUTS, ROUTING_CONFIG } from "@/lib/config";
import { WeatherService } from "./weather-service";

export interface OptimizeOptions {
    startTime?: string;
    zones?: Zone[];
}

export class RoutingService {
    private static getWeatherApiKey() {
        return process.env.OPENWEATHERMAP_API_KEY;
    }

    private static formatAvoidPolygons(avoidPolygons: [number, number][][]) {
        if (!avoidPolygons || avoidPolygons.length === 0) return null;

        return {
            type: "MultiPolygon",
            coordinates: avoidPolygons
                .map(poly => {
                    if (poly.length < 3) return null;
                    const closedPoly = [...poly];
                    const first = closedPoly[0];
                    const last = closedPoly[closedPoly.length - 1];
                    if (first[0] !== last[0] || first[1] !== last[1]) {
                        closedPoly.push(first);
                    }
                    if (closedPoly.length < 4) return null; // A closed linear ring must have at least 4 points
                    return [closedPoly.map(([lat, lon]) => [lon, lat])];
                })
                .filter(p => p !== null) as [number, number][][][]
        };
    }

    /**
     * Main orchestrator function: Snap -> Matrix -> VROOM -> Routing -> Weather
     */
    static async optimize(
        vehicles: FleetVehicle[],
        jobs: (FleetJob | { id: string; coords: [number, number]; label: string })[],
        options: OptimizeOptions = {}
    ): Promise<RouteData> {
        console.log(`🚀 Starting multi-matrix optimization for ${vehicles.length} vehicles and ${jobs.length} jobs`);
        const startTime = options.startTime || new Date().toISOString();
        const zones = options.zones || [];

        // 1. Snapshot all coordinates for snapped locations
        const allCoords = [
            ...vehicles.map(v => v.coords),
            ...jobs.map(j => j.coords)
        ];
        const snappedLocations = await this.snapCoordinates(allCoords);

        // 2. Group vehicles by unique profiles (avoidance polygons)
        const profiles = new Map<string, { vehiclesIdx: number[], avoidPolygons: [number, number][][] }>();

        vehicles.forEach((v, idx) => {
            const forbidden = this.getForbiddenZonesForVehicle(v.type.tags, zones);
            const avoidPolygons = forbidden.map(z => z.coordinates);
            const signature = JSON.stringify(avoidPolygons);

            console.log(`[Profile Analysis] Vehicle ${idx} (${v.type.label}):
              - Tags: ${JSON.stringify(v.type.tags)}
              - Forbidden Zones: ${forbidden.map(fz => fz.name).join(", ") || "None"}
              - Polygon Signature Digest: ${signature.length > 20 ? signature.substring(0, 20) + "..." : signature}`);

            if (!profiles.has(signature)) {
                profiles.set(signature, { vehiclesIdx: [], avoidPolygons });
            }
            profiles.get(signature)!.vehiclesIdx.push(idx);
        });

        console.log(`📡 Identified ${profiles.size} unique routing profiles`);

        // 3. Fetch matrices for each profile
        const matrices: Record<string, number[][]> = {};
        let profileCounter = 0;
        const vehicleToProfile = new Array(vehicles.length);

        for (const [sig, data] of profiles.entries()) {
            const profileName = `p${profileCounter++}`;
            console.log(`📥 Fetching matrix for profile ${profileName} (${data.vehiclesIdx.length} vehicles)`);
            const matrix = await this.getMatrix(snappedLocations, data.avoidPolygons);
            matrices[profileName] = matrix;
            data.vehiclesIdx.forEach(vIdx => {
                vehicleToProfile[vIdx] = { name: profileName, avoidPolygons: data.avoidPolygons };
            });
        }

        // 4. VROOM Optimization with multi-matrix
        const vroomResult = await this.runVroomMulti(vehicles, jobs, matrices, vehicleToProfile);

        console.log(`🏁 VROOM Result:
          - Assigned Jobs: ${(vroomResult.routes || []).reduce((acc: number, r: any) => acc + (r.steps || []).filter((s: any) => s.type === "job").length, 0)}
          - Unassigned Jobs: ${vroomResult.unassigned?.length || 0}`);

        // Map unassigned jobs back to original descriptions
        const unassignedJobs = (vroomResult.unassigned || []).map((u: any) => {
            const jobIdx = u.id - vehicles.length;
            const originalJob = jobs[jobIdx];
            return {
                id: originalJob?.id || u.id.toString(),
                description: originalJob?.label || `Job ${jobIdx + 1}`,
                reason: "Restrictions or unreachable location"
            };
        });

        // Generate notices for the user
        const notices: any[] = [];

        // Notice for vehicles bypassed due to LEZ (Consolidated)
        vehicles.forEach((v, idx) => {
            const assignedRoute = (vroomResult.routes || []).find((r: any) => r.vehicle === idx);
            const jobSteps = assignedRoute?.steps?.filter((s: any) => s.type === "job") || [];
            const profile = vehicleToProfile[idx];

            if (profile?.avoidPolygons && profile.avoidPolygons.length > 0) {
                // Find which jobs (assigned or not) are in this vehicle's forbidden zones
                const forbiddenJobNames = jobs.map((job, jIdx) => {
                    const isForbidden = profile.avoidPolygons.some((poly: [number, number][]) =>
                        RoutingService.isPointInPolygon(job.coords, poly)
                    );
                    return isForbidden ? (job.label || `Job ${jIdx + 1}`) : null;
                }).filter((name: string | null) => name !== null);

                const vehicleLabel = v.type?.label || `Vehicle ${idx + 1}`;

                // Show notice if the vehicle has 0 jobs AND there were jobs it couldn't enter
                if (jobSteps.length === 0 && forbiddenJobNames.length > 0) {
                    notices.push({
                        title: `Vehicle: ${vehicleLabel}`,
                        message: `The vehicle "${vehicleLabel}" was bypassed for the following jobs because it lacks the required environmental labels (e.g. ECO, ZERO) to enter their restricted zones: ${forbiddenJobNames.join(", ")}.`,
                        type: "info"
                    });
                }
            }
        });

        // Fallback for general unassigned jobs (if not already covered by vehicle restrictions)
        if (notices.length === 0 && unassignedJobs.length > 0) {
            const jobNames = unassignedJobs.map((j: any) => j.description).join(", ");
            notices.push({
                title: "Unassigned Jobs",
                message: `The following jobs could not be assigned due to restrictions or reachability: ${jobNames}.`,
                type: "warning"
            });
        }

        // 5. Individual Routing with per-vehicle avoidance
        const vehicleRoutes = await this.calculateVehicleRoutesMulti(vroomResult, snappedLocations, vehicleToProfile, vehicles);

        // 6. Weather Analysis
        let weatherRoutes: any[] = [];
        const weatherAnalysis = await WeatherService.analyzeRoutes(
            vehicleRoutes,
            startTime
        );
        weatherRoutes = weatherAnalysis;

        const totalDistance = (vehicleRoutes as any[]).reduce((acc: number, r: any) => acc + (r.distance || 0), 0);
        const totalDuration = (vehicleRoutes as any[]).reduce((acc: number, r: any) => acc + (r.duration || 0), 0);

        return {
            coordinates: [],
            distance: totalDistance,
            duration: totalDuration,
            vehicleRoutes,
            weatherRoutes,
            unassignedJobs,
            notices
        };
    }

    private static isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
        const [lat, lon] = point;
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            const intersect = ((yi > lon) !== (yj > lon)) &&
                (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
            if (intersect) isInside = !isInside;
        }
        return isInside;
    }

    private static getForbiddenZonesForVehicle(vehicleTags: string[], allZones: Zone[]): Zone[] {
        return allZones.filter(zone => {
            const zType = (zone.type || "").toUpperCase();

            // Priority: if zone specifies required tags, check compliance
            if (zone.requiredTags && zone.requiredTags.length > 0) {
                const isCompliant = zone.requiredTags.some(tag => vehicleTags.includes(tag));
                return !isCompliant;
            }

            // Fallback: Permanent restrictions (Pedestrian zones) are forbidden for everyone
            if (zType === "PEDESTRIAN") {
                return true;
            }

            // If it's a generic Restricted/Environmental zone without specific requirements,
            // we assume it's forbidden for vehicles with NO labels at all.
            if (zType === "RESTRICTED" || zType === "LEZ" || zType === "ENVIRONMENTAL") {
                return vehicleTags.length === 0;
            }

            return false;
        });
    }

    private static async snapCoordinates(coordinates: [number, number][]): Promise<[number, number][]> {
        try {
            const res = await fetch(SNAP_URL, {
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

    private static async getMatrix(locations: [number, number][], avoidPolygons?: [number, number][][]): Promise<number[][]> {
        // if (!this.getApiKey()) throw new Error("ORS API key missing");

        // ORS expects [lon, lat]
        const orsLocations = locations.map(([lat, lon]) => [lon, lat]);

        const body: any = {
            locations: orsLocations,
            metrics: ["distance", "duration"],
            units: "m"
        };

        // Note: We DO NOT send options.avoid_polygons to the Matrix API because it often 
        // triggers "Search exceeds limit of visited nodes" (Error 6020) on complex LEZ areas.
        // Instead, we rely on our Manual Matrix Penalization below to block jobs inside LEZs.

        const res = await fetch(`${ORS_URL}/matrix/driving-car`, {
            method: "POST",
            headers: {
                // Authorization: this.getApiKey()!,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ ORS Matrix failed [${res.status}]:`, errorText);
            throw new Error(`ORS Matrix failed: ${errorText}`);
        }
        const data = await res.json();

        // Detect which locations are in forbidden zones for manual penalization
        const isLocForbidden = locations.map(loc =>
            (avoidPolygons || []).some(poly => this.isPointInPolygon(loc, poly))
        );

        const forbiddenCount = isLocForbidden.filter(f => f).length;
        if (forbiddenCount > 0) {
            console.log(`🛡️  RoutingService: ${forbiddenCount}/${locations.length} locations fall in forbidden zones for this profile`);
        }

        // Create cost matrix (distance * 1 + duration * 0.3 as per your logic)
        return Array.from({ length: locations.length }, (_, i) =>
            Array.from({ length: locations.length }, (_, j) => {
                if (i === j) return 0;

                // Manual Penalization: if source or dest is in a forbidden zone, massive cost
                if (isLocForbidden[i] || isLocForbidden[j]) {
                    return ROUTING_CONFIG.UNREACHABLE_COST;
                }

                const d = data.distances?.[i]?.[j];
                const t = data.durations?.[i]?.[j];

                // If point is unreachable from ORS perspective
                if (d === null || d === undefined || t === null || t === undefined) {
                    return ROUTING_CONFIG.UNREACHABLE_COST;
                }

                return Math.round(d * ROUTING_CONFIG.COST_PER_METER + t * ROUTING_CONFIG.COST_PER_SECOND);
            })
        );
    }

    private static async runVroomMulti(
        vehicles: FleetVehicle[],
        jobs: any[],
        matrices: Record<string, number[][]>,
        vehicleToProfile: any[]
    ): Promise<any> {
        const payload = {
            vehicles: vehicles.map((v, idx) => ({
                id: idx,
                start_index: idx,
                profile: vehicleToProfile[idx].name,
                capacity: [ROUTING_CONFIG.MAX_CAPACITY]
            })),
            jobs: jobs.map((job, jidx) => ({
                id: vehicles.length + jidx,
                location_index: vehicles.length + jidx,
                service: ROUTING_CONFIG.DEFAULT_SERVICE_TIME,
                delivery: [1],
                description: job.label || `Job ${jidx + 1}`
            })),
            matrices: Object.entries(matrices).reduce((acc: any, [name, matrix]) => {
                acc[name] = { durations: matrix };
                return acc;
            }, {})
        };

        const res = await fetch(VROOM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`VROOM failed: ${await res.text()}`);
        return await res.json();
    }

    private static async calculateVehicleRoutesMulti(
        vroomResult: any,
        allLocations: [number, number][],
        vehicleToProfile: any[],
        originalVehicles: FleetVehicle[]
    ): Promise<any[]> {
        const results = [];

        // Track unassigned jobs if needed
        const unassignedMap = new Set((vroomResult.unassigned || []).map((u: any) => u.id));

        for (const route of (vroomResult.routes || [])) {
            const vIdx = route.vehicle;
            const profile = vehicleToProfile[vIdx];
            const assignedJobs = (route.steps || []).filter((s: any) => s.type === "job");

            if (assignedJobs.length === 0) continue;

            const waypoints = route.steps
                .filter((s: any) => typeof s.location_index === "number")
                .map((s: any) => allLocations[s.location_index]);

            if (waypoints.length < 2) continue;

            const orsWaypoints = waypoints.map(([lat, lon]: [number, number]) => [lon, lat]);
            const body: any = {
                coordinates: orsWaypoints,
                instructions: false,
                preference: "recommended",
                radiuses: orsWaypoints.map(() => ROUTING_CONFIG.DEFAULT_RADIUS)
            };

            const avoid_polygons = this.formatAvoidPolygons(profile.avoidPolygons || []);
            if (avoid_polygons) {
                body.options = { avoid_polygons };
                console.log(`📡 ORS Directions: Profile ${profile.name} avoiding zones for vehicle ${vIdx}`);
            }

            // Pre-check: Are any waypoints inside forbidden zones?
            const waypointsInForbiddenZone = waypoints.filter((wp: [number, number]) =>
                (profile.avoidPolygons || []).some((poly: [number, number][]) =>
                    RoutingService.isPointInPolygon(wp, poly)
                )
            );

            if (waypointsInForbiddenZone.length > 0) {
                const vehicleLabel = originalVehicles[vIdx].type?.label || `Vehicle ${vIdx + 1}`;
                console.log(`🚫 Vehicle ${vIdx} (${vehicleLabel}): ${waypointsInForbiddenZone.length} waypoints are inside forbidden zones`);
                results.push({
                    vehicleId: originalVehicles[vIdx].id,
                    coordinates: [],
                    distance: 0,
                    duration: 0,
                    color: ROUTE_COLORS[vIdx % ROUTE_COLORS.length],
                    jobsAssigned: 0,
                    error: `El vehículo "${vehicleLabel}" no puede acceder a la zona de bajas emisiones (LEZ) porque no dispone de las etiquetas ambientales requeridas (ej: ECO, CERO).`
                });
                continue;
            }

            const res = await fetch(`${ORS_URL}/directions/driving-car/geojson`, {
                method: "POST",
                headers: {
                    // Authorization: this.getApiKey()!,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const feat = data.features[0];
                    results.push({
                        vehicleId: originalVehicles[vIdx].id,
                        coordinates: feat.geometry.coordinates.map(([lon, lat]: any) => [lat, lon]),
                        distance: Math.round(feat.properties.summary.distance),
                        duration: Math.round(feat.properties.summary.duration),
                        color: ROUTE_COLORS[vIdx % ROUTE_COLORS.length],
                        jobsAssigned: route.steps.filter((s: any) => s.type === "job").length
                    });
                }
            } else {
                const errorText = await res.text();
                let errorMessage = "Route failed due to restrictions";
                let isLezError = false;

                try {
                    const errorData = JSON.parse(errorText);
                    const orsMsg = errorData.error?.message || "";

                    // Detect ORS "could not find routable point" which often means the point is in an avoided area
                    if (orsMsg.includes("routable point") || orsMsg.includes("400.0 meters")) {
                        isLezError = true;
                        const vehicleLabel = originalVehicles[vIdx].type?.label || `Vehicle ${vIdx + 1}`;
                        errorMessage = `El vehículo "${vehicleLabel}" no puede acceder a uno de los destinos asignados. Esto puede deberse a restricciones de zona de bajas emisiones (LEZ) o a que el punto está en una zona peatonal.`;
                    } else {
                        errorMessage = orsMsg || errorMessage;
                    }
                } catch (e) { }

                results.push({
                    vehicleId: originalVehicles[vIdx].id,
                    coordinates: [],
                    distance: 0,
                    duration: route.duration,
                    color: ROUTE_COLORS[vIdx % ROUTE_COLORS.length],
                    jobsAssigned: 0,
                    error: errorMessage
                });
            }
        }
        return results;
    }

}
