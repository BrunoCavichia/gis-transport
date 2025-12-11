"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
} from "lucide-react";
import type { WeatherData } from "@/lib/types";

interface WeatherPanelProps {
  weather: WeatherData;
}

function getWeatherIcon(condition: string) {
  switch (condition.toLowerCase()) {
    case "clear":
      return <Sun className="h-6 w-6 text-amber-500" />;
    case "clouds":
      return <Cloud className="h-6 w-6 text-gray-500" />;
    case "rain":
    case "drizzle":
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    case "snow":
      return <CloudSnow className="h-6 w-6 text-sky-300" />;
    default:
      return <Cloud className="h-6 w-6 text-gray-500" />;
  }
}

export function WeatherPanel({ weather }: WeatherPanelProps) {
  const multiLocations = (weather as any).multipleLocations || [weather];

  return (
    <Card className="absolute right-4 top-4 z-10 w-80 bg-card/95 backdrop-blur-sm max-h-96 overflow-y-auto">
      <CardContent className="p-4">
        {multiLocations.map((loc: WeatherData, idx: number) => (
          <div
            key={idx}
            className={idx > 0 ? "mt-3 pt-3 border-t border-border" : ""}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {loc.location || "Route Weather"}
                </h3>
                <p className="text-xs capitalize text-muted-foreground">
                  {loc.description}
                </p>
              </div>
              {getWeatherIcon(loc.condition)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Thermometer className="h-3 w-3 text-red-500" />
                <span className="text-foreground">
                  {Math.round(loc.temperature)}°C
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Wind className="h-3 w-3 text-sky-500" />
                <span className="text-foreground">{loc.windSpeed} m/s</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Droplets className="h-3 w-3 text-blue-500" />
                <span className="text-foreground">{loc.humidity}%</span>
              </div>
            </div>
            {loc.alerts && loc.alerts.length > 0 && (
              <div className="mt-2 rounded-md bg-amber-500/10 p-2">
                <p className="text-xs font-medium text-amber-600">
                  Weather Alert
                </p>
                <p className="text-xs text-muted-foreground">{loc.alerts[0]}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
