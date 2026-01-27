// lib/services/routing-service.ts
import {
    FleetVehicle,
    FleetJob,
    RouteData,
    Zone,
    VehicleRoute,
    LatLon,
    VroomResult,
    VroomStep,
    OrsMatrixResponse,
    OrsDirectionsResponse
} from "@/lib/types";
import { THEME } from "@/lib/theme";
import { ORS_URL, VROOM_URL, SNAP_URL, ROUTING_CONFIG } from "@/lib/config";
import { WeatherService } from "./weather-service";

const { route: ROUTE_COLORS } = THEME.colors;

export interface OptimizeOptions {
    startTime?: string;
    zones?: Zone[];
}

interface ProfileData {
    name: string;
    avoidPolygons: LatLon[][];
}

interface JobLocation {
    id: string;
    coords: LatLon;
    label: string;
}

export class RoutingService {
    /**
     * Main orchestrator function: Snap -> Matrix -> VROOM -> Routing -> Weather
     */
    static async optimize(
        vehicles: FleetVehicle[],
        jobs: (FleetJob | JobLocation)[],
        options: OptimizeOptions = {}
    ): Promise<RouteData> {
        const startTime = options.startTime || new Date().toISOString();
        const zones = options.zones || [];

        // 1. Snapping
        const allCoords = [...vehicles.map(v => v.coords), ...jobs.map(j => j.coords)];
        const snappedLocations = await this.snapCoordinates(allCoords);

        // 2. Profiles Mapping
        const vehicleProfiles = vehicles.map(v => {
            const forbidden = this.getForbiddenZonesForVehicle(v.type.tags, zones);
            return forbidden.map(z => z.coordinates);
        });

        const uniqueProfiles = this.getUniqueProfiles(vehicleProfiles);
        const matrices = await this.getMatricesForProfiles(snappedLocations, uniqueProfiles);

        // Map each vehicle index to its profile name and avoid polygons
        const vehicleToProfile = vehicles.map((_, idx) => {
            const currentAvoidPolygons = vehicleProfiles[idx];
            const profile = uniqueProfiles.find(p => JSON.stringify(p.avoidPolygons) === JSON.stringify(currentAvoidPolygons))!;
            return {
                name: profile.name,
                avoidPolygons: currentAvoidPolygons
            };
        });

        // 3. VROOM Optimization
        const vroomResult = await this.runVroom(vehicles, jobs, matrices, vehicleToProfile);

        // 4. Data Processing
        const unassignedJobs = this.processUnassignedJobs(vroomResult, jobs, vehicles.length);
        const notices = this.generateNotices(vroomResult, vehicles, jobs, vehicleToProfile);

        // 5. Individual Routing
        const vehicleRoutes = await this.calculateVehicleRoutes(vroomResult, snappedLocations, vehicleToProfile, vehicles);

        // 6. Weather Analysis
        const weatherRoutes = await WeatherService.analyzeRoutes(vehicleRoutes, startTime);

        return {
            coordinates: [],
            distance: vehicleRoutes.reduce((acc, r) => acc + (r.distance || 0), 0),
            duration: vehicleRoutes.reduce((acc, r) => acc + (r.duration || 0), 0),
            vehicleRoutes,
            weatherRoutes,
            unassignedJobs,
            notices
        };
    }

    private static getUniqueProfiles(vehicleAvoidPolygons: LatLon[][][]): ProfileData[] {
        const profilesMap = new Map<string, LatLon[][]>();
        vehicleAvoidPolygons.forEach(polys => {
            profilesMap.set(JSON.stringify(polys), polys);
        });

        return Array.from(profilesMap.entries()).map(([_, avoidPolygons], idx) => ({
            name: `p${idx}`,
            avoidPolygons
        }));
    }

    private static async getMatricesForProfiles(locations: LatLon[], profiles: ProfileData[]): Promise<Record<string, number[][]>> {
        const matrices: Record<string, number[][]> = {};
        for (const profile of profiles) {
            matrices[profile.name] = await this.getMatrix(locations, profile.avoidPolygons);
        }
        return matrices;
    }

    private static processUnassignedJobs(vroomResult: VroomResult, jobs: (FleetJob | JobLocation)[], vehicleOffset: number) {
        return (vroomResult.unassigned || []).map(u => {
            const jobIdx = u.id - vehicleOffset;
            const originalJob = jobs[jobIdx];
            return {
                id: originalJob?.id.toString() || u.id.toString(),
                description: originalJob?.label || `Job ${jobIdx + 1}`,
                reason: "Restrictions or unreachable location"
            };
        });
    }

    private static generateNotices(
        vroomResult: VroomResult,
        vehicles: FleetVehicle[],
        jobs: (FleetJob | JobLocation)[],
        vehicleToProfile: { avoidPolygons: LatLon[][] }[]
    ) {
        const notices: { title: string; message: string; type: "info" | "warning" }[] = [];

        vehicles.forEach((v, idx) => {
            const assignedRoute = vroomResult.routes.find(r => r.vehicle === idx);
            const jobSteps = assignedRoute?.steps.filter(s => s.type === "job") || [];
            const profile = vehicleToProfile[idx];

            if (jobSteps.length === 0 && profile.avoidPolygons.length > 0) {
                const forbiddenJobNames = jobs
                    .filter(job => profile.avoidPolygons.some(poly => this.isPointInPolygon(job.coords, poly)))
                    .map(job => job.label);

                if (forbiddenJobNames.length > 0) {
                    const label = v.type.label;
                    notices.push({
                        title: `Vehicle: ${label}`,
                        message: `The vehicle "${label}" was bypassed for: ${forbiddenJobNames.join(", ")} due to environmental restrictions.`,
                        type: "info"
                    });
                }
            }
        });

        return notices;
    }

    private static async calculateVehicleRoutes(
        vroomResult: VroomResult,
        allLocations: LatLon[],
        vehicleToProfile: { name: string; avoidPolygons: LatLon[][] }[],
        originalVehicles: FleetVehicle[]
    ): Promise<VehicleRoute[]> {
        const results: VehicleRoute[] = [];

        for (const route of vroomResult.routes) {
            const vIdx = route.vehicle;
            const profile = vehicleToProfile[vIdx];
            const waypoints = route.steps
                .filter(s => typeof s.location_index === "number")
                .map(s => allLocations[s.location_index!]);

            if (waypoints.length < 2) continue;

            const vehicle = originalVehicles[vIdx];
            const color = ROUTE_COLORS[vIdx % ROUTE_COLORS.length];

            // LEZ Pre-check
            const hasForbiddenWaypoint = waypoints.some(wp =>
                profile.avoidPolygons.some(poly => this.isPointInPolygon(wp, poly))
            );

            if (hasForbiddenWaypoint) {
                results.push(this.createErrorRoute(vehicle.id, color, `Vehicle "${vehicle.type.label}" cannot enter LEZ zones.`));
                continue;
            }

            results.push(await this.fetchOrsRoute(vehicle.id, waypoints, profile.avoidPolygons, color, route.steps));
        }
        return results;
    }

    private static async fetchOrsRoute(
        vehicleId: string | number,
        waypoints: LatLon[],
        avoidPolygons: LatLon[][],
        color: string,
        steps: VroomStep[]
    ): Promise<VehicleRoute> {
        const orsWaypoints = waypoints.map(([lat, lon]) => [lon, lat]);
        const avoid_polygons = this.formatAvoidPolygons(avoidPolygons);

        const body = {
            coordinates: orsWaypoints,
            instructions: false,
            preference: "recommended",
            radiuses: orsWaypoints.map(() => ROUTING_CONFIG.DEFAULT_RADIUS),
            ...(avoid_polygons && { options: { avoid_polygons } })
        };

        try {
            const res = await fetch(`${ORS_URL}/directions/driving-car/geojson`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(await res.text());

            const data: OrsDirectionsResponse = await res.json();
            const feat = data.features[0];

            return {
                vehicleId,
                coordinates: feat.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
                distance: Math.round(feat.properties.summary.distance),
                duration: Math.round(feat.properties.summary.duration),
                color,
                jobsAssigned: steps.filter(s => s.type === "job").length
            };
        } catch (e) {
            return this.createErrorRoute(vehicleId, color, "Route failed due to restrictions or reachability.");
        }
    }

    private static createErrorRoute(vehicleId: string | number, color: string, error: string): VehicleRoute {
        return {
            vehicleId,
            coordinates: [],
            distance: 0,
            duration: 0,
            color,
            jobsAssigned: 0,
            error
        };
    }

    private static async getMatrix(locations: LatLon[], avoidPolygons: LatLon[][]): Promise<number[][]> {
        const orsLocations = locations.map(([lat, lon]) => [lon, lat]);
        const body = {
            locations: orsLocations,
            metrics: ["distance", "duration"],
            units: "m"
        };

        const res = await fetch(`${ORS_URL}/matrix/driving-car`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(`ORS Matrix failed: ${await res.text()}`);

        const data: OrsMatrixResponse = await res.json();
        const isLocForbidden = locations.map(loc => avoidPolygons.some(poly => this.isPointInPolygon(loc, poly)));

        return Array.from({ length: locations.length }, (_, i) =>
            Array.from({ length: locations.length }, (_, j) => {
                if (i === j) return 0;
                if (isLocForbidden[i] || isLocForbidden[j]) return ROUTING_CONFIG.UNREACHABLE_COST;

                const d = data.distances?.[i]?.[j];
                const t = data.durations?.[i]?.[j];

                if (d === undefined || t === undefined || d === null || t === null) return ROUTING_CONFIG.UNREACHABLE_COST;

                return Math.round(d * ROUTING_CONFIG.COST_PER_METER + t * ROUTING_CONFIG.COST_PER_SECOND);
            })
        );
    }

    private static async runVroom(
        vehicles: FleetVehicle[],
        jobs: (FleetJob | JobLocation)[],
        matrices: Record<string, number[][]>,
        vehicleToProfile: { name: string }[]
    ): Promise<VroomResult> {
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
                description: job.label
            })),
            matrices: Object.entries(matrices).reduce((acc: Record<string, { durations: number[][] }>, [name, matrix]) => {
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

    private static async snapCoordinates(coordinates: LatLon[]): Promise<LatLon[]> {
        try {
            const res = await fetch(SNAP_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates })
            });
            if (!res.ok) return coordinates;
            const data = await res.json();
            return data.snapped.map((s: { snapped: boolean; location: LatLon }, idx: number) => s.snapped ? s.location : coordinates[idx]);
        } catch (e) {
            return coordinates;
        }
    }

    private static formatAvoidPolygons(avoidPolygons: LatLon[][]) {
        if (!avoidPolygons || avoidPolygons.length === 0) return null;
        const coords = avoidPolygons
            .map(poly => {
                if (poly.length < 3) return null;
                const closed = [...poly];
                if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
                    closed.push(closed[0]);
                }
                return [closed.map(([lat, lon]) => [lon, lat])];
            })
            .filter((p): p is [number, number][][] => p !== null);

        return coords.length > 0 ? { type: "MultiPolygon", coordinates: coords } : null;
    }

    private static isPointInPolygon(point: LatLon, polygon: LatLon[]): boolean {
        const [px, py] = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [ix, iy] = polygon[i];
            const [jx, jy] = polygon[j];

            const intersects =
                (iy > py) !== (jy > py) &&
                px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;

            if (intersects) inside = !inside;
        }

        return inside;
    }


    private static getForbiddenZonesForVehicle(vehicleTags: string[], allZones: Zone[]): Zone[] {
        return allZones.filter(zone => {
            const type = (zone.type || "").toUpperCase();
            if (zone.requiredTags?.length) return !zone.requiredTags.some(tag => vehicleTags.includes(tag));
            if (type === "PEDESTRIAN") return true;
            return ["RESTRICTED", "LEZ", "ENVIRONMENTAL"].includes(type) && vehicleTags.length === 0;
        });
    }
}
