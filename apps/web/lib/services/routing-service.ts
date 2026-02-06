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
  OrsDirectionsResponse,
  OptimizeOptions,
} from "@gis/shared";
import { THEME } from "@/lib/theme";
import { ORS_URL, VROOM_URL, SNAP_URL, ROUTING_CONFIG } from "@/lib/config";
import { WeatherService } from "./weather-service";
import { getForbiddenZones, getZoneForbiddenReason } from "@/lib/helpers/zone-access-helper";

const { route: ROUTE_COLORS } = THEME.colors;

interface ProfileData {
  name: string;
  avoidPolygons: LatLon[][];
}

export class RoutingService {
  /**
   * Main orchestrator function: Snap -> Matrix -> VROOM -> Routing -> Weather
   */
  static async optimize(
    vehicles: FleetVehicle[],
    jobs: FleetJob[],
    options: OptimizeOptions = {},
  ): Promise<RouteData> {
    const startTime = options.startTime || new Date().toISOString();
    const zones = options.zones || [];

    console.log(
      `[Optimize] Iniciando optimización con ${vehicles.length} vehículos, ${jobs.length} jobs, ${zones.length} zonas`,
    );
    if (zones.length > 0) {
      console.log(
        "[Optimize] Zonas recibidas:",
        zones.map((z) => ({
          id: z.id,
          name: z.name,
          type: z.type,
          requiredTags: z.requiredTags,
          hasCoordinates: !!z.coordinates && z.coordinates.length > 0,
        })),
      );
    }

    // 1. Snapping
    console.log(
      "[Optimize] Jobs:",
      jobs.map((j) => ({
        id: j.id,
        label: j.label,
        position: j.position,
        assignedVehicleId: j.assignedVehicleId,
      })),
    );

    // Verificar si los jobs están dentro de zonas LEZ
    console.log("[Optimize] Verificando si jobs están dentro de zonas...");
    jobs.forEach((job, idx) => {
      console.log(
        `[Optimize] Verificando Job "${job.label}" en posición [${job.position[0].toFixed(4)}, ${job.position[1].toFixed(4)}]`,
      );
      zones.forEach((zone) => {
        if (zone.coordinates && zone.coordinates.length > 0) {
          const isInside = this.isPointInZone(job.position, zone.coordinates);
          if (isInside) {
            console.log(
              `[Optimize] ⚠️⚠️⚠️ Job "${job.label}" está DENTRO de zona "${zone.name}" (${zone.type})`,
            );
          }
        }
      });
    });

    const allCoords = [
      ...vehicles.map((v) => v.position),
      ...jobs.map((j) => j.position),
    ];
    const snappedLocations = await this.snapCoordinates(allCoords);

    // 2. Profiles Mapping
    console.log("[Optimize] Mapeando perfiles de vehículos...");
    const vehicleProfiles = vehicles.map((v, idx) => {
      console.log(`[Profile] Procesando vehículo ${idx}:`, {
        id: v.id,
        label: v.label,
        typeLabel: v.type.label,
        tags: v.type.tags,
      });
      const forbidden = this.getForbiddenZonesForVehicle(v.type.tags, zones);
      console.log(
        `[Profile] Vehículo ${idx} (${v.type.label || v.label}) - Tags: [${v.type.tags.join(", ")}] - Zonas prohibidas: ${forbidden.length}`,
      );
      if (forbidden.length > 0) {
        console.log(
          `[Profile] Zonas prohibidas para vehículo ${idx}:`,
          forbidden.map((z) => ({
            id: z.id,
            name: z.name,
            type: z.type,
            requiredTags: z.requiredTags,
          })),
        );
      }
      return forbidden.map((z) => z.coordinates);
    });

    const uniqueProfiles = this.getUniqueProfiles(vehicleProfiles);
    const matrices = await this.getMatricesForProfiles(
      snappedLocations,
      uniqueProfiles,
    );

    // Map each vehicle index to its profile name and avoid polygons
    const vehicleToProfile = vehicles.map((_, idx) => {
      const currentAvoidPolygons = vehicleProfiles[idx];
      const profile = uniqueProfiles.find(
        (p) =>
          JSON.stringify(p.avoidPolygons) ===
          JSON.stringify(currentAvoidPolygons),
      )!;
      return {
        name: profile.name,
        avoidPolygons: currentAvoidPolygons,
      };
    });

    // 3. VROOM Optimization
    const vroomResult = await this.runVroom(
      vehicles,
      jobs,
      matrices,
      vehicleToProfile,
    );

    // 3.5. Validar rutas asignadas - detectar si VROOM asignó jobs prohibidos por falta de alternativas
    console.log("[Optimize] Validando asignaciones de VROOM...");
    const invalidAssignments: { vehicleIdx: number; jobLabels: string[] }[] =
      [];

    vroomResult.routes.forEach((route) => {
      const vIdx = route.vehicle;
      const profile = vehicleToProfile[vIdx];

      // Si este vehículo tiene zonas prohibidas
      if (profile.avoidPolygons.length > 0) {
        const assignedJobSteps = route.steps.filter((s) => s.type === "job");
        const forbiddenJobsAssigned: string[] = [];

        assignedJobSteps.forEach((step) => {
          const jobIdx = (step.id as number) - vehicles.length;
          const job = jobs[jobIdx];

          if (job) {
            // Verificar si este job está en zona prohibida para este vehículo
            const isInForbiddenZone = profile.avoidPolygons.some((poly) =>
              this.isPointInZone(job.position, poly),
            );

            if (isInForbiddenZone) {
              console.log(
                `[Optimize] ❌ ASIGNACIÓN INVÁLIDA: Vehículo ${vIdx} (${vehicles[vIdx].type.label}) no puede hacer "${job.label}" (en zona LEZ prohibida)`,
              );
              forbiddenJobsAssigned.push(job.label);
            }
          }
        });

        if (forbiddenJobsAssigned.length > 0) {
          invalidAssignments.push({
            vehicleIdx: vIdx,
            jobLabels: forbiddenJobsAssigned,
          });
        }
      }
    });

    // NO eliminar rutas asignadas inválidas - mantener jobs asignados pero sin polygon
    // Solo marcar para no pintar rutas visuales cuando hay violaciones legales
    if (invalidAssignments.length > 0) {
      console.log(
        "[Optimize] ⚠️ Manteniendo asignaciones inválidas pero sin pintar polygons (violaciones legales):",
        invalidAssignments,
      );
    }

    // 4. Data Processing
    const baseUnassignedJobs = this.processUnassignedJobs(
      vroomResult,
      jobs,
      vehicles.length,
    );

    // NO agregar jobs inválidos a unassignedJobs - mantener asignados pero sin polygon
    // const forcedAssignmentErrors = invalidAssignments.flatMap(inv =>
    //   inv.jobLabels.map(jobLabel => ({
    //     id: jobs.find(j => j.label === jobLabel)?.id.toString() || jobLabel,
    //     description: jobLabel,
    //     reason: `El vehículo ${vehicles[inv.vehicleIdx].type.label || vehicles[inv.vehicleIdx].label} no tiene etiqueta medioambiental válida para entrar a la zona LEZ`
    //   }))
    // );

    const unassignedJobs = baseUnassignedJobs; // [...baseUnassignedJobs, ...forcedAssignmentErrors];
    const notices = this.generateNotices(
      vroomResult,
      vehicles,
      jobs,
      vehicleToProfile,
      invalidAssignments,
    );

    // 5. Individual Routing
    const vehicleRoutes = await this.calculateVehicleRoutes(
      vroomResult,
      snappedLocations,
      vehicleToProfile,
      vehicles,
      jobs,
      invalidAssignments,
    );

    // 6. Weather Analysis
    const weatherRoutes = await WeatherService.analyzeRoutes(
      vehicleRoutes,
      startTime,
    );

    return {
      coordinates: [],
      distance: vehicleRoutes.reduce((acc, r) => acc + (r.distance || 0), 0),
      duration: vehicleRoutes.reduce((acc, r) => acc + (r.duration || 0), 0),
      vehicleRoutes,
      weatherRoutes,
      unassignedJobs,
      notices,
    };
  }

  private static getUniqueProfiles(
    vehicleAvoidPolygons: LatLon[][][],
  ): ProfileData[] {
    const profilesMap = new Map<string, LatLon[][]>();
    vehicleAvoidPolygons.forEach((polys) => {
      profilesMap.set(JSON.stringify(polys), polys);
    });

    return Array.from(profilesMap.entries()).map(([_, avoidPolygons], idx) => ({
      name: `p${idx}`,
      avoidPolygons,
    }));
  }

  private static async getMatricesForProfiles(
    locations: LatLon[],
    profiles: ProfileData[],
  ): Promise<Record<string, number[][]>> {
    const matrices: Record<string, number[][]> = {};
    for (const profile of profiles) {
      matrices[profile.name] = await this.getMatrix(
        locations,
        profile.avoidPolygons,
      );
    }
    return matrices;
  }

  private static processUnassignedJobs(
    vroomResult: VroomResult,
    jobs: FleetJob[],
    vehicleOffset: number,
  ) {
    return (vroomResult.unassigned || []).map((u) => {
      const jobIdx = u.id - vehicleOffset;
      const originalJob = jobs[jobIdx];
      return {
        id: originalJob?.id.toString() || u.id.toString(),
        description: originalJob?.label || `Job ${jobIdx + 1}`,
        reason: "No suitable vehicle available or unreachable location",
      };
    });
  }

  private static generateNotices(
    vroomResult: VroomResult,
    vehicles: FleetVehicle[],
    jobs: FleetJob[],
    vehicleToProfile: { avoidPolygons: LatLon[][] }[],
    invalidAssignments: { vehicleIdx: number; jobLabels: string[] }[] = [],
  ) {
    const notices: {
      title: string;
      message: string;
      type: "info" | "warning";
    }[] = [];

    // Para cada vehículo, verificar si tiene zonas prohibidas y jobs dentro de ellas
    vehicles.forEach((v, idx) => {
      const profile = vehicleToProfile[idx];

      // Si el vehículo tiene zonas prohibidas (no tiene etiqueta válida)
      if (profile.avoidPolygons.length > 0) {
        // Encontrar jobs que están dentro de las zonas prohibidas
        const forbiddenJobs = jobs.filter((job) =>
          profile.avoidPolygons.some((poly) =>
            this.isPointInZone(job.position, poly),
          ),
        );

        if (forbiddenJobs.length > 0) {
          const forbiddenJobNames = forbiddenJobs.map((job) => job.label);
          const label = v.type.label || v.label || `Vehículo ${idx + 1}`;

          // Verificar si este vehículo tiene jobs asignados en la ruta
          const assignedRoute = vroomResult.routes.find(
            (r) => r.vehicle === idx,
          );
          const assignedJobIds =
            assignedRoute?.steps
              .filter((s) => s.type === "job")
              .map((s) => s.id) || [];

          // Si no tiene ningún job asignado de los prohibidos, mostrar aviso
          // Pero no mostrar si ya hay un error de asignación inválida para este vehículo
          const hasInvalidAssignment = invalidAssignments.some(
            (inv) => inv.vehicleIdx === idx,
          );
          const hasNoForbiddenAssigned = !forbiddenJobs.some((fj) =>
            assignedJobIds.includes(vehicles.length + jobs.indexOf(fj)),
          );

          if (
            hasNoForbiddenAssigned &&
            forbiddenJobs.length > 0 &&
            !hasInvalidAssignment
          ) {
            notices.push({
              title: `Vehículo: ${label}`,
              message: `El vehículo "${label}" no puede realizar: ${forbiddenJobNames.join(", ")} debido a restricciones medioambientales (zona LEZ).`,
              type: "warning",
            });
          }
        }
      }
    });

    // Agregar notices para asignaciones inválidas (cuando VROOM no tuvo alternativa)
    invalidAssignments.forEach((inv) => {
      const vehicle = vehicles[inv.vehicleIdx];
      const label =
        vehicle.type.label || vehicle.label || `Vehículo ${inv.vehicleIdx + 1}`;
      notices.push({
        title: `Error: Vehículo ${label}`,
        message: `El vehículo "${label}" NO puede realizar: ${inv.jobLabels.join(", ")} porque no tiene etiqueta medioambiental válida para entrar a la zona LEZ. Necesita agregar otro vehículo con etiqueta válida (0, ECO, B, C).`,
        type: "warning",
      });
    });

    return notices;
  }

  private static async calculateVehicleRoutes(
    vroomResult: VroomResult,
    allLocations: LatLon[],
    vehicleToProfile: { name: string; avoidPolygons: LatLon[][] }[],
    originalVehicles: FleetVehicle[],
    originalJobs: FleetJob[],
    invalidAssignments: { vehicleIdx: number; jobLabels: string[] }[] = [],
  ): Promise<VehicleRoute[]> {
    const results: VehicleRoute[] = [];
    const invalidVehicleIndices = new Set(
      invalidAssignments.map((inv) => inv.vehicleIdx),
    );

    for (const route of vroomResult.routes) {
      const vIdx = route.vehicle;

      // Saltar rutas inválidas (violaciones legales) - no pintar polygons
      if (invalidVehicleIndices.has(vIdx)) {
        console.log(
          `[CalculateRoutes] ⚠️ Saltando ruta para vehículo ${vIdx} (violación legal - no se pinta polygon)`,
        );
        continue;
      }

      const profile = vehicleToProfile[vIdx];
      const waypoints = route.steps
        .filter((s) => typeof s.location_index === "number")
        .map((s) => allLocations[s.location_index!]);

      if (waypoints.length < 2) continue;

      const vehicle = originalVehicles[vIdx];
      const color = ROUTE_COLORS[vIdx % ROUTE_COLORS.length];

      const vehicleRoute = await this.fetchOrsRoute(
        vehicle.id,
        waypoints,
        profile.avoidPolygons,
        color,
        route.steps,
        originalJobs,
        originalVehicles.length,
      );

      results.push(vehicleRoute);
    }
    return results;
  }

  private static async fetchOrsRoute(
    vehicleId: string | number,
    waypoints: LatLon[],
    avoidPolygons: LatLon[][],
    color: string,
    steps: VroomStep[],
    originalJobs: FleetJob[],
    vehicleOffset: number,
  ): Promise<VehicleRoute> {
    const orsWaypoints = waypoints.map(([lat, lon]) => [lon, lat]);
    const avoid_polygons = this.formatAvoidPolygons(avoidPolygons);

    const body = {
      coordinates: orsWaypoints,
      instructions: false,
      preference: "recommended",
      radiuses: orsWaypoints.map(() => ROUTING_CONFIG.DEFAULT_RADIUS),
    };

    try {
      const res = await fetch(`${ORS_URL}/directions/driving-car/geojson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());

      const data: OrsDirectionsResponse = await res.json();
      const feat = data.features[0];

      return {
        vehicleId,
        coordinates: feat.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon],
        ),
        distance: Math.round(feat.properties.summary.distance),
        duration: Math.round(feat.properties.summary.duration),
        color,
        jobsAssigned: steps.filter((s) => s.type === "job").length,
        assignedJobIds: steps
          .filter((s) => s.type === "job")
          .map((s) => {
            const jobIdx = (s.id as number) - vehicleOffset;
            return originalJobs[jobIdx]?.id;
          })
          .filter((id): id is string | number => id !== undefined),
        error: undefined,
      };
    } catch (e) {
      return this.createErrorRoute(
        vehicleId,
        color,
        "Error al calcular la ruta.",
      );
    }
  }

  private static createErrorRoute(
    vehicleId: string | number,
    color: string,
    error: string,
  ): VehicleRoute {
    return {
      vehicleId,
      coordinates: [],
      distance: 0,
      duration: 0,
      color,
      jobsAssigned: 0,
      error,
    };
  }

  private static async getMatrix(
    locations: LatLon[],
    avoidPolygons: LatLon[][],
  ): Promise<number[][]> {
    const orsLocations = locations.map(([lat, lon]) => [lon, lat]);
    const body = {
      locations: orsLocations,
      metrics: ["distance", "duration"],
      units: "m",
    };

    const res = await fetch(`${ORS_URL}/matrix/driving-car`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`ORS Matrix failed: ${await res.text()}`);

    const data: OrsMatrixResponse = await res.json();

    // Determinar qué ubicaciones están dentro de zonas prohibidas para este perfil
    const isLocForbidden = locations.map((loc, idx) => {
      const isForbidden = avoidPolygons.some((poly) =>
        this.isPointInZone(loc, poly),
      );
      if (isForbidden) {
        console.log(
          `[Matrix] ⚠️ Ubicación ${idx} (${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}) está en zona prohibida`,
        );
      }
      return isForbidden;
    });

    const forbiddenCount = isLocForbidden.filter(Boolean).length;
    if (forbiddenCount > 0) {
      console.log(
        `[Matrix] ${forbiddenCount} ubicaciones están en zonas prohibidas para este perfil`,
      );
    }

    return Array.from({ length: locations.length }, (_, i) =>
      Array.from({ length: locations.length }, (_, j) => {
        if (i === j) return 0;

        // Si cualquiera de los dos puntos está en zona prohibida, costo infinito
        if (isLocForbidden[i] || isLocForbidden[j]) {
          return ROUTING_CONFIG.UNREACHABLE_COST;
        }

        const d = data.distances?.[i]?.[j];
        const t = data.durations?.[i]?.[j];

        if (d === undefined || t === undefined || d === null || t === null)
          return ROUTING_CONFIG.UNREACHABLE_COST;

        return Math.round(
          d * ROUTING_CONFIG.COST_PER_METER +
            t * ROUTING_CONFIG.COST_PER_SECOND,
        );
      }),
    );
  }

  private static async runVroom(
    vehicles: FleetVehicle[],
    jobs: FleetJob[],
    matrices: Record<string, number[][]>,
    vehicleToProfile: { name: string }[],
  ): Promise<VroomResult> {
    console.log(
      "[Vroom] Vehicles mapping:",
      vehicles.map((v, idx) => ({
        idx,
        id: v.id,
        label: v.label,
      })),
    );

    // Generate all possible vehicle skills (all indices + 1)
    const allSkills = vehicles.map((_, idx) => idx + 1);

    const payload = {
      vehicles: vehicles.map((v, idx) => ({
        id: idx,
        start_index: idx,
        profile: vehicleToProfile[idx].name,
        capacity: [ROUTING_CONFIG.MAX_CAPACITY],
        // Each vehicle has its UNIQUE skill only
        // This ensures pinned jobs can ONLY go to their assigned vehicle
        skills: [idx + 1],
      })),
      jobs: jobs.map((job, jidx) => {
        const vehicleIdx = job.assignedVehicleId
          ? vehicles.findIndex(
              (v) => String(v.id) === String(job.assignedVehicleId),
            )
          : -1;

        const isPinned = vehicleIdx !== -1;

        console.log(`[Vroom] Job "${job.label}":`, {
          assignedVehicleId: job.assignedVehicleId,
          vehicleIdx,
          isPinned,
          willUseSkills: isPinned,
        });

        const jobPayload: any = {
          id: vehicles.length + jidx,
          location_index: vehicles.length + jidx,
          service: ROUTING_CONFIG.DEFAULT_SERVICE_TIME,
          delivery: [1],
          description: job.label,
        };

        // ONLY pinned jobs (stops/paradas) get skills
        // Regular jobs remain free for optimization
        if (isPinned) {
          jobPayload.skills = [vehicleIdx + 1];
        }

        return jobPayload;
      }),
      matrices: Object.entries(matrices).reduce(
        (acc: Record<string, { durations: number[][] }>, [name, matrix]) => {
          acc[name] = { durations: matrix };
          return acc;
        },
        {},
      ),
    };

    console.log(
      "[Vroom] Full payload vehicles:",
      JSON.stringify(payload.vehicles, null, 2),
    );
    console.log(
      "[Vroom] Full payload jobs:",
      JSON.stringify(payload.jobs, null, 2),
    );

    const res = await fetch(VROOM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`VROOM failed: ${await res.text()}`);

    const vroomResult = await res.json();

    console.log(
      "[Vroom] Response routes:",
      vroomResult.routes.map((r: any) => ({
        vehicle: r.vehicle,
        steps: r.steps.length,
        jobSteps: r.steps.filter((s: any) => s.type === "job").length,
      })),
    );

    return vroomResult;
  }

  private static async snapCoordinates(
    coordinates: LatLon[],
  ): Promise<LatLon[]> {
    try {
      const res = await fetch(SNAP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates }),
      });
      if (!res.ok) return coordinates;
      const data = await res.json();
      return data.snapped.map(
        (s: { snapped: boolean; location: LatLon }, idx: number) =>
          s.snapped ? s.location : coordinates[idx],
      );
    } catch (e) {
      return coordinates;
    }
  }

  private static formatAvoidPolygons(avoidPolygons: LatLon[][]) {
    if (!avoidPolygons || avoidPolygons.length === 0) return null;
    const coords = avoidPolygons
      .map((poly) => {
        if (poly.length < 3) return null;
        const closed = [...poly];
        if (
          closed[0][0] !== closed[closed.length - 1][0] ||
          closed[0][1] !== closed[closed.length - 1][1]
        ) {
          closed.push(closed[0]);
        }
        return [closed.map(([lat, lon]) => [lon, lat])];
      })
      .filter((p): p is [number, number][][] => p !== null);

    return coords.length > 0
      ? { type: "MultiPolygon", coordinates: coords }
      : null;
  }

  private static isPointInPolygon(point: LatLon, polygon: LatLon[]): boolean {
    const [px, py] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ix, iy] = polygon[i];
      const [jx, jy] = polygon[j];

      const intersects =
        iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;

      if (intersects) inside = !inside;
    }

    return inside;
  }

  /**
   * Aplana coordenadas de MultiPolygon que pueden tener profundidad 4D
   * [[[[[lat, lon]]]]] -> [[lat, lon], [lat, lon], ...]
   */
  private static flattenPolygonCoordinates(coords: any): LatLon[] {
    // Si ya es un array de tuplas [lat, lon], devolverlo
    if (
      Array.isArray(coords) &&
      coords.length > 0 &&
      Array.isArray(coords[0]) &&
      coords[0].length === 2 &&
      typeof coords[0][0] === "number" &&
      typeof coords[0][1] === "number"
    ) {
      return coords as LatLon[];
    }

    // Si tiene profundidad extra, aplanar recursivamente
    if (
      Array.isArray(coords) &&
      coords.length > 0 &&
      Array.isArray(coords[0])
    ) {
      // Tomar el primer polígono si es MultiPolygon
      return this.flattenPolygonCoordinates(coords[0]);
    }

    return coords as LatLon[];
  }

  /**
   * Verifica si un punto está dentro de una zona (maneja MultiPolygon)
   */
  private static isPointInZone(point: LatLon, zoneCoords: any): boolean {
    try {
      // Si es un array de polígonos (MultiPolygon), verificar cada uno
      if (Array.isArray(zoneCoords) && zoneCoords.length > 0) {
        // Caso 1: Array de arrays de arrays (MultiPolygon con profundidad 4D)
        if (Array.isArray(zoneCoords[0]) && Array.isArray(zoneCoords[0][0])) {
          // Iterar sobre cada polígono
          for (const polyGroup of zoneCoords) {
            if (Array.isArray(polyGroup)) {
              for (const poly of polyGroup) {
                const flatPoly = this.flattenPolygonCoordinates(poly);
                if (
                  flatPoly.length >= 3 &&
                  this.isPointInPolygon(point, flatPoly)
                ) {
                  return true;
                }
              }
            }
          }
        } else {
          // Caso 2: Array simple de coordenadas
          const flatPoly = this.flattenPolygonCoordinates(zoneCoords);
          if (flatPoly.length >= 3) {
            return this.isPointInPolygon(point, flatPoly);
          }
        }
      }
    } catch (e) {
      console.error("[isPointInZone] Error checking point:", e);
    }
    return false;
  }

  private static getForbiddenZonesForVehicle(
    vehicleTags: string[],
    allZones: Zone[],
  ): Zone[] {
    console.log(
      `[ForbiddenZones] Evaluando ${allZones.length} zonas para vehículo con tags: [${vehicleTags.join(", ") || "NONE"}]`,
    );

    const forbidden = getForbiddenZones(vehicleTags, allZones);

    if (forbidden.length > 0) {
      console.log(
        `[ForbiddenZones] Found ${forbidden.length} forbidden zones:`,
        forbidden.map((z) => {
          const reason = getZoneForbiddenReason(vehicleTags, z);
          return {
            id: z.id,
            name: z.name,
            type: z.type,
            requiredTags: z.requiredTags || [],
            reason,
          };
        }),
      );
    } else {
      console.log("[ForbiddenZones] No forbidden zones for this vehicle");
    }

    return forbidden;
  }

  /**
   * Calculate a real route for custom stops using ORS
   */
  static async calculateCustomStopRoute(
    vehicleId: string | number,
    waypoints: LatLon[],
    avoidPolygons: LatLon[][] = [],
  ): Promise<VehicleRoute | null> {
    if (waypoints.length < 2) return null;

    const orsWaypoints = waypoints.map(([lat, lon]) => [lon, lat]);
    const avoid_polygons = this.formatAvoidPolygons(avoidPolygons);

    const body = {
      coordinates: orsWaypoints,
      instructions: false,
      preference: "recommended",
      radiuses: orsWaypoints.map(() => ROUTING_CONFIG.DEFAULT_RADIUS),
    };

    try {
      console.log(
        `[CustomStopRoute] Requesting ORS for vehicle ${vehicleId} with ${waypoints.length} waypoints`,
      );
      console.log(
        `[CustomStopRoute] ORS URL: ${ORS_URL}/directions/driving-car/geojson`,
      );

      const res = await fetch(`${ORS_URL}/directions/driving-car/geojson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log(`[CustomStopRoute] ORS response status: ${res.status}`);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[CustomStopRoute] ORS error: ${errText}`);
        throw new Error(errText);
      }

      const data: OrsDirectionsResponse = await res.json();
      const feat = data.features[0];

      console.log(
        `[CustomStopRoute] Route calculated - distance: ${feat.properties.summary.distance}m, duration: ${feat.properties.summary.duration}s`,
      );

      return {
        vehicleId,
        coordinates: feat.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon],
        ),
        distance: Math.round(feat.properties.summary.distance),
        duration: Math.round(feat.properties.summary.duration),
        color: "#8B5CF6", // Purple for custom stop routes
        jobsAssigned: 0,
      };
    } catch (err) {
      console.error(
        `[CustomStopRoute] Error calculating custom stop route for vehicle ${vehicleId}:`,
        err,
      );
      return null;
    }
  }
}
