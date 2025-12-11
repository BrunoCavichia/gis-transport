"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { WeatherPanel } from "@/components/weather-panel";
import { RouteInfo } from "@/components/route-info";
import type {
  RouteData,
  WeatherData,
  LayerVisibility,
  POI,
  SearchLocation,
  VehicleType,
} from "@/lib/types";
import { VEHICLE_TYPES } from "@/lib/types";

const MapContainer = dynamic(() => import("@/components/map-container"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  ),
});

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
  const [isRouting, setIsRouting] = useState(false);
  const [routePoints, setRoutePoints] = useState<{
    start: [number, number] | null;
    end: [number, number] | null;
  }>({ start: null, end: null });
  const [dynamicEVStations, setDynamicEVStations] = useState<POI[]>([]);
  const [dynamicGasStations, setDynamicGasStations] = useState<POI[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.4168, -3.7038,
  ]);
  const [startLocation, setStartLocation] = useState<SearchLocation | null>(
    null
  );
  const [endLocation, setEndLocation] = useState<SearchLocation | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    VEHICLE_TYPES[0]
  );

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const clearRoute = () => {
    setRouteData(null);
    setRoutePoints({ start: null, end: null });
    setStartLocation(null);
    setEndLocation(null);
    setIsRouting(false);
    setWeather(null);
  };

  const handleStartLocationSelect = useCallback(
    (coords: [number, number], name: string) => {
      setStartLocation({ coords, name });
      setRoutePoints((prev) => ({ ...prev, start: coords }));
      setMapCenter(coords);
    },
    []
  );

  const handleEndLocationSelect = useCallback(
    (coords: [number, number], name: string) => {
      setEndLocation({ coords, name });
      setRoutePoints((prev) => ({ ...prev, end: coords }));
    },
    []
  );

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        layers={layers}
        toggleLayer={toggleLayer}
        isRouting={isRouting}
        setIsRouting={setIsRouting}
        clearRoute={clearRoute}
        routePoints={routePoints}
        startLocation={startLocation}
        endLocation={endLocation}
        onStartLocationSelect={handleStartLocationSelect}
        onEndLocationSelect={handleEndLocationSelect}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
      />
      <div className="relative flex-1">
        <MapContainer
          layers={layers}
          routeData={routeData}
          setRouteData={setRouteData}
          setWeather={setWeather}
          isRouting={isRouting}
          routePoints={routePoints}
          setRoutePoints={setRoutePoints}
          dynamicEVStations={dynamicEVStations}
          setDynamicEVStations={setDynamicEVStations}
          dynamicGasStations={dynamicGasStations}
          setDynamicGasStations={setDynamicGasStations}
          mapCenter={mapCenter}
          setMapCenter={setMapCenter}
          selectedVehicle={selectedVehicle}
          zoneKeySuffix={
            layers.lowEmissionZones || layers.restrictedZones
              ? "LEZ-RZ"
              : "none"
          } // opción para asegurar keys únicas
        />
        {weather && <WeatherPanel weather={weather} />}
        {routeData && <RouteInfo routeData={routeData} onClear={clearRoute} />}
      </div>
    </div>
  );
}
