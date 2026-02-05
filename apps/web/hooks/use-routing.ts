import { useState, useCallback, useRef, useEffect } from "react";
import type {
  RouteData,
  FleetVehicle,
  FleetJob,
  CustomPOI,
  Zone,
  LayerVisibility,
  IGisResponse,
  RouteNotice,
} from "@gis/shared";
import { type RouteError } from "@/components/route-error-alert";

interface UseRoutingProps {
  fleetVehicles: FleetVehicle[];
  fleetJobs: FleetJob[];
  customPOIs: CustomPOI[];
  activeZones: Zone[];
  removeJob: (id: string | number) => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerVisibility>>;
}

export function useRouting({
  fleetVehicles,
  fleetJobs,
  customPOIs,
  activeZones,
  removeJob,
  setLayers,
}: UseRoutingProps) {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeErrors, setRouteErrors] = useState<RouteError[]>([]);
  const [routeNotices, setRouteNotices] = useState<RouteNotice[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<{
    start: [number, number] | null;
    end: [number, number] | null;
  }>({ start: null, end: null });

  const lastRoutingKeyRef = useRef<string>("");

  // Store current values in refs to make startRouting stable
  const fleetVehiclesRef = useRef(fleetVehicles);
  const fleetJobsRef = useRef(fleetJobs);
  const customPOIsRef = useRef(customPOIs);
  const activeZonesRef = useRef(activeZones);
  const removeJobRef = useRef(removeJob);
  const setLayersRef = useRef(setLayers);

  // Keep refs in sync with props
  useEffect(() => {
    fleetVehiclesRef.current = fleetVehicles;
  }, [fleetVehicles]);
  useEffect(() => {
    fleetJobsRef.current = fleetJobs;
  }, [fleetJobs]);
  useEffect(() => {
    customPOIsRef.current = customPOIs;
  }, [customPOIs]);
  useEffect(() => {
    activeZonesRef.current = activeZones;
  }, [activeZones]);
  useEffect(() => {
    removeJobRef.current = removeJob;
  }, [removeJob]);
  useEffect(() => {
    setLayersRef.current = setLayers;
  }, [setLayers]);

  // Cleanup route data when vehicles/jobs are removed
  useEffect(() => {
    if (routeData) {
      const currentVehicleIds = new Set(fleetVehicles.map((v) => String(v.id)));
      const hasMissingVehicle = routeData.vehicleRoutes?.some(
        (r) => !currentVehicleIds.has(String(r.vehicleId)),
      );

      if (
        hasMissingVehicle ||
        (fleetVehicles.length === 0 && routeData.vehicleRoutes?.length)
      ) {
        setRouteData(null);
        setRouteErrors([]);
        setRouteNotices([]);
        lastRoutingKeyRef.current = "";
      }
    }
  }, [fleetVehicles, routeData]);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteErrors([]);
    setRouteNotices([]);
    lastRoutingKeyRef.current = "";
    setRoutePoints({ start: null, end: null });
    setIsCalculatingRoute(false);
  }, []);

  // STABLE callback - uses refs to access current values
  const startRouting = useCallback(async () => {
    const vehicles = fleetVehiclesRef.current;
    const jobs = fleetJobsRef.current;
    const pois = customPOIsRef.current;
    const zones = activeZonesRef.current;
    const doRemoveJob = removeJobRef.current;
    const doSetLayers = setLayersRef.current;

    const key = JSON.stringify({
      vehicles: vehicles.map((v) => ({
        id: v.id,
        position: v.position,
        type: v.type,
      })),
      jobs: jobs.map((j) => ({ id: j.id, position: j.position })),
      selectedPOIs: pois
        .filter((poi) => poi.selectedForFleet)
        .map((p) => ({ id: p.id, position: p.position })),
    });

    if (key === lastRoutingKeyRef.current) return;
    lastRoutingKeyRef.current = key;

    const selectedPOIsAsJobs = pois
      .filter((poi) => poi.selectedForFleet)
      .map((poi) => ({
        id: poi.id,
        position: poi.position,
        label: `POI: ${poi.name}`,
      }));

    const allFleetJobs = [...jobs, ...selectedPOIsAsJobs];
    if (vehicles.length === 0 || allFleetJobs.length === 0) {
      alert("You need at least 1 vehicle and 1 job or selected POI");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      console.log("[useRouting] Starting route optimization with", {
        vehicleCount: vehicles.length,
        jobCount: allFleetJobs.length,
        vehicleIds: vehicles.map((v) => v.id),
        jobIds: allFleetJobs.map((j) => j.id),
        zoneCount: zones.length,
        zones:
          zones.length > 0
            ? zones.map((z) => ({
                id: z.id,
                name: z.name,
                type: z.type,
                requiredTags: z.requiredTags,
              }))
            : "No zones",
      });

      const res = await fetch("/api/gis/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: vehicles,
          jobs: allFleetJobs,
          startTime: new Date().toISOString(),
          zones: zones,
        }),
      });

      console.log("[useRouting] Response status:", res.status);

      const responseData: IGisResponse<RouteData> = await res.json();

      console.log("[useRouting] Response data:", {
        success: responseData.success,
        hasError: !!responseData.error,
        vehicleRouteCount: responseData.data?.vehicleRoutes?.length || 0,
        error: responseData.error,
      });

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error?.message || "Optimization failed");
      }

      const data = responseData.data!;

      console.log("[useRouting] Setting route data with", {
        vehicleRoutes: data.vehicleRoutes?.length || 0,
        unassignedJobs: data.unassignedJobs?.length || 0,
      });

      setRouteData(data);
      doSetLayers((prev) => ({ ...prev, route: true }));

      // Process unassigned jobs as errors
      const unassignedErrors: RouteError[] = (data.unassignedJobs || []).map(
        (uj) => ({
          vehicleId: "Unassigned",
          errorMessage: `${uj.description}: ${uj.reason}`,
        }),
      );

      // Check for errors in individual routes
      const failedRoutes = data.vehicleRoutes?.filter((r) => r.error) || [];
      const routeErrorsArr: RouteError[] = failedRoutes.map((r) => ({
        vehicleId: `Vehicle ${r.vehicleId}`,
        errorMessage: r.error || "Unknown error",
      }));

      setRouteErrors([...unassignedErrors, ...routeErrorsArr]);
      setRouteNotices(data.notices || []);

      // If there are unassigned jobs, remove them from the fleet as requested
      if (data.unassignedJobs && data.unassignedJobs.length > 0) {
        data.unassignedJobs.forEach((uj) => {
          doRemoveJob(uj.id);
        });
      }
    } catch (err) {
      console.error("Routing error:", err);
      lastRoutingKeyRef.current = ""; // Allow retry on error
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, []); // Empty deps = stable reference

  return {
    routeData,
    setRouteData,
    routeErrors,
    setRouteErrors,
    routeNotices,
    setRouteNotices,
    isCalculatingRoute,
    routePoints,
    setRoutePoints,
    startRouting,
    clearRoute,
  };
}
