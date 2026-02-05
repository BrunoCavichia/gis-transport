"use client";

import { AlertTriangle, AlertCircle, Info, Cloud } from "lucide-react";
import type { Alert } from "@/lib/utils";
import { getAlertStyles } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VehicleAlertPanelProps {
  alerts: Alert[];
  weatherAlerts?: Alert[];
}

function getAlertIcon(type: string) {
  switch (type) {
    case "speeding":
      return <AlertTriangle className="h-4 w-4 shrink-0" />;
    case "low_fuel":
      return <AlertCircle className="h-4 w-4 shrink-0" />;
    case "low_battery":
      return <AlertCircle className="h-4 w-4 shrink-0" />;
    case "maintenance":
      return <AlertCircle className="h-4 w-4 shrink-0" />;
    case "weather":
      return <Cloud className="h-4 w-4 shrink-0" />;
    default:
      return <Info className="h-4 w-4 shrink-0" />;
  }
}

export function VehicleAlertPanel({
  alerts,
  weatherAlerts = [],
}: VehicleAlertPanelProps) {
  const allAlerts = [...alerts, ...weatherAlerts];

  // Group alerts by severity for visual hierarchy
  const criticalAlerts = allAlerts.filter((a) => a.severity === "critical");
  const warningAlerts = allAlerts.filter((a) => a.severity === "warning");
  const infoAlerts = allAlerts.filter((a) => a.severity === "info");

  const displayAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts];

  return (
    <div className="space-y-2">
      <h3 className="text-[9px] font-black text-muted-foreground/40 flex items-center gap-1.5 uppercase tracking-widest pl-1">
        <AlertTriangle className="h-3 w-3" /> Alertas Activas
      </h3>

      <div className="space-y-1.5">
        {displayAlerts.length === 0 ? (
          <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs font-bold text-emerald-700">
              Sin alertas activas
            </span>
          </div>
        ) : (
          displayAlerts.map((alert, idx) => {
            const styles = getAlertStyles(alert.severity, alert.category);

            return (
              <div
                key={`${alert.id}-${idx}`}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-lg border transition-all hover:translate-x-0.5",
                  styles.bg,
                  styles.border,
                )}
              >
                <div className={cn("mt-0.5 shrink-0", styles.icon)}>
                  {getAlertIcon(alert.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-foreground">
                      {alert.title}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        styles.badge,
                      )}
                    >
                      {alert.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {alert.message}
                  </p>
                  {alert.data && Object.keys(alert.data).length > 0 && (
                    <div className="text-[9px] text-muted-foreground/60 mt-1">
                      {Object.entries(alert.data)
                        .slice(0, 2) // Show only first 2 data points
                        .map(([key, value]) => (
                          <div key={key}>
                            {key.replace(/([A-Z])/g, " $1").toLowerCase()}:{" "}
                            {String(value)}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
