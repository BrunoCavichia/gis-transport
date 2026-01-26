"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

import { WeatherAlert, RouteWeather } from "@/lib/types";

interface WeatherPanelProps {
  routes: RouteWeather[];
}

function getWeatherIcon(event: string) {
  switch (event) {
    case "SNOW":
      return <CloudSnow className="h-5 w-5 text-sky-400" />;
    case "RAIN":
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    case "WIND":
      return <Wind className="h-5 w-5 text-slate-400" />;
    case "ICE":
      return <AlertOctagon className="h-5 w-5 text-blue-300" />;
    case "FOG":
    default:
      return <Cloud className="h-5 w-5 text-slate-400" />;
  }
}

export function WeatherPanel({ routes }: WeatherPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalAlerts = routes.reduce((acc, r) => acc + r.alerts.length, 0);

  if (totalAlerts === 0) return null;

  if (!isExpanded) {
    return (
      <div className="absolute top-20 right-6 z-[1000] animate-in fade-in zoom-in duration-500">
        <Button
          onClick={() => setIsExpanded(true)}
          className="relative h-12 w-12 rounded-full border-2 border-amber-500/30 bg-background/90 p-0 shadow-xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all text-amber-500 group overflow-visible"
          variant="outline"
        >
          <div className="absolute inset-0 rounded-full animate-pulse bg-amber-500/5 ring-4 ring-amber-500/10" />
          <AlertTriangle className="h-6 w-6 fill-amber-500/5 text-amber-500/80" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg ring-2 ring-background">
            {totalAlerts}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="absolute right-6 top-20 z-[1000] w-[350px] bg-background/90 backdrop-blur-md border-border/50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="font-bold text-sm tracking-tight">Active Weather Alerts</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
          className="h-8 w-8 hover:bg-muted transition-colors rounded-full"
          title="Minimize"
        >
          <div className="w-3 h-[2px] bg-foreground/50 rounded-full" />
        </Button>
      </div>

      <div className="p-1 max-h-[400px] overflow-y-auto custom-scrollbar">
        {routes.map((route) => (
          route.alerts.length > 0 && (
            <div key={route.vehicle} className="p-3 border-b border-border/10 last:border-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Veh. {route.vehicle}
                  </span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${route.riskLevel === 'HIGH' ? 'bg-red-500/10 text-red-600' :
                  route.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {route.riskLevel} Risk
                </div>
              </div>

              <div className="space-y-2">
                {route.alerts.map((alert, idx) => (
                  <div
                    key={`${route.vehicle}-${idx}`}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all hover:translate-x-0.5 ${alert.severity === 'HIGH' ? 'bg-red-50/30 border-red-100/50' :
                      alert.severity === 'MEDIUM' ? 'bg-amber-50/30 border-amber-100/50' :
                        'bg-blue-50/30 border-blue-100/50'
                      }`}
                  >
                    <div className="mt-0.5 shrink-0 p-2 bg-white/50 rounded-lg shadow-sm border border-white/80">
                      {getWeatherIcon(alert.event)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-gray-900">{alert.event}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {new Date(alert.timeWindow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-1 italic opacity-90">
                        "{alert.message}"
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>Segment {alert.segmentIndex}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </Card>
  );
}
