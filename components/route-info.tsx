"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { RouteData, RouteInstruction } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RouteInfoProps {
  routeData?: RouteData;
  onClear: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function getInstructionIcon(type?: string): string {
  switch (type) {
    case "turn":
      return "↻";
    case "merge":
      return "⤝";
    case "ramp":
      return "↗";
    case "exit":
      return "↪";
    case "fork":
      return "⎇";
    case "continue":
      return "→";
    case "roundabout":
      return "◯";
    default:
      return "➜";
  }
}

export function RouteInfo({ routeData, onClear }: RouteInfoProps) {
  if (!routeData) return null;
  if (!routeData.instructions || routeData.instructions.length === 0) return null;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-sm px-4 pointer-events-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      <Card className="pointer-events-auto overflow-hidden bg-background/80 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-[2.5rem]">
        {/* Main Floating Cartel */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 mb-1">Resumen de Ruta</span>
              <h2 className="text-xl font-black text-foreground tracking-tight leading-none">
                {formatDuration(routeData.duration)}
              </h2>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full bg-muted/20 hover:bg-muted/40 transition-all border border-white/10"
              onClick={onClear}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatDistance(routeData.distance)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/10">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatDuration(routeData.duration)}
              </span>
            </div>
          </div>

          {/* Premium Progress/Info Bar */}
          <div className="mt-5 h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-full opacity-80" />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 w-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
          >
            {isExpanded ? "Ocultar Pasos" : `Ver Indicaciones (${routeData.instructions.length})`}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isExpanded ? "rotate-180" : "group-hover:translate-y-0.5"
              )}
            />
          </button>
        </div>

        {/* Expandable Instructions Panel */}
        {isExpanded && (
          <div className="px-2 pb-6 max-h-[40vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              {routeData.instructions.map((instruction: RouteInstruction, index: number) => (
                <div
                  key={index}
                  className="px-5 py-4 rounded-3xl hover:bg-primary/5 transition-all group flex items-start gap-4"
                >
                  <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                    <span className="text-xs">{getInstructionIcon(instruction.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-snug">
                      {instruction.text}
                    </p>
                    <div className="flex gap-2 mt-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                      <span>{formatDistance(instruction.distance)}</span>
                      <span>•</span>
                      <span>{formatDuration(instruction.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
