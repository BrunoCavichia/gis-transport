"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import type { Alert } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AlertBadgeProps {
  alerts: Alert[];
  className?: string;
}

/**
 * Alert badge indicator - shows on vehicle icons and sidebar
 * Displays the count and severity level of active alerts
 */
export function AlertBadge({ alerts, className }: AlertBadgeProps) {
  if (alerts.length === 0) return null;

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  const severity = hasCritical ? "critical" : hasWarning ? "warning" : "info";

  return (
    <div
      className={cn(
        "absolute -top-2 -right-2 flex items-center justify-center rounded-full text-white text-xs font-bold shadow-xl ring-2 ring-background",
        hasCritical
          ? "bg-red-600 ring-red-600/40 animate-pulse"
          : hasWarning
            ? "bg-amber-600 ring-amber-600/40"
            : "bg-blue-600 ring-blue-600/40",
        className,
      )}
      style={{
        minWidth: "24px",
        minHeight: "24px",
      }}
      title={`${alerts.length} alert${alerts.length !== 1 ? "s" : ""} - ${severity}`}
    >
      {hasCritical || hasWarning ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {alerts.length > 1 && (
        <span className="ml-0.5 text-[11px]">{alerts.length}</span>
      )}
    </div>
  );
}
