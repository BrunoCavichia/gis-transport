"use client";
import React from "react";

interface GISMapToolbarProps {
  isDrawingZone: boolean;
  zonePointsCount: number;
  isEditingZone: boolean;
  onUndoZonePoint: () => void;
  onToggleEditingMode: () => void;
  onCancelZoneDrawing: () => void;
  onConfirmZoneDrawing: () => void;
}

export function GISMapToolbar({
  isDrawingZone,
  zonePointsCount,
  isEditingZone,
  onUndoZonePoint,
  onToggleEditingMode,
  onCancelZoneDrawing,
  onConfirmZoneDrawing,
}: GISMapToolbarProps) {
  if (!isDrawingZone) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-card/90 border border-border/40 rounded-lg shadow-md px-3 py-2 backdrop-blur-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Compact Counter */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded">
        <div
          className={`h-2 w-2 rounded-full ${zonePointsCount >= 3 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`}
        />
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {zonePointsCount}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border/30" />

      {/* Action Buttons */}
      <button
        onClick={onUndoZonePoint}
        disabled={zonePointsCount === 0}
        className="p-1.5 rounded hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs text-foreground"
        title="Deshacer (Ctrl+Z)"
      >
        ↶
      </button>

      <button
        onClick={onToggleEditingMode}
        disabled={zonePointsCount < 3}
        className={`p-1.5 rounded text-xs transition-colors ${
          isEditingZone
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50 text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        }`}
        title="Ajustar puntos"
      >
        ✎
      </button>

      <button
        onClick={onCancelZoneDrawing}
        className="p-1.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors text-xs"
        title="Cancelar (Esc)"
      >
        ✕
      </button>

      <button
        onClick={onConfirmZoneDrawing}
        disabled={zonePointsCount < 3}
        className="px-2 py-1.5 rounded bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white text-xs font-semibold"
        title="Confirmar (Enter)"
      >
        ✓
      </button>
    </div>
  );
}
