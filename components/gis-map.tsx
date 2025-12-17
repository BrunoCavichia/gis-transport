"use client";
//app/components/gis-map.tsx
import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import type {
  LayerVisibility,
  POI,
  VehicleType,
  RouteData,
  WeatherData,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
});

interface FleetJob {
  id: string;
  coords: [number, number];
  label: string;
}

interface FleetVehicle {
  id: string;
  coords: [number, number];
  type: VehicleType;
}

export function GISMap() {
  const [layers, setLayers] = useState<LayerVisibility>({
    gasStations: true,
    evStations: true,
    lowEmissionZones: true,
    restrictedZones: true,
    route: true,
  });

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [routePoints, setRoutePoints] = useState<{
    start: [number, number] | null;
    end: [number, number] | null;
  }>({ start: null, end: null });
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.4168, -3.7038,
  ]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    VEHICLE_TYPES[0]
  );
  const [fleetMode, setFleetMode] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [fleetJobs, setFleetJobs] = useState<FleetJob[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [addMode, setAddMode] = useState<"vehicle" | "job" | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const toggleLayer = (layer: keyof LayerVisibility) =>
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));

  const clearFleet = () => {
    setFleetVehicles([]);
    setFleetJobs([]);
    setSelectedVehicleId(null);
    setAddMode(null);
    setRouteData(null);
  };

  const addVehicle = () => setAddMode("vehicle");
  const addJob = () => setAddMode("job");

  const removeVehicle = (vehicleId: string) => {
    setFleetVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    if (selectedVehicleId === vehicleId) {
      const remaining = fleetVehicles.filter((v) => v.id !== vehicleId);
      setSelectedVehicleId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const removeJob = (jobId: string) => {
    setFleetJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleMapClick = useCallback(
    (coords: [number, number]) => {
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
        const newVehicle: FleetVehicle = {
          id: `vehicle-${Date.now()}`,
          coords,
          type: selectedVehicle,
        };
        setFleetVehicles((prev) => [...prev, newVehicle]);
        setSelectedVehicleId(newVehicle.id);
        setAddMode(null);
      } else if (addMode === "job") {
        const newJob: FleetJob = {
          id: `job-${Date.now()}`,
          coords,
          label: `Job ${fleetJobs.length + 1}`,
        };
        setFleetJobs((prev) => [...prev, newJob]);
        setAddMode(null);
      }
    },
    [fleetMode, addMode, selectedVehicle, fleetJobs.length]
  );

  const toLonLat = (coords: [number, number]): [number, number] => {
    const [a, b] = coords;

    console.log(`🔄 Convirtiendo coord: [${a.toFixed(6)}, ${b.toFixed(6)}]`);

    // Leaflet siempre devuelve [lat, lng], necesitamos [lon, lat]
    // Heurística: si el primer valor tiene magnitud < 90, es probablemente latitud
    if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
      // Definitivamente [lat, lon] porque lon > 90
      console.log(
        `   → [lat, lon] detectado, convirtiendo a [lon, lat]: [${b.toFixed(
          6
        )}, ${a.toFixed(6)}]`
      );
      return [b, a];
    }

    // Para España/Europa: lat ≈ 40, lon ≈ -3
    // Si a está alrededor de 40 y b alrededor de -3 a -10
    if (Math.abs(a - 40) < 20 && Math.abs(b + 4) < 10) {
      // Probablemente [lat, lon] para coordenadas europeas
      console.log(
        `   → Coordenadas europeas [lat, lon], convirtiendo: [${b.toFixed(
          6
        )}, ${a.toFixed(6)}]`
      );
      return [b, a];
    }

    console.log(`   → Asumiendo ya está en [lon, lat]`);
    return coords;
  };

  const startRouting = useCallback(async () => {
    console.log("🎯 startRouting llamado");

    if (fleetVehicles.length === 0 || fleetJobs.length === 0) {
      alert("Necesitas al menos 1 vehículo y 1 trabajo");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      // 1. Ubicaciones en formato [lon, lat]
      const allLocations: [number, number][] = [
        ...fleetVehicles.map((v) => toLonLat(v.coords)),
        ...fleetJobs.map((j) => toLonLat(j.coords)),
      ];

      console.log("📍 allLocations (lon, lat):", allLocations);

      // 2. Para matriz ORS: convertir a [lat, lon]
      const coordinatesForMatrix = allLocations.map(([lon, lat]) => [lat, lon]);

      // 3. Calcular matriz de distancias/duraciones
      console.log("⏳ Calculando matriz de distancias...");
      const matrixRes = await fetch("/api/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coordinatesForMatrix }),
      });

      if (!matrixRes.ok) {
        throw new Error("Error en matriz");
      }

      const matrixData = await matrixRes.json();
      const cleanedMatrix = matrixData.durations.map((row: number[]) =>
        row.map((val: number) =>
          isFinite(val) && val >= 0 ? Math.round(val) : 999999
        )
      );

      // 4. Payload VROOM con asignación forzada por skills
      const jobsPerVehicle = Math.ceil(fleetJobs.length / fleetVehicles.length);

      const vroomPayload = {
        vehicles: fleetVehicles.map((v, idx) => ({
          id: idx,
          start_index: idx,
          profile: "car",
          capacity: [jobsPerVehicle + 1],
          skills: [idx],
        })),
        jobs: fleetJobs.map((j, jidx) => {
          // Asignar trabajos round-robin a los vehículos
          const assignedVehicle = jidx % fleetVehicles.length;
          return {
            id: fleetVehicles.length + jidx,
            location_index: fleetVehicles.length + jidx,
            service: 300,
            delivery: [1],
            skills: [assignedVehicle],
          };
        }),
        matrix: cleanedMatrix,
      };

      console.log("🚀 Payload VROOM:", JSON.stringify(vroomPayload, null, 2));

      // 5. Llamar a VROOM para optimización
      console.log("⏳ Optimizando rutas con VROOM...");
      const vroomRes = await fetch("/api/vroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vroomPayload),
      });

      if (!vroomRes.ok) {
        throw new Error("Error en VROOM");
      }

      const vroomResult = await vroomRes.json();
      console.log("✅ VROOM result:", vroomResult);

      // Verificar si hay trabajos sin asignar
      if (vroomResult.unassigned && vroomResult.unassigned.length > 0) {
        console.warn("⚠️ Trabajos sin asignar:", vroomResult.unassigned);
      }

      // Verificar número de rutas
      if (!vroomResult.routes || vroomResult.routes.length === 0) {
        throw new Error("VROOM no devolvió ninguna ruta");
      }

      console.log(
        `📊 VROOM devolvió ${vroomResult.routes.length} rutas de ${fleetVehicles.length} vehículos`
      );

      // 6. Extraer secuencia de paradas por vehículo con colores
      const vehicleRoutes: Array<{
        vehicleId: number;
        coordinates: [number, number][];
        distance: number;
        duration: number;
        color: string;
        jobsAssigned: number;
      }> = [];

      const routeColors = [
        "#3B82F6", // azul
        "#EF4444", // rojo
        "#10B981", // verde
        "#F59E0B", // amarillo
        "#8B5CF6", // morado
        "#EC4899", // rosa
        "#14B8A6", // teal
        "#F97316", // naranja
      ];

      let totalDistance = 0;
      let totalDuration = 0;

      for (const route of vroomResult.routes || []) {
        totalDuration += route.duration || 0;

        // Extraer secuencia de location_index de los steps
        const waypoints: [number, number][] = [];
        let jobCount = 0;

        for (const step of route.steps || []) {
          if (typeof step.location_index === "number") {
            const [lon, lat] = allLocations[step.location_index];
            waypoints.push([lat, lon]); // [lat, lon] para la API de routing

            // Contar jobs (excluir start y end del vehículo)
            if (step.type === "job") {
              jobCount++;
            }
          }
        }

        console.log(
          `🚗 Vehículo ${route.vehicle}: ${waypoints.length} waypoints, ${jobCount} jobs`
        );

        // 7. Obtener ruta real por carretera para este vehículo
        if (waypoints.length >= 2) {
          console.log(
            `⏳ Obteniendo ruta real para vehículo ${route.vehicle}...`
          );

          const routingRes = await fetch("/api/routing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinates: waypoints }),
          });

          if (!routingRes.ok) {
            console.error(
              `Error obteniendo ruta para vehículo ${route.vehicle}`
            );
            // Fallback: usar líneas rectas
            vehicleRoutes.push({
              vehicleId: route.vehicle,
              coordinates: waypoints,
              distance: 0,
              duration: route.duration || 0,
              color: routeColors[route.vehicle % routeColors.length],
              jobsAssigned: jobCount,
            });
            continue;
          }

          const routingData = await routingRes.json();
          console.log(
            `✅ Ruta obtenida: ${routingData.coordinates.length} puntos`
          );

          vehicleRoutes.push({
            vehicleId: route.vehicle,
            coordinates: routingData.coordinates,
            distance: routingData.distance || 0,
            duration: routingData.duration || 0,
            color: routeColors[route.vehicle % routeColors.length],
            jobsAssigned: jobCount,
          });

          totalDistance += routingData.distance || 0;
        }
      }

      // 8. Combinar todas las coordenadas de todas las rutas (para bounds)
      const allRouteCoordinates = vehicleRoutes.flatMap((r) => r.coordinates);

      if (allRouteCoordinates.length === 0) {
        throw new Error("No se generaron coordenadas de ruta");
      }

      console.log(
        `🗺️ Total coordenadas de ruta: ${allRouteCoordinates.length}`
      );

      try {
        const weatherRes = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleRoutes }),
        });
        const weatherData = await weatherRes.json();
        setRouteData({
          coordinates: [],
          distance: totalDistance,
          duration: totalDuration,
          vehicleRoutes,
          weatherRoutes: weatherData.routes, // <-- aquí agregas las rutas con info de clima
        });
      } catch {
        setRouteData({
          coordinates: [],
          distance: totalDistance,
          duration: totalDuration,
          vehicleRoutes,
          weatherRoutes: [],
        });
      }

      setLayers((prev) => ({ ...prev, route: true }));

      alert(
        `✅ Ruta calculada!\n` +
          `Vehículos: ${fleetVehicles.length}\n` +
          `Trabajos: ${fleetJobs.length}\n` +
          vehicleRoutes
            .map(
              (r) =>
                `  • Vehículo ${r.vehicleId}: ${r.jobsAssigned} jobs, ${(
                  r.distance / 1000
                ).toFixed(1)} km`
            )
            .join("\n") +
          "\n" +
          `\nTotal distancia: ${(totalDistance / 1000).toFixed(2)} km\n` +
          `Total duración: ${Math.round(totalDuration / 60)} min\n` +
          `Puntos de ruta: ${allRouteCoordinates.length}`
      );
    } catch (err) {
      console.error("💥 Error:", err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [fleetVehicles, fleetJobs]);

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
        clearFleet={clearFleet}
        fleetVehicles={fleetVehicles}
        fleetJobs={fleetJobs}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        addVehicle={addVehicle}
        addJob={addJob}
        removeVehicle={removeVehicle}
        removeJob={removeJob}
        addMode={addMode}
        cancelAddMode={() => setAddMode(null)}
        startRouting={startRouting}
        isCalculatingRoute={isCalculatingRoute}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
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
          fleetVehicles={fleetVehicles}
          fleetJobs={fleetJobs}
          selectedVehicleId={selectedVehicleId}
          onMapClick={fleetMode ? handleMapClick : undefined}
        />
      </div>
    </div>
  );
}
