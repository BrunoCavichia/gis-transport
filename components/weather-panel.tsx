"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from "lucide-react";

interface Alert {
  segmentIndex: number;
  event: "SNOW" | "RAIN" | "ICE" | "WIND" | "FOG";
  severity: "LOW" | "MEDIUM" | "HIGH";
  timeWindow: string;
  message: string;
}

export interface RouteWeather {
  vehicle: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  alerts: Alert[];
}

interface WeatherPanelProps {
  routes: RouteWeather[];
}

function getWeatherIcon(event: string) {
  switch (event) {
    case "SNOW":
      return <CloudSnow className="h-6 w-6 text-sky-300" />;
    case "RAIN":
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    case "WIND":
      return <Wind className="h-6 w-6 text-sky-500" />;
    case "ICE":
    case "FOG":
    default:
      return <Cloud className="h-6 w-6 text-gray-500" />;
  }
}

export function WeatherPanel({ routes }: WeatherPanelProps) {
  return (
    <Card className="absolute right-4 top-4 z-10 w-96 bg-card/95 backdrop-blur-sm max-h-[480px] overflow-y-auto">
      <CardContent className="p-4">
        {routes.map((route) => (
          <div key={route.vehicle} className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">
                Vehicle {route.vehicle}
              </h3>
              <span
                className={`text-xs font-medium ${
                  route.riskLevel === "HIGH"
                    ? "text-red-600"
                    : route.riskLevel === "MEDIUM"
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {route.riskLevel}
              </span>
            </div>

            {route.alerts.length > 0 ? (
              <div className="mt-2 space-y-2">
                {route.alerts.map((alert) => (
                  <div
                    key={alert.segmentIndex + alert.event}
                    className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2"
                  >
                    {getWeatherIcon(alert.event)}
                    <div className="text-xs text-foreground">
                      <p className="font-medium">{alert.event}</p>
                      <p>{alert.message}</p>
                      <p className="text-muted-foreground">
                        ETA: {new Date(alert.timeWindow).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-green-600">No weather alerts</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
