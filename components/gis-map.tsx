"use client";
// app/components/gis-map.tsx
import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  RouteData,
  WeatherData,
  Zone,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";
import { useFleet } from "@/hooks/use-fleet";
import { useCustomPOI } from "@/hooks/use-custom-poi";
import { RouteErrorAlert, type RouteError, type RouteNotice } from "@/components/route-error-alert";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038];

export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: false,
    evStations: false,
    cityZones: false,
    route: true,
  });

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [, setWeather] = useState<WeatherData | null>(null);
  const [routePoints, setRoutePoints] = useState<{
    start: [number, number] | null;
    end: [number, number] | null;
  }>({ start: null, end: null });
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    VEHICLE_TYPES[0]
  );
  const [fleetMode, setFleetMode] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showCustomPOIs, setShowCustomPOIs] = useState(true);

  // Después de los otros estados, añade:
  const [pickingPOILocation, setPickingPOILocation] = useState(false);
  const [pickedPOICoords, setPickedPOICoords] = useState<
    [number, number] | null
  >(null);
  const [isAddCustomPOIOpen, setIsAddCustomPOIOpen] = useState(false);

  const [pickingJobLocation, setPickingJobLocation] = useState(false);
  const [pickedJobCoords, setPickedJobCoords] = useState<
    [number, number] | null
  >(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [activeZones, setActiveZones] = useState<Zone[]>([]);
  const [routeErrors, setRouteErrors] = useState<RouteError[]>([]);
  const [routeNotices, setRouteNotices] = useState<RouteNotice[]>([]);

  // Live Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    fleetVehicles,
    fleetJobs,
    selectedVehicleId,
    addMode,
    setAddMode,
    setSelectedVehicleId,
    clearFleet,
    addVehicleAt,
    addJobAt,
    removeVehicle,
    removeJob,
    isLoadingVehicles,
    fetchVehicles,
    updateVehiclePosition,
  } = useFleet();

  // useEffect to clear route data when vehicles/jobs are removed
  // This ensures we don't show routes for things that are no longer there
  useEffect(() => {
    if (routeData) {
      // Check if all vehicleIds in routeData still exist in fleetVehicles
      const currentVehicleIds = new Set(fleetVehicles.map(v => v.id));
      const hasMissingVehicle = routeData.vehicleRoutes?.some(r => !currentVehicleIds.has(r.vehicleId));

      if (hasMissingVehicle || (fleetVehicles.length === 0 && routeData.vehicleRoutes?.length)) {
        setRouteData(null);
        setRouteErrors([]);
        setRouteNotices([]);
        lastRoutingKeyRef.current = "";
      }
    }
  }, [fleetVehicles, fleetJobs, routeData]);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const {
    customPOIs,
    addCustomPOI,
    removeCustomPOI,
    updateCustomPOI,
    clearAllCustomPOIs,
    togglePOISelectionForFleet,
  } = useCustomPOI();

  const clearAll = useCallback(() => {
    clearFleet();
    setRouteData(null); // Clear routes from map
    setRouteErrors([]);
    setRouteNotices([]);
    lastRoutingKeyRef.current = "";
    setRoutePoints({ start: null, end: null });
    setDynamicEVStations([]);
    setDynamicGasStations([]);
    setIsCalculatingRoute(false);
    setShowCustomPOIs(false);
    setIsTracking(false);
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    setPickedPOICoords(null);
    setPickedJobCoords(null);
    setPickingPOILocation(false);
    setPickingJobLocation(false);
    setLayers({
      gasStations: false,
      evStations: false,
      cityZones: false,
      route: true,
    });
    setSelectedVehicle(VEHICLE_TYPES[0]);
  }, [clearFleet]);

  const toggleLayer = useCallback(
    (layer: keyof LayerVisibility) => {
      setLayers((prev) => {
        const newState = { ...prev, [layer]: !prev[layer] };

        // Cleanup immediately if toggled OFF
        if (layer === "evStations" && !newState.evStations) {
          setDynamicEVStations([]);
        }
        if (layer === "gasStations" && !newState.gasStations) {
          setDynamicGasStations([]);
        }

        return newState;
      });
    },
    []
  );

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
      // Primero manejar picking de POI
      if (pickingPOILocation) {
        setPickedPOICoords(coords);
        setPickingPOILocation(false);
        setIsAddCustomPOIOpen(true);
        return;
      }

      // Handle picking for JOB
      if (pickingJobLocation) {
        setPickedJobCoords(coords);
        setPickingJobLocation(false);
        setIsAddJobOpen(true);
        return;
      }

      // Resto del código existente para fleet mode
      if (!fleetMode || !addMode) return;

      if (
        !coords ||
        coords.length !== 2 ||
        coords.some((c) => typeof c !== "number")
      ) {
        console.error("Invalid coordinates clicked:", coords);
        return;
      }

      if (addMode === "vehicle") {
        addVehicleAt(coords, selectedVehicle);
      } else if (addMode === "job") {
        addJobAt(coords);
      }
    },
    [
      fleetMode,
      addMode,
      addVehicleAt,
      addJobAt,
      selectedVehicle,
      pickingPOILocation,
      pickingJobLocation,
    ]
  );

  const lastRoutingKeyRef = useRef<string>("");
  const startRouting = useCallback(async () => {
    const key = JSON.stringify({
      vehicles: fleetVehicles.map((v) => ({ id: v.id, coords: v.coords })),
      jobs: fleetJobs.map((j) => ({ id: j.id, coords: j.coords })),
      selectedPOIs: customPOIs
        .filter((poi) => poi.selectedForFleet)
        .map((p) => ({ id: p.id, coords: p.position })),
    });

    if (key === lastRoutingKeyRef.current) return;
    lastRoutingKeyRef.current = key;

    const selectedPOIsAsJobs = customPOIs
      .filter((poi) => poi.selectedForFleet)
      .map((poi) => ({
        id: poi.id,
        coords: poi.position,
        label: `POI: ${poi.name}`,
      }));

    const allFleetJobs = [...fleetJobs, ...selectedPOIsAsJobs];
    if (fleetVehicles.length === 0 || allFleetJobs.length === 0) {
      alert("You need at least 1 vehicle and 1 job or selected POI");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      const res = await fetch("/api/gis/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: fleetVehicles,
          jobs: allFleetJobs,
          startTime: new Date().toISOString(),
          zones: activeZones
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Optimization failed");
      }

      const routeData: RouteData = await res.json();
      setRouteData(routeData);
      setLayers((prev) => ({ ...prev, route: true }));

      // Process unassigned jobs as errors
      const unassignedErrors: RouteError[] = (routeData.unassignedJobs || []).map(uj => ({
        vehicleId: "Unassigned",
        errorMessage: `${uj.description}: ${uj.reason}`
      }));

      // Check for errors in individual routes
      const failedRoutes = routeData.vehicleRoutes?.filter(r => r.error) || [];
      const routeErrors: RouteError[] = failedRoutes.map(r => ({
        vehicleId: `Vehicle ${r.vehicleId}`,
        errorMessage: r.error || "Unknown error"
      }));

      setRouteErrors([...unassignedErrors, ...routeErrors]);
      setRouteNotices(routeData.notices || []);

      // If there are unassigned jobs, remove them from the fleet as requested
      if (routeData.unassignedJobs && routeData.unassignedJobs.length > 0) {
        routeData.unassignedJobs.forEach(uj => {
          removeJob(uj.id);
        });
      }
    } catch (err) {
      console.error("Routing error:", err);
      lastRoutingKeyRef.current = ""; // Allow retry on error
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [fleetVehicles, fleetJobs, customPOIs, setLayers, activeZones, selectedVehicle, removeJob]);

  /**
   * Toggle Live Tracking mode.
   * When enabled, the system polls the GPS API to update vehicle positions.
   * The API is structured so that only the endpoint implementation needs to change
   * when switching from mock data to real GPS devices.
   */
  const toggleTracking = useCallback(() => {
    if (isTracking) {
      // Stop tracking
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      setIsTracking(false);
    } else {
      // Start tracking - pass route data to the API for simulation
      if (routeData?.vehicleRoutes) {
        const activeRoutes: Record<string, [number, number][]> = {};
        routeData.vehicleRoutes.forEach(route => {
          if (route.vehicleId && route.coordinates) {
            activeRoutes[route.vehicleId] = route.coordinates;
          }
        });

        // Initialize simulation with routes
        fetch("/api/gps/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes: activeRoutes, action: "start" })
        }).catch(err => console.error("Failed to start simulation:", err));
      }

      setIsTracking(true);

      // Start polling for GPS updates
      trackingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/gps/positions");
          if (res.ok) {
            const data = await res.json();
            // Update each vehicle's position
            Object.entries(data.positions || {}).forEach(([vehicleId, coords]) => {
              updateVehiclePosition(vehicleId, coords as [number, number]);
            });
          }
        } catch (err) {
          console.error("GPS poll error:", err);
        }
      }, 2000); // Poll every 2 seconds
    }
  }, [isTracking, routeData, updateVehiclePosition]);

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        layers={layers}
        setMapCenter={setMapCenter}
        toggleLayer={toggleLayer}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        fleetMode={fleetMode}
        setFleetMode={setFleetMode}
        clearFleet={clearAll}
        fleetVehicles={fleetVehicles}
        fleetJobs={fleetJobs}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        addVehicle={() => setAddMode("vehicle")}
        addJob={() => {
          setPickedJobCoords(null);
          setIsAddJobOpen(true);
        }}
        addJobDirectly={(coords, label) => {
          setPickedJobCoords(null);
          addJobAt(coords, label);
        }}
        removeVehicle={removeVehicle}
        removeJob={removeJob}
        addMode={addMode}
        cancelAddMode={() => setAddMode(null)}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
        customPOIs={customPOIs}
        addCustomPOI={(name, coords, desc) => {
          setPickedPOICoords(null);
          return addCustomPOI(name, coords, desc);
        }}
        removeCustomPOI={removeCustomPOI}
        updateCustomPOI={updateCustomPOI}
        clearAllCustomPOIs={clearAllCustomPOIs}
        showCustomPOIs={showCustomPOIs}
        setShowCustomPOIs={setShowCustomPOIs}
        mapCenter={mapCenter}
        onStartPicking={() => {
          setPickingPOILocation(true);
          setIsAddCustomPOIOpen(false);
        }}
        pickedCoords={pickedPOICoords}
        isAddCustomPOIOpen={isAddCustomPOIOpen}
        setIsAddCustomPOIOpen={setIsAddCustomPOIOpen}
        onStartPickingJob={() => {
          setPickingJobLocation(true);
          setIsAddJobOpen(false);
        }}
        pickedJobCoords={pickedJobCoords}
        isAddJobOpen={isAddJobOpen}
        setIsAddJobOpen={setIsAddJobOpen}
        isLoadingVehicles={isLoadingVehicles}
        fetchVehicles={fetchVehicles}
        togglePOISelectionForFleet={togglePOISelectionForFleet}
        isTracking={isTracking}
        toggleTracking={toggleTracking}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
          toggleLayer={toggleLayer}
          routeData={routeData}
          setRouteData={setRouteData}
          setWeather={setWeather}
          isRouting={isCalculatingRoute}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          dynamicEVStations={dynamicEVStations}
          setDynamicEVStations={setDynamicEVStations}
          dynamicGasStations={dynamicGasStations}
          setDynamicGasStations={setDynamicGasStations}
          mapCenter={mapCenter}
          setMapCenter={setMapCenter}
          selectedVehicle={selectedVehicle}
          customPOIs={showCustomPOIs ? customPOIs : []}
          fleetVehicles={fleetVehicles}
          fleetJobs={fleetJobs}
          selectedVehicleId={selectedVehicleId}
          onMapClick={handleMapClick}
          pickedPOICoords={pickedPOICoords}
          pickedJobCoords={pickedJobCoords}
          onZonesUpdate={setActiveZones}
          isInteracting={!!addMode || pickingJobLocation || pickingPOILocation || isCalculatingRoute}
        />

        <RouteErrorAlert
          errors={routeErrors}
          notices={routeNotices}
          onClear={() => {
            setRouteErrors([]);
            setRouteNotices([]);
          }}
        />
      </div>
    </div>
  );
}
