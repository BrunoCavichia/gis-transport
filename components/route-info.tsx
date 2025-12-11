"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { RouteData } from "@/lib/types";

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
  if (!routeData.instructions) return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const hasInstructions =
    routeData.instructions && routeData.instructions.length > 0;

  return (
    <Card className="absolute bottom-4 left-4 z-50 w-96 bg-card/95 backdrop-blur-sm max-h-[70vh] overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-blue-500/10 to-transparent p-4 border-b border-border rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-foreground">Route</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-foreground">
              {formatDistance(routeData.distance)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="font-medium text-foreground">
              {formatDuration(routeData.duration)}
            </span>
          </div>
        </div>
      </div>

      {hasInstructions && (
        <div className="border-t border-border">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-accent text-sm"
          >
            <span className="font-semibold">
              Indicaciones ({routeData.instructions.length})
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform"
              style={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {isExpanded && (
            <div className="overflow-y-auto max-h-[50vh] px-0">
              <ul className="divide-y divide-border">
                {routeData.instructions.map((instruction, index) => (
                  <li
                    key={index}
                    className="px-4 py-3 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                        {getInstructionIcon(instruction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground break-words">
                          {instruction.text}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatDistance(instruction.distance)}</span>
                          <span>•</span>
                          <span>{formatDuration(instruction.duration)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!hasInstructions && (
        <div className="px-4 py-3">
          <p className="text-sm text-muted-foreground">
            No indications available for this route.
          </p>
        </div>
      )}
    </Card>
  );
}
